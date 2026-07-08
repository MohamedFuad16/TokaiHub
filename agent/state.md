# State

> Last updated: 2026-07-08 · HEAD: 2265dde

## Current state summary
Student portal PWA (React+TS+Vite+Tailwind, custom Cognito auth via aws-amplify, 11
manually-deployed Lambdas over DynamoDB, SES OTP). Frontend live on GitHub Pages.
Verified 2026-07-08 on `main` (synced with origin): `npm run lint` clean, `npm run
build` green, all lambdas parse. Done: PWA theming, bilingual EN/JP, onboarding wizard,
custom auth + OTP, dashboard/schedule/courses/enrollment/profile APIs, DynamoDB
persistence, gated admin console. Pending (README roadmap): S3 uploads, Route 53
domain. No automated tests yet (see tests.md).

## Recent changes
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
