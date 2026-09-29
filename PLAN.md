# UnifyHub Master Plan & Roadmap

## Phase 1: Foundation, Design System, Layout, Demo Mode, Env Module [COMPLETED]
- [x] Configure `.gitignore` to prevent leaking `.env` or credentials
- [x] Write `BRAINSTORM.md` for Phase 1
- [x] Write `PLAN.md` master roadmap
- [x] Create `.env.example` with comprehensive documentation of client and server variables
- [x] Create `CONNECT_CHECKLIST.md` describing per-service requirements and test procedures
- [x] Set up Vite + React + TypeScript + Tailwind CSS project configuration
- [x] Create `src/lib/env.ts` for safe typed environment validation and `isConfigured` checks
- [x] Define core domain TypeScript interfaces in `src/types/index.ts` (Account, Item, Workspace, Adapter)
- [x] Implement rich mock datasets in `src/lib/demo-data.ts` (student assignments, meetings, emails, files)
- [x] Build global application state with Zustand in `src/store/useAppStore.ts`
- [x] Build theme tokens, typography, and glassmorphic UI base in `src/index.css`
- [x] Build AppShell layout with top bar, workspace switcher, and demo mode indicator
- [x] Verify build and local dev execution

## Phase 2: Database Migrations and Auth Architecture [COMPLETED]
- [x] Brainstorm Phase 2 in `BRAINSTORM.md`
- [x] Write Postgres SQL migrations with Row Level Security (RLS) policies for:
  - `connected_accounts`
  - `integrations`
  - `items`
  - `pinned_items`
  - `workspaces`
  - `user_settings`
  - `reminders`
  - `notification_channels`
  - `sync_logs`
  - `audit_log`
- [x] Configure automated user onboarding trigger for workspaces and settings
- [x] Set up safe Supabase client wrapper with auth state management
- [x] Build Google sign-in UI, protected routes, and 3-step onboarding wizard
- [x] Integrate mock auth for Demo Mode when unconfigured

## Phase 3: Adapter System, Registry, OAuth Edge Functions [COMPLETED]
- [x] Brainstorm Phase 3 in `BRAINSTORM.md`
- [x] Create Provider Adapter interface: `{ key, name, authType, connect, fetchItems, normalize, refreshAuth }`
- [x] Build centralized Adapter Registry (`src/adapters/index.ts`) registering all 18 adapters in exact sequence
- [x] Implement Supabase Edge Functions for OAuth code exchange, refresh, and data sync:
  - `oauth-callback`
  - `oauth-refresh`
  - `sync-provider`
- [x] Implement token encryption helper with `TOKEN_ENCRYPTION_KEY` via AES-GCM
- [x] Build rate limiting and exponential backoff retry helpers with Retry-After header support

## Phase 4: Dashboard UI on Demo Data [COMPLETED]
- [x] Brainstorm Phase 4 in `BRAINSTORM.md`
- [x] Build Hero "Right now" strip: next event, urgent deadline, live ticking countdown, briefing summary
- [x] Build Bento-grid layout with Framer Motion staggered card entrances:
  - Unified Deadlines Board (Overdue, Today, This Week, Later) with heat urgency colors
  - Daily Events Timeline with focus window callout
  - Key Emails & Action Requests list with bill/flight badges
  - Pinned Files & Quick-Access Folders
- [x] Account color badges and filter toggles
- [x] Snooze modal (+3h, +24h, custom) and Mark Done interactive controls
- [x] Customizable Bento card visibility modal and Account Health drawer

## Phase 5: Search, Command Palette, Unified Calendar [COMPLETED]
- [x] Brainstorm Phase 5 in `BRAINSTORM.md`
- [x] Implement Ctrl+K Command Palette with fuzzy search across accounts, items, actions
- [x] Build Unified Calendar (Day, Week, and Agenda views with overlap awareness and video join links)
- [x] Implement global search bar with type filters and account chips
- [x] Workspaces system (College, Work, Personal, and custom workspace creator modal)

## Phase 6: Smart Features
- [x] Brainstorm Phase 6 in `BRAINSTORM.md`
- [x] Priority score ranking algorithm
- [x] Calendar conflict detector
- [x] Free-time slot finder across multi-account calendars
- [x] Duplicate item deduplication and merging
- [x] Smart reminders calculation (24h, 3h, 30m)
- [x] Detection rules for email-to-task, bills, subscriptions, and travel

## Phase 7: AI Daily Briefing and Notifications
- [x] Brainstorm Phase 7 in `BRAINSTORM.md`
- [x] Supabase Edge Function with Gemini API for daily briefing generation
- [x] Email-to-task extraction with AI date/action parsing
- [x] Notification channels config (Email, Web Push, Telegram, SMS, WhatsApp)
- [x] Quiet hours and per-channel preferences

## Phase 8: Integrations Hub & All Provider Adapters
- [x] Brainstorm Phase 8 in `BRAINSTORM.md`
- [x] Integrations management page with toggle cards, health indicators, reconnect flows
- [x] Implement adapters:
  - [x] Google (Gmail, Calendar, Classroom, Drive, Tasks)
  - [x] Microsoft (Outlook, Calendar, To Do, OneDrive, Teams)
  - [x] iCal URL importer
  - [x] GitHub, Notion, Todoist
  - [x] Slack, Jira, Linear, Trello, Asana, ClickUp
  - [x] Dropbox, Box, Zoom, GitLab, Bitbucket
  - [x] Canvas, Moodle
  - [x] IMAP (with security warning)

## Phase 9: PWA, Polish, Privacy Page, Verification
- [x] Brainstorm Phase 9 in `BRAINSTORM.md`
- [x] Installable PWA manifest and offline cache handling
- [x] Privacy page with itemized provider permissions and data boundaries
- [x] Audit log and data wipe ("Delete my data") interface
- [x] Accessibility audit, reduced motion checks, responsive test pass
- [x] Final documentation and user verification guide
