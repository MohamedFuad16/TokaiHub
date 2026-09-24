# Architecture Decision Records (ADRs)

Append-only. Newest at the bottom. Format: ID · date · title · status · context ·
decision · consequences. Never edit past ADRs — supersede with a new one.

---

## ADR-0001 · 2026-07-08 · Adopt the agent/ knowledge base (agent-folder schema)
**Status:** Accepted
**Context:** TokaiHub had a strong README but no agent-facing knowledge base: no
router, no state log, no decision trail, no dependency graph. Sessions re-derived the
custom-Cognito story, the TokaiHome merge invariants, and the manual Lambda deployment
model every time.
**Decision:** Create the standard `agent/` folder (router + 11 sub-files + `graph/`)
plus thin root pointers (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/agent-folder.mdc`).
Reverse-engineer the initial content from README, source, and lambda doc headers.
**Consequences:** Agents route to exactly one sub-file per task. The load-bearing
invariants (scheduling truth in `data.ts`, id-OR-code matching, custom-message trigger
safety, manual Lambda deploys) are now written down where every agent reads first.

---

## ADR-0002 · 2026-07-08 · Remove the dead assignments setter from TokaiHome
**Status:** Accepted
**Context:** `TokaiHome.tsx` called `setAssignments(data.assignments)` but no such
state existed (tsc: TS2304) — and nothing in the app consumes assignments. Because
`vite build` skips typechecking, this shipped. At runtime the mock dashboard
(`_mockAssignments` non-empty) would throw a ReferenceError inside the `.then`
handler, killing the entire dashboard population in mock/dev mode.
**Decision:** Delete the dead block rather than add unused state. The API type keeps
`assignments?` and the mock fixture stays; real state gets wired when an assignments
UI actually lands.
**Consequences:** `npm run lint` is clean again and the mock dashboard path cannot
crash. Lesson recorded in errors.md: lint is the only type gate in this repo.

---

## ADR-0003 · 2026-07-08 · Lambda doc headers are the deployment runbook — restore & keep
**Status:** Accepted
**Context:** Uncommitted local edits had stripped the doc headers from
`custom-message.mjs` and `update-profile.mjs` (plus whitespace noise in README).
Those headers are the only record of each function's console setup: runtime, handler,
route, env vars (`USERS_TABLE`), IAM grants, request/response contract, and the
Cognito trigger-source safety rules. Deployment is manual, so losing them loses the
runbook.
**Decision:** Restore the headers from git (`git checkout -- …`) and codify in
conventions.md that lambda doc headers are load-bearing and must not be removed by
cleanups.
**Consequences:** The operational knowledge stays with the code it deploys. Automated
"comment cleanup" passes must exclude `lambdas/`.

---

## ADR-0004 · 2026-09-24 · Replace the Cognito/DynamoDB data path with a local TIPS bridge
**Status:** Accepted (prototype, branch `tips-wrapper`)
**Context:** The professor asked for a prototype that shows real TIPS data in the
TokaiHub UI; the student has permission from the professor and the IT office for their
own account. TIPS has no JSON API: every screen is server-rendered Spring Web Flow HTML,
login is Microsoft Entra SAML into a Shibboleth SP, and the server requires legacy TLS
renegotiation that Node's OpenSSL rejects.
**Decision:** A bridge on the student's machine (`server/`) signs in through a visible
Chromium window, keeps cookies in memory only, runs every TIPS request as fetch() inside
headless Chromium, parses pages with cheerio, and caches JSON encrypted (AES-256-GCM,
key file 0600) in `~/.tokaihub`. The Hub session defaults to 160 minutes and is
extendable; TIPS's own 30-minute idle limit is handled by silent re-auth through the
Microsoft cookies held in the same browser context, not by keep-alive pings. The React
app talks only to the bridge. Write actions (registration, attendance keyword, report
submission) are out of scope and link to TIPS.
**Consequences:** Real data with 0.1-1 s per page after the first load (TIPS UI itself
takes 3-15 s). Restarting the bridge requires a new sign-in. Opening a bulletin marks it
read in TIPS. The student-portfolio parser drops residence card, birth date, tuition and
visa fields on purpose. Parsers depend on TIPS markup; `~/.tokaihub/fixtures` holds real
pages for re-testing and contains personal data (outside the repo).

---

## ADR-0005 · 2026-09-24 · Data only from TIPS, in the UI language; registration through the Hub
**Status:** Accepted (branch `tips-wrapper`)
**Context:** The student asked that nothing be hardcoded, that English mode show English,
and that course registration (open from 2026-09-24 until 2026-10-07 23:59) work inside the
Hub. TIPS has an English mode (`portal.do?locale=en_US`) that returns English course names,
categories and statuses; it stores the language on the server session.
**Decision:**
- Every feature request carries `lang`; the bridge switches the TIPS session language only
  when it differs, runs features one at a time (`runFeature` lock in session.ts), and keys
  the cache by language. Parsers read by position/class so they work on both page languages.
- `src/data.ts` (hand-written catalog with English titles, colours, images) is deleted.
  Course artwork is picked from `src/assets/courses` by course-code hash (decoration only).
  Monthly calendar dates come from attendance sessions (past terms) or the class schedule
  (current term). Period clock times are the one local constant (`src/config/periods.ts`)
  because TIPS never publishes them.
- Bulletins: the flow's first page lists unread posts only; the full list is
  `displayOshirase` + `displayKojin` (paged to 200), with unread ids from the first page.
- Registration: `registration-candidates` searches a slot (flag and campus code taken from
  the TIPS cell) or a code; `/tips-api/action/register|drop` require `confirm: true`, which
  the UI sends only after a confirmation dialog, and return TIPS's own messages.
**Consequences:** English UI shows TIPS's English (all-caps, so the UI title-cases it via
`tidy()`; Japanese text is never touched). Room names and bulletin bodies stay Japanese
because TIPS has no English for them. Syllabus text is Japanese unless the instructor
published an English version (the UI says so). Register/drop have not been executed yet.

---

## ADR-0006 · 2026-09-24 · Registration planner inside Schedule, eligibility from TIPS's curriculum view
**Status:** Accepted (branch `tips-wrapper`)
**Context:** Fall 2026 registration opened (deadline 2026-10-07 23:59). The student wants to
plan and register from the Hub's Schedule, and only see courses they are allowed to take.
**Decision:** One `RegistrationPlanner` component (grid + finder) is used on the
Registration page and in Schedule's weekly view whenever the viewed term is TIPS's current
term and registration is open. The finder has three modes, all backed by TIPS registration
screens: by slot (TIPS's own-department slot search), by curriculum (TIPS search type 6:
the student's requirement categories, each course's weekly slots per term and
prerequisites, then its sections), and by code. Courses already passed are labelled by
matching the grades list in the same language; courses with no slots this term are marked.
"Follow TIPS" stays on the current term while registration is open.
**Consequences:** No eligibility rules are re-implemented in the Hub; TIPS lists what the
student may take and rejects anything else with its own message, which the Hub shows.
Register/drop remain unexecuted until the student confirms a real course.

---

## ADR-0007 · 2026-09-24 · Registration eligibility pre-checks from the class handbook
**Status:** Accepted (branch `tips-wrapper`)
**Context:** The 2024 class handbook for 情報通信学部 (授業要覧, `g_youran_12.pdf`, kept in
`~/.tokaihub/docs`) says: cap 20 credits regular + 4 session (28 with GPA ≥ 3.80); passed
courses may be re-registered only by forfeiting the grade (既修得ワーニング); E and "/" may be
retaken; TIPS rejects prerequisite, other-department (×), time-clash, cap and curriculum-year
violations. The student wants passed courses blocked outright.
**Decision:** The planner blocks Register when the course title matches a passed course in
the grades list (same language), when it would exceed the TIPS credit limit, or when a slot
clashes with a registered course, and shows why. Slot view lists the own-department
candidates plus every other course in the slot from the TIPS syllabus (term/day/period/
campus), each checked against TIPS's registration search by code. Drops follow TIPS's two
steps (DeleteForm → confirmation InputForm "delete").
**Consequences:** Verified live: TTX050 registered from the Hub and dropped through the bridge
(TIPS shows 0/20 credits afterwards); Global Skills sections render blocked with disabled
buttons; TTN103 Academic English B (university-wide) is offered with Register. Title matching
cannot see renamed equivalents (handbook 同一名称科目一覧表); TIPS's warning still applies there.

---

## ADR-0008 · 2026-09-24 · Host on the owner's Mac Mini, reachable only over Tailscale
**Status:** Superseded by ADR-0009 (same day)
**Context:** The owner dropped the AWS EC2 plan. The Hub runs on their Mac Mini around the
clock, and only the owner uses it, from their own devices, including away from home.
TIPS data must stay on the owner's machines.
**Decision:** The bridge serves the built PWA and `/tips-api` from one process on
127.0.0.1, run by launchd (`scripts/hub.sh`). Tailscale Serve publishes it with HTTPS on the
owner's tailnet; nothing listens on a public interface and Funnel stays off. Microsoft
sign-in runs in headless Chromium and is streamed to the Hub page (CDP screencast over
server-sent events; taps and keys posted back), because the owner may not be at the Mac.
**Consequences:** No accounts, access codes, or per-user sessions: tailnet membership is
the gate. Anyone the owner adds to the tailnet (or shares the node with) can reach the Hub.
Chromium stays resident for sign-in and silent re-auth, which is fine on the Mac Mini, so
the Node legacy-TLS client is not needed. The Mac must stay logged in for the launchd
agent to run.

---

## ADR-0009 · 2026-09-24 · Owner-only public API behind a Cloudflare tunnel, passkey unlock
**Status:** Accepted (branch `tips-wrapper`)
**Context:** The owner wants the app at tokaihub.mohamedfuad.com (Vercel, from GitHub), usable
from a phone without a VPN client or a mirrored sign-in screen, and open to their student ID
only. A phone's own Microsoft sign-in cannot give the Mac a TIPS session: the SAML response
posts from the phone's browser straight to TIPS, and the Mac could only get it by proxying
the login, which is phishing-shaped and was ruled out.
**Decision:** The Mac holds the TIPS session: Microsoft sign-in in a visible window on the Mac
("Stay signed in"), cookies sealed with AES-256-GCM and refreshed after each silent re-auth,
no Hub-side expiry. The bridge accepts only a TIPS account whose profile student ID equals
HUB_OWNER_ID and signs out and wipes the cache otherwise. A second listener (8792) is the only
thing the tunnel reaches; it needs a device token from a passkey unlock (user verification
required, RP ID = app host), and serves nothing else. Passkeys enrol with a single-use 10-minute
code that only the local listener issues, and only while the owner is signed in. Cabinet files
open through single-use one-minute tickets because links cannot carry the token. On a phone,
"sign out" locks the device instead of signing the Mac out.
**Consequences:** No accounts or university app registration needed. If Microsoft asks for a
password again (password change, policy, roughly 90 days idle), the phone shows "sign in on
your Mac" until the owner does. Anyone holding an unlocked enrolled phone has the owner's
access for up to 30 days per token; `scripts/hub.sh devices-reset` revokes all. The public
listener's rules rely on requests arriving on port 8792, so nothing but cloudflared may be
pointed at it.

---

## ADR-0010 · 2026-09-24 · Graduation categories from the student's own TIPS pages
**Status:** Accepted (branch `tips-wrapper`)
**Context:** The owner wants to see which graduation section (区分 I–VI) each course counts
toward and what is still needed, for any student, without hardcoding. TIPS has no field that
maps a timetable course to a section; the syllabus has no required/elective flag.
**Decision:** Join three pages of the signed-in student: the graduation check (lines with
required/earned/in progress), the curriculum category list (G1…), and each category's course
list. Sections map to categories by name, then by TIPS's ordering (G<n> = section n). Courses
match across pages by normalised title in both languages (the curriculum uses subject codes,
the timetable uses timetable codes). Plans allocate by the candidate's 必修/選択 field to the
matching graduation line, overflowing to the section whose line names the source section's
surplus.
**Consequences:** Works for any student whose TIPS pages follow this layout; a course outside
the student's curriculum gets no chip (it may still count as "other department" credits in V,
which the Hub does not guess). Title matching can miss renamed equivalents.
