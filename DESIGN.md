---
name: GLOBAL EXCLUSIVE MONITOR
description: Live tracker for JKT48 exclusive event availability
colors:
  signal-lilac: "#c2adff"
  signal-lilac-strong: "#ddd0ff"
  night-plum: "#16101f"
  night-plum-elevated: "#231732"
  dawn-paper: "#f7f2ff"
  dawn-plum: "#35274a"
  support-rose: "#cd538e"
  availability-mint: "#5fd1a5"
  queue-amber: "#e0ba72"
  sold-rose: "#d66379"
  offline-mauve: "#8e84a9"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "3.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.16em"
rounded:
  card: "18px"
  panel: "28px"
  field: "12px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  theme-toggle:
    backgroundColor: "{colors.night-plum-elevated}"
    textColor: "{colors.dawn-paper}"
    rounded: "{rounded.pill}"
    padding: "4px"
  button-support:
    backgroundColor: "{colors.support-rose}"
    textColor: "{colors.dawn-paper}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  chip-filter-active:
    backgroundColor: "{colors.signal-lilac}"
    textColor: "{colors.dawn-plum}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  chip-filter-idle:
    backgroundColor: "{colors.night-plum-elevated}"
    textColor: "{colors.dawn-paper}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  field-search:
    backgroundColor: "{colors.night-plum-elevated}"
    textColor: "{colors.dawn-paper}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
  card-member:
    backgroundColor: "{colors.night-plum-elevated}"
    textColor: "{colors.dawn-paper}"
    rounded: "{rounded.card}"
    padding: "16px 12px"
---

# Design System: GLOBAL EXCLUSIVE MONITOR

## 1. Overview

**Creative North Star: "Night Signal Board"**

This system is a dark-first monitoring board for people checking volatile availability under time pressure. The interface should feel like a signal surface that has already filtered the noise: fast to scan, firm in contrast, and precise about which states are actionable, stale, queued, sold, or closed. The light theme is a true inverse of the same product, not a second identity.

The personality is controlled rather than ornamental. Lilac, mint, amber, rose, and mauve behave like operational indicators inside a disciplined frame. Dense data is welcome when it improves decision speed. Decorative drift is not. The system explicitly rejects speculative-finance theatrics, fandom scrapbook softness, and enterprise gray bureaucracy.

**Key Characteristics:**
- Dark-first monitoring surface with a crisp light-mode inverse.
- Saturated state colors used as signal lights, not broad decoration.
- Rounded controls and tiles with disciplined spacing and strong touch targets.
- Dense but readable layouts built for repeated scanning on mobile and desktop.
- Resilient product states for loading, waiting room, stale data, and empty results.

## 2. Colors

The palette acts like a bank of monitored signals. Identity stays concentrated in lilac, support gets a single rose voice, and availability states keep fixed semantic meanings across both themes.

### Primary
- **Signal Lilac** (`#c2adff`): the main identity and selection color in dark mode. Use for active chips, focus rings, active toggles, links, and live-state badges.
- **Signal Lilac Strong** (`#ddd0ff`): the brighter companion for higher-emphasis surfaces or lighter contexts where the base lilac would lose authority.

### Secondary
- **Support Rose** (`#cd538e`): reserved for the support CTA and nothing else. Its restraint keeps the action distinct.

### Operational States
- **Availability Mint** (`#5fd1a5`): tickets still open and actionable.
- **Queue Amber** (`#e0ba72`): queue pressure, waiting room, or low-stock urgency.
- **Sold Rose** (`#d66379`): sold out and hard failure states.
- **Offline Mauve** (`#8e84a9`): closed, expired, or no-longer-actionable states.

### Neutrals
- **Night Plum** (`#16101f`): primary dark canvas.
- **Night Plum Elevated** (`#231732`): lifted dark surfaces, controls, and grouped panels.
- **Dawn Paper** (`#f7f2ff`): light-theme canvas and high-contrast text on dark surfaces.
- **Dawn Plum** (`#35274a`): light-theme ink and the authoritative text color on pale lilac surfaces.

### Named Rules
**The Signal Light Rule.** Saturated colors exist to communicate state, selection, and action readiness. They do not become wallpaper.

**The State Consistency Rule.** Mint, amber, rose, and mauve keep the same semantic meaning in every component, alert, and metric.

## 3. Typography

**Display Font:** system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif  
**Body Font:** system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif  
**Label Font:** system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif

One family does all the work. The voice is bold, compact, and operational, using weight, tracking, and spacing shifts instead of decorative type pairing.

### Hierarchy
- **Display** (800, `3.25rem`, `1`, `-0.04em`): product title and the largest page anchor.
- **Headline** (700, `2rem`, `1.1`, `-0.03em`): event titles and major section anchors.
- **Title** (600, `1rem`, `1.35`): labels above controls, grouped surfaces, and helper copy.
- **Body** (500, `1rem`, `1.5`): UI copy, alert messages, and explanatory states.
- **Label** (700, `0.75rem`, `1.2`, `0.16em`): chips, toggles, timestamps, and compact state indicators.

### Named Rules
**The Tight But Legal Rule.** Display tracking never goes past `-0.04em`. The type should feel compact, not fused.

**The No Soft Labels Rule.** Small labels must stay legible on both themes. Muted does not mean faint enough to disappear.

## 4. Elevation

Depth is tonal-first. Most separation comes from layered plum surfaces, inset highlights, and border contrast rather than permanent float-heavy shadows.

### Shadow Vocabulary
- **Ambient Hover** (`0 18px 36px rgba(9, 6, 16, 0.26)`): interactive card lift on hover only.
- **Control Lift** (`0 6px 16px rgba(49, 31, 86, 0.16)`): active theme-toggle buttons and similar round controls.
- **Inset Sheen** (`inset 0 1px 0 rgba(255, 255, 255, 0.06)`): passive surface separation without added bulk.

### Named Rules
**The Hover-Only Lift Rule.** Passive surfaces sit still. Depth appears when the user hovers, focuses, or selects.

**The No Ghost Card Rule.** Avoid pairing broad decorative shadows with passive full borders unless the element is genuinely interactive.

## 5. Components

### Theme Toggle
A compact floating control that lets dark and light mode feel equally intentional.
- **Shape:** small pill shell with circular active buttons.
- **Behavior:** the selected icon gets a lifted, filled state; inactive icons stay quiet.
- **Role:** utility control only, never a hero element.

### Filters and Inputs
Filters behave like compact control-room instruments.
- **Category and event selects:** rounded rectangles with quiet borders and strong text contrast.
- **Search field:** subtle dark or light shell with immediate focus visibility and no decorative placeholder washout.
- **Availability toggle:** a compound pill with explicit Off/On labels and a clear sliding thumb.

### Alerts and Status Banners
Operational messaging is explicit and state-colored.
- **Waiting room / stale data:** amber-bordered banner with a direct retry action.
- **Failure:** rose-bordered banner with compact explanatory copy.
- **Info states:** lilac-tinted surfaces for search and filter confirmations.

### Metric Panels
Top-level event metrics are compact summary tiles.
- **Shape:** softened rectangle around `1.6rem` corners.
- **Content:** a small operational label, a short explanation, one strong numeric anchor, and a thin state-colored divider.
- **Behavior:** these are summary instruments, not vanity-stat cards.

### Member Availability Card
This is the signature component and the product's core unit.
- **Shape:** compact tile with ~`18px` corners and a semantic `5px` bottom rail.
- **Content:** micro schedule text, circular avatar, member name, sold count, and an action/progress rail.
- **Behavior:** hover lift is subtle, ribbons appear only for meaningful urgency, and the progress fill must agree with the card's semantic state.

## 6. Motion

Motion is short, local, and state-driven.
- Hover shifts stay small and fast.
- Progress updates and theme transitions should feel immediate, not theatrical.
- Low-stock emphasis may pulse, but content must stay fully readable without motion.
- Reduced-motion users should still get all state information without reliance on animation.

## 7. Do's and Don'ts

### Do:
- **Do** preserve the dark monitoring mood even in light mode; light is an inverse, not a redesign.
- **Do** keep status colors stable and semantically trustworthy.
- **Do** maintain strong minimum touch targets and compact but readable density.
- **Do** surface stale, waiting-room, and empty states as part of the product, not as edge-case afterthoughts.
- **Do** let bold tabular numbers and high-contrast labels carry the dashboard rhythm.

### Don't:
- **Don't** let this become a crypto dashboard with glow-heavy drama or decorative metrics.
- **Don't** turn the interface into a fandom collage with sentimental ornament.
- **Don't** fall back to enterprise gray hierarchy that weakens scan speed.
- **Don't** use gradient text, side-stripe accents, glassmorphism-by-default, or giant resting shadows.
- **Don't** treat every grouped surface as a generic card when a pill, rail, or concise panel is enough.
