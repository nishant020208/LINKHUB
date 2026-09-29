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
