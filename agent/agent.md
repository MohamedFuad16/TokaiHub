# TokaiHub — agent router

Student portal PWA for Tokai University: courses, schedule, credits/GPA, campus
onboarding — native-app feel, bilingual EN/JP, dark/light. Frontend on GitHub Pages;
serverless AWS backend (Cognito + Lambda + DynamoDB).

Stack: React 18 + TypeScript · Vite · Tailwind · motion/react · aws-amplify (custom
Cognito auth UI) · 11 Lambda functions (`lambdas/`) · DynamoDB single-table · SES OTP.

## Routing table — read ONLY what the task needs

| If the task concerns... | read |
|---|---|
| build / install / run / env | `agent/setup.md` |
| architecture / how it fits together | `agent/architecture.md` |
| an API route / Lambda / Cognito / AWS | `agent/api.md` |
| a UI screen / component | `agent/components.md` |
| data models / DynamoDB / course catalog | `agent/data.md` |
| where to put a file / naming / style | `agent/conventions.md` |
| tests | `agent/tests.md` |
| a bug / gotcha / known issue | `agent/errors.md` |
| secrets / env keys | `agent/secrets.md` |
| why something was decided | `agent/decisions.md` |
| what changed / current state | `agent/state.md` |
| impact/blast-radius of a change | `agent/graph/graph.md` |
| where is X / semantic code question | graphify (`~/.claude/graphify-venv/bin/graphify query`) |
| fleet delegation (subagents / teams / workflows) | `~/Documents/brain/leader.md` |

After changes: update `agent/state.md` (summary + dated entry) and append
`agent/decisions.md` for architectural decisions. Regenerate `agent/graph/` +
`architecture.svg` when structure changes.

**Shared fleet memory:** fleet workers read this router first and append results to
`agent/state.md` with a `by:` attribution — pass workers file PATHS, never file bodies.
