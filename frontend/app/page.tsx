"use client";

import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";

import { MemberCard, type MemberCardViewModel } from "@/src/components/MemberCard";
import { getInitialTheme, resolveTheme } from "./theme";
import {
	AlertIcon,
	BoxIcon,
	CalendarIcon,
	CategoryIcon,
	ClockIcon,
	DotIcon,
	FlameIcon,
	PinIcon,
	SearchIcon,
	SupportIcon,
	TicketIcon,
} from "@/src/components/UiIcons";

interface ApiEnvelope<T> {
	data: T;
	isStale?: boolean;
	lastUpdated?: string;
	queueStatus?: string;
	status: boolean;
}

interface MemberRecord {
	name?: string;
	nickname?: string;
	photo?: string;
}

interface ExclusiveListItem {
	category?: string;
	code?: string;
	default_price?: number;
	sales_period?: SalesPeriod[];
	title?: string;
	valid_date_from?: string;
	valid_date_to?: string;
}

interface SalesPeriod {
	end_date?: string;
	is_ofc_only?: boolean;
	label?: string;
}

interface SessionDetail {
	available_quota?: number;
	jkt48_member_name?: string;
	label?: string;
	tickets_sold?: number;
}

interface Session {
	date?: string;
	end_time?: string;
	label?: string;
	session_detail?: SessionDetail[];
	start_time?: string;
}

interface EventDetail extends ExclusiveListItem {
	code?: string;
	session?: Session[];
	status?: boolean;
}

interface EventOption {
	data: EventDetail;
	label: string;
}

interface GroupedSession {
	filteredMembers: SessionDetail[];
	isBeforeDeadline: boolean;
	label: string;
	sessionDateWib: Date | null;
	startTime: string;
	endTime: string;
	date: string;
}

interface EventMetrics {
	remaining: number;
	soldRate: number;
	totalSold: number;
	totalTickets: number;
}

interface ErrorResponsePayload {
	error?: boolean | string;
	isStale?: boolean;
	lastUpdated?: string;
	message?: string;
	queueStatus?: string;
	status?: boolean | string;
}

type ThemeMode = "dark" | "light";

class ApiError extends Error {
	errorStatus?: string;
	isWaitingRoom: boolean;
	statusCode?: number;

	constructor(message: string, statusCode?: number, errorStatus?: string) {
		super(message);
		this.name = "ApiError";
		this.errorStatus = errorStatus;
		this.isWaitingRoom = errorStatus === "waiting_room";
		this.statusCode = statusCode;
	}
}

const API_BASE_URL = "https://api.estrella19.workers.dev";
const THEME_STORAGE_KEY = "gem-theme";

const FALLBACK_CODES = ["EX783D", "EX9A4A", "EXCD2C", "EXCB75"];
const FALLBACK_IMAGE =
	"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const CATEGORY_LABELS: Record<string, string> = {
	DIGITAL_PHOTOBOOK: "Video Call",
	TWO_SHOT: "2-Shot",
	PHOTOCARD: "Meet & Greet",
};

const FOCUSED_POLLING = {
	refreshInterval: 3000,
	keepPreviousData: true,
	refreshWhenHidden: false,
	revalidateOnFocus: true,
	shouldRetryOnError: false,
} as const;

const WAITING_ROOM_POLLING = {
	...FOCUSED_POLLING,
	refreshInterval: 30000,
} as const;

function parseJsonPayload<T>(bodyText: string): (T & ErrorResponsePayload) | null {
	if (!bodyText.trim()) {
		return null;
	}

	try {
		return JSON.parse(bodyText) as T & ErrorResponsePayload;
	} catch {
		return null;
	}
}

function looksLikeWaitingRoomResponse(response: Response, bodyText: string, payload: ErrorResponsePayload | null): boolean {
	const bodyLower = bodyText.toLowerCase();
	const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
	const statusLabel = typeof payload?.status === "string" ? payload.status.toLowerCase() : "";
	const errorLabel = typeof payload?.error === "string" ? payload.error.toLowerCase() : "";

	if (statusLabel === "waiting_room" || errorLabel === "waiting_room") {
		return true;
	}

	if (response.status === 429 || response.status === 503) {
		return true;
	}

	return (
		(contentType.includes("text/html") || bodyLower.includes("<html") || bodyLower.includes("<!doctype")) &&
		(bodyLower.includes("waiting room") || bodyLower.includes("cloudflare") || bodyLower.includes("cf-waitingroom"))
	);
}

function isWaitingRoomError(error: unknown): boolean {
	return error instanceof ApiError && error.isWaitingRoom;
}

function getNowWib(): Date {
	return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

function createWibDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
	return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

function parseWibLocalDate(value: string): Date | null {
	const match = value.match(
		/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
	);

	if (!match) {
		return null;
	}

	const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;
	return createWibDate(
		Number(year),
		Number(month),
		Number(day),
		Number(hour),
		Number(minute),
		Number(second),
	);
}

function parseApiDate(value?: string): Date | null {
	if (!value) {
		return null;
	}

	const clean = value.split(".")[0];

	if (clean.endsWith("Z")) {
		return new Date(new Date(clean).getTime() + 7 * 60 * 60 * 1000);
	}

	if (clean.includes("T")) {
		return parseWibLocalDate(clean);
	}

	return parseWibLocalDate(`${clean}T00:00:00`);
}

function parseSessionDate(value?: string): Date | null {
	if (!value) {
		return null;
	}

	const clean = value.split(".")[0].replace("Z", "");

	if (clean.includes("T")) {
		return new Date(new Date(`${clean}Z`).getTime() + 7 * 60 * 60 * 1000);
	}

	return parseWibLocalDate(`${clean}T00:00:00`);
}

function formatDateKey(date: Date, nowWib: Date): string {
	const base = formatDate(date);
	const today = formatDate(nowWib);
	const tomorrow = formatDate(new Date(nowWib.getTime() + 24 * 60 * 60 * 1000));

	if (base === today) {
		return `${base} (Today)`;
	}

	if (base === tomorrow) {
		return `${base} (Tomorrow)`;
	}

	return base;
}

function formatDate(date: Date): string {
	return [
		String(date.getUTCDate()).padStart(2, "0"),
		String(date.getUTCMonth() + 1).padStart(2, "0"),
		String(date.getUTCFullYear()),
	].join("/");
}

function formatTime(date: Date): string {
	return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(
		date.getUTCSeconds(),
	).padStart(2, "0")}`;
}

function parseWorkerTimestamp(value?: string): Date | null {
	if (!value) {
		return null;
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	return new Date(parsed.getTime() + 7 * 60 * 60 * 1000);
}

function formatMinutesAgo(value?: string): string {
	if (!value) {
		return "";
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return "";
	}

	const diffMinutes = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000));
	return diffMinutes <= 0 ? "baru saja" : `${diffMinutes} menit yang lalu`;
}

function formatDatePrefix(value?: string): string {
	const date = parseApiDate(value);
	return date ? `[${formatDate(date)}] ` : "";
}

function getWarnLimit(category?: string): number {
	return category === "TWO_SHOT" || category === "DIGITAL_PHOTOBOOK" ? 5 : 20;
}

function getSortTimestamp(value?: string | null): number {
	const parsed = value ? parseApiDate(value) ?? parseWibLocalDate(value) : null;
	return parsed?.getTime() ?? 0;
}

function compareEventsByRecency(a: EventDetail, b: EventDetail): number {
	const releaseDiff = getSortTimestamp(b.valid_date_from) - getSortTimestamp(a.valid_date_from);

	if (releaseDiff !== 0) {
		return releaseDiff;
	}

	return getSortTimestamp(getEventCloseDate(b)) - getSortTimestamp(getEventCloseDate(a));
}

function buildMemberMaps(members: MemberRecord[]): {
	nicknameMap: Map<string, string>;
	photoMap: Map<string, string>;
} {
	const nicknameMap = new Map<string, string>();
	const photoMap = new Map<string, string>();

	for (const member of members) {
		const name = member.name?.trim().toLowerCase();
		const nickname = member.nickname?.trim().toLowerCase();
		const photo = member.photo?.trim();

		if (name && nickname) {
			nicknameMap.set(nickname, name);
		}

		if (name && photo) {
			photoMap.set(name, photo);
		}
	}

	return { nicknameMap, photoMap };
}

function getEventCloseDate(event: EventDetail): string | null {
	for (const period of event.sales_period ?? []) {
		if (period.label === "General" && period.end_date) {
			return period.end_date.split(".")[0];
		}
	}

	return event.valid_date_to?.split(".")[0] ?? null;
}

function isEventClosed(rawCloseDate: string | null, nowWib: Date): boolean {
	if (!rawCloseDate) {
		return false;
	}

	const parsed = parseWibLocalDate(rawCloseDate);
	return parsed !== null && !Number.isNaN(parsed.getTime()) && nowWib >= parsed;
}

function getGeneralEndWib(event: EventDetail): Date | null {
	for (const period of event.sales_period ?? []) {
		if (period.is_ofc_only && period.label !== "General") {
			continue;
		}

		if (!period.end_date) {
			continue;
		}

		const clean = period.end_date.split(".")[0];
		if (period.end_date.includes("Z")) {
			return new Date(new Date(clean).getTime() + 7 * 60 * 60 * 1000);
		}

		return parseWibLocalDate(clean);
	}

	return null;
}

function buildSessionGroups(args: {
	availableOnly: boolean;
	event: EventDetail;
	isClosed: boolean;
	nicknameMap: Map<string, string>;
	nowWib: Date;
	searchQuery: string;
}): Map<string, GroupedSession[]> {
	const { availableOnly, event, isClosed, nicknameMap, nowWib, searchQuery } = args;
	const grouped = new Map<string, GroupedSession[]>();
	const generalEndWib = getGeneralEndWib(event);
	const matchedNames = new Set<string>();

	if (searchQuery) {
		for (const [nickname, fullName] of nicknameMap.entries()) {
			if (nickname.includes(searchQuery) || fullName.includes(searchQuery)) {
				matchedNames.add(fullName);
			}
		}
	}

	for (const session of event.session ?? []) {
		const sessionDateWib = parseSessionDate(session.date);
		let isBeforeDeadline = true;

		if (generalEndWib) {
			if (nowWib > generalEndWib) {
				isBeforeDeadline = false;
			} else if (sessionDateWib) {
				const dailyCutoff = new Date(sessionDateWib);
				dailyCutoff.setUTCHours(
					generalEndWib.getUTCHours(),
					generalEndWib.getUTCMinutes(),
					generalEndWib.getUTCSeconds(),
					0,
				);

				if (nowWib > dailyCutoff) {
					isBeforeDeadline = false;
				}

				if (isBeforeDeadline && session.end_time) {
					const [hours = "0", minutes = "0", seconds = "0"] = session.end_time.split(":");
					const sessionEnd = new Date(sessionDateWib);
					sessionEnd.setUTCHours(Number(hours), Number(minutes), Number(seconds), 0);

					if (nowWib > sessionEnd) {
						isBeforeDeadline = false;
					}
				}
			}
		}

		let members = session.session_detail ?? [];

		if (searchQuery) {
			members = members.filter((member) => {
				const name = member.jkt48_member_name?.toLowerCase() ?? "";
				return matchedNames.has(name) || name.includes(searchQuery);
			});
		}

		if (availableOnly) {
			if (isClosed || !isBeforeDeadline) {
				continue;
			}

			members = members.filter((member) => (member.available_quota ?? 0) > 0);
		}

		if (!members.length) {
			continue;
		}

		const key = sessionDateWib ? formatDateKey(sessionDateWib, nowWib) : session.date?.slice(0, 10) || "Others";
		const list = grouped.get(key) ?? [];

		list.push({
			date: session.date ?? "",
			endTime: session.end_time ?? "",
			filteredMembers: members,
			isBeforeDeadline,
			label: session.label ?? "Session",
			sessionDateWib,
			startTime: session.start_time ?? "",
		});

		grouped.set(key, list);
	}

	return grouped;
}

function buildCard(args: {
	availableQuota: number;
	category?: string;
	isBeforeDeadline: boolean;
	isEventClosed: boolean;
	member: SessionDetail;
	metaHtml: string;
	photoMap: Map<string, string>;
	purchaseLink: string;
	sessionKey: string;
}): MemberCardViewModel {
	const { availableQuota, category, isBeforeDeadline, isEventClosed, member, metaHtml, photoMap, purchaseLink, sessionKey } =
		args;
	const memberName = member.jkt48_member_name ?? "Unknown";
	const soldCount = member.tickets_sold ?? 0;
	const totalCapacity = soldCount + availableQuota;
	const warnLimit = getWarnLimit(category);
	const safeName = memberName.trim().toLowerCase();
	const rawPhotoUrl = photoMap.get(safeName);

	let status: MemberCardViewModel["status"] = "avail";
	let buttonLabel = `${availableQuota}&nbsp;LEFT`;
	let badgeLabel: string | null = "OPEN";
	let badgeClassName = "member-card-badge-avail";
	let progressPercent = totalCapacity > 0 ? (soldCount / totalCapacity) * 100 : 0;
	let progressColor = "var(--available)";
	let clickable = true;

	if (isEventClosed || !isBeforeDeadline) {
		status = "closed";
		buttonLabel = "CLOSED";
		badgeLabel = null;
		progressPercent = 100;
		progressColor = "var(--closed)";
		clickable = false;
	} else if (availableQuota <= 0) {
		status = "sold";
		buttonLabel = "SOLD&nbsp;OUT";
		badgeLabel = null;
		progressPercent = 100;
		progressColor = "var(--sold)";
		clickable = false;
	} else if (availableQuota < warnLimit) {
		status = "warn";
		buttonLabel = `${availableQuota}&nbsp;LEFT`;
		badgeLabel = "LOW";
		badgeClassName = "member-card-badge-warn";
		progressColor = "var(--warn)";
	} else {
		progressColor = "var(--available)";
	}

	return {
		badgeClassName,
		badgeLabel,
		buttonLabel,
		clickable,
		id: `${sessionKey}-${memberName}-${member.label ?? ""}`,
		memberName,
		metaHtml,
		photoUrl: rawPhotoUrl ? `https://wsrv.nl/?url=${encodeURIComponent(rawPhotoUrl)}&w=150&output=webp` : FALLBACK_IMAGE,
		progressColor,
		progressPercent,
		purchaseLink,
		soldCount,
		status,
	};
}

function getMetrics(event: EventDetail | undefined): EventMetrics {
	let remaining = 0;
	let totalSold = 0;

	for (const session of event?.session ?? []) {
		for (const member of session.session_detail ?? []) {
			totalSold += member.tickets_sold ?? 0;
			remaining += member.available_quota ?? 0;
		}
	}

	const totalTickets = totalSold + remaining;
	return {
		remaining,
		soldRate: totalTickets > 0 ? (totalSold / totalTickets) * 100 : 0,
		totalSold,
		totalTickets,
	};
}

function stripSessionLabel(label: string): string {
	return label.split("(")[0].split("·")[0].trim().replace("Sesi", "Session");
}

export default function Page() {
	const [selectedCategory, setSelectedCategory] = useState("");
	const [selectedEventLabel, setSelectedEventLabel] = useState("");
	const [selectedDate, setSelectedDate] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [availableOnly, setAvailableOnly] = useState(false);
	const [isRetrying, setIsRetrying] = useState(false);
	const [waitingRoomActive, setWaitingRoomActive] = useState(false);
	const [eventListStale, setEventListStale] = useState(false);
	const pollingOptions = waitingRoomActive ? WAITING_ROOM_POLLING : FOCUSED_POLLING;

	const fetcher = async <T,>(path: string): Promise<T> => {
		const response = await fetch(`${API_BASE_URL}${path}`, {
			cache: "no-store",
		});
		const bodyText = await response.text();
		const payload = parseJsonPayload<T>(bodyText);

		if (looksLikeWaitingRoomResponse(response, bodyText, payload)) {
			setWaitingRoomActive(true);
			throw new ApiError(payload?.message ?? "Cloudflare Waiting Room is active.", 503, "waiting_room");
		}

		if (!payload) {
			throw new ApiError("Worker returned a non-JSON response.", response.status);
		}

		if (!response.ok || payload.status === false) {
			throw new ApiError(
				payload.message ?? (typeof payload.error === "string" ? payload.error : "Request failed"),
				response.status,
				typeof payload.status === "string" ? payload.status : undefined,
			);
		}

		if (payload.isStale || payload.queueStatus === "waiting_room") {
			setWaitingRoomActive(true);
		}
		return payload;
	};

	const {
		data: membersResponse,
		error: membersError,
		isLoading: membersLoading,
		mutate: mutateMembers,
	} = useSWR<ApiEnvelope<MemberRecord[]>>("/members", fetcher, pollingOptions);
	const {
		data: codesResponse,
		error: codesError,
		isLoading: codesLoading,
		mutate: mutateCodes,
	} = useSWR<ApiEnvelope<ExclusiveListItem[] | { data?: ExclusiveListItem[] }>>("/exclusives", fetcher, pollingOptions);

	const activeCodes = useMemo(() => {
		const data = codesResponse?.data;
		const list = Array.isArray(data) ? data : data?.data ?? [];
		const codes = list.map((event) => event.code).filter((code): code is string => Boolean(code));
		return codes.length ? codes : FALLBACK_CODES;
	}, [codesResponse]);

	const { data: eventsData, error: eventsError, isLoading: eventsLoading, mutate: mutateEvents } = useSWR<EventDetail[]>(
		activeCodes.length ? ["event-list", ...activeCodes] : null,
		async ([, ...codes]) => {
			const results = await Promise.all(
				codes.map(async (code) => {
					try {
						return await fetcher<ApiEnvelope<EventDetail>>(`/exclusives/${code}`);
					} catch {
						return null;
					}
				}),
			);

			setEventListStale(results.some((event) => event?.isStale));
			return results
				.filter((event): event is ApiEnvelope<EventDetail> => event !== null && event.status !== false)
				.map((event) => event.data)
				.sort(compareEventsByRecency);
		},
		pollingOptions,
	);

	const categories = useMemo(() => {
		const mapped = new Map<string, EventOption[]>();

		for (const event of eventsData ?? []) {
			const categoryLabel = CATEGORY_LABELS[event.category ?? ""] ?? "Others";
			const eventLabel = `${formatDatePrefix(event.valid_date_from)}${event.title ?? "Unknown Event"}`;
			const list = mapped.get(categoryLabel) ?? [];
			list.push({ data: event, label: eventLabel });
			mapped.set(categoryLabel, list);
		}

		for (const [categoryLabel, list] of mapped.entries()) {
			mapped.set(
				categoryLabel,
				[...list].sort((a, b) => compareEventsByRecency(a.data, b.data)),
			);
		}

		return mapped;
	}, [eventsData]);

	const categoryKeys = Array.from(categories.keys());
	const activeCategory = selectedCategory && categories.has(selectedCategory) ? selectedCategory : categoryKeys[0] ?? "";
	const eventOptions = categories.get(activeCategory) ?? [];
	const activeEventOption =
		eventOptions.find((option) => option.label === selectedEventLabel) ?? eventOptions[0] ?? null;
	const activeEvent = activeEventOption?.data;
	const [nowWib, setNowWib] = useState(() => getNowWib());
	const [lastRefresh, setLastRefresh] = useState<{ code: string; timestamp: Date } | null>(null);
	const [theme, setTheme] = useState<ThemeMode>(() =>
		getInitialTheme({
			datasetTheme: typeof document === "undefined" ? undefined : document.documentElement.dataset.theme,
			storedTheme: typeof window === "undefined" ? null : window.localStorage.getItem(THEME_STORAGE_KEY),
		}),
	);

	const activeEventCode = activeEvent?.code ?? null;
	const detailSWR = useSWR<ApiEnvelope<EventDetail>>(
		activeEventCode ? `/exclusives/${activeEventCode}` : null,
		fetcher,
		{
			...pollingOptions,
			onSuccess: (payload) => {
				if (!activeEventCode) {
					return;
				}

				setLastRefresh({
					code: activeEventCode,
					timestamp: parseWorkerTimestamp(payload.lastUpdated) ?? getNowWib(),
				});
			},
		},
	);
	const { mutate: mutateDetail } = detailSWR;

	const currentEvent = detailSWR.data?.data ?? activeEvent;
	const lastUpdatedWib = lastRefresh?.code === activeEventCode ? lastRefresh.timestamp : null;
	const staleLastUpdated = detailSWR.data?.lastUpdated ?? codesResponse?.lastUpdated ?? membersResponse?.lastUpdated;
	const staleMinutesAgo = formatMinutesAgo(staleLastUpdated);
	const { nicknameMap, photoMap } = useMemo(
		() => buildMemberMaps(membersResponse?.data ?? []),
		[membersResponse?.data],
	);
	const closeDate = currentEvent ? getEventCloseDate(currentEvent) : null;
	const closed = currentEvent ? isEventClosed(closeDate, nowWib) : false;
	const metrics = getMetrics(currentEvent);
	const groupedSessions = currentEvent
		? buildSessionGroups({
				availableOnly,
				event: currentEvent,
				isClosed: closed,
				nicknameMap,
				nowWib,
				searchQuery: searchQuery.trim().toLowerCase(),
		  })
		: new Map<string, GroupedSession[]>();

	const dateKeys = Array.from(groupedSessions.keys());
	const isSearchMode = Boolean(searchQuery.trim());
	const activeDate = isSearchMode ? "" : dateKeys.includes(selectedDate) ? selectedDate : dateKeys[0] ?? "";
	const visibleSessions = isSearchMode
		? dateKeys.flatMap((key) => groupedSessions.get(key) ?? [])
		: groupedSessions.get(activeDate) ?? [];

	const cards = (() => {
		if (!currentEvent) {
			return [];
		}

		const purchaseLink = `https://jkt48.com/purchase/exclusive?code=${currentEvent.code ?? ""}`;

		return visibleSessions.flatMap((session) => {
			const sessionLabel = stripSessionLabel(session.label);
			const timeInfo = session.startTime ? `${session.startTime.slice(0, 5)}-${session.endTime.slice(0, 5)}` : "";

			return session.filteredMembers.map((member) => {
				let metaHtml = member.label ?? "-";

				if (isSearchMode) {
					const dateShort = session.sessionDateWib
						? `${String(session.sessionDateWib.getUTCDate()).padStart(2, "0")}/${String(
								session.sessionDateWib.getUTCMonth() + 1,
						  ).padStart(2, "0")}`
						: session.date.length >= 10
							? `${session.date.slice(8, 10)}/${session.date.slice(5, 7)}`
							: "";
					const shortLabel = sessionLabel.replace("Session", "S.").replace("Sesi", "S.");
					const timeLine = timeInfo ? `<br>(${timeInfo})` : "";
					metaHtml = dateShort
						? `${dateShort} • ${shortLabel}${timeLine}<br>${member.label ?? "-"}`
						: `${shortLabel}${timeLine}<br>${member.label ?? "-"}`;
				}

				return buildCard({
					availableQuota: member.available_quota ?? 0,
					category: currentEvent.category,
					isBeforeDeadline: session.isBeforeDeadline,
					isEventClosed: closed,
					member,
					metaHtml,
					photoMap,
					purchaseLink,
					sessionKey: `${session.date}-${sessionLabel}-${session.startTime}`,
				});
			});
		});
	})();
	const allCardsClosed = cards.length > 0 && cards.every((card) => card.status === "closed");
	const ticketsLeftNotBuyable = closed || allCardsClosed;
	const remainingMetricTitle = ticketsLeftNotBuyable ? "Quota Remaining" : "Tickets Left";
	const remainingMetricDescription = ticketsLeftNotBuyable ? "Still listed in event data" : "Tickets you can still buy";
	const remainingMetricStatusLabel = ticketsLeftNotBuyable ? "not buyable" : "still open";
	const remainingMetricFooter = ticketsLeftNotBuyable ? "view-only signal" : "ready to buy";
 	const showSearchEmpty = isSearchMode && !cards.length;
 	const showAvailableOnlyEmpty = !isSearchMode && availableOnly && !cards.length;

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			setNowWib(getNowWib());
		}, 1000);

		return () => window.clearInterval(intervalId);
	}, []);

	function updateTheme(nextTheme: ThemeMode) {
		const resolvedTheme = resolveTheme(nextTheme);
		setTheme(resolvedTheme);
		document.documentElement.dataset.theme = resolvedTheme;
		window.localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
	}

	const pageError = membersError ?? codesError ?? eventsError;
	const detailError = detailSWR.error;
	const isLoading = membersLoading || codesLoading || eventsLoading;
	const hasStaleData = Boolean(
		membersResponse?.isStale || codesResponse?.isStale || detailSWR.data?.isStale || eventListStale,
	);
	const workerWaitingRoom = waitingRoomActive || hasStaleData || isWaitingRoomError(pageError) || isWaitingRoomError(detailError);
	const workerErrorMessage = workerWaitingRoom
		? `Showing the latest cached data${staleMinutesAgo ? ` (${staleMinutesAgo})` : ""}. The upstream queue is active.`
		: pageError
			? `Failed to load worker data. ${String(pageError.message)}`
			: detailError
				? `Unable to refresh live data. ${String(detailError.message)}`
				: null;
	const showGlobalWorkerBanner = Boolean(workerErrorMessage && !currentEvent);

	async function retryAll() {
		if (isRetrying) {
			return;
		}

		setIsRetrying(true);
		setWaitingRoomActive(false);
		try {
			await Promise.allSettled([mutateMembers(), mutateCodes(), mutateEvents(), mutateDetail()]);
		} finally {
			setIsRetrying(false);
		}
	}

	return (
		<main className="relative mx-auto w-full max-w-[1680px] px-3 py-4 text-[var(--text)] sm:px-5 sm:py-5 lg:px-8 lg:py-6 2xl:px-10">
			<header className="mb-5 border-b border-[color:var(--border)] pb-4 sm:mb-6 sm:pb-5">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 max-w-[58rem]">
						<h1 className="m-0 text-[2rem] font-extrabold tracking-[-0.04em] text-[var(--text)] sm:text-[2.4rem] lg:text-[3rem]">
							GLOBAL EXCLUSIVE MONITOR
						</h1>
						<p className="mt-2 max-w-[62ch] text-sm font-medium text-[var(--text-muted)] sm:text-[0.95rem] lg:text-base">
							Track which JKT48 exclusive sessions are still actionable without digging through queue-heavy upstream pages.
						</p>
					</div>
					<div className="flex justify-end sm:shrink-0">
						<div className="inline-flex scale-95 items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-elevated)]/80 p-1 shadow-[inset_0_1px_0_var(--highlight),0_10px_20px_rgba(49,31,86,0.08)] backdrop-blur-md sm:scale-100">
							<button
								aria-label="Switch to dark theme"
								aria-pressed={theme === "dark"}
								title="Dark theme"
								className={`inline-flex size-8 items-center justify-center rounded-full transition ${
									theme === "dark"
										? "bg-[var(--accent)] text-[var(--ribbon-available-text)] shadow-[0_6px_16px_rgba(49,31,86,0.16)]"
										: "text-[var(--text-faint)] hover:text-[var(--text)]"
								}`}
								onClick={() => updateTheme("dark")}
								type="button"
							>
								<svg
									aria-hidden="true"
									className={`${theme === "dark" ? "scale-105" : "scale-100"} size-4 transition-transform duration-200`}
									fill="none"
									viewBox="0 0 24 24"
								>
									<path
										d="M20.354 15.354A9 9 0 0 1 8.646 3.646a8.25 8.25 0 1 0 11.708 11.708Z"
										fill="currentColor"
									/>
								</svg>
							</button>
							<button
								aria-label="Switch to light theme"
								aria-pressed={theme === "light"}
								title="Light theme"
								className={`inline-flex size-8 items-center justify-center rounded-full transition ${
									theme === "light"
										? "bg-[var(--surface-strong)] text-[var(--accent-strong)] shadow-[0_6px_16px_rgba(49,31,86,0.12)]"
										: "text-[var(--text-faint)] hover:text-[var(--text)]"
								}`}
								onClick={() => updateTheme("light")}
								type="button"
							>
								<svg
									aria-hidden="true"
									className={`${theme === "light" ? "scale-105" : "scale-100"} size-4 transition-transform duration-200`}
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle cx="12" cy="12" fill="currentColor" r="4.25" />
									<path
										d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23 5.46 5.46"
										stroke="currentColor"
										strokeLinecap="round"
										strokeWidth="1.8"
									/>
								</svg>
							</button>
						</div>
					</div>
				</div>
				<div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm text-[var(--text-muted)]">
					<div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent)] sm:text-xs">
						<span className="size-2 rounded-full bg-[var(--accent)]" />
						Refreshes every 3s
					</div>
					{currentEvent && !workerWaitingRoom && !detailError ? (
						<div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-xs">
							<ClockIcon className="size-3.5 text-[var(--accent)]" />
							{lastUpdatedWib ? `${formatDate(lastUpdatedWib)} ${formatTime(lastUpdatedWib)} WIB` : "Waiting for sync"}
						</div>
					) : null}
				</div>
			</header>

			{showGlobalWorkerBanner ? (
				<div
					aria-live="polite"
					className={`mb-4 rounded-2xl p-4 text-sm ${
						workerWaitingRoom
							? "border border-[var(--warn)] bg-[color:var(--warn-soft)] text-[var(--warn-text)]"
							: "border border-[var(--sold)] bg-[color:var(--sold-soft)] text-[var(--sold-text)]"
					}`}
				>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							{workerWaitingRoom ? <AlertIcon className="mr-2 inline size-4 align-[-2px]" /> : null}
							{workerErrorMessage}
						</div>
						<button
							className="inline-flex min-h-11 items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition hover:opacity-85"
							onClick={retryAll}
							disabled={isRetrying}
							type="button"
						>
							{isRetrying ? "Refreshing..." : workerWaitingRoom ? "Retry now" : "Refresh now"}
						</button>
					</div>
				</div>
			) : null}

			{isLoading ? (
				<section className="mb-6 space-y-4">
					<div className="h-28 animate-pulse rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)]" />
					<div className="grid gap-4 md:grid-cols-3">
						<div className="h-24 animate-pulse rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]" />
						<div className="h-24 animate-pulse rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]" />
						<div className="h-24 animate-pulse rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]" />
					</div>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 sm:gap-4">
						{Array.from({ length: 6 }).map((_, index) => (
							<div
								className="h-64 animate-pulse rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]"
								key={index}
							/>
						))}
					</div>
				</section>
			) : null}

			{!isLoading && !categoryKeys.length && !pageError && !detailError ? (
				<div className="rounded-2xl border border-[var(--sold)] bg-[color:var(--sold-soft)] p-4 text-sm text-[var(--sold-text)]">
					<p className="m-0 font-semibold">No active exclusive events are available right now.</p>
					<p className="mb-0 mt-2 text-[var(--sold-text)]/90">Refresh the feed in a moment or switch back when the upstream schedule opens new drops.</p>
				</div>
			) : null}

			{categoryKeys.length ? (
				<>
					<section className="mb-6 grid gap-3 rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 backdrop-blur sm:gap-4 sm:p-4 md:grid-cols-2 xl:grid-cols-[1.05fr_2.25fr_1.15fr_auto]">
						<label className="flex min-w-0 flex-col gap-2 text-sm font-semibold sm:text-[0.95rem]">
							<span className="inline-flex items-center gap-2"><CategoryIcon className="size-4 text-[var(--accent)]" />Category</span>
							<select
								className="min-h-11 w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 py-2 pr-10 text-sm text-[var(--text)] outline-none sm:text-base"
								onChange={(event) => {
									setSelectedCategory(event.target.value);
									setSelectedEventLabel("");
									setSelectedDate("");
								}}
								value={activeCategory}
							>
								{categoryKeys.map((category) => (
									<option key={category} value={category}>
										{category}
									</option>
								))}
							</select>
						</label>

						<label className="flex min-w-0 flex-col gap-2 text-sm font-semibold sm:text-[0.95rem]">
							<span className="inline-flex items-center gap-2"><PinIcon className="size-4 text-[var(--sold)]" />Event</span>
							<select
								className="min-h-11 w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 py-2 pr-10 text-sm text-[var(--text)] outline-none sm:text-base"
								onChange={(event) => {
									setSelectedEventLabel(event.target.value);
									setSelectedDate("");
								}}
								value={activeEventOption?.label ?? ""}
							>
								{eventOptions.map((option) => (
									<option key={option.data.code} value={option.label}>
										{option.label}
									</option>
								))}
							</select>
						</label>

						<label className="flex min-w-0 flex-col gap-2 text-sm font-semibold sm:text-[0.95rem]">
							<span className="block truncate whitespace-nowrap"><span className="inline-flex items-center gap-2"><SearchIcon className="size-4 text-[var(--accent)]" />Search member...</span></span>
							<input
								className="min-h-11 w-full min-w-0 rounded-xl border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] sm:text-base"
								onChange={(event) => {
									setSearchQuery(event.target.value);
									setSelectedDate("");
								}}
								placeholder="Type member name..."
								value={searchQuery}
							/>
						</label>

						<label className="mt-1 flex min-h-11 min-w-0 items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-3 py-2.5 text-sm font-semibold sm:justify-self-end sm:text-[0.95rem] xl:min-w-[280px]">
							<div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-sm text-[var(--accent)]">
								<DotIcon className="size-2.5" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Available Only</div>
							<div className="truncate text-sm text-[var(--text)]">Hide unavailable members</div>
							</div>
							<span className="relative ml-auto inline-flex shrink-0 items-center">
								<input
									checked={availableOnly}
									className="peer sr-only"
									onChange={(event) => setAvailableOnly(event.target.checked)}
									type="checkbox"
								/>
								<span className="flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg-elevated)]">
									<span className={`transition-colors ${availableOnly ? "text-[var(--text-faint)]" : "text-[var(--accent)]"}`}>Off</span>
									<span className={`relative h-7 w-12 rounded-full border transition-colors ${
										availableOnly ? "border-[color:var(--accent-border)] bg-[color:var(--accent-soft)]" : "border-[color:var(--border)] bg-[color:var(--surface)]"
									}`}>
										<span
											className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-[var(--toggle-thumb)] shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-all duration-200 ${
												availableOnly ? "left-[1.45rem] bg-[var(--accent)]" : "left-1"
											}`}
										/>
									</span>
									<span className={`transition-colors ${availableOnly ? "text-[var(--accent)]" : "text-[var(--text-faint)]"}`}>On</span>
								</span>
							</span>
						</label>
					</section>

					{currentEvent ? (
						<>
							<section className="mb-4">
								<div className="min-w-0">
									<h2 className="text-2xl font-bold tracking-[-0.03em] text-[var(--text)] sm:text-[2rem]">{currentEvent.title ?? "Event"}</h2>
									<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)] sm:text-[0.95rem]">
										<span className="inline-flex items-center gap-2">
											<CategoryIcon className="size-4 text-[var(--accent)]" />
											{(currentEvent.category ?? "-").replaceAll("_", " ")}
										</span>
										<span className="inline-flex items-center gap-2">
											<TicketIcon className="size-4 text-[var(--sold)]" />
											IDR {(currentEvent.default_price ?? 0).toLocaleString("id-ID")}
										</span>
									</div>
								</div>
							</section>

							{workerWaitingRoom ? (
								<div aria-live="polite" className="mb-4 flex flex-col gap-3 rounded-2xl border border-[var(--warn)] bg-[color:var(--warn-soft)] p-4 text-sm text-[var(--warn-text)] sm:flex-row sm:items-center sm:justify-between">
									<div>
										<AlertIcon className="mr-2 inline size-4 align-[-2px]" />
										Showing the latest cached data{staleMinutesAgo ? ` (${staleMinutesAgo})` : ""}. The upstream queue is active.
									</div>
									<button
										className="inline-flex min-h-11 items-center justify-center rounded-full border border-current px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition hover:opacity-85"
										onClick={retryAll}
										disabled={isRetrying}
										type="button"
									>
										{isRetrying ? "Refreshing..." : "Retry now"}
									</button>
								</div>
							) : detailError ? (
								<div aria-live="polite" className="mb-4 rounded-2xl border border-[var(--sold)] bg-[color:var(--sold-soft)] p-4 text-sm text-[var(--sold-text)]">
									<p className="m-0 font-semibold">Unable to refresh live data.</p>
									<p className="mb-0 mt-2 text-[var(--sold-text)]/90">The last successful snapshot is still visible below. Retry when the upstream feed stabilizes.</p>
								</div>
							) : null}

							{availableOnly && cards.length ? (
								<div className="mb-4 rounded-2xl border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] p-4 text-sm text-[var(--accent-text)]">
									Showing only members with tickets still available.
								</div>
							) : null}

							{isSearchMode && cards.length ? (
								<div className="mb-4 rounded-2xl border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] p-4 text-sm text-[var(--accent-text)]">
									<SearchIcon className="mr-2 inline size-4 align-[-2px]" />Showing <strong>{searchQuery.trim().toUpperCase()}</strong> across all dates.
								</div>
							) : null}

							{!isSearchMode && dateKeys.length ? (
								<section className="mb-4">
									<div className="mb-3 text-sm font-semibold text-[var(--text-muted)] inline-flex items-center gap-2">
										<CalendarIcon className="size-4" />
										<span>Date: {dateKeys.length === 1 ? dateKeys[0] : "Choose a schedule"}</span>
									</div>
									{dateKeys.length > 1 ? (
										<div className="flex flex-wrap gap-2">
											{dateKeys.map((dateKey) => (
												<button
													className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--surface-soft)] ${
														dateKey === activeDate
															? "border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-[var(--accent-text)]"
															: "border-[color:var(--border)] bg-[color:var(--surface)] text-[var(--text-muted)]"
													}`}
													key={dateKey}
													onClick={() => setSelectedDate(dateKey)}
													type="button"
												>
													{dateKey}
												</button>
											))}
										</div>
									) : null}
								</section>
							) : null}

							{!cards.length ? (
								<div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4 text-sm text-[var(--text-muted)]">
									{showSearchEmpty ? (
										<>
											<p className="m-0 font-semibold text-[var(--text)]">No schedules matched &quot;{searchQuery.trim()}&quot;.</p>
											<p className="mb-0 mt-2">Try a shorter member name or clear the search to return to the full event view.</p>
											<button
												className="mt-3 inline-flex min-h-10 items-center rounded-full border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-[color:var(--surface)]"
												onClick={() => setSearchQuery("")}
												type="button"
											>
												Clear search
											</button>
										</>
									) : showAvailableOnlyEmpty ? (
										<>
											<p className="m-0 font-semibold text-[var(--text)]">No tickets are currently buyable for this filter.</p>
											<p className="mb-0 mt-2">Turn off Available Only or switch to another date to keep monitoring this event.</p>
											<button
												className="mt-3 inline-flex min-h-10 items-center rounded-full border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-[color:var(--surface)]"
												onClick={() => setAvailableOnly(false)}
												type="button"
											>
												Show all members
											</button>
										</>
									) : (
										<>
											<p className="m-0 font-semibold text-[var(--text)]">No active sessions are visible right now.</p>
											<p className="mb-0 mt-2">Try another date, switch events, or refresh to check whether the upstream feed has changed.</p>
										</>
									)}
								</div>
							) : (
								<div id="laporan-container">
									<div className="share-banner" id="share-banner">
										<div>
											<h3 className="m-0 text-sm font-extrabold text-[var(--accent-text)]">{(currentEvent.title ?? "JKT48 Exclusive Event").toUpperCase()}</h3>
											<p className="m-0 text-[11px] font-semibold text-[var(--accent-text)] opacity-90 inline-flex items-center gap-1.5">
												{isSearchMode ? <SearchIcon className="size-3.5" /> : <CalendarIcon className="size-3.5" />}
												<span>{isSearchMode ? searchQuery.trim().toUpperCase() : activeDate}</span>
											</p>
										</div>
										<div className="text-right text-[var(--accent-text)]">
											<div className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--share-chip-border)] bg-[color:var(--share-chip-bg)] px-2.5 py-1 text-[11px] font-bold">
												<ClockIcon className="size-3.5" />
												<span>{lastUpdatedWib ? `${formatDate(lastUpdatedWib)} ${formatTime(lastUpdatedWib)} WIB` : `${formatDate(nowWib)} ${formatTime(nowWib)} WIB`}</span>
											</div>
											<div className="mt-1 text-[9px] font-bold tracking-[0.5px] text-[var(--accent-text)] opacity-80">LIVE TRACKER BY @ESTRELLAWIN19</div>
										</div>
									</div>

									{visibleSessions.map((session) => {
										const sessionLabel = stripSessionLabel(session.label);
										const timeInfo = session.startTime ? ` | ${session.startTime.slice(0, 5)} - ${session.endTime.slice(0, 5)}` : "";
										const sessionCards = cards.filter((card) =>
											card.id.startsWith(`${session.date}-${sessionLabel}-${session.startTime}`),
										);

										return (
											<section className="mb-6 first:mt-0 sm:mb-7" key={`${sessionLabel}-${session.startTime}`}>
												{!isSearchMode ? (
													<h3 className="mb-3 mt-1 text-sm font-semibold text-[var(--text)] sm:mb-4 sm:text-base lg:text-lg">
														{sessionLabel}
														<span className="ml-1 text-[11px] font-medium text-[var(--text-faint)] sm:text-[13px]">{timeInfo}</span>
													</h3>
												) : null}
												<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 sm:gap-4">
													{sessionCards.map((card) => (
														<MemberCard card={card} key={card.id} />
													))}
												</div>
											</section>
										);
									})}
								</div>
							)}

							<section className="mt-6 grid gap-3 border-t border-[color:var(--border)] pt-4 md:grid-cols-3 sm:gap-4 sm:pt-5">
								<div className="rounded-[1.6rem] border border-[color:var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-elevated))] p-4 shadow-[inset_0_1px_0_var(--highlight)]">
									<div className="flex items-start justify-between gap-3">
										<div>
											<div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-faint)]">Total Tickets</div>
											<div className="mt-1 text-xs text-[var(--text-muted)]">All tickets for this event</div>
										</div>
										<div className="text-[var(--sold)]"><TicketIcon className="size-4" /></div>
									</div>
									<div className="mt-5 flex items-end justify-between gap-3">
										<div className="text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-[var(--text)] tabular-nums sm:text-[2.3rem]">
											{metrics.totalTickets.toLocaleString("id-ID")}
										</div>
										<div className="pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-faint)]">Event total</div>
									</div>
									<div className="mt-4 flex items-center gap-3">
										<div className="h-px flex-1 bg-[var(--sold)]" />
										<div className="text-[10px] font-medium text-[var(--text-faint)]">all sessions</div>
									</div>
								</div>
								<div className="rounded-[1.6rem] border border-[color:var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-elevated))] p-4 shadow-[inset_0_1px_0_var(--highlight)]">
									<div className="flex items-start justify-between gap-3">
										<div>
											<div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-faint)]">{remainingMetricTitle}</div>
											<div className="mt-1 text-xs text-[var(--text-muted)]">
												{remainingMetricDescription}
											</div>
										</div>
										<div className={ticketsLeftNotBuyable ? "text-[var(--closed)]" : "text-[var(--available)]"}>
											<BoxIcon className="size-4" />
										</div>
									</div>
									<div className="mt-5 flex items-end justify-between gap-3">
										<div className="text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-[var(--text)] tabular-nums sm:text-[2.3rem]">
											{metrics.remaining.toLocaleString("id-ID")}
										</div>
										<div
											className={`pb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
												ticketsLeftNotBuyable ? "text-[var(--closed)]" : "text-[var(--available)]"
											}`}
										>
											{remainingMetricStatusLabel}
										</div>
									</div>
									<div className="mt-4 flex items-center gap-3">
										<div className={`h-px flex-1 ${ticketsLeftNotBuyable ? "bg-[var(--closed)]" : "bg-[var(--available)]"}`} />
										<div className="text-[10px] font-medium text-[var(--text-faint)]">
											{remainingMetricFooter}
										</div>
									</div>
								</div>
								<div className="rounded-[1.6rem] border border-[color:var(--border)] bg-[linear-gradient(180deg,var(--surface),var(--surface-elevated))] p-4 shadow-[inset_0_1px_0_var(--highlight)]">
									<div className="flex items-start justify-between gap-3">
										<div>
											<div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-faint)]">Sold Rate</div>
											<div className="mt-1 text-xs text-[var(--text-muted)]">How many tickets are sold</div>
										</div>
										<div className="text-[var(--warn)]"><FlameIcon className="size-4" /></div>
									</div>
									<div className="mt-5 flex items-end justify-between gap-3">
										<div className="text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-[var(--text)] tabular-nums sm:text-[2.3rem]">
											{metrics.soldRate.toFixed(1)}%
										</div>
										<div className="pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--warn)]">already sold</div>
									</div>
									<div className="mt-4 flex items-center gap-3">
										<div className="h-px flex-1 bg-[var(--warn)]" />
										<div className="text-[10px] font-medium text-[var(--text-faint)]">tickets not sold yet</div>
									</div>
								</div>
							</section>

							<footer className="mt-6 flex flex-col gap-3 border-t border-[color:var(--border)] pt-4 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
								<div className="flex flex-wrap items-center gap-3">
									<span>
										Built by{" "}
										<a
											className="font-semibold text-[var(--accent)] hover:underline"
											href="https://x.com/estrellawin19"
											rel="noreferrer"
											target="_blank"
										>
											@estrellawin19
										</a>
									</span>
									<a
										className="inline-flex items-center gap-2 text-[var(--accent-text)] no-underline transition hover:text-[var(--support)]"
										href="https://tako.id/Sportagame19Win"
										rel="noreferrer"
										target="_blank"
									>
										<SupportIcon className="size-4 text-[var(--support)]" />
										Support via Tako
									</a>
								</div>
								<span className="text-xs uppercase tracking-[0.16em] text-[var(--text-faint)]">
									Fast scan surface for live exclusive drops
								</span>
							</footer>
						</>
					) : null}
				</>
			) : null}
		</main>
	);
}
