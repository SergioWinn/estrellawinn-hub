import { DurableObject } from "cloudflare:workers";

const API_BASE_URL = "https://jkt48.com/api/v1";
const LIVE_REFRESH_INTERVAL_SECONDS = 5;
const SNAPSHOT_TTL_SECONDS = 24 * 60 * 60;
const SNAPSHOT_WRITE_INTERVAL_SECONDS = 2 * 60 * 60;
const WAITING_ROOM_PROBE_INTERVAL_SECONDS = 20;
const COOKIE_TTL_SECONDS = 15 * 60;
const UPSTREAM_TIMEOUT_MS = 10_000;
const EXCLUSIVE_SNAPSHOT_BUNDLE_KEY = "exclusive-snapshot-bundle";
const FALLBACK_CODES = ["EX783D", "EX9A4A", "EXCD2C", "EXCB75"];
const REQUEST_HEADERS = {
	"Accept": "application/json, text/plain, */*",
	"Referer": "https://jkt48.com/",
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};
const BASE_RESPONSE_HEADERS = {
	"Access-Control-Allow-Headers": "Content-Type",
	"Access-Control-Allow-Methods": "GET,OPTIONS",
	"Cache-Control": "no-store",
	"Content-Type": "application/json; charset=utf-8",
} as const;
const ALLOWED_ORIGIN_PATTERNS = [/^http:\/\/localhost(?::\d+)?$/i, /^https:\/\/(?:[a-z0-9-]+\.)*vercel\.app$/i];

type ProxyErrorStatus =
	| "method_not_allowed"
	| "not_found"
	| "upstream_invalid_json"
	| "waiting_room"
	| "upstream_fetch_failed";

interface CacheEntry {
	cachedAt: string;
	payload: unknown;
}

interface WaitingRoomState {
	detectedAt: string;
	generation: number;
	nextProbeAt: string;
}

interface CookieEntry {
	cachedAt: string;
	value: string;
}

interface CoordinatorResult {
	body: unknown;
	status: number;
}

interface ErrorBody {
	error: true;
	message: string;
	status: ProxyErrorStatus;
}

function getCorsHeaders(request: Request): Headers {
	const headers = new Headers(BASE_RESPONSE_HEADERS);
	const origin = request.headers.get("Origin") ?? "";

	if (ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))) {
		headers.set("Access-Control-Allow-Origin", origin);
		headers.set("Vary", "Origin");
	}

	return headers;
}

function json(request: Request, data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		headers: getCorsHeaders(request),
		status,
	});
}

function errorResult(status: number, responseStatus: ProxyErrorStatus, message: string): CoordinatorResult {
	return {
		body: {
			error: true,
			message,
			status: responseStatus,
		} satisfies ErrorBody,
		status,
	};
}

function getUpstreamUrl(pathname: string): string | null {
	if (pathname === "/members") {
		return `${API_BASE_URL}/members?lang=id`;
	}

	if (pathname === "/exclusives") {
		return `${API_BASE_URL}/exclusives?lang=id`;
	}

	const detailMatch = pathname.match(/^\/exclusives\/([A-Z0-9]+)$/i);
	return detailMatch ? `${API_BASE_URL}/exclusives/${detailMatch[1]}?lang=id` : null;
}

function normalizePathname(pathname: string): string | null {
	if (pathname === "/members" || pathname === "/exclusives") {
		return pathname;
	}

	const detailMatch = pathname.match(/^\/exclusives\/([A-Z0-9]+)$/i);
	return detailMatch ? `/exclusives/${detailMatch[1].toUpperCase()}` : null;
}

function getCacheKey(pathname: string): string {
	return `payload:${pathname}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ageInSeconds(timestamp: string): number {
	const timestampMs = Date.parse(timestamp);
	return Number.isNaN(timestampMs) ? Number.POSITIVE_INFINITY : (Date.now() - timestampMs) / 1000;
}

function isWaitingRoomResponse(response: Response, bodyText: string): boolean {
	const contentType = response.headers.get("content-type") ?? "";
	const bodyLower = bodyText.trim().toLowerCase();
	const serverHeader = response.headers.get("server")?.toLowerCase() ?? "";
	const mitigatedHeader = response.headers.get("cf-mitigated")?.toLowerCase() ?? "";

	if (response.status === 429 || response.status === 503) {
		return true;
	}

	const looksLikeHtml =
		contentType.includes("text/html") || bodyLower.startsWith("<!doctype") || bodyLower.startsWith("<html");
	const hasWaitingRoomSignature =
		bodyLower.includes("waiting room") ||
		bodyLower.includes("cloudflare") ||
		bodyLower.includes("cf-waitingroom") ||
		bodyLower.includes("attention required");

	return looksLikeHtml &&
		(hasWaitingRoomSignature || serverHeader.includes("cloudflare") || mitigatedHeader.length > 0 || response.headers.has("cf-ray"));
}

function extractWaitingRoomCookie(response: Response): string | null {
	const setCookie = response.headers.get("set-cookie") ?? "";
	return setCookie.match(/__cfwaitingroom[^=;,\s]*=[^;,\s]+/i)?.[0] ?? null;
}

function isValidUpstreamPayload(payload: unknown): boolean {
	return isRecord(payload) && payload.status !== false && Object.hasOwn(payload, "data");
}

function stalePayload(entry: CacheEntry, queueStatus: "waiting_room" | "upstream_unavailable"): unknown {
	if (!isRecord(entry.payload)) {
		return {
			data: entry.payload,
			isStale: true,
			lastUpdated: entry.cachedAt,
			queueStatus,
			status: true,
		};
	}

	return {
		...entry.payload,
		isStale: true,
		lastUpdated: entry.cachedAt,
		queueStatus,
	};
}

export class WaitingRoomCoordinator extends DurableObject<Env> {
	private waitingRoomState: WaitingRoomState | null = null;
	private cookie: CookieEntry | null = null;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => {
			const [waitingRoomState, cookie] = await Promise.all([
				this.ctx.storage.get<WaitingRoomState>("waiting-room-state"),
				this.ctx.storage.get<CookieEntry>("waiting-room-cookie"),
			]);
			this.waitingRoomState = waitingRoomState ?? null;
			this.cookie = cookie ?? null;
		});
	}

	async beginRequest(): Promise<{ allowed: boolean; cookie: string | null; generation: number | null }> {
		const cookie = this.cookie && ageInSeconds(this.cookie.cachedAt) < COOKIE_TTL_SECONDS ? this.cookie.value : null;
		if (!this.waitingRoomState) {
			return { allowed: true, cookie, generation: null };
		}

		if (Date.now() < Date.parse(this.waitingRoomState.nextProbeAt)) {
			return { allowed: false, cookie, generation: this.waitingRoomState.generation };
		}

		this.waitingRoomState.nextProbeAt = new Date(
			Date.now() + WAITING_ROOM_PROBE_INTERVAL_SECONDS * 1000,
		).toISOString();
		await this.ctx.storage.put("waiting-room-state", this.waitingRoomState);
		return { allowed: true, cookie, generation: this.waitingRoomState.generation };
	}

	async reportWaiting(cookieValue: string | null): Promise<void> {
		const now = new Date();
		this.waitingRoomState = {
			detectedAt: this.waitingRoomState?.detectedAt ?? now.toISOString(),
			generation: (this.waitingRoomState?.generation ?? 0) + 1,
			nextProbeAt: new Date(now.getTime() + WAITING_ROOM_PROBE_INTERVAL_SECONDS * 1000).toISOString(),
		};
		await this.ctx.storage.put("waiting-room-state", this.waitingRoomState);
		if (cookieValue) {
			this.cookie = { cachedAt: now.toISOString(), value: cookieValue };
			await this.ctx.storage.put("waiting-room-cookie", this.cookie);
		}
	}

	async reportFresh(generation: number, cookieValue: string | null): Promise<void> {
		if (!this.waitingRoomState || this.waitingRoomState.generation !== generation) {
			return;
		}

		this.waitingRoomState = null;
		await this.ctx.storage.delete("waiting-room-state");
		if (cookieValue) {
			this.cookie = { cachedAt: new Date().toISOString(), value: cookieValue };
			await this.ctx.storage.put("waiting-room-cookie", this.cookie);
		}
	}
}

export class UpstreamCoordinator extends DurableObject<Env> {
	private snapshot: CacheEntry | null = null;
	private kvSnapshotAt: string | null = null;
	private waitingRoomState: WaitingRoomState | null = null;
	private cookie: CookieEntry | null = null;
	private inFlight: Promise<CoordinatorResult> | null = null;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => {
			const [snapshot, waitingRoomState, cookie] = await Promise.all([
				this.ctx.storage.get<CacheEntry>("snapshot"),
				this.ctx.storage.get<WaitingRoomState>("waiting-room-state"),
				this.ctx.storage.get<CookieEntry>("waiting-room-cookie"),
			]);
			this.snapshot = snapshot ?? null;
			this.kvSnapshotAt = snapshot?.cachedAt ?? null;
			this.waitingRoomState = waitingRoomState ?? null;
			this.cookie = cookie ?? null;
		});
	}

	async getPayload(pathname: string): Promise<CoordinatorResult> {
		const upstreamUrl = getUpstreamUrl(pathname);
		if (!upstreamUrl) {
			return errorResult(404, "not_found", "Unknown API route.");
		}

		if (!this.snapshot) {
			this.snapshot = await this.getKvSnapshot(pathname);
			this.kvSnapshotAt = this.snapshot?.cachedAt ?? null;
		}

		if (this.waitingRoomState && Date.now() < Date.parse(this.waitingRoomState.nextProbeAt)) {
			return this.fallback("waiting_room");
		}

		if (this.snapshot && ageInSeconds(this.snapshot.cachedAt) < LIVE_REFRESH_INTERVAL_SECONDS) {
			return { body: this.snapshot.payload, status: 200 };
		}

		if (this.inFlight) {
			return this.inFlight;
		}

		this.inFlight = this.refresh(pathname, upstreamUrl);
		try {
			return await this.inFlight;
		} finally {
			this.inFlight = null;
		}
	}

	private async refresh(pathname: string, upstreamUrl: string): Promise<CoordinatorResult> {
		const wasWaiting = this.waitingRoomState !== null;
		const waitingRoom = wasWaiting ? this.env.WAITING_ROOM_COORDINATOR.getByName("jkt48-api") : null;
		const access = waitingRoom
			? await waitingRoom.beginRequest()
			: {
					allowed: true,
					cookie: this.cookie && ageInSeconds(this.cookie.cachedAt) < COOKIE_TTL_SECONDS ? this.cookie.value : null,
					generation: null,
				};

		if (!access.allowed) {
			await this.deferWaitingRoomProbe();
			return this.fallback("waiting_room");
		}

		try {
			const headers = new Headers(REQUEST_HEADERS);
			if (access.cookie) {
				headers.set("Cookie", access.cookie);
			}

			const upstream = await fetch(upstreamUrl, {
				headers,
				method: "GET",
				signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
			});
			const waitingRoomCookie = extractWaitingRoomCookie(upstream);
			const bodyText = await upstream.text();
			if (isWaitingRoomResponse(upstream, bodyText)) {
				await this.enterWaitingRoom(waitingRoomCookie);
				await this.persistSnapshot(pathname, true);
				return this.fallback("waiting_room");
			}

			let payload: unknown;
			try {
				payload = JSON.parse(bodyText) as unknown;
			} catch {
				return this.fallback("upstream_unavailable", "JKT48 upstream returned a non-JSON payload.");
			}

			if (upstream.status >= 400 && upstream.status < 500) {
				return { body: payload, status: upstream.status };
			}

			if (!upstream.ok || !isValidUpstreamPayload(payload)) {
				return this.fallback("upstream_unavailable", "JKT48 upstream returned an invalid response.");
			}

			this.snapshot = { cachedAt: new Date().toISOString(), payload };
			await this.persistSnapshot(pathname, false);
			if (wasWaiting && waitingRoom && access.generation !== null) {
				await waitingRoom.reportFresh(access.generation, waitingRoomCookie);
			}
			if (wasWaiting) {
				this.waitingRoomState = null;
				await this.ctx.storage.delete("waiting-room-state");
			}
			if (waitingRoomCookie) {
				this.cookie = { cachedAt: new Date().toISOString(), value: waitingRoomCookie };
				await this.ctx.storage.put("waiting-room-cookie", this.cookie);
			}

			return { body: payload, status: 200 };
		} catch {
			return this.fallback("upstream_unavailable", "Failed to reach the JKT48 upstream API.");
		}
	}

	private async enterWaitingRoom(cookieValue: string | null): Promise<void> {
		const now = new Date();
		this.waitingRoomState = {
			detectedAt: this.waitingRoomState?.detectedAt ?? now.toISOString(),
			generation: (this.waitingRoomState?.generation ?? 0) + 1,
			nextProbeAt: new Date(now.getTime() + WAITING_ROOM_PROBE_INTERVAL_SECONDS * 1000).toISOString(),
		};
		await this.ctx.storage.put("waiting-room-state", this.waitingRoomState);
		if (cookieValue) {
			this.cookie = { cachedAt: now.toISOString(), value: cookieValue };
			await this.ctx.storage.put("waiting-room-cookie", this.cookie);
		}
		await this.env.WAITING_ROOM_COORDINATOR.getByName("jkt48-api").reportWaiting(cookieValue);
	}

	private async deferWaitingRoomProbe(): Promise<void> {
		if (!this.waitingRoomState) {
			return;
		}
		this.waitingRoomState.nextProbeAt = new Date(
			Date.now() + WAITING_ROOM_PROBE_INTERVAL_SECONDS * 1000,
		).toISOString();
		await this.ctx.storage.put("waiting-room-state", this.waitingRoomState);
	}

	private fallback(
		queueStatus: "waiting_room" | "upstream_unavailable",
		message?: string,
	): CoordinatorResult {
		if (this.snapshot && ageInSeconds(this.snapshot.cachedAt) < SNAPSHOT_TTL_SECONDS) {
			return { body: stalePayload(this.snapshot, queueStatus), status: 200 };
		}

		return queueStatus === "waiting_room"
			? errorResult(503, "waiting_room", "Cloudflare Waiting Room is active.")
			: errorResult(502, message?.includes("non-JSON") ? "upstream_invalid_json" : "upstream_fetch_failed", message ?? "Failed to reach the JKT48 upstream API.");
	}

	private async getKvSnapshot(pathname: string): Promise<CacheEntry | null> {
		try {
			const raw = await this.env.JKT48_CACHE.get(getCacheKey(pathname));
			return raw ? (JSON.parse(raw) as CacheEntry) : null;
		} catch {
			return null;
		}
	}

	private async persistSnapshot(pathname: string, force: boolean): Promise<void> {
		if (!this.snapshot) {
			return;
		}

		await this.ctx.storage.put("snapshot", this.snapshot);

		if (!force && this.kvSnapshotAt && ageInSeconds(this.kvSnapshotAt) < SNAPSHOT_WRITE_INTERVAL_SECONDS) {
			return;
		}

		try {
			await this.env.JKT48_CACHE.put(getCacheKey(pathname), JSON.stringify(this.snapshot), {
				expirationTtl: SNAPSHOT_TTL_SECONDS,
			});
			this.kvSnapshotAt = this.snapshot.cachedAt;
		} catch {
			// Durable Object storage remains the primary snapshot when KV is unavailable.
		}
	}
}

function extractExclusiveCodes(payload: unknown): string[] {
	if (!isRecord(payload)) {
		return [];
	}

	const outerData = payload.data;
	const list = Array.isArray(outerData)
		? outerData
		: isRecord(outerData) && Array.isArray(outerData.data)
			? outerData.data
			: [];

	return list
		.map((event) => (isRecord(event) && typeof event.code === "string" ? event.code : null))
		.filter((code): code is string => code !== null);
}

function extractExclusiveDetail(payload: unknown): unknown | null {
	return isRecord(payload) && isRecord(payload.data) ? payload.data : null;
}

async function saveExclusiveSnapshotBundle(env: Env, results: CoordinatorResult[]): Promise<void> {
	const details = results.map((result) => extractExclusiveDetail(result.body)).filter((detail) => detail !== null);
	if (!details.length) {
		return;
	}

	const staleResult = results.find((result) => isRecord(result.body) && result.body.isStale === true);
	const bundle = {
		data: details,
		isStale: Boolean(staleResult),
		lastUpdated:
			staleResult && isRecord(staleResult.body) && typeof staleResult.body.lastUpdated === "string"
				? staleResult.body.lastUpdated
				: new Date().toISOString(),
		queueStatus:
			staleResult && isRecord(staleResult.body) && typeof staleResult.body.queueStatus === "string"
				? staleResult.body.queueStatus
				: undefined,
		status: true,
	};

	await env.JKT48_CACHE.put(EXCLUSIVE_SNAPSHOT_BUNDLE_KEY, JSON.stringify(bundle), {
		expirationTtl: SNAPSHOT_TTL_SECONDS,
	});
}

async function getExclusiveSnapshotBundle(env: Env): Promise<unknown | null> {
	try {
		const bundle = await env.JKT48_CACHE.get(EXCLUSIVE_SNAPSHOT_BUNDLE_KEY, "json");
		if (bundle) {
			return bundle;
		}

		const listEntry = await env.JKT48_CACHE.get<CacheEntry>(getCacheKey("/exclusives"), "json");
		const codes = listEntry ? extractExclusiveCodes(listEntry.payload) : FALLBACK_CODES;
		const detailEntries = await Promise.all(
			codes.map((code) => env.JKT48_CACHE.get<CacheEntry>(getCacheKey(`/exclusives/${code}`), "json")),
		);
		const details = detailEntries
			.map((entry) => (entry ? extractExclusiveDetail(entry.payload) : null))
			.filter((detail) => detail !== null);

		return details.length
			? {
					data: details,
					isStale: true,
					lastUpdated: detailEntries.find((entry) => entry)?.cachedAt,
					queueStatus: "upstream_unavailable",
					status: true,
				}
			: null;
	} catch {
		return null;
	}
}

async function getCoordinatedPayload(env: Env, pathname: string): Promise<CoordinatorResult> {
	return env.UPSTREAM_COORDINATOR.getByName(pathname).getPayload(pathname);
}

async function warmSnapshots(env: Env): Promise<void> {
	const [membersResult, exclusivesResult] = await Promise.allSettled([
		getCoordinatedPayload(env, "/members"),
		getCoordinatedPayload(env, "/exclusives"),
	]);

	void membersResult;
	if (exclusivesResult.status !== "fulfilled") {
		return;
	}

	const codes = extractExclusiveCodes(exclusivesResult.value.body);
	const detailResults: CoordinatorResult[] = [];
	for (let index = 0; index < codes.length; index += 3) {
		const batch = await Promise.allSettled(
			codes.slice(index, index + 3).map((code) => getCoordinatedPayload(env, `/exclusives/${code}`)),
		);
		detailResults.push(
			...batch
				.filter((result): result is PromiseFulfilledResult<CoordinatorResult> => result.status === "fulfilled")
				.map((result) => result.value),
		);
	}

	try {
		await saveExclusiveSnapshotBundle(env, detailResults);
	} catch {
		// Individual durable snapshots remain available if the aggregate KV write fails.
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === "OPTIONS") {
			return new Response(null, { headers: getCorsHeaders(request), status: 204 });
		}

		if (request.method !== "GET") {
			const result = errorResult(405, "method_not_allowed", "Only GET and OPTIONS are supported.");
			return json(request, result.body, result.status);
		}

		const requestedPathname = new URL(request.url).pathname;
		if (requestedPathname === "/exclusive-snapshots") {
			const bundle = await getExclusiveSnapshotBundle(env);
			const result = bundle
				? { body: bundle, status: 200 }
				: errorResult(503, "upstream_fetch_failed", "No exclusive snapshot is available yet.");
			return json(request, result.body, result.status);
		}

		const pathname = normalizePathname(requestedPathname);
		if (!pathname) {
			const result = errorResult(404, "not_found", "Unknown API route.");
			return json(request, result.body, result.status);
		}

		try {
			const result = await getCoordinatedPayload(env, pathname);
			return json(request, result.body, result.status);
		} catch {
			const result = errorResult(502, "upstream_fetch_failed", "Failed to coordinate the JKT48 request.");
			return json(request, result.body, result.status);
		}
	},

	async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(warmSnapshots(env));
	},
} satisfies ExportedHandler<Env>;
