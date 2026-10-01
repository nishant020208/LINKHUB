# UnifyHub Services Connection Checklist

Every external integration, the Supabase Edge Function secrets it needs, where
to get them, and the one shared callback URL to register.

---

## The single shared OAuth callback URL

Every OAuth provider registers **exactly this URL** — no query string:

```
https://lpfasogspxerqxqevewd.supabase.co/functions/v1/oauth-callback
```

The provider is read from the signed `state` token, so one URL works for all
providers. Add the `App URL` (`APP_URL`) and the redirect URL in each console.

| Provider | Callback URL to register | Where to register |
|---|---|---|
| Google | `.../functions/v1/oauth-callback` | Google Cloud Console → APIs & Services → Credentials → OAuth client → Authorized redirect URIs |
| GitHub | `.../functions/v1/oauth-callback` | GitHub → Settings → Developer settings → OAuth Apps → Authorization callback URL |
| Notion | `.../functions/v1/oauth-callback` | notion.so/my-integrations → your integration → Redirect URIs |
| Todoist | `.../functions/v1/oauth-callback` | developer.todoist.com/appconsole.html → OAuth redirect URL |
| Slack | `.../functions/v1/oauth-callback` | api.slack.com/apps → OAuth & Permissions → Redirect URLs |
| Linear | `.../functions/v1/oauth-callback` | linear.app/settings/api/applications → Redirect URIs |
| Jira | `.../functions/v1/oauth-callback` | developer.atlassian.com/console/myapps → Authorization → Callback URL |
| Asana | `.../functions/v1/oauth-callback` | app.asana.com/0/developer-console → OAuth → Redirect URL |
| ClickUp | `.../functions/v1/oauth-callback` | app.clickup.com/settings/apps → Redirect URL |
| Dropbox | `.../functions/v1/oauth-callback` | dropbox.com/developers/apps → OAuth 2 → Redirect URIs |
| Box | `.../functions/v1/oauth-callback` | app.box.com/developers/console → Configuration → Redirect URI |
| Zoom | `.../functions/v1/oauth-callback` | marketplace.zoom.us/develop/create → OAuth Redirect URL |
| GitLab | `.../functions/v1/oauth-callback` | gitlab.com/-/profile/applications → Redirect URI |
| Bitbucket | `.../functions/v1/oauth-callback` | bitbucket.org/account/settings/api → OAuth consumers → Callback URL |
| Trello | `https://lpfasogspxerqxqevewd.supabase.co/…` → use **`https://<your-app-url>/integrations`** | trello.com/power-ups/admin (fragment token returns to the app, not the function) |

All secrets are set with `supabase secrets set KEY=value` (or Supabase Dashboard
→ Project Settings → Edge Functions → Secrets). They are never placed in
`.env.local`.

---

## 1. Supabase (Database, Auth, Edge Functions)
- **Frontend (`.env.local`)**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Server secrets**: `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY`
  (`openssl rand -hex 32`), `APP_URL`, optional `STATE_SIGNING_KEY`
- **Where**: Supabase Dashboard → Project Settings → API
- **Test**: open the app; sign in; confirm the demo banner switches to live.

---

## 2. Google (Gmail, Calendar, Classroom, Drive, Tasks)
- **Secrets**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Where**: console.cloud.google.com/apis/credentials
- **REQUIRED**: enable each API in the *same* project or sync returns
  `403 accessNotConfigured`:
  - Calendar `calendar-json.googleapis.com`
  - Gmail `gmail.googleapis.com`
  - Drive `drive.googleapis.com`
  - Tasks `tasks.googleapis.com`
  - Classroom `classroom.googleapis.com`
- **Scopes**: all `*.readonly` (gmail, calendar, classroom, drive, tasks)

## 3. GitHub
- **Secrets**: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- **Where**: github.com/settings/developers → OAuth Apps
- **Scopes**: `read:user user:email repo notifications`

## 4. Notion
- **Secrets**: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`
- **Where**: notion.so/my-integrations
- **Flow note**: token exchange uses HTTP Basic auth + `owner=user` on authorize.

## 5. Todoist
- **Secrets**: `TODOIST_CLIENT_ID`, `TODOIST_CLIENT_SECRET`
- **Where**: developer.todoist.com/appconsole.html
- **Scope**: `data:read`

## 6. Slack
- **Secrets**: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`
- **Where**: api.slack.com/apps → OAuth & Permissions
- **Flow note**: user token is read from the nested `authed_user.access_token`.
- **User scopes**: `users:read,channels:history,im:history,search:read`

## 7. Linear
- **Secrets**: `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`
- **Where**: linear.app/settings/api/applications
- **Scope**: `read`

## 8. Jira (Atlassian 3LO)
- **Secrets**: `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`
- **Where**: developer.atlassian.com/console/myapps
- **Flow note**: authorize sends `audience=api.atlassian.com`; the callback
  resolves and stores the site `cloudId` via `accessible-resources`.
- **Scopes**: `read:jira-work read:jira-user offline_access`

## 9. Trello
- **Secret**: `TRELLO_API_KEY`
- **Where**: trello.com/power-ups/admin
- **Flow note**: public OAuth via the URL fragment — no code exchange. The app
  captures the token on return and saves it through `connect-credentials`.

## 10. Asana
- **Secrets**: `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET`
- **Where**: app.asana.com/0/developer-console

## 11. ClickUp
- **Secrets**: `CLICKUP_CLIENT_ID`, `CLICKUP_CLIENT_SECRET`
- **Where**: app.clickup.com/settings/apps

## 12. Dropbox
- **Secrets**: `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET`
- **Where**: dropbox.com/developers/apps
- **Flow note**: authorize adds `token_access_type=offline` for a refresh token.

## 13. Box
- **Secrets**: `BOX_CLIENT_ID`, `BOX_CLIENT_SECRET`
- **Where**: app.box.com/developers/console
- **Flow note**: refresh rotates the refresh token; the new one is re-stored.

## 14. Zoom
- **Secrets**: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`
- **Where**: marketplace.zoom.us/develop/create
- **Flow note**: token exchange authenticates with HTTP Basic.

## 15. GitLab
- **Secrets**: `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`
- **Where**: gitlab.com/-/profile/applications
- **Scopes**: `read_api read_user`

## 16. Bitbucket
- **Secrets**: `BITBUCKET_CLIENT_ID`, `BITBUCKET_CLIENT_SECRET`
- **Where**: bitbucket.org/account/settings/api
- **Flow note**: token exchange authenticates with HTTP Basic; no `redirect_uri`
  is sent on authorize (the callback is configured on the consumer).

## 17. Moodle LMS (not OAuth)
- **Secrets**: none. The user supplies the portal URL + a personal web-service
  token in the app, saved via `connect-credentials`.
- **Where**: Moodle → Preferences → Security keys (or Site admin → Plugins →
  Web services → External services)

## 18. Custom IMAP / School Mail (not OAuth)
- **Secrets**: none. The user supplies host, port (993), username, and an app
  password in the app, saved encrypted via `connect-credentials`.

---

## AI & Notification Channels
- `GEMINI_API_KEY` — aistudio.google.com/app/apikey (AI briefing + action parsing)
- `RESEND_API_KEY` — resend.com/api-keys (email)
- `TELEGRAM_BOT_TOKEN` — @BotFather (Telegram)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — `npx web-push generate-vapid-keys`
- Optional `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`,
  `TWILIO_WHATSAPP_NUMBER`

---

## Not-configured behaviour
A provider whose secrets are not set shows a **Not configured** state on its
card and its Connect button is disabled — no network call is attempted. When a
connect is started, the server returns a specific message such as
`"Notion isn't configured yet. Add the Supabase secrets NOTION_CLIENT_ID,
NOTION_CLIENT_SECRET …"` instead of a generic "non-2xx status code".
