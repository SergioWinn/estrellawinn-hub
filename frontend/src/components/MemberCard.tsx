"use client";

export type CardStatus = "avail" | "warn" | "sold" | "closed";

export interface MemberCardViewModel {
	id: string;
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
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[1.15rem] border border-[color:var(--border)] border-b-[5px] border-b-[var(--available)] bg-[linear-gradient(180deg,var(--card-top),var(--card-bottom))] px-3 py-4 text-center shadow-[inset_0_1px_0_var(--highlight)] transition-transform duration-200 sm:px-4 sm:py-5 lg:px-3 lg:py-3.5 hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow)]",
	warn:
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[1.15rem] border border-[color:var(--border)] border-b-[5px] border-b-[var(--warn)] bg-[linear-gradient(180deg,var(--card-top),var(--card-bottom))] px-3 py-4 text-center shadow-[inset_0_1px_0_var(--highlight)] transition-transform duration-200 animate-[card-glow_2s_ease-in-out_infinite] sm:px-4 sm:py-5 lg:px-3 lg:py-3.5 hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow)]",
	sold:
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[1.15rem] border border-[color:var(--border)] border-b-[5px] border-b-[var(--sold)] bg-[linear-gradient(180deg,var(--card-top-muted),var(--card-bottom-muted))] px-3 py-4 text-center opacity-90 shadow-[inset_0_1px_0_var(--highlight)] transition-transform duration-200 sm:px-4 sm:py-5 lg:px-3 lg:py-3.5 hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow)]",
	closed:
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[1.15rem] border border-[color:var(--border)] border-b-[5px] border-b-[var(--closed)] bg-[linear-gradient(180deg,var(--closed-soft),var(--card-bottom-muted))] px-3 py-4 text-center opacity-85 shadow-[inset_0_1px_0_var(--highlight)] transition-transform duration-200 sm:px-4 sm:py-5 lg:px-3 lg:py-3.5 hover:-translate-y-1 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow)]",
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
					className={`pointer-events-none absolute -right-9 top-3 z-10 w-[6.4rem] rotate-45 select-none py-[3px] text-center text-[7px] font-extrabold uppercase tracking-[0.16em] shadow-[0_8px_18px_rgba(0,0,0,0.18)] sm:-right-8 sm:w-[6.3rem] lg:-right-9 lg:top-2.5 lg:w-[6.15rem] ${ribbonClassName}`}
				>
					{card.badgeLabel}
				</div>
			) : null}
			<div className="mb-3 w-full pt-1 text-center sm:mb-4 lg:mb-2.5">
				<div
					className={hasMetaBreak
						? "w-full text-[10px] font-semibold uppercase leading-[1.35] tracking-[0.16em] text-[var(--text-muted)] sm:text-[11px] lg:text-[10px]"
						: "w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)] sm:text-[11px] lg:text-[10px]"}
					dangerouslySetInnerHTML={{ __html: card.metaHtml }}
					title={card.metaHtml.replace(/<br\s*\/?>/gi, " ").replace(/&nbsp;/g, " ")}
				/>
			</div>
			<div className="relative mb-3 size-16 overflow-hidden rounded-full border-2 border-[color:var(--photo-border)] bg-[var(--photo-bg)] shadow-[0_4px_10px_rgba(0,0,0,0.15)] sm:mb-4 sm:size-[4.5rem] lg:mb-2.5 lg:size-[3.85rem]">
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
			<div className="mb-2 line-clamp-2 min-h-[2.55rem] w-full text-sm font-bold leading-tight text-[var(--text)] sm:mb-3 sm:text-base lg:mb-1.5 lg:min-h-[2.2rem] lg:text-[0.92rem]">
				{card.memberName}
			</div>
			<div className="mt-auto w-full">
				<div className="mb-2 flex w-full justify-center px-1 text-[11px] font-medium text-[var(--text-muted)] sm:text-xs lg:mb-1 lg:text-[10px]">
					<span>
						Sold:&nbsp;
						<b className={card.status === "avail" || card.status === "warn" ? "font-extrabold text-[var(--accent)]" : "font-extrabold text-[var(--text)]"}>
							{card.soldCount}
						</b>
					</span>
				</div>
				{card.clickable ? (
					<a
						aria-label={card.buttonLabel.replace(/&nbsp;/g, " ")}
						className="relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-xl border border-[color:var(--border)] bg-[var(--card-progress-bg)] no-underline shadow-[inset_0_0_0_1px_var(--highlight)] transition hover:border-[color:var(--border-strong)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)] lg:min-h-10"
						href={card.purchaseLink}
						rel="noreferrer"
						target="_blank"
					>
						<div
							className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${isInactive ? "rounded-xl" : "rounded-l-xl"}`}
							style={{
								backgroundColor: card.progressColor,
								width: `${card.progressPercent}%`,
							}}
						/>
						<div
							className="relative z-10 flex min-h-11 w-full min-w-0 items-center justify-center px-2 text-[11px] font-extrabold tracking-[0.12em] text-[var(--accent-text)] text-shadow-[0_1px_3px_rgba(0,0,0,0.5)] sm:text-xs lg:min-h-10 lg:text-[10px]"
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
							className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${isInactive ? "rounded-xl" : "rounded-l-xl"}`}
							style={{
								backgroundColor: card.progressColor,
								width: `${card.progressPercent}%`,
							}}
						/>
						<div
							className="relative z-10 flex min-h-11 w-full min-w-0 items-center justify-center px-2 text-[11px] font-extrabold tracking-[0.12em] text-[var(--accent-text)] text-shadow-[0_1px_3px_rgba(0,0,0,0.5)] sm:text-xs lg:min-h-10 lg:text-[10px]"
							dangerouslySetInnerHTML={{ __html: card.buttonLabel }}
						/>
					</div>
				)}
			</div>
		</>
	);

	return <article className={statusClasses[card.status]}>{content}</article>;
}
