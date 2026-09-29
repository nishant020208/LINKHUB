# UnifyHub Brainstorming & Architecture Log

## Phase 1: Foundation, Design System, Layout, Demo Mode, Environment Module

### 1. Goals & What Could Go Wrong
- **Goals**:
  - Establish a solid, modern Vite + React + TypeScript application structure.
  - Implement a central environment variable configuration module (`src/lib/env.ts`) that validates client env variables, isolates server secrets, and detects configuration readiness without crashing when keys are absent.
  - Establish a comprehensive `.env.example` and `CONNECT_CHECKLIST.md` documenting every environment variable and provider requirement.
  - Build an expressive design system and theme tokens (custom Tailwind configuration, dark/light theme switcher, fluid typography pairing with distinct display fonts for headings, sans for body, mono for dates/counters).
  - Create the core app shell layout (responsive navigation, top command bar, workspace selector, notification dock, account indicator badge, and "Right now" hero container).
  - Establish an end-to-end Demo Mode with realistic data stores (in Zustand) that mirrors real production data models for connected accounts, items, dead-lines, assignments, and files, clearly displaying "Demo data" indicators.
- **What could go wrong**:
  - Package dependency conflicts between Tailwind v4 / v3, Lucide icons, or Framer Motion.
  - App crashing on startup if `env.ts` throws when `VITE_SUPABASE_URL` is missing before `ENV READY`.
  - Demo state mutating unexpectedly or conflicting with future Supabase data hooks.
  - Generic admin UI appearance if default shadcn/Inter styling is used without intentional art direction.

### 2. Data Flow: Provider API to Database to UI
- In production:
  `Provider APIs (Google, Microsoft, GitHub, etc.)` -> `Supabase Edge Functions (Token Exchange & Sync Engine)` -> `Supabase Postgres (with RLS)` -> `TanStack Query Client Hooks` -> `Normalized Zustand Store & React Views`.
- In Phase 1 Demo Mode:
  `Mock Dataset Generators (Realistic Student/Professional fixtures in src/lib/demo-data.ts)` -> `Demo Store / Mock Repository Interface` -> `React UI Components (tagged with Demo Data pill)`.
- When switching from Demo Mode to Live Mode:
  The repository interface dynamically delegates to either TanStack Query + Supabase RPC when `env.isConfigured.supabase` is true, or fallback mock fixtures when unconfigured or in explicit demo preview.

### 3. Edge Cases & Resilience
- **Missing or Partial Variables**:
  `src/lib/env.ts` gracefully degrades with safe fallbacks and boolean flags (`isConfigured.supabase`, `isConfigured.google`, etc.) so the entire app renders in full fidelity.
- **Empty Accounts & Zero States**:
  The dashboard must handle 0 connected accounts gracefully with an intuitive onboarding banner, and empty item states with meaningful guidance rather than blank cards.
- **Timezone Inconsistencies**:
  All item timestamps are standardized to ISO 8601 UTC strings (`due_at`, `start_at`, `end_at`). Client UI displays times in the user's localized browser timezone with countdown helpers.
- **Expired Tokens & Revoked Access Handling**:
  The Account model defines statuses: `connected`, `needs_reconnect`, `syncing`, `error`. The UI badges and warning banners must visually signal disconnected accounts without breaking overall rendering.

### 4. Security Considerations
- **Zero Client Secrets**:
  No `CLIENT_SECRET`, `SERVICE_ROLE_KEY`, or `TOKEN_ENCRYPTION_KEY` is ever exposed to Vite or client bundles. Only `VITE_` prefixed variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are accessed via `import.meta.env`.
- **Git Hygiene**:
  `.gitignore` explicitly prevents staging `.env`, `.env.local`, `.env.*.local`, or build outputs.
- **Sanitized Mock Data**:
  Mock data strictly contains synthetic educational and project records with no real private credentials or PII.

### 5. UX & Art Direction Decisions
- **Command Center Philosophy**:
  Instead of a standard sidebar-and-white-table admin panel, UnifyHub uses a bento-grid command station:
  - Frosted glass cards (`backdrop-blur`, subtle border glow, dark graphite surfaces).
  - Bold typography pairing: `Plus Jakarta Sans` / `Outfit` for expressive headings, clean `Inter` for UI controls, and `JetBrains Mono` for dates, countdowns, and source tags.
  - Dedicated account color dots on every item (e.g., Cornell Blue for University Outlook, Emerald for Work Google, Amber for Personal Gmail, Coral for Classroom).
  - Persistent "Right Now" hero status bar providing immediate contextual focus: next meeting, closest deadline, and live countdown timer.
- **Demo Mode Banner**:
  A subtle, non-intrusive amber-accented badge in the header indicating "Demo Mode (Keys unconfigured)" with a drawer explaining what real services connect to.

### 6. Exact List of Files Created/Changed in Phase 1
- `BRAINSTORM.md` (this file)
- `PLAN.md` (master roadmap and phase checklist)
- `CONNECT_CHECKLIST.md` (environment setup and verification checklist)
- `.env.example` (template with documentation for all frontend and backend variables)
- `package.json` & `package-lock.json`
- `tsconfig.json` & `tsconfig.app.json` & `tsconfig.node.json`
- `vite.config.ts` (with path alias `@/` mapping to `src/`)
- `index.html` (fonts, meta tags, PWA viewport settings)
- `src/index.css` (custom design tokens, glassmorphism utilities, CSS variables)
- `src/lib/env.ts` (strongly-typed environment configuration and readiness guards)
- `src/lib/utils.ts` (class merging, date formatting, color helpers)
- `src/types/index.ts` (core domain contracts: Account, Item, Workspace, Provider, etc.)
- `src/lib/demo-data.ts` (rich mock data: student & pro emails, deadlines, events, files)
- `src/store/useAppStore.ts` (Zustand state for active workspace, filter selections, demo state)
- `src/components/layout/Navbar.tsx` (top navigation, search trigger, status badge, theme toggle)
- `src/components/layout/AppShell.tsx` (master shell with persistent header, workspace switcher)
- `src/components/common/DemoBanner.tsx` (contextual banner explaining demo state vs live sync)
- `src/App.tsx` (router and provider tree: QueryClient, ThemeProvider, AppShell)
- `src/main.tsx` (React root mounting)
