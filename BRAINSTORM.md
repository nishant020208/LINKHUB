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

---

## Phase 2: Database Migrations and Auth Architecture

### 1. Goals & What Could Go Wrong
- **Goals**:
  - Implement full Postgres database schema in `supabase/migrations/20260301000000_unifyhub_schema.sql` covering all 10 core tables: `connected_accounts`, `integrations`, `items`, `pinned_items`, `workspaces`, `user_settings`, `reminders`, `notification_channels`, `sync_logs`, and `audit_log`.
  - Enforce strict Row Level Security (RLS) on EVERY table with policies ensuring users can only read, insert, update, or delete rows where `user_id = auth.uid()`.
  - Add unique constraint on `items(account_id, source_id)` to prevent duplicate item syncs.
  - Implement indexes on `items(user_id, due_at)`, `items(account_id)`, and `items(type, is_done)` for millisecond query performance.
  - Create Supabase client wrapper (`src/lib/supabase.ts`) that safely handles missing environment variables.
  - Build Auth Store (`src/store/useAuthStore.ts`) providing realistic mock auth session in demo mode and seamless Supabase Auth when configured.
  - Build interactive 3-step Onboarding Wizard (`src/components/auth/OnboardingWizard.tsx`) guiding new users through role selection (Student vs Pro), connecting their first accounts, and customizing workspace views.
- **What could go wrong**:
  - Migration syntax incompatibility with Postgres 15/16 or Supabase extensions (`uuid-ossp`, `pgcrypto`).
  - Circular foreign keys between accounts and workspaces.
  - RLS policy blocking service role background workers if `service_role` policy is not explicitly declared.
  - Auth state hydration flashes in client UI before checking session status.

### 2. Data Flow
`User Auth / OAuth Provider` -> `Supabase Auth (auth.users)` -> `Public User Profile & Default Workspaces Trigger` -> `Client useAuthStore` -> `Interactive Onboarding Wizard` -> `Initial Sync Triggers`.

### 3. Edge Cases & Resilience
- **Unauthenticated Access**: All sensitive routes require active session; in demo mode, an instant demo profile is supplied with 1-click logout/switch.
- **First-Time User Onboarding**: New users automatically receive default "All Combined", "College & Courses", "Tech Work", and "Personal Life" workspaces via database default rows / client hydration.
- **Service Role Sync**: Sync Edge Functions using `service_role` key must bypass client RLS while preserving correct `user_id` ownership.

### 4. Security Risks & RLS
- Every table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
- Strict policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE` with `USING (auth.uid() = user_id)`.
- Server-side secrets (`encrypted_refresh_token`) cannot be accessed by public client queries because client-side adapter views omit secret columns or rely on Edge Function proxies.

### 5. UX Decisions
- In Demo Mode: User can test the full onboarding flow with pre-populated options and sample accounts.
- 3-Step Wizard:
  1. Persona: "Student", "Engineering / Tech", "Hybrid / Freelance".
  2. First Connected Account selection: Google Classroom / Gmail, Cornell / College Outlook, GitHub.
  3. Workspaces Preference: selecting default tabs and quiet hour notifications.

### 6. Exact List of Files for Phase 2
- `supabase/migrations/20260301000000_unifyhub_schema.sql`
- `src/lib/supabase.ts`
- `src/store/useAuthStore.ts`
- `src/components/auth/AuthModal.tsx`
- `src/components/auth/OnboardingWizard.tsx`

---

## Phase 3: Adapter System, Registry, OAuth Edge Functions

### 1. Goals & What Could Go Wrong
- **Goals**:
  - Implement a uniform Provider Adapter contract `{ key, name, authType, connect, fetchItems, normalize, refreshAuth }`.
  - Build the centralized Adapter Registry in `src/adapters/index.ts` so adding any service is exactly 1 adapter file + 1 registry line.
  - Implement all 18 specified adapters in the exact required sequence:
    1. Google (Gmail, Calendar, Classroom, Drive, Tasks)
    2. Microsoft (Outlook, Calendar, To Do, OneDrive, Teams)
    3. iCal URL Importer (Apple, Outlook, college timetables)
    4. GitHub, Notion, Todoist
    5. Slack, Jira, Linear, Trello, Asana, ClickUp
    6. Dropbox, Box, Zoom, GitLab, Bitbucket
    7. Canvas, Moodle
    8. IMAP (with security TLS warning)
  - Write complete Supabase Edge Functions reading secrets from `Deno.env`:
    - `oauth-callback`: exchanges auth code for refresh token, encrypts via `TOKEN_ENCRYPTION_KEY`, inserts/updates `connected_accounts`.
    - `oauth-refresh`: safely refreshes expired access tokens.
    - `sync-provider`: fetches raw items, normalizes into canonical `Item` schema, upserts to DB.
    - `_shared/crypto.ts`: AES-256-GCM encryption/decryption routines.
    - `_shared/rate-limit.ts`: exponential backoff with jitter and 429 Retry-After header parsing.
- **What could go wrong**:
  - Token refresh race conditions when multiple sync workers refresh the same account token concurrently.
  - Edge Functions crashing if Deno environment variables are missing before `ENV READY`.
  - Inconsistent normalization across differing provider date formats (RFC 2822 vs ISO 8601 vs Unix epoch).
  - Rate-limit bans from Google/Microsoft APIs during full account synchronization.

### 2. Data Flow
`User Clicks Connect` -> `Supabase Edge Function /oauth-callback` -> `Exchange Code with Provider OAuth Server` -> `Encrypt Refresh Token via TOKEN_ENCRYPTION_KEY` -> `Save in connected_accounts` -> `Scheduled pg_cron or Manual Sync` -> `sync-provider Edge Function` -> `Normalize to Canonical Item Schema` -> `Upsert into items table` -> `TanStack Query Client View`.

### 3. Edge Cases & Resilience
- **Expired Refresh Tokens**: Mark account status as `needs_reconnect` and record error message in DB; do not crash the sync pipeline.
- **Rate Limits (HTTP 429)**: The sync function inspects `Retry-After` headers and pauses with exponential backoff up to 3 retries before scheduling the remaining items for the next interval.
- **Duplicate Items**: Dedup on `(account_id, source_id)` ensures idempotent syncs.

### 4. Security Risks & Cryptography
- No client secrets or refresh tokens touch the browser.
- Encryption key `TOKEN_ENCRYPTION_KEY` is a 32-byte secret stored only in Edge runtime.
- IMAP adapter requires TLS (port 993) and explicit user credential confirmation warning.

### 5. UX Decisions
- Each adapter exports rich metadata: brand color, category, friendly description, and required scopes.
- In Demo Mode: Adapters simulate fetching realistic fixture items and normalize them instantly into the store.

### 6. Exact List of Files for Phase 3
- `src/adapters/types.ts`
- `src/adapters/google.ts`
- `src/adapters/microsoft.ts`
- `src/adapters/ical.ts`
- `src/adapters/github.ts`
- `src/adapters/notion.ts`
- `src/adapters/todoist.ts`
- `src/adapters/slack.ts`
- `src/adapters/jira.ts`
- `src/adapters/linear.ts`
- `src/adapters/trello.ts`
- `src/adapters/asana.ts`
- `src/adapters/clickup.ts`
- `src/adapters/dropbox.ts`
- `src/adapters/box.ts`
- `src/adapters/zoom.ts`
- `src/adapters/gitlab.ts`
- `src/adapters/bitbucket.ts`
- `src/adapters/canvas.ts`
- `src/adapters/moodle.ts`
- `src/adapters/imap.ts`
- `src/adapters/index.ts`
- `supabase/functions/_shared/crypto.ts`
- `supabase/functions/_shared/rate-limit.ts`
- `supabase/functions/oauth-callback/index.ts`
- `supabase/functions/sync-provider/index.ts`

---

## Phase 4: Dashboard UI on Demo Data & Bento Command Center

### 1. Goals & What Could Go Wrong
- **Goals**:
  - Deliver the Bento-grid Command Center layout with Framer Motion staggered entrances and animated urgency heat.
  - Implement customizable/toggleable widget layout (`src/components/dashboard/WidgetSettingsModal.tsx`) allowing users to show/hide and re-order sections: Deadlines, Timeline, Key Emails, Pinned Files, and Metrics.
  - Build interactive Snooze Modal (`src/components/dashboard/SnoozeModal.tsx`) allowing custom snooze periods (3 hours, 1 day, next weekend, custom time).
  - Implement Account Quick Drawer (`src/components/dashboard/AccountDrawer.tsx`) showing account health indicators, pause/resume, and last synced details.
  - Build Quick Add Task/Deadline Modal (`src/components/dashboard/QuickAddModal.tsx`).
  - Animate items with Framer Motion respecting `prefers-reduced-motion`.
- **What could go wrong**:
  - Layout shifting or jumping when filtering accounts or toggling completed tasks.
  - Cluttered UI if cards have too many controls; maintain calm density with hover reveals and clean typographic hierarchies.
  - Performance stutter if animations trigger unnecessary re-renders of the whole grid.

### 2. Data Flow
`User interaction (Snooze, Complete, Filter, Widget Reorder)` -> `Zustand useAppStore` -> `Normalized state recomputation` -> `Framer Motion Layout Animations` -> `Local Storage persistence`.

### 3. Edge Cases & Resilience
- **All Widgets Hidden**: If a user toggles off all widgets, render an intuitive "Reset to Default Layout" banner.
- **Extreme Deadlines Urgency**: Items due in < 1h pulse with a subtle crimson glow and prioritize at the top.
- **Zero Items Found**: Empty states explain which account or filter caused zero results, with a 1-click "Clear Filters" button.

### 4. Security & Privacy
- Client-only UI transformations; no sensitive data transmitted or logged.

### 5. UX Decisions
- Urgency heat color intensity:
  - Critical (<6h or Overdue): Deep Rose crimson with pulsing status dot.
  - High (<24h): Amber gold.
  - Medium (<72h): Sky blue.
  - Normal (>3d): Muted slate.
- Micro-interactions:
  - Toggling completion triggers a strike-through transition and updates weekly progress ring smoothly.

### 6. Exact List of Files for Phase 4
- `src/components/dashboard/WidgetSettingsModal.tsx`
- `src/components/dashboard/SnoozeModal.tsx`
- `src/components/dashboard/AccountDrawer.tsx`
- `src/components/dashboard/QuickAddModal.tsx`
- `src/components/dashboard/AnimatedCard.tsx`
- Updates to `src/pages/DashboardPage.tsx` and `src/components/dashboard/DeadlinesBoard.tsx`

---

## Phase 5: Search, Command Palette, Unified Calendar, Workspaces

### 1. Goals & What Could Go Wrong
- **Goals**:
  - Implement full keyboard-driven Ctrl+K / ⌘K Command Palette (`src/components/search/CommandPalette.tsx`) with fuzzy matching across:
    - Synced Items (Deadlines, Events, Emails, Pinned Files)
    - Connected Accounts
    - Workspaces
    - Quick actions: "Sync all accounts", "Add new deadline", "Switch to dark/light mode", "Open Calendar", "Open Privacy Controls", "Wipe data".
  - Build the multi-view Unified Calendar in `src/pages/CalendarPage.tsx`:
    - Agenda View: chronologically ordered cards with meeting video link buttons and account dots.
    - Week View: 7-day grid showing items distributed by date and time with overlap collision awareness.
    - Day View: hourly vertical timetable with current time indicator.
  - Implement Custom Workspace Creator Modal (`src/components/workspaces/WorkspaceModal.tsx`) allowing users to create custom workspaces (e.g. "Thesis", "Startup", "Athletics"), bind specific accounts, and toggle included item types.
- **What could go wrong**:
  - Calendar date calculations failing on month boundaries or daylight saving transitions; mitigate using standard date manipulation functions.
  - Keyboard focus trapping issues inside modal; ensure Escape closes palette and Arrow keys navigate options.
  - Slow fuzzy search if item array is large; optimize with lightweight regex score matching.

### 2. Data Flow
`User keystrokes (Ctrl+K or query)` -> `Fuzzy matcher over useAppStore.items, accounts, and actions` -> `Filtered results list with keyboard selection` -> `Execute action (navigate, toggle, open modal)`.

### 3. Edge Cases & Resilience
- **Search Query with Zero Matches**: Render suggestions to create a new task with that title or clear the query.
- **Days with Zero Events**: In Week View, empty days display calm dashes rather than squished columns.

### 4. Security
- Client-side fuzzy matching runs completely in memory; zero query strings or keystrokes leaked to external servers.

### 5. UX Decisions
- Keyboard navigation (<kbd>&uarr;</kbd> / <kbd>&darr;</kbd> to navigate, <kbd>Enter</kbd> to execute, <kbd>Esc</kbd> to close).
- Distinct category headers in command palette: `Actions`, `Deadlines & Tasks`, `Calendar Events`, `Files`, `Emails`.

### 6. Exact List of Files for Phase 5
- `src/components/search/CommandPalette.tsx`
- `src/components/workspaces/WorkspaceModal.tsx`
- Updates to `src/pages/CalendarPage.tsx` (Day, Week, and Agenda view modes)
- Integration into `src/components/layout/AppShell.tsx` and `src/components/layout/Navbar.tsx`

---

## Phase 6: Smart Engine & Automated Intelligence

### 1. Goals & What Could Go Wrong
- **Goals**:
  - Implement Priority Scoring Algorithm (`src/lib/smart/priority.ts`):
    - Due-date proximity (score jumps exponentially within 24h/6h/overdue).
    - Starred / high importance flag (+20).
    - Sender authority / course instructor keywords (+15).
    - High-urgency keywords ('exam', 'midterm', 'final', 'quiz', 'due', 'submit', 'invoice', 'payment', 'flight', 'urgent') (+15).
  - Implement Calendar Conflict Detector (`src/lib/smart/conflicts.ts`):
    - Detects overlapping start and end times between separate connected accounts (e.g. Work meeting clashing with University lecture).
    - Visual conflict alert badge with conflicting event titles.
  - Implement Free-Time Focus Slot Finder (`src/lib/smart/freetime.ts`):
    - Identifies open contiguous blocks of 45+ minutes during standard working/study hours (8 AM - 8 PM).
  - Implement Duplicate Item Merging (`src/lib/smart/dedup.ts`):
    - When the same meeting or course session exists in both Google and Outlook calendars, merges into a unified entry displaying both account chips.
  - Implement Smart Reminders Calculation (`src/lib/smart/reminders.ts`):
    - Automatically stages alerts at 1 day (24h), 3 hours, and 30 minutes before deadlines.
  - Implement Smart Email Feature Detectors:
    - Bills & subscriptions renewals detection.
    - Travel reservation detection (flights, hotels, confirmation numbers).
  - Implement Weekly Performance Report Modal (`src/components/dashboard/WeeklyReportModal.tsx`):
    - Tracks completed vs overdue/missed deadlines, completion rate percentage, and average time-to-completion.
  - Implement iCal (`.ics`) and CSV Export Utilities (`src/lib/export.ts`):
    - 1-click export of unified agenda or deadline list.
- **What could go wrong**:
  - Complex date math causing false positive calendar conflicts if timezone offsets aren't normalized.
  - Excessive priority inflation if keyword matcher triggers on body text substrings.
  - Exported iCal files failing validation in Apple Calendar / Google Calendar due to missing VCALENDAR headers or malformed UID/DTSTAMP lines.

### 2. Data Flow
`Raw Synced Items` -> `Priority Scorer & Smart Classifiers` -> `Conflict & Deduplication Filters` -> `Dynamic Store Calculations` -> `UI Warning Badges & Focus Slot Widgets` -> `Export Engine (ICS/CSV)`.

### 3. Edge Cases & Resilience
- **Events with Missing End Times**: Default to start_at + 50 minutes so conflict detector doesn't fail.
- **Identical Titles at Different Dates**: Deduplication strictly verifies time boundary overlap before merging.
- **Zero Completed Tasks**: Weekly report displays encouraging empty state guidance.

### 4. Security
- All heuristic matching runs client-side in memory; zero PII sent off-device.

### 5. UX Decisions
- High-visibility amber warning pill in "Right Now" strip and Calendar view when an active meeting conflict is detected.
- Clean summary modal for Weekly Report with radial completion rings.

### 6. Exact List of Files for Phase 6
- `src/lib/smart/priority.ts`
- `src/lib/smart/conflicts.ts`
- `src/lib/smart/freetime.ts`
- `src/lib/smart/dedup.ts`
- `src/lib/smart/reminders.ts`
- `src/lib/export.ts`
- `src/components/dashboard/WeeklyReportModal.tsx`
- Integration into `src/pages/DashboardPage.tsx` and `src/components/dashboard/RightNowHero.tsx`






---

## Phase 7: AI Daily Briefing & Multi-Channel Notifications

### 1. Goals & What Could Go Wrong
- **Goals**:
  - Deliver AI Daily Briefing generator Edge Function (`supabase/functions/ai-briefing/index.ts`):
    - Uses Google Gemini API (`GEMINI_API_KEY`) with structured JSON schema prompt.
    - Condenses schedule, priority deadlines, conflicts, and suggests 1 clear daily focus.
    - Deterministic fallback mock briefing engine if `GEMINI_API_KEY` is absent (Demo mode compliance).
  - Deliver Email-to-Task / Action Extraction Edge Function (`supabase/functions/extract-actions/index.ts`):
    - Extracts tasks, deadlines, action items, dates, and urgency scores from unread email snippets.
  - Deliver Multi-Channel Notification Dispatcher (`supabase/functions/dispatch-notification/index.ts`):
    - Supports Email (Resend), Web Push (VAPID / Web Notification API), Telegram Bot, SMS (Twilio), and WhatsApp.
    - Enforces user-configurable Quiet Hours (e.g. 22:00 to 08:00) with timezone awareness.
    - Per-channel toggles so users can customize which channels receive high-priority alerts vs summaries.
  - Build Frontend Notification Settings Modal (`src/components/settings/NotificationSettingsModal.tsx`):
    - Channel toggles with configuration fields (Telegram Chat ID, Phone number, Email address).
    - Quiet hours start/end time pickers.
    - Interactive "Send Test Notification" button that dispatches a simulated test alert across enabled channels.
- **What could go wrong**:
  - Gemini API rate limits or timeout: Edge function must catch errors and return structured fallback summary instantly.
  - Invalid phone numbers or unlinked Telegram bot chats: Dispatches must validate formatting and return helpful error messages.
  - Quiet hours crossing midnight (e.g. 22:00 to 07:00): Time check must handle wrap-around correctly.

### 2. Data Flow
`Cron trigger or User Login` -> `ai-briefing Edge Function` -> `Gemini API (or Fallback)` -> `Save briefing in user_briefings table` -> `Zustand useAppStore.briefing` -> `RightNowHero display`.
`Deadline threshold reached (24h/3h/30m)` -> `dispatch-notification Edge Function` -> `Verify Quiet Hours & Preferences` -> `Provider API (Resend / Telegram / Twilio / Push API)` -> `Log in audit_logs`.

### 3. Edge Cases & Resilience
- **API Key Missing**: Returns realistic, high-quality synthesized daily briefing with zero downtime or console warnings.
- **Quiet Hours Active**: High-urgency overrides for deadlines due in < 2 hours if configured; otherwise queues or suppresses non-critical alerts.
- **Malformed Email Content**: HTML stripped, maximum 1500 tokens sent to LLM to prevent context overflow or excessive cost.

### 4. Security & Privacy
- Zero user emails or items stored by external LLMs with training flags (`temperature: 0.2`, ephemeral processing).
- Third-party webhook URLs and API keys kept strictly in Supabase Edge Function secrets.

### 5. UX Decisions
- Beautiful Notification Settings Modal accessible directly via the bell icon in the Navbar.
- Clear status badges indicating channel health and quiet hours status.

### 6. Exact List of Files for Phase 7
- `supabase/functions/ai-briefing/index.ts`
- `supabase/functions/extract-actions/index.ts`
- `supabase/functions/dispatch-notification/index.ts`
- `src/components/settings/NotificationSettingsModal.tsx`
- Updates to `src/components/layout/Navbar.tsx`
- Updates to `src/store/useAppStore.ts`

---

## Phase 8: Integrations Hub & All 18 Provider Adapters

### 1. Goals & What Could Go Wrong
- **Goals**:
  - Full catalog of all 18 registered adapters:
    1. Google Workspace (Gmail, Calendar, Tasks, Drive, Classroom)
    2. Microsoft 365 (Outlook, Calendar, To Do, OneDrive, Teams)
    3. iCal Universal Feed (webcal:// & https://)
    4. GitHub, Notion, Todoist
    5. Slack, Jira, Linear, Trello, Asana, ClickUp
    6. Dropbox, Box, Zoom, GitLab, Bitbucket
    7. Canvas LMS, Moodle LMS
    8. Custom IMAP (with mandatory TLS encryption warning)
  - Interactive Connection Modal (`src/components/integrations/ConnectModal.tsx`):
    - OAuth 2.0 authorization redirect or simulated grant in Demo Mode.
    - iCal direct URL subscription input with instant feed preview.
    - Moodle token and base URL configuration.
    - IMAP secure host, port (993), username, and app password with TLS security banner.
  - Per-Account Data Type Filters:
    - User can selectively toggle which data types sync per account (`sync_enabled_types`: email, event, deadline, task, file).
  - Account health diagnostics with 1-click Reconnect and scoped Data Wiping.
- **What could go wrong**:
  - Invalid iCal URLs failing parse: client must validate URL format (`https://` or `webcal://`) before accepting.
  - Insecure plain text IMAP: UI warns against non-TLS connections (must use SSL/TLS port 993 or STARTTLS).
  - Missing adapter icons or layout clipping in catalog: standardized bento cards with responsive grid.

### 2. Data Flow
`User Clicks Connect` -> `ConnectModal opens with provider adapter metadata` -> `OAuth redirect or credential/URL input` -> `Adapter connect() executed` -> `New ConnectedAccount created in store` -> `Initial incremental sync executed` -> `Normalized items appear on Dashboard`.

### 3. Edge Cases & Resilience
- **Already Connected Account**: Show "Linked" state with option to "Add Secondary Account" (e.g. 2nd Google account for University vs Personal).
- **Network Drops during Sync**: Status switches to `needs_reconnect` with retry button.
- **Revoked Scopes**: Account shows amber badge with clear instructions on which scopes need re-authorization.

### 4. Security
- Tokens never logged to console or local storage; in production, tokens are encrypted with AES-256-GCM via Edge function.
- IMAP credentials strictly stored in protected encrypted account rows, never exposed to client-side analytics.

### 5. UX Decisions
- Filter tabs across provider catalog: "All", "Popular", "Academic", "Productivity", "Developer", "Enterprise".
- Clear color chips corresponding to each brand for instant visual recognition.

### 6. Exact List of Files for Phase 8
- `src/components/integrations/ConnectModal.tsx`
- Updates to `src/pages/IntegrationsPage.tsx`
- Updates to `src/store/useAppStore.ts` (support adding custom accounts and toggling sync_enabled_types)

---

## Phase 9: PWA, Polish, Privacy Page with Audit Log, Verification

### 1. Goals & What Could Go Wrong
- **Goals**:
  - PWA Web App Manifest (`public/manifest.json`):
    - App name "UnifyHub", icons, standalone display mode, background & theme colors.
  - Service Worker Registration (`src/registerServiceWorker.ts`):
    - Registers offline service worker caching essential app assets.
  - Privacy Page Enhancement with Live Audit Log Viewer (`src/pages/PrivacyPage.tsx`):
    - Tabs for "Privacy Scopes", "Security Architecture", "Audit Log", and "Data Wipe & Export".
    - Interactive Audit Log table showing real-time event entries: incremental syncs, conflict detections, token refresh validations, notification dispatches, and data access.
    - One-click "Export My Data" (download all items and account data as JSON).
  - Polish & Accessibility:
    - Zero console errors, responsive on mobile/tablet/desktop, reduced motion compatibility.
  - Production Documentation (`README.md`):
    - Comprehensive architecture diagram, list of all 18 adapters, demo mode instructions, and Supabase deployment guide.
- **What could go wrong**:
  - Service worker caching stale bundles in development: Only register in production or bypass during dev hot-reloads.
  - PWA manifest missing valid icons: Provide standard SVG/PNG icon paths in `public/`.
  - Export data payload failing on large datasets: Stream as formatted JSON blob with automatic object URL cleanup.

### 2. Data Flow
`User Action / Sync Event` -> `Audit Log entry recorded` -> `useAppStore audit entries` -> `Privacy Page Audit Log View`.
`User Clicks "Export My Data"` -> `Serialize useAppStore.items and accounts to JSON` -> `Create Blob URL` -> `Trigger file download unifyhub-data-export.json`.

### 3. Edge Cases & Resilience
- **Offline / Flight Mode**: Service worker serves cached app shell; user can inspect already-synced deadlines and calendar events locally.
- **Data Wipe**: Completely resets store, clears localStorage, and logs the wipe action in the session.

### 4. Security
- Full data export executes purely client-side; zero exfiltration risk.
- Audit log is immutable per session and displays transparent security records.

### 5. UX Decisions
- Tabbed layout on Privacy page for easy navigation between Architecture, Scopes, Audit Log, and Danger Zone.
- Distinct color-coded audit log badges (SYNC, SECURITY, AI, NOTIFICATION).

### 6. Exact List of Files for Phase 9
- `public/manifest.json`
- `src/registerServiceWorker.ts`
- Updates to `index.html`
- Updates to `src/pages/PrivacyPage.tsx`
- Updates to `README.md`

---

## Live Sync Pipeline Diagnosis (End-to-End Trace)

### 1. Database & Account Linkage (`connected_accounts`)
- **Finding**: Accounts added via the UI `ConnectModal` were previously only stored in-memory in Zustand (`useAppStore.accounts`).
- **Root Cause**: There was no client-side sync hook querying `supabase.from('connected_accounts').select('*')` on authentication.
- **Fix**: The client store must query Supabase `connected_accounts` using the active session user ID, and `ConnectModal` must insert into `connected_accounts` (or initiate the OAuth redirect to `oauth-callback`).

### 2. Edge Function Invocation (`sync-provider`)
- **Finding**: The manual "Sync All" button in `Navbar` / `IntegrationsPage` was calling a dummy `setTimeout(1100)` inside `useAppStore.triggerSync`.
- **Root Cause**: The client never called `supabase.functions.invoke('sync-provider', { body: { accountId } })`.
- **Fix**: `triggerSync` must invoke the `sync-provider` Edge Function via Supabase client, await the response, and re-fetch `items` and `sync_logs`.

### 3. Token Decryption & Google Access Token Handshake
- **Finding**: `sync-provider` calls internal `oauth-refresh` Edge Function to decrypt `encrypted_refresh_token` using AES-256-GCM.
- **Root Cause**: If `TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, or `GOOGLE_CLIENT_SECRET` are not set in Supabase Secrets, token exchange returns HTTP 500.
- **Fix**: Provide clear status logging and fallbacks. If refresh returns HTTP 401/400 (token revoked/invalid), update `connected_accounts.status = 'needs_reconnect'`.

### 4. Google API Error Surface (403, 401, 429)
- **Finding**: Google APIs are disabled by default on newly created Google Cloud projects.
  - **403 Forbidden**: Occurs if Google Calendar API, Google Classroom API, Gmail API, Google Drive API, or Google Tasks API are not enabled in Google Cloud Console.
  - **401 Unauthorized**: Occurs if refresh token is expired or client secret is incorrect.
  - **429 Rate Limit**: Occurs if quota limits are exceeded.
- **Fix**: Wrap each of the 5 Google integrations (Calendar, Classroom, Gmail, Drive, Tasks) in its own isolated `try/catch`. Log the exact HTTP status and error body, and record it into `sync_logs` per data type so a failure in one service (e.g. Classroom API not enabled) does not block the other services (Calendar and Gmail).

### 5. Row Level Security (RLS) on `items`
- **Finding**: The Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` to upsert into `public.items`, which bypasses RLS. However, `items` requires `account_id` to reference a valid row in `connected_accounts`.
- **Frontend RLS**: The frontend client reads from `items` with the user's JWT (`auth.uid() = user_id`). If the frontend is not logged in with Supabase Auth, RLS returns an empty array.
- **Fix**: Support both authenticated Supabase session querying and direct synchronization.

### 6. UI Components & TanStack Query Bindings
- **Finding**: Dashboard widgets were reading directly from in-memory Zustand `state.items` instead of fetching live database rows via TanStack Query.
- **Fix**: Bind TanStack Query `useQuery` hooks to `supabase.from('items').select('*')` and `supabase.from('sync_logs').select('*')`, and provide a real-time Sync Status Panel in the UI displaying live status per data type.

---

## Live Auth, Account Connection, and Zero-Demo Production Pipeline

### 1. Goals & What Could Go Wrong
- **Goals**:
  - Implement full dedicated `/login` route with Google and GitHub OAuth buttons using `supabase.auth.signInWithOAuth`.
  - Protect all routes (`/`, `/calendar`, `/integrations`, `/privacy`) behind auth session check, redirecting unauthenticated visitors to `/login`, and redirecting authenticated users away from `/login` to `/`.
  - Provide an `/auth/callback` route with resilient token exchange, graceful error handling for cancellation/disabled providers, and routing new users to the 3-step onboarding wizard vs returning users directly to the dashboard.
  - Separate login authentication (Supabase Auth identity) strictly from integration access (Google/Microsoft data sync): logging in NEVER requests broad Gmail/Calendar scopes; connection happens via distinct "Connect" actions with read-only scopes.
  - Provide database migration for `public.profiles` with automatic trigger on `auth.users` creation.
  - Implement `oauth-start` Edge Function to generate cryptographically signed, expiring CSRF state tokens and redirect to provider consent screens with read-only scopes.
  - Upgrade `oauth-callback` Edge Function to exchange codes for Google, Microsoft, GitHub, Notion, Todoist, Slack, and Linear, storing AES-256-GCM encrypted tokens in `connected_accounts` and triggering an immediate first sync.
  - Build Multi-Adapter Sync pipeline in `sync-provider` supporting Google (Gmail, Calendar, Classroom, Drive, Tasks), Microsoft (Outlook, Calendar, Tasks), GitHub (Issues, PRs), Notion, Todoist, Linear, and Slack.
  - Render an empty-state card ("Connect your first account") on the dashboard when `accounts.length === 0`, directing the user to `/integrations` instead of showing empty widgets.
  - Render actual user name and avatar from Supabase session in the navbar and greeting hero, along with a functional Sign Out button that purges cached TanStack queries and store state.
  - Show "Not configured" badges on integration cards whose environment variables/keys are missing.
- **What could go wrong**:
  - Auth loop between `/login` and `/` if session state is not resolved synchronously or during hydration.
  - State parameter tampering or replay attacks during OAuth callback if HMAC signature is missing.
  - Refresh token collisions or scope mismatches when connecting multiple accounts from the same provider (e.g. 2 Gmail accounts).
  - Race conditions between database user trigger and client profile query.

### 2. Data Flow from Provider API to Database to UI
1. **User Sign In**:
   - `User clicks "Continue with Google" or "Continue with GitHub"` -> `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: ${appUrl}/auth/callback } })` -> `Provider signs in user` -> `Redirect to /auth/callback` -> `Exchange session` -> `Check public.profiles.is_onboarded` -> `Redirect to / or trigger OnboardingWizard`.
2. **Account Linking**:
   - `User clicks "Connect" on Integrations Card` -> `Client calls oauth-start Edge Function with user JWT and provider name` -> `oauth-start verifies JWT, signs HMAC state with timestamp + user_id + provider, generates consent URL with read-only scopes` -> `User grants read-only consent` -> `Provider redirects to oauth-callback Edge Function with code & state` -> `oauth-callback validates HMAC state, exchanges code for access & refresh tokens, fetches provider profile email, encrypts refresh token with AES-256-GCM, upserts connected_accounts(user_id, provider, email)` -> `oauth-callback invokes sync-provider in background` -> `Redirects user back to /integrations?status=connected&provider=${provider}`.
3. **Real Data Ingestion**:
   - `sync-provider runs per account` -> `decrypts refresh token via oauth-refresh` -> `fetches Google Calendar / Classroom / Gmail / Drive / Tasks / Microsoft / GitHub / etc.` -> `normalizes records into items schema` -> `upserts into items table on (account_id, source_id)` -> `writes sync_logs per data stream` -> `TanStack Query refetches items and sync_logs` -> `Dashboard widgets update live`.

### 3. Edge Cases & Resilience
- **Expired Tokens (HTTP 401)**: `sync-provider` calls token refresh endpoint. If refresh token is revoked or invalid, account is updated to `status: 'needs_reconnect'`.
- **Rate Limits (HTTP 429 & 5xx)**: Implemented jittered exponential backoff (up to 3 retries) with isolated try/catch per stream.
- **Multiple Accounts Per Provider**: Schema uses `UNIQUE(user_id, provider, email)`, allowing unlimited separate Gmail, Outlook, or GitHub accounts for the same user.
- **Unconfigured Providers**: Integrations page cards inspect server/client availability. If keys are missing, the card displays "Not configured" and disables the connect action with a tooltip explaining required setup.

### 4. Security Considerations
- **Strict Read-Only Scopes**: Only read permissions (`calendar.readonly`, `gmail.readonly`, `classroom.courses.readonly`, `drive.readonly`, `tasks.readonly`, `User.Read`, `Calendars.Read`, `Mail.Read`, etc.) are requested. Full email bodies are never fetched or stored—only subject, sender, date, and brief snippet for task classification.
- **Server-Side Secret Isolation**: No client secret or encryption key is exposed to the frontend bundle. All token exchanges and decryption occur strictly within Supabase Edge Functions.
- **State HMAC CSRF Protection**: OAuth `state` parameter contains `{ userId, provider, exp, sig }` verified against server encryption key, preventing CSRF injection.

### 5. Files to Create and Update
- Database Migration: `supabase/migrations/20260303000000_profiles_and_triggers.sql`
- Edge Function `oauth-start`: `supabase/functions/oauth-start/index.ts`
- Edge Function `oauth-callback`: `supabase/functions/oauth-callback/index.ts` (enhanced multi-provider + HMAC verification)
- Edge Function `sync-provider`: `supabase/functions/sync-provider/index.ts` (enhanced multi-provider pipelines)
- Auth Store: `src/store/useAuthStore.ts` (connected to real Supabase session, profile, sign-out)
- Login Page: `src/pages/LoginPage.tsx` (unique brand UI, preview, dark/light theme, Google & GitHub buttons)
- Auth Callback Page: `src/pages/AuthCallbackPage.tsx` (exchanges hash/code, loading and error states)
- Route Guard & App Routing: `src/App.tsx` (protected routes, redirect logic)
- Dashboard Page: `src/pages/DashboardPage.tsx` (connect first account empty state when accounts = 0)
- Navbar: `src/components/layout/Navbar.tsx` (user avatar, display name, real sign-out dropdown with query cache clearing)
- Hero: `src/components/dashboard/RightNowHero.tsx` (personalized user greeting with avatar)
- Integrations: `src/pages/IntegrationsPage.tsx` (OAuth start trigger, multi-account support, "Not configured" state)

---

## Phase 10: Live Sync Reliability + UI/UX Overhaul (Diagnosis → Fix → Redesign)

### 1. DIAGNOSIS: Why "No Data After Connect" Happened

Audit findings (verified by reading every relevant file before changing anything):

1. **Demo fallback is already OFF — confirmed.** `src/lib/env.ts` hardcodes `demoFallbackEnabled: false` and `isDemoMode() => false`. No component imports `src/lib/demo-data.ts` (ripgrep found zero matches in `src/`). Mock data cannot be the cause.
2. **Per-provider sync functions do not exist — confirmed missing.** Only a single monolithic `sync-provider` exists, and its body only implements `if (account.provider === 'google')`. Microsoft/GitHub/Notion/Todoist/Slack/Linear/iCal accounts sync **nothing** silently. → FIX: dedicated `google-sync`, `microsoft-sync`, `github-sync`, `notion-sync`, `todoist-sync`, `slack-sync`, `linear-sync`, `ical-sync` functions + `sync-provider` becomes a thin dispatcher.
3. **oauth-callback first-sync race — confirmed.** It fires `fetch(...)` to `sync-provider` without `await` and without `.json()` consumption; on deny it still redirects. Worse, the old dispatcher would 404/401 silently. → FIX: `await` the first sync against the new per-provider function, wait for completion, then redirect with `synced=true&items=N`.
4. **Query-key mismatch — confirmed silent killer.** `ConnectModal` invalidates `['connected-accounts']`, `['sync-logs']` (kebab-case), but `useSyncData` queries `['connected_accounts']`, `['sync_logs']` (snake_case). Invalidations hit nothing. → FIX: shared query-key constants module.
5. **Dual sync triggers — confirmed.** `useAppStore.triggerSync` is a fake `setTimeout(1100)` mock; `useSyncData.syncMutation` is the real Edge Function call. Navbar uses the fake one. → FIX: delete the mock; single source of truth in the hook.
6. **`sync_logs` upsert mismatch — confirmed.** Old logs insert `items_synced` but UI reads `items_upserted`/`items_fetched` (migration added the columns, sync code half-adopted them). Also the sync log SELECT policy exists but the Edge Function writes via service role (fine) — the real gap is per-stream error text was never consistently surfaced. → FIX: helpers always write all columns; SyncStatusPanel reads them.
7. **Upsert semantics — verified OK but fragile.** `items` has `UNIQUE(account_id, source_id)` and upserts pass `onConflict: 'account_id,source_id'`. KEPT, but moved into a shared `upsertItems()` helper that (a) never throws mid-stream (per-item try/catch), (b) strips `raw` payloads > 64KB to avoid Postgres TOAST/row-size failures before insert, (c) returns exact counts.
8. **RLS — verified correct shape.** Edge Functions write with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS, preserves `user_id`); frontend reads with user JWT (`auth.uid() = user_id`). Both migration files confirm policies. No change needed; documented + regression-tested via `sync_logs` visibility.
9. **Scopes — not recorded.** `connected_accounts` has no `granted_scopes` column, so the app can't tell which Google stream failed due to missing consent. → FIX: migration adds `granted_scopes TEXT[]`; oauth-callback parses Google's `scope` response field and stores it; SyncStatusPanel + IntegrationsPage render "Scope missing — reconnect" hints when a stream's required scope isn't granted.
10. **Token refresh gaps — confirmed.** `oauth-refresh` handles only google/microsoft; GitHub/Notion/Todoist/Linear/Slack use long-lived tokens. Refresh logic duplicated inline. → FIX: `_shared/token-refresh.ts` with per-provider strategy map (real refresh vs bearer-token reuse), used by every sync function.
11. **No disconnect function.** → FIX: `disconnect-account` Edge Function: revoke where provider supports it (Google, GitHub), delete tokens, delete account row (DB cascade wipes items + sync_logs), frontend invalidates queries.

### 2. DATA FLOW (After Fix)
`Connect` → `oauth-start` (signed state, read-only scopes) → provider consent → `oauth-callback` (verify state → exchange → encrypt AES-256-GCM → upsert account + granted scopes → **await** `sync-provider` → per-provider dispatch) → `{provider}-sync` (refresh via shared helper → per-data-type try/catch → fetchWithRetry pagination → `upsertItems` on `(account_id, source_id)` → per-stream `sync_logs` row incl. HTTP status + error body) → client `useSyncData` invalidates exact keys → TanStack Query refetch under RLS → Zustand → widgets render with per-stream health + exact counts + visible error text.

### 3. Edge Cases & Resilience
- Stream failure isolation: each data type in its own try/catch; one failing stream never blocks others; every non-2xx logs `HTTP <status>: <body>` to console AND `sync_logs.error_message`.
- 401 → shared token refresh → single retry → else `needs_reconnect`. 429/5xx → `fetchWithRetry` honors `Retry-After`, jittered exponential backoff (already exists, reused everywhere).
- iCal: fetch raw `.ics`, parse VEVENTs (SUMMARY/DTSTART/DTEND/LOCATION/URL), handle webcal://→https://, guard against malformed lines; upsert with `source_id = uid or hash`. `disconnected@` sentinel skipped.
- First-sync timeout: oauth-callback caps awaited sync at ~25s then still redirects (URL carries outcome).
- Zero-result streams distinguished from failures in the UI: "No data found" vs "Failed: <HTTP error>".
- prefers-reduced-motion gates all route/widget animations.

### 4. Security
- Read-only scopes only (unchanged). Secrets only in Edge Function env (unchanged). State HMAC verified with exp check (kept). Tokens AES-256-GCM encrypted (kept). `disconnect-account` authenticated by user JWT; deletes scoped to `auth.uid()`-verified user.

### 5. UI/UX & Navigation Overhaul — Design Decisions

**Design tokens (one source: `src/index.css`)**
- Full CSS-variable token set for BOTH themes, each designed deliberately (not inverted): dark = deep space-graphite `#0B0E14` base with layered panels; light = warm paper `#FAF7F2` with ink text.
- Accent identity: **electric indigo→violet** (`#6C5CE7` family) — confident, distinctive, not the default slate/blue dashboard look. Success=emerald, warning=amber, danger=rose, info=sky — identical roles everywhere.
- Typography pairing (Google Fonts): **Sora** (expressive geometric display for headings), **Inter** (UI text), **JetBrains Mono** (timestamps, countdowns, source tags). Loaded in `index.html` with preconnect.
- Spacing/radius/shadow scales as tokens: `--radius-*`, `--shadow-glow-*`; Tailwind v4 `@theme` block maps tokens so utilities like `bg-card`, `text-muted-foreground`, `rounded-xl`, `font-display` are token-driven everywhere.

**Navigation (react-router)**
- Nested routes under persistent `AppShell`: `/` (Dashboard), `/deadlines`, `/calendar`, `/files`, `/integrations`, `/settings`, `/privacy`. Shell (sidebar/header) never remounts → zero full page reloads between tabs.
- New persistent left **Sidebar** (desktop ≥lg): brand, nav items with active-route pill (Framer Motion `layoutId` sliding highlight), workspace switcher, account dots; collapses to icons on md.
- **Mobile bottom nav** (<md) with 5 primary destinations + drawer for the rest.
- Route transitions: `AnimatePresence` + `motion.div` fade/slide on every route element.
- Filters (account/type/workspace/view) become **URL query params** (`useSearchParams`) so refresh/back/forward preserve state; store filters stay as derived state from URL.
- Shared `layoutId` elements: Ctrl+K trigger pill and account-switcher dots animate across pages.

**Interactivity**
- Toast system (`src/components/ui/toast.tsx`, Zustand-driven): fired on connect, sync start/finish w/ counts, mark-done, errors.
- Skeleton loaders shaped like real cards (`src/components/ui/skeleton.tsx`) for dashboard boards.
- Animated counters for deadline metrics; spring check-off animation on completion; smooth expand/collapse (height auto) on cards.
- Drag-to-reorder dashboard widgets (native HTML5 DnD), order persisted per user in `user_settings.widget_order` (JSONB) via debounce upsert; falls back to local order for unconfigured DB.
- Command palette reachable on every tab (already global — kept, restyled to tokens).
- All hover states: border + subtle translate/scale + shadow transitions (not just color); focus-visible rings everywhere.

**Consistency**
- One `Button` (variants: primary/secondary/ghost/danger; sizes sm/md), one `Card`, one `Badge`/`StatusDot` component with the canonical status→color map (connected=emerald, syncing=sky pulse, needs_reconnect=amber, error=rose, paused=slate) used by account cards, sync panel, integrations page.
- Shared `EmptyState`, `Skeleton`, `ErrorNotice` used by every widget; no one-off visuals.

### 6. Exact Files for Phase 10
- DB: `supabase/migrations/20260304000000_sync_reliability.sql`
- Shared (Deno): `supabase/functions/_shared/token-refresh.ts`, `supabase/functions/_shared/sync-helpers.ts`
- New sync functions: `google-sync`, `microsoft-sync`, `github-sync`, `notion-sync`, `todoist-sync`, `slack-sync`, `linear-sync`, `ical-sync`, `disconnect-account` (each `index.ts`)
- Rewritten: `sync-provider` (dispatcher), `oauth-callback` (scopes + awaited first sync), `oauth-refresh` (uses shared helper)
- Frontend: `src/lib/queryKeys.ts`, `src/hooks/useSyncData.ts`, `src/store/useAppStore.ts`, `src/components/ui/{button,card,badge,skeleton,toast}.tsx`, `src/components/layout/{Sidebar,AppShell,Navbar,MobileNav}.tsx`, `src/pages/{DashboardPage,DeadlinesPage,FilesPage,SettingsPage}.tsx`, `src/App.tsx`, `src/index.css`, `index.html`, dashboards boards refit to primitives

---

## Phase 11: Frontend Rebuild — Elimination of "AI Slop" & Cohesive Design System

### 1. Concrete Audit: What Reads as "AI Slop" (Per Screen)

#### A. Global App Shell, Navigation & Layout (`Navbar.tsx`, `Sidebar.tsx`, `MobileNav.tsx`, `AppShell.tsx`)
1. **Redundant Duplicate Navigation**: The workspace switcher appears both as raw pills in the top navbar AND as a vertical list in the sidebar. This confuses mental models and looks like two uncoordinated prompt outputs merged together.
2. **Generic Blue Gradient & Disjointed Brand Identity**: The logo uses `from-primary to-[#4f8cff]` in Navbar, but `from-sky-400 to-blue-600` on LoginPage, with an ad-hoc letter "U" inside a generic rounded box.
3. **Mismatched Interactive Controls**: Notification buttons, theme toggles, and sync triggers each have inline styling (`p-1.5`, `p-2`, `px-3`), inconsistent hover effects, and lack standardized focus-visible rings.
4. **Missing Shared Layout Polish**: Nav transitions feel like separate pages without springy shared-layout animations. Mobile navigation lacks ergonomic thumb-zone feel and haptic visual feedback.

#### B. Dashboard & Hero (`DashboardPage.tsx`, `RightNowHero.tsx`)
1. **The Classic AI Gradient Blob**: `bg-sky-500/10 rounded-full blur-3xl pointer-events-none` floating in the top right. A trademark tell of an AI generating a "futuristic glassmorphism" template.
2. **Cliché '✨ Powered by AI' and Sparkle Icons**: Sparkle icons (`Sparkles`) scattered with vague buzzwords ("Personalized Hub", "Intelligent Command Center") instead of showing concrete, actionable data.
3. **Rigid Uniform 2-Column Grid instead of a Real Bento Grid**: Deadlines, files, timeline, and emails are squished into two identical columns regardless of content priority or emptiness. A true bento grid dynamically scales the hero and highest-urgency streams with visual variety.
4. **Light-Mode Contrast Breakdown**: In dark mode, `bg-rose-950/20` and `bg-amber-950/20` look tolerable; in light mode, they render as muddy brown sludge on warm paper, violating WCAG contrast ratios.
5. **Static Numbers Without Living Metrics**: Urgency scores, deadline counts, and sync status are static text with no animated number counters (`framer-motion` counter) or living pulse.

#### C. Deadlines & Tasks (`DeadlinesBoard.tsx`, `DeadlinesPage.tsx`)
1. **Hand-Rolled Custom Checkboxes**: Raw `<button>` elements with brittle Tailwind classes instead of an accessible, animated Checkbox component with spring physics and proper ARIA states.
2. **Raw Inline Color Hacks**: `style={{ backgroundColor: `${account.color}15`, color: account.color }}` producing unreadable low-contrast text on bright backgrounds.
3. **Badge Chaos**: Some badges use `font-mono px-2 py-0.5`, others use `px-2.5 py-1`, others use ad-hoc colored borders. No unified `Badge` primitive.
4. **Abrupt State Updates**: Completing a task immediately snaps the row into strikethrough with zero micro-interaction celebration or smooth reordering.

#### D. Events & Timeline (`EventsTimeline.tsx`, `CalendarPage.tsx`)
1. **Floating Incoherent Timeline Line**: A disconnected `border-l-2` line with misaligned bullet dots that don't match event durations or intervals.
2. **Boring Empty States**: Generic gray circles with "No events found" instead of an actionable invitation with quick-add shortcuts or Google/Outlook sync prompts.
3. **Missing Date Scroller Ergonomics**: Calendar page displays static tables without intuitive keyboard navigation (left/right arrow navigation) or animated day transitions.

#### E. Login & Landing (`LoginPage.tsx`)
1. **The Centered Cliché Hero**: Centered text with `One calm view for everything you do` and a generic "✨ Cross-Platform Command Center" pill.
2. **Fake Static Mock Preview**: The right side displays hardcoded fake JSX components that don't match the real app's design system or live components.
3. **Disconnected OAuth Button Styles**: Raw button markup with inline SVGs instead of leveraging the central `Button` component with hover springs and active states.

#### F. Design System & Accessibility Primitives
1. **Non-Existent Font Classes**: Components frequently use `font-heading`, which was never defined in Tailwind v4 theme, causing browser fallback to system-ui!
2. **Missing Radix Primitive Backbones**: Modals and dropdowns use raw unmanaged divs with partial keyboard traps and missing screen reader announcements.
3. **No Screen Reader Live Region**: Sync updates, deadline check-offs, and error states only trigger visual toasts without polite `aria-live="polite"` feedback for screen reader users.

---

### 2. Concrete Architectural Remediation Plan

#### Step 1: Design Tokens & Typography Standardization (`src/index.css`, `index.html`)
- **Accent Identity**: Firmly anchor the entire application to **Electric Indigo** (`#7c6cf6` dark / `#6049ea` light). Secondary accents: emerald (`#10b981`), amber (`#f59e0b`), rose (`#f43f5e`), cyan (`#06b6d4`).
- **Typography Scale**:
  - Display: `Sora` (loaded via Google Fonts) for display titles, card headers, and metrics. Define `font-display` and alias `font-heading` to `Sora` so legacy classes resolve correctly.
  - Body: `Inter` for crisp readability, form controls, and labels.
  - Mono: `JetBrains Mono` with `font-feature-settings: 'tnum' on, 'zero' on` for timestamps, countdowns, and source tags.
- **Surface Elevation & Shadows**:
  - Tokenized shadows: `--shadow-card`, `--shadow-card-hover`, `--shadow-glow`, `--shadow-float`.
  - Tokenized radii: `--radius-sm` (8px), `--radius-md` (12px), `--radius-lg` (16px), `--radius-xl` (24px), `--radius-full`.
  - Light theme: Warm alabaster (`#f7f6f3`), slate ink (`#181a20`), soft linen cards (`#ffffff`), and violet-tinted borders (`#e6e4df`).
  - Dark theme: Space obsidian (`#0b0e14`), high-contrast off-white (`#f0f2f8`), deep graphite cards (`#121622`), and indigo borders (`#22293e`).

#### Step 2: Unified Reusable Primitives (`src/components/ui/`)
1. **Button (`button.tsx`)**:
   - Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`.
   - Sizes: `xs`, `sm`, `md`, `lg`, `icon`.
   - Built on `framer-motion` with spring hover (`y: -1`), tap feedback (`scale: 0.98`), focus-visible rings (`ring-2 ring-primary ring-offset-2`).
2. **Card (`card.tsx`)**:
   - Variants: `bento` (glass panel with subtle hover lift and reactive border), `subtle` (embedded section container), `floating` (modal/popover surface).
   - Primitives: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`, `CardFooter`.
3. **Badge & StatusDot (`badge.tsx`)**:
   - Canonical status tones: `connected` (emerald), `syncing` (sky pulsing), `warning` (amber), `error` (rose), `neutral` (slate), `accent` (indigo).
   - High WCAG AA contrast in both dark and light modes using deliberate color tokens.
4. **Checkbox (`checkbox.tsx`)**:
   - Radix-inspired accessible toggle with spring-checked icon animation and sound/haptic visual ripple.
5. **MetricCounter (`metric-counter.tsx`)**:
   - Living animated number counters for urgent deadlines, active sync streams, and unread items using `framer-motion`.
6. **LiveAnnouncer (`live-announcer.tsx`)**:
   - Polite invisible ARIA live region announcing background sync completions and action confirmations to screen readers.

#### Step 3: Bento Grid Dashboard Overhaul (`DashboardPage.tsx`, `RightNowHero.tsx`)
- **True Bento Layout**:
  - Hero item (closest meeting + countdown) spans full width or 8 columns with prominent typography and visual clarity.
  - Priority Deadlines card gets large primary visual weight with animated progress ring.
  - Schedule Timeline gets dedicated vertical rhythm.
  - Active Files and Key Emails sit in compact secondary bento tiles.
- **Eliminate AI Tropes**:
  - Remove all generic gradient blob divs. Replace with purposeful, subtle ambient radial gradient tied to the electric indigo accent.
  - Strip cliché "✨ powered by AI" copy; replace with clear, concrete action labels: "Unified Feed", "Upcoming Deadlines", "Account Health".

#### Step 4: Cohesive Navigation & Polish
- Unify Workspace Switcher into the Sidebar (desktop) and Drawer (mobile). Top Navbar remains dedicated to Search (Ctrl+K), Sync Status, Notifications, Theme Toggle, and User Profile.
- Shared `layoutId` on navigation pills for seamless fluid animations between views.
- Keyboard navigation: Full tab-index flow, arrow keys in lists and calendars, Ctrl+K command palette with instant search and shortcuts.

#### Step 5: Mobile & PWA Verification
- Bottom navigation with safe-area padding and 44px+ touch targets.


---

## Phase 3: Comprehensive Root Cause Diagnosis & Systematic Remediation

### 1. BUG 1: EMAIL SYNC ERROR (Gmail Stream)
#### Concrete Symptoms & Failure Points:
- When a Google account is connected, the Sync Status Panel shows Gmail notices as "Failed" or generic API error while other streams (Calendar, Classroom) may succeed or also fail with vague messages.
- Console error logs show cryptic 403 or truncated status messages without actionable remediation.

#### Real Root Causes:
1. **Google Cloud API Disabled (`accessNotConfigured`)**:
   - In newly created Google Cloud OAuth projects, the **Gmail API** (`gmail.googleapis.com`) is **disabled by default**.
   - Unlike Calendar which is frequently enabled during initial quickstarts, Gmail requires explicit activation in the Google Cloud Console.
   - Google returns HTTP 403 with `status: PERMISSION_DENIED` and `reason: SERVICE_DISABLED` containing a project-specific activation link (`https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=...` or `https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=...`).
   - Previously, our regex `GOOGLE_ENABLE_URL_RE` only looked for `console.developers.google.com/apis/api/...`, silently failing to match `console.cloud.google.com` URLs!
2. **Missing Granular Scope Consent**:
   - Google OAuth consent screen displays granular checkboxes for each requested scope (`gmail.readonly`, `calendar.readonly`, etc.).
   - If the user unchecks the Gmail permission checkbox, or if the account was connected before `https://www.googleapis.com/auth/gmail.readonly` was added to `oauth-start`, the account row's `granted_scopes` lacks `gmail`.
   - The sync helper correctly detects this via `missingScope(ctx, 'gmail')`, but the UI did not clearly explain that the user must re-consent with the Gmail checkbox checked.
3. **Double Error Humanization & Truncation**:
   - In `_shared/sync-helpers.ts`, `fetchJson` called `humanizeProviderError(..., res.status, body)`.
   - Then in `runStream`, `catch (err)` called `humanizeProviderError(..., null, errorMessage)` a second time!
   - This second call ran with `status: null`, destroying HTTP status codes and truncating the message to 300 characters, discarding the exact Google API error details (`code`, `reason`, `extendedHelp`).
4. **Sequential Pagination / Message Fetching**:
   - The Gmail stream fetches 35 message IDs, then runs 35 sequential `fetchJson` calls. If any single message fails or returns a 429 rate limit or 401 token refresh mid-stream, error handling needed to isolate individual message retrieval so transient issues don't abort the entire stream.

#### Systematic Fix:
- In `_shared/sync-helpers.ts`: Parse full JSON error objects from Google API (`error.message`, `error.status`, `error.details`).
- Expand `GOOGLE_ENABLE_URL_RE` to match all Google Cloud console URLs (`console.developers.google.com` and `console.cloud.google.com`).
- Stop double-humanizing in `runStream`. Persist both humanized actionable text AND exact Google error details to `sync_logs.error_message`.
- In `SyncStatusPanel.tsx`: Display the real error with collapsible details, full text copy, and dedicated buttons: "Enable on Google Cloud" (direct link), "Reconnect Account" (with scope instruction), or "Retry Stream".

---

### 2. BUG 2: BLANK/WHITE SCREEN WHEN SWITCHING TABS
#### Concrete Symptoms:
- Clicking between sidebar navigation tabs (e.g. from Dashboard to Deadlines or Calendar) occasionally renders a blank white area where page content should be.
- A manual page reload is required to restore content.

#### Real Root Causes:
1. **Uncaught Render Errors & Missing Route-Level Error Boundaries**:
   - React 18 completely unmounts the component tree up to the nearest Error Boundary when any component throws an error during render.
   - Because `App.tsx` only had a single global Error Boundary at the root level (and none inside `AppShell` or around `<Outlet />`), any uncaught render exception in a page caused React to unmount the entire page content.
2. **Defensive Data Access Flaws During Store Hydration / Cache Transitions**:
   - In `DeadlinesPage`, `items.filter(...)` ran without guarding against `items` being `undefined` or null during query transitions.
   - In `DeadlinesPage`, `new Date(i.due_at)` and `formatDueCountdown` did not defensively check for `isNaN(date.getTime())`, throwing or producing `NaN` representations.
   - In `FilesPage`, `accounts.find(...)` and `items.filter(...)` lacked defensive fallbacks when store state was hydrating.
   - In `CalendarPage`, event date parsing did not filter out invalid date strings before arithmetic sort operations.
3. **`AnimatePresence mode="wait"` Transition Race Condition**:
   - `AppShell.tsx` wrapped `<Outlet />` inside `<AnimatePresence mode="wait">` keyed by `location.pathname`.
   - When switching tabs, the outgoing route plays its exit animation (0.22s). If the incoming route chunk is still downloading or if `Suspense` unmounts prematurely during exit, Framer Motion can enter an empty transition state.

#### Systematic Fix:
- Create `RouteErrorBoundary.tsx` that wraps `<Outlet />` inside `AppShell.tsx`. If an individual page encounters an unexpected error, an on-brand in-shell error card is displayed with "Retry" and "Return to Dashboard", while the Navbar, Sidebar, and other tabs remain fully functional.
- Add `initial={false}` to `AnimatePresence` and ensure smooth exit/enter transitions.
- Add defensive null-guards across all page components: `(items || [])`, `(accounts || [])`, and sanitize date inputs in `formatDueCountdown`.

---

### 3. BUG 3: APP GETS STUCK, REQUIRES MANUAL HARD REFRESH
#### Concrete Symptoms:
- After a new deployment or when an error occurs, hitting normal browser refresh (F5 / `location.reload()`) does NOT fix the app.
- Users are trapped in a broken state until they perform a manual Ctrl+Shift+R or clear browser cache.

#### Real Root Causes:
1. **Service Worker Cache-First Strategy for `index.html`**:
   - In `public/sw.js`, the fetch handler used a **Cache-First** strategy: `caches.match(event.request)`.
   - When `/` or `/index.html` was requested, the service worker returned the cached `index.html` from `unifyhub-v1` without checking the network!
   - Because `CACHE_NAME` was static (`unifyhub-v1`), the browser never fetched the new `index.html` produced by a new Vercel deployment.
2. **Stale Dynamic Import Chunk 404s**:
   - The stale cached `index.html` referenced old JavaScript chunk hashes (e.g. `/assets/DashboardPage-xyz.js`).
   - After a new build on Vercel, those old chunk hashes no longer exist.
   - When Vite attempts to load a route chunk via `React.lazy()`, the browser gets a 404, throwing:
     `TypeError: Failed to fetch dynamically imported module`.
   - Normal `window.location.reload()` simply reloaded the same stale cached `index.html`, repeating the exact same error indefinitely!
3. **Soft Reload Does Not Clear Corrupted Cache or Query State**:
   - The old `ErrorBoundary.tsx` had a button that only called `window.location.reload()`.
   - This did not unregister service workers, did not clear Cache Storage, and did not clear TanStack Query's cache.

#### Systematic Fix:
1. **Network-First for HTML Navigation in `public/sw.js`**:
   - Change `event.request.mode === 'navigate'` to **Network-First**: always fetch the freshest `index.html` from the network when online, and only fall back to cache when offline.
   - Handle `SKIP_WAITING` and call `self.clients.claim()`.
2. **True Hard Reset Engine (`src/lib/cacheReset.ts`)**:
   - Implement `hardResetApp()`:
     a) Unregister all active Service Workers via `navigator.serviceWorker.getRegistrations()`.
     b) Wipe all entries in `window.caches` via `caches.keys()` and `caches.delete()`.
     c) Clear TanStack `queryClient.clear()`.
     d) Force navigation via `window.location.replace('/?__reset=' + Date.now())`.
3. **Auto-Recovery on Dynamic Import Failure**:
   - Listen for `vite:preloadError` on `window`: if a chunk load fails after a deploy, automatically trigger `hardResetApp()` once to seamlessly recover.
4. **On-Brand Global Error Boundary**:
   - Update `ErrorBoundary.tsx` to match the Electric Indigo design system, display collapsible error and stack trace details with copy functionality, and provide the "Hard Reload UnifyHub" button.

---

### 4. LAYOUT BUG: CONTENT RENDERING UNDER HEADER
#### Concrete Symptoms:
- "Linked logins monitored" and account cards render underneath the sticky header when the Account Drawer is opened.
- Page headings and anchors are partially obscured when scrolled into view.

#### Real Root Causes:
1. **CSS Stacking Context Trap in `AppShell.tsx`**:
   - `AppShell.tsx` wrapped the router `<main>` inside `<motion.div>` with Framer Motion properties (`initial={{ opacity: 0, y: 10 }}`).
   - In CSS specification, applying `transform`, `filter`, or `perspective` to an element creates a **new stacking context and containing block**.
   - As a result, any descendant with `position: fixed` (like `AccountDrawer` with `fixed inset-0 z-50`) is positioned relative to the transformed `motion.div` instead of the viewport!
   - Furthermore, the parent container of `<main>` had `relative z-10`, while `Navbar` had `relative z-20` (with sticky `header.z-40`).
   - Because `z-10` is lower than `z-20`, `AccountDrawer` was trapped inside a stacking context that sat physically behind the Navbar!
2. **Missing Tokenized Header Height**:
   - Sticky header height (64px / 4rem) was not declared as a CSS variable `--header-height`.
   - Content lacked consistent `scroll-margin-top` tokens to prevent headings from sliding underneath the sticky header.

#### Systematic Fix:
- Declare `--header-height: 4rem;` in `src/index.css`.
- Render `AccountDrawer` (and all other modal overlays) using **`createPortal(..., document.body)`**. Portaling to `document.body` escapes all transformed containers and stacking contexts, guaranteeing that the drawer sits at `z-50` above the entire screen.
- Elevate `Navbar` container to `relative z-40` and set `header` height to `h-[var(--header-height)]`.
- Apply `scroll-margin-top: calc(var(--header-height) + 1rem)` across page headings.

---

### 5. NEW FEATURE: THREE DISPLAY MODES (Dark / Light / Aesthetic)
#### Design & Architecture:
1. **Token Hierarchy in `src/index.css`**:
   - **Dark (Default)**: Space obsidian (`#0b0e14`), high-contrast off-white (`#eef0f8`), deep graphite cards (`#121627`), electric indigo accent (`#7c6cf6`).
   - **Light**: Warm alabaster paper (`#f7f6f2`), soft ink (`#191b26`), crisp white cards (`#ffffff`), royal indigo accent (`#6049ea`).
   - **Aesthetic**: Deep atmospheric midnight dusk (`#090a14`), ethereal glow cards (`#111224`), vibrant neon ultraviolet accent (`#9d5cfc`), tactile depth, layered radial ultraviolet glows.
2. **Store State (`useAppStore.ts`) & Types (`types/index.ts`)**:
   - Expand `theme: 'dark' | 'light' | 'aesthetic'`.
   - Persist to `localStorage.getItem('unifyhub-theme')`.
   - Provide `setTheme` and cycling `toggleTheme`.
   - Sync document root classes (`dark`, `light`, `aesthetic`).
3. **UI Selectors**:
   - In `Navbar.tsx`: 3-state icon switcher (Moon -> Sun -> Sparkles) with clear tooltip.
   - In `SettingsPage.tsx`: Full visual radio selector with color swatches and active preview.
4. **Ambient Glow Layer (`AestheticGlow.tsx`)**:
   - Gentle floating gradient orbs active only in Aesthetic mode.
   - Strict `prefers-reduced-motion` compliance.




---

## Phase 6: Full Application Architecture, Live Integration & Environment Specification

### 1. Understanding Summary
- **What is being built:** **UnifyHub** — high-density personal command station harmonizing events, deadlines, tasks, files, and AI daily briefings across Google, Microsoft, GitHub, Canvas, and 14 other services.
- **Why it exists:** To eliminate cognitive overload and context fragmentation for individuals balancing university coursework, enterprise employment, and developer projects.
- **Who it is for:** Multi-Context Power Users (Students + Developers + Working Professionals).
- **Key Constraints:** 
  1. Strict Tiered Security: The browser bundle touches only 4 public `VITE_` variables. All OAuth client secrets, refresh tokens, and encryption keys live strictly in Supabase Edge Functions & Vault.
  2. Strict Read-Only Scopes: Zero destructive write permissions requested on external provider accounts.
  3. Git Hygiene: No private tokens or `.env.local` committed to Git. A clean, fully-documented `.env.var` acts as the canonical template.
- **Explicit Non-Goals:** Two-way destructive write-backs into external provider platforms; requiring all 18 providers to be live before the app functions.

### 2. Validated Assumptions
1. Frontend is hosted statically (Vercel/Vite), while backend orchestration and token encryption run on Supabase Edge Functions (Deno) backed by Supabase Postgres with RLS.
2. AI Daily Briefings and task extraction run on Google Gemini 2.0 Flash via the `ai-briefing` edge function.
3. Provider rollout follows a Tier 1 live foundation (Google, Microsoft, GitHub, Canvas LMS) with graceful fallback to realistic demo data for unconfigured secondary providers.

### 3. Comprehensive Decision Log
| # | Topic | Decision | Alternatives Considered | Rationale |
|---|---|---|---|---|
| **D-01** | **Primary Scope** | Full Architecture & Live Integration Flow | Provider Prioritization only | Delivers end-to-end sync across OAuth, DB, Gemini AI, and UI with a solid env matrix. |
| **D-02** | **Target Persona** | Multi-Context Power User (Student + Dev + Pro) | Tech Pro only, Student only | Fits UnifyHub's core mission to harmonize disparate life streams. |
| **D-03** | **Security Model** | Strict Tiered Security | Monolithic env file | Prevents secret leakage to browser bundle while keeping dev ergonomic. |
| **D-04** | **Provider Rollout** | Tier 1 Live Foundation + Demo Fallback | All 18 Live mandatory | Enables immediate real usage (Google, Microsoft, GitHub, Canvas). |
| **D-05** | **Sync Frequency** | On-demand + Hourly background + 5-min cache | Realtime webhooks | Conserves quotas while keeping data fresh. |
| **D-06** | **Config Division** | `.env.local` (4 Vite keys) + `.env.var` (Full Template) | Single bloated file | Clean separation of concerns and safe Git tracking. |

### 4. Final Environment Blueprint
To make UnifyHub operational:
1. **Frontend (`.env.local`):**
   - `VITE_SUPABASE_URL`: Supabase Project API endpoint
   - `VITE_SUPABASE_ANON_KEY`: Supabase Client Anon Key
   - `VITE_APP_URL`: Frontend base URL (`http://localhost:5173` or production)
   - `VITE_ENABLE_DEMO_FALLBACK`: Set to `true` to ensure unconfigured providers display rich mock data
2. **Backend & Edge Functions (`.env.var` / Supabase Vault):**
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role secret for edge sync bypassing RLS
   - `TOKEN_ENCRYPTION_KEY`: 32-byte AES-256-GCM hex key (`openssl rand -hex 32`)
   - `GEMINI_API_KEY`: Google AI Studio API key
   - Provider OAuth Credentials (`GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`, etc.)
