# Tests

```bash
npm run lint      # tsc --noEmit (vite build does not typecheck)
npm run eslint    # ESLint flat config: typescript-eslint + react-hooks (rules-of-hooks = error)
npm test          # Vitest, Node environment (vitest.config.ts, vitest.setup.ts)
npm run build     # vite production build
```

Unit tests (46 on 2026-09-24):
- `src/lib/syllabusText.test.ts`: reflow, linkify, pickLang, gradingWeights, withoutWeightLines.
- `src/lib/courseCategories.test.ts`: normTitle, allocate (IV electives overflow to V, required
  stays in IV, beyond-requirement flags).
- `src/lib/tipsAdapters.test.ts`: slotLabel, tidy.
- `server/tips/parse/syllabus.test.ts`: syllabus detail (groups, files, link addresses, blank
  lines, schedule), cellText, bulletin detail (attachments with index, genre suffix).

Rules: the repo is public. Parser tests use small SYNTHETIC HTML shaped like TIPS pages; never
commit real TIPS HTML, names, student IDs or grades. Raw pages for debugging stay in
`~/.tokaihub/fixtures` or a temp dir outside the repo.

Manual checks for UI changes: dev server (`tokaihub-web`, port 3000, proxies /tips-api to the
bridge), EN and JP, light and dark, 375px and desktop; no horizontal scroll at 375px.
