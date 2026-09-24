# TIPS integration findings for the Tokai Hub wrapper

First pass 2026-09-24, second pass the same day (more pages opened, auth and session plan added).
Source: live inspection of tips.u-tokai.ac.jp with the student's own logged-in session.
No personal data is recorded in this file.

## Architecture

```
 Tokai Hub (React)            Local backend (BFF, student's machine)                     External
 -----------------            --------------------------------------                     --------
 "Sign in" button ──────────▶ opens a real browser window (Playwright, headed) ──────▶ Microsoft login (MFA by the student)
                                                                                           │ SSO redirect
                              captures the TIPS session cookie  ◀──────────────────── TIPS (tips.u-tokai.ac.jp)
                                       │
 GET /api/<feature> ─JSON─▶   route handler
                                │ cached and fresh? ─yes─▶ return cached JSON at once
                                │ no: per-session queue (one TIPS flow at a time)
                                ▼
                              TIPS client
                                │ GET  campussquare.do?_flowId=<FLOW>-flow         ─▶ 302
                                │ GET  campussquare.do?_flowExecutionKey=_c.._k..  ─▶ HTML
                                │ POST campussquare.do (_flowExecutionKey,_eventId) ─▶ 302 ─▶ HTML
                                ▼
                              cheerio parser ─▶ typed JSON ─▶ encrypted SQLite cache
```

TIPS has no JSON API. Every screen is server-rendered HTML. The wrapper needs a local backend that
drives TIPS the way a browser does, parses the HTML, and serves JSON to React.

## What TIPS is (verified)

- Product: NS Solutions "CampusSquare" (page footer "Copyright(c) 2001- NS Solutions Corporation", endpoint `campussquare.do`).
- Stack: Java, Spring Web Flow, jQuery 3.4.1, Materialize 1.0.0. Static assets live under `/campusweb/static/pub/campus/6.0/`.
- `portal.do?page=main` is the portal home. Its portlets render server-side. Portlet actions are POST forms to `portal.do` (`action, tabId, wfId, event`, plus `wnId` for news).
- `campussquare.do` runs every feature as a Spring Web Flow.

## Flow protocol (verified from network capture)

1. `GET /campusweb/campussquare.do?_flowId=<FLOW>-flow` starts a flow and redirects.
2. `GET campussquare.do?_flowExecutionKey=_c<conversation-uuid>_k<step-uuid>` returns the HTML.
3. Buttons `POST /campusweb/campussquare.do` with the current `_flowExecutionKey` and an `_eventId`. TIPS redirects, keeps the `_c` id and issues a new `_k` id.
4. The menu's `link=` parameter is only tracking. `_flowId` alone works (verified on 10 flows).
5. Some results open in a new window (syllabus detail opened as a popup with its own `_k` key in the same conversation).

Consequences for the client:
- Read `_flowExecutionKey` from each response before the next event. Never reuse an old `_k`.
- One flow at a time per session. Starting a new flow while a slow one is still loading left the browser tab stuck on "Loading..." and it stopped responding (observed twice).

## Feature to flow map

| Tokai Hub feature | TIPS menu item | `_flowId` | Status | Load time seen |
|---|---|---|---|---|
| Home | HOME portal | `portal.do?page=main` | read | ~2 s |
| Timetable (registered courses) | 履修登録・登録状況照会 | `RSW0001000-flow` | read | ~3 s |
| Attendance | 出欠状況参照 | `AAW0001000-flow` | read (list only, no rows this term) | ~3 s |
| Credits and grades | 単位修得状況照会 | `SIW0001300-flow` | read (form, then POST) | ~8 s after POST |
| Graduation self-check | 自己判定 | `HTW0001000-flow` | read | ~15 s |
| Class schedule, cancellations, make-ups | 授業スケジュール参照 | `KHW0001100-flow` | read | ~3 s |
| Syllabus | シラバス参照 | `SBW3701300-flow` | read (search, results, detail) | ~10 s per search |
| Class portfolio | 授業ポートフォリオ | `JPW0001000-flow` | read | ~3 s |
| Student portfolio | 学生ポートフォリオ | `CHW0001000-flow` | read | ~5 s |
| Reports | レポート提出・提出レポート参照 | `RMW0001000-flow` | read | ~3 s |
| Exam timetable | 定期試験時間割照会（学生用） | `TEW0001200-flow` | read (form only) | ~3 s |
| Bulletins | 掲示板 | `KJW0001100-flow` | not read (tab froze) | ? |
| Cabinet (files) | キャビネット | `SDW0001000-flow` | not opened | ? |
| FAQ | FAQ | `PTW0001400-flow` | not opened | ? |
| Qualification self-check | 資格自己判定 | `HTW0001100-flow` | not opened | ? |
| Pre-registration | 事前登録 / 事前登録照会 | `RSW0001300-flow` / `RSW0001400-flow` | not opened | ? |
| Attendance keyword entry | 出席キーワード登録 | `AAW6901000-flow` | not opened (write action) | ? |

Load times are single observations from a browser, not benchmarks.

## Page shapes seen

- Timetable (`RSW0001000`): student header, credit caps (registered/limit), spring/autumn toggle, 6-period Monday-to-Saturday grid, "session" and "other" course tables (day, period, timetable number, course, lead instructor).
- Attendance (`AAW0001000`): year and semester selects, then a course list (day/period, offering type, timetable number, course name). The detail page is not yet seen.
- Credits (`SIW0001300`): range form, then POST. Result has per-semester GPA and rank, a credits-per-semester table, and a course table (category, subcategory, required flag, course, credits, year, semester, grade, pass).
- Graduation self-check (`HTW0001000`): one table by requirement category with required, earned, in-progress and shortfall credits, plus a total row.
- Class schedule (`KHW0001100`): date-range week grid (8 periods, Monday to Saturday), filters (registered-only checkbox, campus, instructor kana, course), and a legend for normal, room change, cancelled and make-up classes. Week and month navigation links.
- Syllabus (`SBW3701300`): two search forms (by timetable number, or detailed filters: term A/B/C/D, campus code, faculty code, day 1-8, instructor, course name, keyword, language). More than 500 hits returns an error, so the UI must require at least one narrowing filter. Detail page is bilingual with three tabs: basic info, details, class schedule.
- Class portfolio (`JPW0001000`): registration-period banner, "What's new", and the registered course list by year and semester.
- Student portfolio (`CHW0001000`): profile photo, basic record, advisor, tuition payment status, and an international-student section, with sub-tabs (contact, courses, attendance, grades, activities, scholarships, awards, careers, PROG).
- Reports (`RMW0001000`): course reports and general reports, each with status, year/term and keyword filters and a table (period, course, teacher, title, published, deadline, updated, submitted).
- Exam timetable (`TEW0001200`): year, term, campus and exam-type form (regular exam and three make-up exam types).

## Authentication (plan; login not yet observed)

- The student signs in with their university Microsoft account. The student gives the link; I have not seen the redirect chain yet.
- Microsoft's sign-in page refuses to load inside an iframe (Microsoft's documented behaviour; not tested here). The Hub opens it in a separate window instead: a Playwright-controlled browser window for the local prototype, or a `BrowserWindow` if the Hub becomes an Electron app.
- A Microsoft token alone does not open TIPS. The backend needs the TIPS session cookie that appears after Microsoft redirects back to TIPS. The backend reads that cookie from the login window's cookie store and never sees the password.

## Session length (160 minutes)

- TIPS's own session is 30 minutes (header countdown "残り30分"). The Hub cannot change that server setting.
- Recommended: give the Hub its own 160-minute session, separate from TIPS. The Hub shows cached data immediately. When a refresh finds the TIPS session expired, the backend re-runs the Microsoft sign-in in the background. If the Microsoft session is still valid, that finishes without a prompt (to be verified once the login link is available).
- Alternative: call TIPS's extend action every ~25 minutes for up to 160 minutes. This keeps a TIPS session open past the idle limit the university chose, so get the IT office to approve it specifically. The extend request's exact shape is not captured yet (the tab froze when I clicked it).
- The in-app "extend further" option works the same way: it moves the Hub session's expiry, and TIPS is re-authenticated on demand.

## Sensitive data

The student portfolio holds a residence card number, date of birth, tuition payment status, visa period and a photo. Do not cache or display these fields by default. Cache only what a Hub screen shows.

## Recommended build

1. Backend: Node with Playwright. The headed context handles login. `context.request` makes the TIPS requests and shares the cookies.
2. One adapter per flow: `start(flowId)`, `submit(eventId, fields)`, `parse(html)`. Save one HTML fixture per page for parser tests.
3. Parse with cheerio, keyed on Japanese header labels (氏名, 時間割番号, 科目, 単位数, 評価).
4. Cache: encrypted SQLite keyed by `(feature, year, term)`, stale-while-revalidate. Suggested ages: grades and self-check 24 h, timetable 12 h, attendance and class schedule 1 h, reports 30 min.
5. After login, prefetch the main screens one after another in the background. From the times above that is roughly 1 minute.
6. No write actions in the prototype (registration, attendance keyword, report submission). Link out to TIPS for those.

## Not yet verified

- Login redirect chain and silent re-authentication.
- The session-extend request.
- Bulletins, cabinet, FAQ, qualification self-check and pre-registration pages.
- Attendance detail and a filled timetable grid (autumn 2026 has no data yet; use spring 2026).
- Whether a plain HTTP client works without a browser (bot checks, Referer). Playwright's request context avoids most of this.
- The class portfolio banner says autumn registration runs 2026-09-24 to 2026-10-07, while the registration page said 登録期間外 (outside the period) earlier today.
