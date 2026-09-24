# Architecture

## Since 2026-09-24: TIPS wrapper (branch `tips-wrapper`)
TokaiHub is now a skin over TIPS (tips.u-tokai.ac.jp, NS Solutions CampusSquare). Full
page-by-page findings: `docs/tips-integration.md`.

```
React (Vite, /tips-api proxy, loopback only)
  -> server/index.ts (express, 127.0.0.1:8791)
     -> tips/routes.ts   feature -> flow(s) -> parser -> encrypted cache (~/.tokaihub/cache)
     -> tips/client.ts   fetch() run INSIDE headless Chromium (TIPS needs legacy TLS
                         renegotiation that Node refuses); one request at a time
     -> tips/session.ts  headed Microsoft login (SAML via Entra ID -> Shibboleth SP),
                         cookies moved in memory to a headless context; Hub session
                         160 min, extendable; silent re-auth while the browser lives
     -> tips/parse/*.ts  pure html -> json (cheerio, NFKC-normalized)
```
Frontend data path: `lib/api.ts` (bridge client) -> `lib/useTips.ts` (memory store,
cache-first paint) -> `lib/useTerm.ts` (active term, auto-fallback to the other term
when the current one has no courses) -> `lib/tipsAdapters.ts` (TIPS -> CourseItem).
`data.ts` is now only an artwork/colour/English-title lookup keyed by course code.
Cognito, onboarding, edit-profile and admin screens were removed; `lambdas/` is left in
the repo but the app no longer calls it.

## Before 2026-09-24 (main branch)

TokaiHub is a **static React PWA + fully serverless AWS backend**. No app server: the
frontend (GitHub Pages, also Vercel-configured) talks to API Gateway → Lambda →
DynamoDB, with Cognito for identity. Diagram: [`graph/architecture.svg`](graph/architecture.svg).

## Frontend (`src/`)
- `App.tsx` — routing (react-router), env flags (incl. `settings.devSkipAuth`),
  screen composition.
- `components/` — one file per screen (`Tokai*` prefix) + shared pieces
  (`SharedMenu`, `WeeklyTimetable`, `MaintenanceBanner`, `AdminDatabase`).
- `lib/api.ts` — THE API client: typed `getDashboard/getSchedule/getCourse…` wrappers
  over `VITE_API_BASE_URL`, plus mock fallbacks for offline dev.
- `lib/awsConfig.ts` — Amplify/Cognito wiring from `VITE_COGNITO_*` env.
- `data.ts` — local course catalog. **Ground truth for scheduling fields**
  (`dayOfWeek`, `periods`) and curated JP translations; API data is merged over it but
  scheduling fields are protected (see TokaiHome merge logic).

## Auth (the differentiator — README §Unique Auth Mechanism)
Cognito **without** the Hosted UI: custom login/signup forms call aws-amplify directly.
`studentId` (e.g. 4CJE1108) is the Cognito username; students log in by email via
Cognito's email-alias mapping. Signup OTP emails come from SES via the
`custom-message` Lambda trigger; `pre-signup`/`post-confirmation` triggers complete the
lifecycle. API Gateway routes use a Cognito JWT authorizer.

## Backend (`lambdas/`, deployed by hand in the Lambda console)
Node 22 ESM functions; each file's doc header records its route, env vars, and IAM
needs. Read: get-dashboard (aggregation), get-schedule, get-course,
get-course-detail. Write: enroll-courses, update-profile. Auth triggers: pre-signup,
post-confirmation, custom-message. Admin: admin-database (gated `/admin/database`
view). Shared entity helpers: userclass-entity.

## Data flow
Login (Cognito JWT) → screens call `lib/api.ts` → API Gateway (JWT authorizer) →
Lambda → DynamoDB (single-table `userclass-entity` model; users in `tokaihub-users`)
→ TokaiHome merges API courses over the local `data.ts` catalog (colors, curated JP,
protected scheduling fields) → caches to localStorage for instant next paint.

## Deploy
Frontend: `npm run build` → `build/`, published to GitHub Pages (live:
mohamedfuad16.github.io/TokaiHub). Lambdas: manual console deploy per function —
a repo push does NOT update them.
