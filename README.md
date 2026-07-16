# GLOBAL EXCLUSIVE MONITOR

GLOBAL EXCLUSIVE MONITOR is a full-stack web application designed to track JKT48 exclusive event availability in near real time through a fast, focused, and mobile-friendly interface. Instead of relying on repeated manual refreshes or raw upstream responses, the application reorganizes event sessions, member availability, and ticket movement into a view that is easier to scan during high-traffic sales periods.

From a technical perspective, the project combines a responsive Next.js frontend with a lightweight Cloudflare Worker proxy that sits between the client and the upstream JKT48 API. This backend layer simplifies frontend data access while handling unstable upstream behavior such as invalid JSON payloads and temporary fetch failures. The result is a compact but practical product that emphasizes usability, resilience, and clear separation between presentation and data access.

## Why This Project

Exclusive event sales often move quickly, especially when traffic spikes and availability changes in short intervals. In that kind of flow, standard event pages are functional but not always optimized for fast monitoring, repeated checking, or quick visual comparison across members and sessions.

This project was built as a focused monitoring layer on top of that experience. Rather than replacing the source platform, GLOBAL EXCLUSIVE MONITOR reorganizes the most relevant information into a clearer dashboard that reduces friction for users who want to follow availability changes in real time. It also serves as a portfolio project that demonstrates practical frontend design, defensive API handling, and clean separation between interface and data access.

## Highlights

- Near real-time monitoring with client-side polling for active event data.
- Member-focused cards that highlight sold count, availability state, and direct purchase actions.
- Responsive dashboard layout built for quick scanning on both desktop and mobile.
- Lightweight Worker-based proxy that isolates the frontend from unstable upstream behavior.
- Defensive handling for invalid payloads and transient upstream failures.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4, SWR
- Backend: Cloudflare Workers, TypeScript, Wrangler
- Data source: JKT48 public upstream API via Worker proxy

## Architecture Overview

The application is intentionally split into two small parts:

- `frontend/` renders the monitoring dashboard, fetches event data, and refreshes the interface on a polling interval.
- `backend/` exposes a minimal proxy layer for selected upstream routes such as member data, event lists, and event details.

This separation keeps the browser application simple while centralizing upstream request logic and failure handling in one place.

## Core Features

- Event list and event detail monitoring for JKT48 exclusive events
- Session-based availability tracking across event slots
- Member-centric status cards with visual state indicators
- Theme-aware UI for a cleaner viewing experience
- Cached snapshot fallback when live upstream data is temporarily unavailable

## Project Structure

```text
.
|-- backend/    # Cloudflare Worker proxy
|-- frontend/   # Next.js application
`-- README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Cloudflare account and Wrangler CLI access for backend deployment

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs locally at `http://localhost:3000`.

### Backend

```bash
cd backend
npm install
npm run dev
```

The Worker can then be deployed with:

```bash
npm run deploy
```

### Local Development Note

The frontend currently uses a fixed Worker API base URL in the application code. For a fully local end-to-end setup, that value should be switched to your local Worker endpoint or moved into environment-based configuration.

## What This Project Demonstrates

- Building a focused full-stack product with a clear separation between UI and API concerns
- Handling unstable third-party responses defensively
- Designing a dense but readable monitoring interface for real-time use
- Turning a niche real-world use case into a practical shipping product

## Potential Improvements

- Add automated tests for the Worker error-handling paths
- Introduce environment-based frontend API configuration
- Add deployment notes and screenshots for easier onboarding
- Document the data flow and operational assumptions in more detail

## License

No license has been added yet. If this repository is intended for public reuse, add a license file.
