# Setup — build & run

## Prerequisites
- Node.js ≥ 18 (repo verified on Node 22).
- AWS CLI only if pushing Amplify/backend config changes.

## Install & run
```bash
npm install
npm run dev      # vite on http://0.0.0.0:3000
npm run build    # vite build → build/
npm run preview  # serve the build
npm run lint     # tsc --noEmit  ← the only typecheck gate; vite build does NOT typecheck
npm run clean    # rm -rf dist
```

**TIPS bridge (required for data, since 2026-09-24):** run `npm run bridge` in a second
terminal, then `npm run dev`. The app's "Sign in with Microsoft" button opens a
separate Chromium window (Playwright, fresh profile) for the university Microsoft
login. Needs Playwright's Chromium: `npx playwright install chromium`. The session
lives only in the bridge's memory; restarting the bridge means signing in again.

## Environment variables (`.env.local`, template `.env.example`)
- `TIPS_BRIDGE_PORT` (8791), `TIPS_HUB_SESSION_MINUTES` (160), `VITE_TIPS_BRIDGE_URL`
  (`/tips-api`) — TIPS bridge. Port 8787 was avoided: another local process uses it.
- `VITE_API_BASE_URL` — API Gateway base URL.
- `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN`,
  `VITE_OAUTH_REDIRECT_SIGN_IN`, `VITE_OAUTH_REDIRECT_SIGN_OUT` — Cognito/Amplify.
- `GEMINI_API_KEY` — optional, asset/script tooling.

## Lambda deployment (manual!)
Each `lambdas/*.mjs` documents its own console setup in its doc header: runtime
Node 22.x, handler, API Gateway method/route, JWT authorizer, env vars
(e.g. `USERS_TABLE=tokaihub-users`), and required IAM (e.g. `dynamodb:UpdateItem` on
the table ARN). Deploy = paste/upload in the Lambda console per function; pushing this
repo does not deploy them. Region: ap-northeast-1.

## Hosting (current)
Frontend: Vercel project tokai-hub-ng5h builds `main` into `build/` and serves
tokaihub.mohamedfuad.com. `.env.production` points it at `https://tokaihub-api.mohamedfuad.com/tips-api`.

Bridge on the Mac Mini: `scripts/hub.sh start|stop|status|logs|tunnel-setup|devices-reset`.
Settings in `~/.tokaihub/hub.env` (HUB_OWNER_ID, HUB_APP_ORIGIN, HUB_API_HOST). launchd agents
`com.mohamedfuad.tokaihub` (bridge, caffeinate) and `.tunnel` (cloudflared). Logs in
`~/Library/Logs/TokaiHub/`. First run: sign in from http://127.0.0.1:8791 on the Mac (tick
"Stay signed in"), then Settings, Add a phone, and enter the code on the phone.

## Frontend deployment (old)
GitHub Pages from the built `build/` output (live at mohamedfuad16.github.io/TokaiHub);
`vercel.json` also present for Vercel previews.
