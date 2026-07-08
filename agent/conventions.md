# Conventions

## Placement
- Screens → `src/components/TokaiX.tsx` (ScreenProps signature); shared UI pieces in
  the same folder without the `Tokai` prefix.
- ALL HTTP in `src/lib/api.ts` (typed wrapper + mock fallback per endpoint) — never
  fetch from a component. AWS/Amplify config only in `src/lib/awsConfig.ts`.
- Course/schedule static data → `src/data.ts`. Types → `src/lib/types.ts`, `src/types/`.
- Lambdas → `lambdas/<kebab-verb-noun>.mjs`, Node 22 ESM, **keep the doc header**
  (route, env vars, IAM, request/response) — it IS the deployment runbook.
- One-off data/asset scripts → `scripts/` (not imported by the app).

## Style
- TypeScript; `npm run lint` (tsc --noEmit) must be clean — vite build does NOT
  typecheck, so lint is the only type gate.
- Bilingual first: every user-facing string needs en + jp variants.
- Motion via `motion/react`; Tailwind utility classes; dark/light themes.
- Emoji-annotated console.log diagnostics are the house debugging style in data-merge
  paths (keep them terse).

## Cardinal rules
- Never break the TokaiHome merge invariants: local `data.ts` owns `dayOfWeek`/`periods`
  + curated JP; match courses on `id` OR `code`.
- `custom-message` Lambda must return the event untouched for unknown trigger sources.
- Lambda deploys are manual (console) — a repo push changes nothing in AWS; say so in
  any change note that touches `lambdas/`.
