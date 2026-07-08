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
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[1.15rem] border border-white/12 border-b-[5px] border-b-emerald-500 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.68))] px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-transform duration-200 sm:px-4 sm:py-5 lg:px-3.5 lg:py-4 supports-[hover:hover]:hover:-translate-y-1 supports-[hover:hover]:hover:border-white/20 supports-[hover:hover]:hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)]",
	warn:
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[1.15rem] border border-white/12 border-b-[5px] border-b-amber-400 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.72))] px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-transform duration-200 animate-[card-glow_2s_ease-in-out_infinite] sm:px-4 sm:py-5 lg:px-3.5 lg:py-4 supports-[hover:hover]:hover:-translate-y-1 supports-[hover:hover]:hover:border-white/20 supports-[hover:hover]:hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)]",
	sold:
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[1.15rem] border border-white/12 border-b-[5px] border-b-rose-500 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(15,23,42,0.62))] px-3 py-4 text-center opacity-90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-transform duration-200 sm:px-4 sm:py-5 lg:px-3.5 lg:py-4 supports-[hover:hover]:hover:-translate-y-1 supports-[hover:hover]:hover:border-white/20 supports-[hover:hover]:hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)]",
	closed:
		"relative flex min-h-full flex-col items-center overflow-hidden rounded-[1.15rem] border border-white/12 border-b-[5px] border-b-slate-500 bg-[linear-gradient(180deg,rgba(51,65,85,0.34),rgba(30,41,59,0.22))] px-3 py-4 text-center opacity-85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-transform duration-200 sm:px-4 sm:py-5 lg:px-3.5 lg:py-4 supports-[hover:hover]:hover:-translate-y-1 supports-[hover:hover]:hover:border-white/20 supports-[hover:hover]:hover:shadow-[0_18px_36px_rgba(0,0,0,0.28)]",
};

export function MemberCard({ card }: MemberCardProps) {
	const isInactive = card.status === "sold" || card.status === "closed";
	const isClosed = card.status === "closed";

	const content = (
		<>
			<div className="mb-3 flex w-full min-w-0 items-start justify-between gap-2 sm:mb-4 lg:mb-3">
				<div
					className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60 sm:text-[11px] lg:text-[11px]"
					dangerouslySetInnerHTML={{ __html: card.metaHtml }}
					title={card.metaHtml.replace(/<br\s*\/?>/gi, " ").replace(/&nbsp;/g, " ")}
				/>
				{card.badgeLabel ? (
					<div
						className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-extrabold tracking-[0.12em] shadow-[0_2px_5px_rgba(0,0,0,0.12)] lg:px-2 lg:text-[8px] ${
							card.badgeClassName === "member-card-badge-warn"
								? "bg-amber-400 text-slate-950"
								: "bg-emerald-500 text-white"
						}`}
					>
						{card.badgeLabel}
					</div>
				) : null}
			</div>
			<div className="relative mb-3 size-16 overflow-hidden rounded-full border-2 border-white/15 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.15)] sm:mb-4 sm:size-[4.5rem] lg:mb-3 lg:size-[4.15rem]">
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
					<div className={`absolute inset-0 ${isClosed ? "bg-slate-900/45" : "bg-white/30"}`} />
				) : null}
			</div>
			<div className="mb-2 line-clamp-2 min-h-[2.55rem] w-full text-sm font-bold leading-tight text-white sm:mb-3 sm:text-base lg:mb-2 lg:min-h-[2.35rem] lg:text-[0.95rem]">
				{card.memberName}
			</div>
			<div className="mt-auto w-full">
				<div className="mb-2 flex w-full justify-center px-1 text-[11px] font-medium text-white/85 sm:text-xs lg:mb-1.5 lg:text-[11px]">
					<span>
						Sold:&nbsp;
						<b className={card.status === "avail" || card.status === "warn" ? "font-extrabold text-sky-300" : "font-extrabold text-white"}>
							{card.soldCount}
						</b>
					</span>
				</div>
				<div
					aria-label={card.buttonLabel.replace(/&nbsp;/g, " ")}
					className="relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-[#34363b] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] lg:min-h-10"
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
						className="relative z-10 flex min-h-11 w-full min-w-0 items-center justify-center px-2 text-[11px] font-extrabold tracking-[0.12em] text-white text-shadow-[0_1px_3px_rgba(0,0,0,0.5)] sm:text-xs lg:min-h-10 lg:text-[11px]"
						dangerouslySetInnerHTML={{ __html: card.buttonLabel }}
					/>
				</div>
			</div>
		</>
	);

	if (!card.clickable) {
		return <article className={statusClasses[card.status]}>{content}</article>;
	}

	return (
		<article className={statusClasses[card.status]}>
			<a
				className="flex h-full w-full flex-col items-center text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
				href={card.purchaseLink}
				rel="noreferrer"
				target="_blank"
			>
				{content}
			</a>
		</article>
	);
}
