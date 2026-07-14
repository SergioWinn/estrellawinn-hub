"use client";

export type CardStatus = "avail" | "warn" | "sold" | "closed";

export interface MemberCardViewModel {
	id: string;
	sessionKey: string;
	memberName: string;
	metaHtml: string;
	photoUrl: string;
	purchaseLink: string;
	status: CardStatus;
	badgeLabel: string | null;
	badgeClassName: string;
	buttonLabel: string;
	progressPercent: number;
	soldCount: number;
	progressColor: string;
	clickable: boolean;
}

interface MemberCardProps {
	card: MemberCardViewModel;
}

const statusClasses: Record<CardStatus, string> = {
	avail:
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] border-b-[5px] border-b-[var(--available)] bg-[var(--card-top)] px-3 py-4 text-center shadow-[inset_0_1px_0_var(--highlight)] transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] sm:px-4 sm:py-5 lg:px-3 lg:py-4 hover:-translate-y-1",
	warn:
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] border-b-[5px] border-b-[var(--warn)] bg-[var(--card-top)] px-3 py-4 text-center shadow-[inset_0_1px_0_var(--highlight)] transition-transform duration-[var(--dur-short)] ease-[var(--ease-out)] sm:px-4 sm:py-5 lg:px-3 lg:py-4 hover:-translate-y-1",
	sold:
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] border-b-[5px] border-b-[var(--sold)] bg-[var(--card-top-muted)] px-3 py-4 text-center opacity-90 shadow-[inset_0_1px_0_var(--highlight)] sm:px-4 sm:py-5 lg:px-3 lg:py-4",
	closed:
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border)] border-b-[5px] border-b-[var(--closed)] bg-[var(--closed-soft)] px-3 py-4 text-center opacity-85 shadow-[inset_0_1px_0_var(--highlight)] sm:px-4 sm:py-5 lg:px-3 lg:py-4",
};

export function MemberCard({ card }: MemberCardProps) {
	const isInactive = card.status === "sold" || card.status === "closed";
	const isClosed = card.status === "closed";
	const hasMetaBreak = /<br\s*\/?>/i.test(card.metaHtml);
	const ribbonClassName =
		card.badgeClassName === "member-card-badge-warn"
			? "bg-[var(--ribbon-warn-bg)] text-[var(--ribbon-warn-text)]"
			: "bg-[var(--ribbon-available-bg)] text-[var(--ribbon-available-text)]";

	const content = (
		<>
			{card.badgeLabel ? (
				<div
					className={`pointer-events-none absolute -right-9 top-3 z-10 w-26 rotate-45 select-none py-1 text-center text-xs font-extrabold uppercase tracking-[0.16em] shadow-[var(--shadow-detail)] sm:-right-8 lg:-right-9 lg:top-2 ${ribbonClassName}`}
				>
					{card.badgeLabel}
				</div>
			) : null}
			<div className="mb-3 w-full pt-1 text-center sm:mb-4 lg:mb-2">
				<div
					className={hasMetaBreak
						? "w-full text-xs font-semibold uppercase leading-[1.35] tracking-[0.16em] text-[var(--text-muted)]"
						: "w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]"}
					dangerouslySetInnerHTML={{ __html: card.metaHtml }}
					title={card.metaHtml.replace(/<br\s*\/?>/gi, " ").replace(/&nbsp;/g, " ")}
				/>
			</div>
			<div className="relative mb-3 size-16 overflow-hidden rounded-full border-2 border-[color:var(--photo-border)] bg-[var(--photo-bg)] shadow-[var(--shadow-detail)] sm:mb-4 sm:size-18 lg:mb-2 lg:size-16">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					alt={`${card.memberName} JKT48 photo`}
					className={`block size-full object-cover object-[center_5%] ${
						card.status === "closed"
							? "grayscale contrast-90"
							: card.status === "sold"
								? "saturate-50"
								: ""
					}`}
					height={74}
					loading="lazy"
					src={card.photoUrl}
					width={74}
				/>
				{isInactive ? (
					<div className={`absolute inset-0 ${isClosed ? "bg-[var(--overlay-closed)]" : "bg-[var(--overlay-sold)]"}`} />
				) : null}
			</div>
			<div className="mb-2 line-clamp-2 min-h-10 w-full text-base font-bold leading-tight text-[var(--text)] sm:mb-3 lg:mb-2 lg:min-h-9 lg:text-sm">
				{card.memberName}
			</div>
			<div className="mt-auto w-full">
				<div className="mb-2 flex w-full justify-center px-1 text-xs font-medium text-[var(--text-muted)] lg:mb-1">
					<span>
						Sold:&nbsp;
						<b className={card.status === "avail" || card.status === "warn" ? "font-extrabold text-[var(--accent-readable)]" : "font-extrabold text-[var(--text)]"}>
							{card.soldCount}
						</b>
					</span>
				</div>
				{card.clickable ? (
					<a
						aria-label={card.buttonLabel.replace(/&nbsp;/g, " ")}
						className="relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-xl border border-[color:var(--border)] bg-[var(--card-progress-bg)] no-underline shadow-[inset_0_0_0_1px_var(--highlight)] transition-transform duration-[var(--dur-micro)] ease-[var(--ease-out)] hover:-translate-y-px focus-visible:outline-[var(--color-focus)] active:translate-y-px"
						href={card.purchaseLink}
						rel="noreferrer"
						target="_blank"
					>
						<div
							className={`absolute inset-0 origin-left transition-transform duration-[var(--dur-long)] ease-[var(--ease-out)] ${isInactive ? "rounded-xl" : "rounded-l-xl"}`}
							style={{
								backgroundColor: card.progressColor,
								transform: `scaleX(${card.progressPercent / 100})`,
							}}
						/>
						<div
							className="relative z-10 inline-flex min-h-7 min-w-0 items-center justify-center rounded-full bg-[var(--color-paper)] px-2 text-xs font-extrabold tracking-[0.12em] text-[var(--color-ink)]"
							dangerouslySetInnerHTML={{ __html: card.buttonLabel }}
						/>
					</a>
				) : (
					<div
						aria-label={card.buttonLabel.replace(/&nbsp;/g, " ")}
						className="relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-xl border border-[color:var(--border)] bg-[var(--card-progress-bg)] shadow-[inset_0_0_0_1px_var(--highlight)] lg:min-h-10"
						role="img"
					>
						<div
							className={`absolute inset-0 origin-left ${isInactive ? "rounded-xl" : "rounded-l-xl"}`}
							style={{
								backgroundColor: card.progressColor,
								transform: `scaleX(${card.progressPercent / 100})`,
							}}
						/>
						<div
							className="relative z-10 inline-flex min-h-7 min-w-0 items-center justify-center rounded-full bg-[var(--color-paper)] px-2 text-xs font-extrabold tracking-[0.12em] text-[var(--color-ink)]"
							dangerouslySetInnerHTML={{ __html: card.buttonLabel }}
						/>
					</div>
				)}
			</div>
		</>
	);

	return <article className={statusClasses[card.status]}>{content}</article>;
}
