# State

> Last updated: 2026-09-24 · branch tips-wrapper (uncommitted) · bridge on the Mac Mini, frontend on Vercel

## Current state summary
TIPS wrapper PWA (React+TS+Vite+Tailwind), one owner (HUB_OWNER_ID). Frontend on Vercel at
tokaihub.mohamedfuad.com (project tokai-hub-ng5h, deploys `main`; `main` = 57063fc, live
since 2026-09-24). Bridge (`server/`) runs on
the owner's Mac Mini under launchd (`scripts/hub.sh`): local listener 8791, public listener
8792 behind Cloudflare tunnel tokaihub-api.mohamedfuad.com, passkey unlock, TIPS session
sealed on disk. DNS for mohamedfuad.com on Cloudflare since 2026-09-24 (registrar IONOS).
Open: owner's first TIPS sign-in on the Mac (TIPS down on 2026-09-24), real-device
passkey test. Unit tests: `npm test` (Vitest, pure logic and parsers on synthetic HTML); lint:
`npm run lint` (tsc) and `npm run eslint`.

## Recent changes
- **2026-09-24 (twelfth pass) — syllabus completeness, links, error states, lint + tests;
  uncommitted** (by: Claude, UI/syllabus worker). Syllabus parser keeps each field's TIPS group
  (a label can sit in two groups: 地域志向 flag and content, the second was silently dropped),
  keeps blank lines and link addresses, and returns attached files (rubrics) separately; cache
  key `syllabus:v2`. Attached files and bulletin attachments open through the bridge
  (`/tips-api/file?kind=syllabus|bulletin`, one-minute tickets on the phone; PDFs served inline);
  bulletin detail drops the " [genre]" title suffix (`bulletin:v3`). One `linkify` in
  `syllabusText.ts`, rendered by `Linked`/`RichText`/`FileLink` in SyllabusText.tsx: URLs and
  e-mails are blue links (new tab, noopener) in syllabus fields, bulletin bodies and contacts,
  cabinet summaries and reports. Course page: Syllabus tab grouped by TIPS group (materials split
  out of grading), one-line values as a fact list in the UI language (有(Yes) → Yes/有), rubric
  links under Grading, compact "Thu 1・2" slot, tabs fit 375px. `reflow` no longer merges
  intentionally short lines (office lists, numbered items, address lines). Shared `LoadError`
  (message + retry) replaces endless skeletons on 10 screens when TIPS fails with nothing cached;
  shared `SearchField`, `DayClassCard`, `slotLabel`. Home stat tiles no longer squeeze the
  Attendance icon to 2px; Settings name wraps. Removed dead TokaiSplash.tsx, src/lib/index.ts,
  util `kv`, unused exports/imports. Tooling: ESLint flat config (`npm run eslint`), Vitest
  (`npm test`, 46 tests, synthetic HTML only). Bridge restarted 3× (14:20, 14:33, 14:42 JST).
  Verified: live fetch of TTX025/TTX015/TTX050/918004 through the bridge (3 rubrics found,
  918004 has none), rubric 818 KB PDF served inline, tickets single-use (403 on reuse), public
  listener 401 without token; refresh=1 seen for every feature; error state on 9 screens with a
  simulated 502; no horizontal overflow or squashed icon at 375px on 11 routes. NOT verified:
  opening a file on the real iPhone (ticket path tested on the local listener only), motion by
  eye (Browser pane was hidden for part of the pass).
- **2026-09-24 (eleventh pass) — graduation categories, grading chart, planner, sidebar** (by:
  Claude). New bridge feature `course-categories` (graduation check + curriculum lists: remaining
  per section, section per course; G<n> ↔ section n, cross-checked by name; ~11–19 s, cached 12 h,
  queue priority -1). Registration: "Credits to graduate" panel with live plan subtraction; plan
  credits follow the graduation lines by requirement type (必修/選択) and overflow to the
  section whose line takes the surplus (IV electives → V, as TIPS counts them). Section chips on
  planner cards, curriculum categories and syllabus results, plus "only what I still need"
  filters. Course page: grading donut (only when weights sum to ~100%), syllabus text reflowed
  (wrapped lines joined, ・ as lists). Bridge queue now prioritised (actions 10, files 5, reads 0,
  bg=1 chips -1, keep-alive -2); delivery chips load when visible. Desktop sidebar collapses to an
  icon rail (⌘B, remembered). Includes the UI sub-agent's pass (see its entry). Verified in the
  browser at 375px and desktop: panel numbers match TIPS (IV 10, V 7 left), planned elective
  lands in V, grading chart for 918004 (30/40/30), syllabus filter, collapsed rail icons centred.
  Owner registered TTX015, TTX005, TTX025 from the phone during this pass (log lines).
- **2026-09-24 (eleventh pass) — UI polish, motion, sync fixes; uncommitted** (by: Claude, UI worker).
  Shared frame: skeleton shimmer instead of spinners (`Loading`, `Skeleton`), `Pill` 40px with a
  sliding active background (`layoutId`), shared `Select`, `RefreshButton`, `TAP`/`rise` presets,
  `MotionConfig reducedMotion="user"` in main.tsx, route transition fade+rise (240 ms in, 140 ms out).
  Screens: Home gets a refresh-all button, container width, visible empty timetable cells, 40px
  links; Schedule gets a refresh button and sliding Weekly/Monthly thumb; Settings uses PageShell;
  Registration stat cards no longer clip on 375px; Attendance rows glide on re-sort; Bulletins
  filters fit one row + selects; Course tabs slide and long text expands smoothly; dark-mode
  contrast for green/red banners and delivery chips. useTips: the spinner no longer stops early
  when a refresh overlaps a background load; an older response can no longer overwrite newer data;
  an unmounted hook run no longer calls `mode=cache`. Verified: tsc + build pass; refresh=1 fires
  on 10 data screens (network log; the new Syllabus results refresh was not clicked); no horizontal overflow and no tap target under 40px at
  375px except the grid "Drop" chip. NOT verified: motion timing by eye (the Browser pane was
  hidden, rAF ran at 2/s), the sign-in/lock screen (not reachable while signed in).
- **2026-09-24 (tenth pass) — "Load failed" on the phone fixed** (by: Claude). Causes: TIPS
  idle-timeout page not recognised as expired (see errors.md), silent re-auth stuck on TIPS "/"
  403 and a cookie redirect loop, and IPv6 tunnel drops. Fixes in client.ts/session.ts, 20-min
  keep-alive in hosted mode, tunnel pinned to IPv4, one retry for failed GETs in the app.
  Verified: bulletins 92 posts after "silent re-auth OK"; timetable, attendance, changes,
  cabinet, profile all fetched fresh from TIPS (log lines "fetched in … ms").
- **2026-09-24 (ninth pass) — signed-in devices per passkey** (by: Claude). Owner's iPhone
  unlocked with the Mac-created passkey (iCloud Keychain sync), so the passkey list showed one
  entry for two devices. Tokens now carry the unlocking device's label and last use; Settings
  groups devices under each passkey with per-device sign-out (POST /auth/sessions/remove) and a
  synced badge. The two existing tokens were labelled by hand (Mac · Chrome from registration,
  iPhone from the owner's report). Passkey tests 16/16 incl. second-device unlock and single
  sign-out.
- **2026-09-24 (eighth pass) — passkey device list** (by: Claude). Owner signed in on the Mac
  and enrolled a Mac passkey; Settings had no device list, only a stale count. Added
  GET /tips-api/auth/devices and POST /auth/devices/remove (token required on 8792), lastUsedAt,
  readable labels ("Mac · Chrome"), and a Devices list in Settings that polls while a setup code
  is shown. Verified: sealed TIPS session survived a bridge restart (status signed_in, account
  4CJE1108); devices endpoint 401 without token on 8792; list renders on the Mac.
- **2026-09-24 (seventh pass) — merged and deployed** (by: Claude, on the owner's instruction).
  `main` fast-forwarded to 57063fc and pushed; Vercel deployment dpl_6PwW7bfJmRvN7DBYcNmGoammJVuX
  READY. A clean build of 57063fc matches the served files byte for byte (8/8, incl.
  index.html). tokaihub-api.mohamedfuad.com answers through the tunnel (health 200, status 401
  locked, CORS only for the app). After the nameserver switch, public resolvers return the same
  values for all hosts, MX, SPF and DKIM; portfolio/brain/portal 200, apex and www 307 as before.
  Note: Vercel's Security Checkpoint answers 403 to curl on tokaihub.mohamedfuad.com; browsers
  pass it.
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
