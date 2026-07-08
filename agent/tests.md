# Tests

**Current state: no automated test suite.** Quality gates today:

```bash
npm run lint                      # tsc --noEmit — the only type gate (vite build skips types)
npm run build                     # vite production build
for f in lambdas/*.mjs; do node --check "$f"; done   # lambda syntax check
```

Manual verification checklist for UI changes:
- Dev server (`npm run dev`, port 3000) with `settings.devSkipAuth = true` + api.ts
  mocks for offline screens.
- Both languages (EN/JP), both themes, mobile viewport (it's a PWA — test ~390px).
- Dashboard merge: enrolled courses appear on the weekly timetable with correct
  day/period from `data.ts`.

Lambda changes: exercise via the deployed API (manual console deploy) — there is no
local AWS emulation in this repo. Verified 2026-07-08: lint clean, build green, all 11
lambdas parse.

Wanted next (candidates when tests are introduced): vitest + testing-library for the
TokaiHome merge logic (highest-risk pure logic — extractable), and node --test for
`userclass-entity.mjs` helpers.
