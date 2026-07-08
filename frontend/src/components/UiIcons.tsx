interface IconProps {
	className?: string;
}

export function CategoryIcon({ className = "size-4" }: IconProps) {
	return (
		<svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
			<circle cx="12" cy="12" fill="currentColor" opacity="0.14" r="9" />
			<circle cx="12" cy="12" r="5.25" stroke="currentColor" strokeWidth="1.8" />
			<circle cx="12" cy="12" fill="currentColor" r="1.6" />
		</svg>
	);
}

export function PinIcon({ className = "size-4" }: IconProps) {
	return (
		<svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
			<path d="m14.88 3.72 5.4 5.4-2.13 2.13-1.2-.3-2.67 2.67 3 4.8-1.2 1.2-4.8-3-4.23 4.23-1.62-1.62 4.23-4.23-3-4.8 1.2-1.2 4.8 3 2.67-2.67-.3-1.2 2.13-2.13Z" />
		</svg>
	);
}

export function SearchIcon({ className = "size-4" }: IconProps) {
	return (
		<svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
			<circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
			<path d="m16 16 4.25 4.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
		</svg>
	);
}

export function DotIcon({ className = "size-3" }: IconProps) {
	return <span aria-hidden="true" className={`inline-block rounded-full bg-current ${className}`} />;
}

export function RefreshIcon({ className = "size-4" }: IconProps) {
	return (
		<svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
			<path d="M19 7v4h-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
			<path d="M5 17v-4h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
			<path d="M7.5 9A7 7 0 0 1 19 11m-14 2a7 7 0 0 0 11.5 2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
		</svg>
	);
}

export function TicketIcon({ className = "size-4" }: IconProps) {
	return (
		<svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
			<path d="M4 8.25A2.25 2.25 0 0 1 6.25 6h11.5A2.25 2.25 0 0 1 20 8.25v2.1a2.35 2.35 0 0 0 0 3.3v2.1A2.25 2.25 0 0 1 17.75 18H6.25A2.25 2.25 0 0 1 4 15.75v-2.1a2.35 2.35 0 0 0 0-3.3v-2.1Z" />
		</svg>
	);
}

export function BoxIcon({ className = "size-4" }: IconProps) {
	return (
		<svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
			<path d="M12 3.75 19 7.5 12 11.25 5 7.5 12 3.75Z" fill="currentColor" opacity="0.7" />
			<path d="M5 7.5v9l7 3.75 7-3.75v-9" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
			<path d="M12 11.25v9" stroke="currentColor" strokeWidth="1.8" />
		</svg>
	);
}

export function FlameIcon({ className = "size-4" }: IconProps) {
	return (
		<svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
			<path d="M12.75 2.5c.32 2.28-.65 3.94-1.86 5.54-1.04 1.37-1.94 2.58-1.94 4.33a3.55 3.55 0 1 0 7.1 0c0-1.26-.5-2.26-1.54-3.64-.83 1.96-2.07 2.81-3.3 3.38.19-2.22 1.41-3.8 2.72-5.47 1.16-1.49 2.36-3.03 2.67-5.14 2.54 1.8 4.3 5.06 4.3 8.85A8.9 8.9 0 1 1 3.1 13.4c0-2.7 1.1-5.03 2.7-6.78.12 2.27 1.22 3.46 2.54 4.7.23-3.72 1.99-6.89 4.4-8.82Z" />
		</svg>
	);
}

export function CalendarIcon({ className = "size-4" }: IconProps) {
	return (
		<svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
			<rect fill="currentColor" height="4" opacity="0.16" rx="2" width="16" x="4" y="6" />
			<rect height="14" rx="3" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="6" />
			<path d="M8 3.75v4.5M16 3.75v4.5M4 10.5h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
		</svg>
	);
}

export function ClockIcon({ className = "size-4" }: IconProps) {
	return (
		<svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
			<circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
			<path d="M12 7.75v4.75l3.25 1.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
		</svg>
	);
}

export function AlertIcon({ className = "size-4" }: IconProps) {
	return (
		<svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
			<path d="M12 4.5 20.25 19H3.75L12 4.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
			<path d="M12 9v4.75" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
			<circle cx="12" cy="16.5" fill="currentColor" r="1" />
		</svg>
	);
}

export function SupportIcon({ className = "size-4" }: IconProps) {
	return (
		<svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
			<path d="M12 20.25s-6.75-4.21-6.75-9.14a4.11 4.11 0 0 1 7-2.9 4.11 4.11 0 0 1 7 2.9c0 4.93-6.75 9.14-6.75 9.14Z" fill="currentColor" opacity="0.85" />
		</svg>
	);
}
