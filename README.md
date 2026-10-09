# BIZZNNOVATE — Live Arena Leaderboard & Scoring Platform

The official real-time scoring engine and display leaderboard for **BIZZNNOVATE** (IIPS, DAVV, Indore).

Designed with an artisanal paper-craft aesthetic faithfully matching the event's brand identity, high-contrast projector display modes for auditoriums, and an authenticated judge console.

---

## Key Features

- **Crafted Editorial Aesthetic**: Authentic warm ecru paper textures (`--paper-fibers`, `--paper-grain`, `--paper-mottle`), craft borders, and editorial typography using `Playfair Display`, `Cinzel`, and `DM Sans`.
- **Projector Display Mode (`/display`)**: Specially crafted for stage projectors and large auditorium screens. Streamlined presentation focusing purely on Ranks, Team Names, Tracks, and Scores without clutter.
- **Official Brand Assets**: High-resolution BIZZNNOVATE eagle crest emblem and typography wordmark.
- **Real-time Synchronization**: Powered by Supabase real-time subscriptions, instantly reflecting score updates and ranking shifts with subtle pulse animations.
- **Judge & Admin Console (`/admin`)**: Role-based access control for event evaluators to enter scores across 6 competition challenges (Workforce Wars, Tech Sprint, Brand Blitz, The Boardroom, Viral Vault, The Gaming League).
- **Responsive Architecture**: Designed to look crisp on mobile devices, tablets, desktop workstations, and high-resolution venue projectors.

---

## Tech Stack

- **Framework**: TanStack Start (SSR / Nitro / Vite)
- **Styling**: Tailwind CSS v4 with bespoke BIZZNNOVATE design tokens
- **Typography**: Google Fonts (Cinzel, Playfair Display, DM Sans)
- **Database & Realtime**: Supabase (PostgreSQL + Realtime Channels)
- **Icons**: Lucide React

---

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm or bun

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build

```bash
# Build production bundle
npm run build

# Preview build locally
npm run preview
```

---

## Project Structure

```
├── public/                 # Static brand assets (emblem, wordmark, paper textures)
│   ├── bizznnovate-emblem.webp
│   ├── bizznnovate-wordmark.webp
│   └── paper/              # Layered paper grain textures
├── src/
│   ├── components/         # UI components & LeaderboardView
│   ├── hooks/              # Real-time state hooks (useLeaderboard)
│   ├── integrations/       # Supabase client & schemas
│   ├── lib/                # Standings computation & scoring helpers
│   ├── routes/             # TanStack Start file-based routing
│   │   ├── index.tsx       # Public Leaderboard
│   │   ├── display.tsx     # Projector Display Mode
│   │   ├── auth.tsx        # Judge & Admin Authentication
│   │   └── _authenticated/admin.tsx # Scorer Console
│   └── styles.css          # Design system, paper tokens, and animations
```

---

## License & Credits

Built for **BIZZNNOVATE 2026** — Institute of Management Studies & International Institute of Professional Studies (IIPS), Devi Ahilya Vishwavidyalaya (DAVV), Indore.
