# Setup — build & run

## Prerequisites
- Node.js ≥ 18 (repo verified on Node 22).
- AWS CLI only if pushing Amplify/backend config changes.

## Install & run
```bash
npm install
npm run dev      # vite on http://0.0.0.0:3000
npm run build    # vite build → build/
npm run preview  # serve the build
npm run lint     # tsc --noEmit  ← the only typecheck gate; vite build does NOT typecheck
npm run clean    # rm -rf dist
```

**Local auth bypass:** for UI work without AWS, flip `settings.devSkipAuth = true` in
the App environment flags (see `App.tsx`); `lib/api.ts` mock fallbacks keep screens
populated offline.

## Environment variables (`.env.local`, template `.env.example`)
- `VITE_API_BASE_URL` — API Gateway base URL.
- `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN`,
  `VITE_OAUTH_REDIRECT_SIGN_IN`, `VITE_OAUTH_REDIRECT_SIGN_OUT` — Cognito/Amplify.
- `GEMINI_API_KEY` — optional, asset/script tooling.

## Lambda deployment (manual!)
Each `lambdas/*.mjs` documents its own console setup in its doc header: runtime
Node 22.x, handler, API Gateway method/route, JWT authorizer, env vars
(e.g. `USERS_TABLE=tokaihub-users`), and required IAM (e.g. `dynamodb:UpdateItem` on
the table ARN). Deploy = paste/upload in the Lambda console per function; pushing this
repo does not deploy them. Region: ap-northeast-1.

## Frontend deployment
GitHub Pages from the built `build/` output (live at mohamedfuad16.github.io/TokaiHub);
`vercel.json` also present for Vercel previews.
