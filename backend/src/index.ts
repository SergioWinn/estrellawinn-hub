const API_BASE_URL = "https://jkt48.com/api/v1";
const CACHE_TTL_SECONDS = 60 * 60;
const COOKIE_TTL_SECONDS = 15 * 60;
const WAITING_ROOM_COOKIE_KEY = "waiting-room-cookie";
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
	| "upstream_http_error"
	| "upstream_invalid_json"
	| "waiting_room"
	| "upstream_fetch_failed";

interface Env {
	JKT48_CACHE: KVNamespace;
}

interface CacheEntry {
	cachedAt: string;
	payload: unknown;
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

function errorResponse(request: Request, status: number, responseStatus: ProxyErrorStatus, message: string): Response {
	return json(
		request,
		{
			error: true,
			message,
			status: responseStatus,
		} satisfies ErrorBody,
		status,
	);
}

function getUpstreamUrl(pathname: string): string | null {
	if (pathname === "/members") {
		return `${API_BASE_URL}/members?lang=id`;
	}

	if (pathname === "/exclusives") {
		return `${API_BASE_URL}/exclusives?lang=id`;
	}

	const detailMatch = pathname.match(/^\/exclusives\/([A-Z0-9]+)$/i);
	if (detailMatch) {
		return `${API_BASE_URL}/exclusives/${detailMatch[1]}?lang=id`;
	}

	return null;
}

function getCacheKey(pathname: string): string {
	return `payload:${pathname}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
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

	return looksLikeHtml && (hasWaitingRoomSignature || serverHeader.includes("cloudflare") || mitigatedHeader.length > 0 || response.headers.has("cf-ray"));
}

function extractWaitingRoomCookie(response: Response): string | null {
	const setCookie = response.headers.get("set-cookie") ?? "";
	const match = setCookie.match(/cf_waiting_room=[^;,\s]+/i);
	return match?.[0] ?? null;
}

async function saveWaitingRoomCookie(env: Env, response: Response): Promise<void> {
	const cookie = extractWaitingRoomCookie(response);

	if (!cookie) {
		return;
	}

	await env.JKT48_CACHE.put(WAITING_ROOM_COOKIE_KEY, cookie, {
		expirationTtl: COOKIE_TTL_SECONDS,
	});
}

async function getWaitingRoomCookie(env: Env): Promise<string | null> {
	return env.JKT48_CACHE.get(WAITING_ROOM_COOKIE_KEY);
}

function buildUpstreamHeaders(cookie: string | null): Headers {
	const headers = new Headers(REQUEST_HEADERS);

	if (cookie) {
		headers.set("Cookie", cookie);
	}

	return headers;
}

async function savePayloadToCache(env: Env, pathname: string, payload: unknown): Promise<void> {
	const entry: CacheEntry = {
		cachedAt: new Date().toISOString(),
		payload,
	};

	await env.JKT48_CACHE.put(getCacheKey(pathname), JSON.stringify(entry), {
		expirationTtl: CACHE_TTL_SECONDS,
	});
}

async function getCachedPayload(env: Env, pathname: string): Promise<CacheEntry | null> {
	const raw = await env.JKT48_CACHE.get(getCacheKey(pathname));

	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw) as CacheEntry;
	} catch {
		return null;
	}
}

function withStaleMetadata(payload: unknown, cachedAt: string): unknown {
	if (!isRecord(payload)) {
		return {
			data: payload,
			isStale: true,
			lastUpdated: cachedAt,
			queueStatus: "waiting_room",
			status: true,
		};
	}

	return {
		...payload,
		isStale: true,
		lastUpdated: cachedAt,
		queueStatus: "waiting_room",
	};
}

async function readUpstreamJson(response: Response): Promise<unknown> {
	const bodyText = await response.text();

	if (isWaitingRoomResponse(response, bodyText)) {
		throw new Error("UPSTREAM_WAITING_ROOM");
	}

	try {
		return JSON.parse(bodyText) as unknown;
	} catch {
		throw new Error("UPSTREAM_INVALID_JSON");
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: getCorsHeaders(request),
				status: 204,
			});
		}

		if (request.method !== "GET") {
			return errorResponse(request, 405, "method_not_allowed", "Only GET and OPTIONS are supported.");
		}

		const url = new URL(request.url);
		const upstreamUrl = getUpstreamUrl(url.pathname);

		if (!upstreamUrl) {
			return errorResponse(request, 404, "not_found", "Unknown API route.");
		}

		try {
			const cookie = await getWaitingRoomCookie(env);
			const upstream = await fetch(upstreamUrl, {
				headers: buildUpstreamHeaders(cookie),
				method: "GET",
			});

			await saveWaitingRoomCookie(env, upstream);
			const payload = await readUpstreamJson(upstream);

			if (!upstream.ok) {
				return json(request, payload, upstream.status);
			}

			await savePayloadToCache(env, url.pathname, payload);
			return json(request, payload, 200);
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : "UPSTREAM_FETCH_FAILED";

			if (message === "UPSTREAM_WAITING_ROOM") {
				const cached = await getCachedPayload(env, url.pathname);

				if (cached) {
					return json(request, withStaleMetadata(cached.payload, cached.cachedAt), 200);
				}

				return errorResponse(request, 503, "waiting_room", "Cloudflare Waiting Room is active.");
			}

			if (message === "UPSTREAM_INVALID_JSON") {
				return errorResponse(request, 502, "upstream_invalid_json", "JKT48 upstream returned a non-JSON payload.");
			}

			return errorResponse(request, 502, "upstream_fetch_failed", "Failed to reach the JKT48 upstream API.");
		}
	},
} satisfies ExportedHandler<Env>;
