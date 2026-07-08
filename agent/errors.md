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
