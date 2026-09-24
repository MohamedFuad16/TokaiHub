# State

> Last updated: 2026-09-24 · branch tips-wrapper (uncommitted) · bridge on the Mac Mini, frontend on Vercel

## Current state summary
TIPS wrapper PWA (React+TS+Vite+Tailwind), one owner (HUB_OWNER_ID). Frontend on Vercel at
tokaihub.mohamedfuad.com (project tokai-hub-ng5h, deploys `main`; branch `tips-wrapper` is
NOT merged yet, so the live site still shows the old Cognito app). Bridge (`server/`) runs on
the owner's Mac Mini under launchd (`scripts/hub.sh`): local listener 8791, public listener
8792 behind Cloudflare tunnel tokaihub-api.mohamedfuad.com, passkey unlock, TIPS session
sealed on disk. DNS for mohamedfuad.com on Cloudflare since 2026-09-24 (registrar IONOS).
Open: owner's first TIPS sign-in on the Mac (TIPS down on 2026-09-24), merge + deploy,
real-device passkey test. No automated tests beyond the passkey/access probes noted below.

## Recent changes
- **2026-09-24 (sixth pass) — DNS for mohamedfuad.com moved to Cloudflare** (by: Claude, on the
  owner's instruction). Registrar stays IONOS. Cloudflare zone f65f7dc7… (free plan) holds the
  19 IONOS records, all DNS only, imported from a BIND file and checked name by name against
  ns1045.ui-dns.com on both mack/monroe.ns.cloudflare.com (16 names + MX + SPF identical), plus
  `tokaihub-api` (tunnel, proxied). IONOS nameservers switched to mack/monroe.ns.cloudflare.com;
  rollback = "IONOS name server" on the IONOS Name server tab (its old zone is kept). The Hub API
  host is `tokaihub-api.mohamedfuad.com` because `api` already serves 3.112.141.17. Sign-in now
  reports a TIPS outage as such (TIPS resets every connection today). Passkey button names
  Touch ID on a Mac and Face ID on iPhone/iPad.
- **2026-09-24 (fifth pass) — owner-only public API, passkeys, Vercel frontend** (by: Claude).
  Replaces the Tailscale and mirrored sign-in design from the fourth pass, which the owner
  rejected. Frontend stays on Vercel (`tokaihub.mohamedfuad.com`, project tokai-hub-ng5h,
  deploys `main`). Bridge: local listener 8791 (sign-in window, setup codes, serves build/)
  and public listener 8792 (owner device token required; TIPS session must be
  HUB_OWNER_ID). Cloudflare tunnel `tokaihub-api.mohamedfuad.com` (corrected 2026-09-24: was `api`, which already points at 3.112.141.17) to 8792 via `scripts/hub.sh
  tunnel-setup`. Passkeys (`server/auth.ts`, @simplewebauthn v13), setup code from Settings
  on the Mac. TIPS session sealed on disk and restored on restart; no Hub expiry. Phone opens
  instantly from last status + IndexedDB. Verified: 16 access-rule probes on 8792, 12/12
  software-authenticator passkey cases, lock and setup screens EN/JP at 375px, Mac sign-in
  screen unchanged, `npm run lint` clean. NOT verified: Microsoft sign-in + owner check with
  the real account, sealed-session restore after restart, Cloudflare tunnel (not created;
  owner must move DNS to Cloudflare and run `cloudflared tunnel login`), Face ID on a real
  phone, Vercel deploy (needs merge to main). ADR-0009.
- **2026-09-24 (fourth pass) — personal hosting on the Mac Mini** (by: Claude). AWS plan
  dropped; only the owner uses the Hub. `scripts/hub.sh start|stop|status|logs` builds the
  app and runs the bridge as launchd agent `com.mohamedfuad.tokaihub` (NODE_ENV=production,
  KeepAlive, wrapped in `caffeinate -is`); the bridge serves `build/` itself. Outside access
  is `tailscale serve` only (not installed yet: owner installs and signs in). Microsoft
  sign-in now runs headless and streams to the Hub page (`SignInView`), so sign-in works
  from a phone. Verified: stream, tap, type, Backspace, cancel on desktop and 375px;
  launchd restart after kill -9; caffeinate assertion present. NOT verified: a full
  Microsoft sign-in through the stream (needs the owner's password), access over Tailscale.
  Multi-user sessions, access codes, and the Node-HTTP client (earlier steps 1, 2, 4) are
  not needed for single-user hosting and were not built. ADR-0008.
- **2026-09-24 (fifth pass) — cabinet, delivery mode, local cache/PWA** (by: Claude). Cabinet
  page + Home "recently added" (169 folders, 595 files; TIPS-hosted files proxied through
  `/tips-api/file`); delivery chip (in-person/online from the syllabus) on planner courses;
  IndexedDB local cache with 5-minute background refresh and "Updated from TIPS" pill; service
  worker caches the app shell only (never /tips-api). Hosting not started: needs the
  student's decision (see open question in the session).
- **2026-09-24 (fourth pass) — eligibility, university-wide courses, drop fix** (by: Claude).
  Handbook read (2024 ICT). Planner blocks already-passed / over-cap / clashing courses; slot
  view adds other courses in the slot (syllabus) with TIPS check; curriculum filter + hide
  earned; drop fixed (two-step); syllabus faculty options grouped (fixes 0G "No courses");
  Schedule layout aligned. Live: TTX050 registered by the student, dropped by the bridge on
  request, TIPS confirms 0 credits. ADR-0007.
- **2026-09-24 (third pass) — registration planner, eligibility, syllabus fixes** (by:
  Claude). Schedule shows the registration planner for the current term while registration
  is open (fall 2026 open until 10/7 23:59); curriculum-based finder with "already earned"
  and "not offered this term" labels; syllabus filters restyled (Safari), my-department
  shortcut; English-only syllabus fallback; equal-height class cards. Verified live EN,
  desktop + mobile; register dialog opened and cancelled, bridge log shows 0 actions sent.
  ADR-0006.
- **2026-09-24 (second pass) — UI cleanup, bilingual TIPS data, syllabus + registration**
  (by: Claude). TIPS English mode wired end to end; all parsers bilingual; data.ts removed;
  new Syllabus page (filters from TIPS) and Registration page (slot search, confirmed
  register/drop); bulletins now full list with filters; redesigned course detail (tabs,
  attendance ring, class-plan timeline), Grades, Attendance, Classes cards; shared PageShell
  for consistent width. Verified live in EN and JP, desktop and 375px mobile. Register/drop
  NOT executed (needs the student's go-ahead). ADR-0005.
- **2026-09-24 — TIPS wrapper prototype** (by: Claude). New local bridge (`server/`) +
  frontend rewired to TIPS: Home, Schedule, Classes (+ syllabus search), Course detail
  (syllabus + attendance), Grades (GPA, credits, graduation check), Attendance,
  Bulletins, Reports & Exams, Settings (session extend). Removed Cognito auth,
  onboarding, edit profile, admin DB, maintenance banner, aws-amplify. Verified live
  against TIPS in the browser (see docs/tips-integration.md for what was and was not
  tested). `npm run lint` and `vite build` pass. ADR-0004.
- **2026-07-08 — agent/ knowledge base created** (by: Claude, leader session). Standard
  agent-folder schema; invariants (data.ts scheduling truth, id-OR-code matching,
  custom-message trigger safety, manual Lambda deploys) captured; dependency graph +
  D2 diagram generated; root pointers added. ADR-0001.
- **2026-07-08 — fixed dead `setAssignments` crash in TokaiHome** (by: Claude). tsc
  error TS2304; would ReferenceError the mock dashboard path. Dead block removed; lint
  + build green. ADR-0002.
- **2026-07-08 — restored stripped lambda doc headers** (by: Claude). Uncommitted local
  edits had deleted the deployment runbook comments in custom-message.mjs +
  update-profile.mjs; restored from git. ADR-0003.
