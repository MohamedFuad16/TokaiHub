# Secrets — pointers only (never values)

- Frontend env: `.env.local` (gitignored; template `.env.example`) —
  `VITE_API_BASE_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`,
  `VITE_COGNITO_DOMAIN`, `VITE_OAUTH_REDIRECT_SIGN_IN/OUT`. These are public-ish
  client config (Cognito client is a public client), but keep them out of commits.
- Lambda env (set in the Lambda console per function): `USERS_TABLE=tokaihub-users`,
  region ap-northeast-1. IAM permissions per each lambda's doc header.
- `GEMINI_API_KEY` — optional local tooling only (`.env.local`).
- No server-side API keys live in this repo. AWS credentials come from the AWS CLI
  profile / console session, never files here.
