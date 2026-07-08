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
