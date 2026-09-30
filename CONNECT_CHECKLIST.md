# UnifyHub Services Connection Checklist

This checklist details every external integration, the required environment variables, which file consumes them, and step-by-step instructions to test each connection once keys are ready.

---

## 1. Supabase (Database, Auth, Edge Functions)
- **Status**: Ready for keys
- **Variables Needed**:
  - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Backend: `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY`
- **Consumed in**:
  - `src/lib/env.ts` (Client validation)
  - `src/lib/supabase.ts` (Supabase client init)
  - `supabase/functions/common/crypto.ts` (AES-GCM encryption)
  - `supabase/functions/sync-provider/index.ts`
- **How to test**:
  1. Populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.
  2. Open the app; confirm the demo banner switches to "Live Supabase Connected".
  3. Sign in via Supabase Auth; verify a user session appears in the Supabase Auth dashboard.

---

## 2. Google Workspace & Classroom (Gmail, Calendar, Drive, Classroom, Tasks)

### ⚠️ REQUIRED: Enable all 5 Google APIs before connecting (fixes `403 accessNotConfigured` / `SERVICE_DISABLED`)

A brand-new Google Cloud project has every API turned OFF. If you connect an account before enabling them, every sync stream fails with HTTP 403:

1. Open <https://console.developers.google.com/apis/library?project=YOUR_PROJECT_ID>
2. Enable **each** of these five APIs (click → Enable, one at a time):
   - [Google Calendar API](https://console.developers.google.com/apis/api/calendar-json.googleapis.com) (`calendar-json.googleapis.com`)
   - [Google Classroom API](https://console.developers.google.com/apis/api/classroom.googleapis.com) (`classroom.googleapis.com`)
   - [Gmail API](https://console.developers.google.com/apis/api/gmail.googleapis.com) (`gmail.googleapis.com`)
   - [Google Drive API](https://console.developers.google.com/apis/api/drive.googleapis.com) (`drive.googleapis.com`)
   - [Google Tasks API](https://console.developers.google.com/apis/api/tasks.googleapis.com) (`tasks.googleapis.com`)
3. Wait 1–2 minutes for propagation (Google's own error message says so).
4. In UnifyHub, press **Sync Now** (Integrations page) or the stream's **Retry** button.

The Sync Status panel and the account card on the Integrations page render a direct
**Enable on Google Cloud** button for the exact API that failed — clicking it, pressing
Enable, then Sync Now is the full recovery flow.

- **Status**: Ready for keys
- **Variables Needed**:
  - Backend: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- **Consumed in**:
  - `supabase/functions/oauth-callback/index.ts`
  - `supabase/functions/oauth-refresh/index.ts`
  - `src/adapters/google/index.ts`
- **Required Read-Only Scopes**:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/classroom.courses.readonly`
  - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
  - `https://www.googleapis.com/auth/drive.metadata.readonly`
  - `https://www.googleapis.com/auth/tasks.readonly`
- **How to test**:
  1. Set secrets using `supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...`
  2. On the Integrations page, click "Connect" on Google Account.
  3. Complete Google OAuth consent and check that deadlines, emails, and calendar events populate the unified dashboard.

---

## 3. Microsoft 365 (Outlook Mail, Calendar, To Do, OneDrive, Teams)
- **Status**: Ready for keys
- **Variables Needed**:
  - Backend: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI`
- **Consumed in**:
  - `supabase/functions/oauth-callback/index.ts`
  - `src/adapters/microsoft/index.ts`
- **Required Scopes**:
  - `Mail.Read`, `Calendars.Read`, `Tasks.Read`, `Files.Read`, `User.Read`, `offline_access`
- **How to test**:
  1. Register an App in Azure Portal (Entra ID), setting the redirect URI to the Supabase function callback.
  2. Click "Connect" on Microsoft Account in UnifyHub Integrations.
  3. Verify Outlook meetings and To Do items sync into the Today view.

---

## 4. Google Gemini AI (Daily Briefing & Email Action Parsing)
- **Status**: Ready for keys
- **Variables Needed**:
  - Backend: `GEMINI_API_KEY`
- **Consumed in**:
  - `supabase/functions/ai-briefing/index.ts`
  - `supabase/functions/extract-actions/index.ts`
- **How to test**:
  1. Set `GEMINI_API_KEY` in Supabase secrets.
  2. Click "Regenerate Briefing" in the Right Now hero section; verify a natural, tailored summary of your day is produced from synced items.

---

## 5. GitHub, Notion, Todoist, Linear
- **Status**: Ready for keys
- **Variables Needed**:
  - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`
  - `TODOIST_CLIENT_ID`, `TODOIST_CLIENT_SECRET`
  - `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`
- **Consumed in**:
  - `supabase/functions/oauth-callback/index.ts`
  - Respective adapter directories in `src/adapters/`
- **How to test**:
  1. Configure OAuth apps on each developer portal.
  2. Trigger connect and verify issues, tasks, and pages normalize into the `Item` schema.

---

## 6. Notification Channels (Email, Web Push, Telegram, SMS, WhatsApp)
- **Status**: Ready for keys
- **Variables Needed**:
  - `RESEND_API_KEY`
  - `TELEGRAM_BOT_TOKEN`
  - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
  - (Optional) `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
  - (Optional) `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- **Consumed in**:
  - `supabase/functions/dispatch-notification/index.ts`
- **How to test**:
  1. Set channel tokens.
  2. In Settings -> Notifications, click "Send Test Notification" on enabled channels.
