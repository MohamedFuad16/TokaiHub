# Known issues & gotchas

- **`vite build` succeeds with type errors** — it does not typecheck. Always run
  `npm run lint` (tsc). This is how the dead `setAssignments` crash shipped unnoticed
  (fixed 2026-07-08, ADR-0002).
- **Dashboard API shape drift** — responses have carried the profile at `data.profile`,
  `data.user`, `data.Item`, or flat. TokaiHome normalizes by picking the candidate with
  profile-ish fields; don't "simplify" that tolerance away.
- **Course identity is id OR code** — the API sometimes returns course codes (TTK085)
  where the local catalog uses ids. Every match must check both.
- **Scheduling fields must come from `data.ts`** — API rows may lack/garble
  `dayOfWeek`/`periods`; the merge deliberately overwrites API values with local ones.
- **custom-message trigger safety** — returning a modified event for
  `CustomMessage_Authentication` (or any unhandled source) makes Cognito throw
  InvalidLambdaResponseException at the end user.
- **Lambda drift risk** — lambdas deploy manually; the repo can be ahead of AWS. Check
  the console (or admin-database) when behavior doesn't match the code.
- **Doc headers in lambdas are load-bearing** — they record console setup + IAM; an
  automated cleanup once stripped them (restored 2026-07-08). Don't delete.
- **`.claude/worktrees/agent-aa006f49`** — stale worktree marker in git status; harmless,
  ignore.
- **TIPS: Node TLS fails** (`unsafe legacy renegotiation disabled`). Requests must run in
  Chromium (`client.ts` uses `page.evaluate(fetch)`). Playwright's `APIRequestContext`
  also fails. Found 2026-09-24.
- **TIPS: NFKC folds characters parsers match on.** `／` becomes `/`, `：` becomes `:`, and
  `Ⅳ` becomes `IV`. Match both forms (parse/util.ts `bi()`, graduation section regex).
- **TIPS: starting a flow while another is loading hangs the tab.** The client queues
  requests; do not parallelize TIPS calls.
- **TIPS: bulletin list holds only the latest 60 posts.** Older posts (and their detail
  route) are unreachable from the list.
- **Vite dev listens on 0.0.0.0.** The `/tips-api` proxy rejects non-loopback clients
  (vite.config.ts); keep that guard or TIPS data leaks to the LAN.
- **Bridge logs can contain cookies** if a Playwright call-log error is printed. Errors
  are trimmed to the first line; do not log full Playwright errors.
- **TIPS bulletin first page = unread only.** Opening a post (displayMidoku) removes it from
  that page. Use displayOshirase/displayKojin for the full lists. Found 2026-09-24.
- **TIPS language is per session, not per request.** Switching mid-flow invalidates the
  meaning of parsed labels; the bridge serializes features and switches before each one.
- **English syllabus (`locale=en_US`) returns "No Data Found"** when the instructor wrote
  none, even though TIPS shows the English button. Always load `ja_JP` (bilingual labels).
- **Registration cells change markup when the period opens:** empty cells gain
  `yobiJigenCall(d,p)` and `yobiJigen(d,p,flag,campus)`. Before the period there is no link.
- **TIPS search results are capped at the page size (200).** The syllabus parser reports
  TIPS's own total so the UI can say "200 of N".
- **Browser-pane screenshots can show mid-animation frames** when the pane is hidden
  (`document.visibilityState === 'hidden'`); check computed opacity before calling it a bug.
- **English-only courses have no ja_JP syllabus** ("No Data Found"); the syllabus route falls
  back to en_US, whose labels are bilingual. Course 918004 was the example.
- **Syllabus faculty filter alone returns more than 500 courses** (it includes university-wide
  courses on all campuses). The "my department" shortcut adds department + campus (82 fall
  courses for 情報通信学科 at 品川).
- **Native selects render unevenly in Safari.** Filter controls use appearance-none with a
  drawn chevron and a fixed h-11.
- **TIPS drop is two steps.** The first DeleteForm submit only shows a confirmation page; the
  course stays registered until that page's InputForm `_eventId=delete` is sent. A read right
  after the drop can still show the course; re-read.
- **English faculty labels collide** (19 undergraduate vs 0G graduate are both "Information and
  Telecommunication Engineering"). The syllabus UI groups options using TIPS's Japanese list
  (…学部 / …研究科). Picking 0G returned "No courses found".
- **Registration "Other department" search requires an affiliation** ("Affiliation has not been
  selected"). University-wide courses are reached through the curriculum view (category V,
  172 courses) or the syllabus slot search instead.
- **cheerio (parse5) inserts implicit <tbody>** around table rows, so `table > tr` selectors
  miss rows. The cabinet parser checks both levels.
- **Cabinet downloads are binary**; the bridge fetches them inside Chromium as base64 and
  streams the bytes with TIPS's Content-Type/Disposition (a 40 MB PDF verified).
- **TIPS idle timeout returns a 200 "認証エラー" page, not a login redirect** (2026-09-24). Once
  the TIPS session idles out while the Microsoft/Shibboleth session is alive, flows answer with a
  page whose form `authorizationError` sends a browser back to the portal by script. The client
  saw "no flow key on page" / "form not found" and never re-authenticated; bulletins on the
  phone showed "Load failed". `looksSignedOut` now treats that form as expired.
- **Silent re-auth lands on TIPS "/" (403 Forbidden)** after the SAML POST, because the SP drops
  the return address; a second portal visit enters. Stale TIPS cookies can also loop
  portal ↔ ssologin (ERR_TOO_MANY_REDIRECTS). `reauthenticate` clears tips.u-tokai.ac.jp
  cookies, then visits the portal up to 3 times. Hosted mode also pings the portal every 20 min
  so the 30-minute idle timeout does not hit.
- **cloudflared over IPv6 drops on this network** ("sendmsg: no route to host" to the edge).
  `~/.cloudflared/tokaihub.yml` sets `edge-ip-version: "4"`.
- **Syllabus labels repeat across groups** (2026-09-24). 地域志向による学修内容 is both a yes/no
  flag under 基本事項 and a content field under 科目の目的・学修内容. The parser deduped by label, so
  the content field was dropped. It now dedupes by group + label. TIPS also files 履修上の注意点,
  教科書 and 参考図書 under 成績評価基準・方法; the app regroups them as materials.
- **Screens without cached data stayed on a skeleton forever when TIPS failed** (2026-09-24).
  Most screens rendered `!data && <Loading/>` and ignored `error`. They now show `LoadError`
  with a retry. Checked with a simulated 502 on 9 screens.
- **Home stat tile squeezed its icon to 2 px** (2026-09-24): "ATTENDANCE" in uppercase
  tracking-widest is wider than a third of 375px, and the icon had no `shrink-0`. Icons now sit
  above the label below `sm`.
- **No @types/react in the repo**: JSX is untyped, so `tsc` does not check component props, and
  a function component declared with a typed props object rejects `key`. Components that are
  mapped with keys are declared as `React.FC` (as elsewhere in the codebase).
