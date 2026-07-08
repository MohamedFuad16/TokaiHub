# API — routes, Lambdas, AWS connectors

Client: `src/lib/api.ts` (typed wrappers + mock fallbacks) → `VITE_API_BASE_URL`
(API Gateway, Cognito JWT authorizer on protected routes).

## Routes ↔ Lambdas
| Method/Route | Lambda | What |
|---|---|---|
| GET /dashboard | `get-dashboard.mjs` | Aggregated home payload: profile, enrolled course ids, courses. |
| GET /schedule | `get-schedule.mjs` | Weekly timetable data. |
| GET /courses | `get-course.mjs` | Course catalog browse. |
| GET /courses/{id} | `get-course-detail.mjs` | Course detail. |
| POST /enroll | `enroll-courses.mjs` | Enroll/unenroll course ids. |
| PUT /profile | `update-profile.mjs` | Update selectedCourseIds, cumulativeGpa, lastSemGpa (all optional). |
| /admin/database | `admin-database.mjs` | Gated admin console backend. |

## Cognito lifecycle triggers (not HTTP routes)
- `pre-signup.mjs` — validation before account creation.
- `post-confirmation.mjs` — seed the DynamoDB user row after confirm.
- `custom-message.mjs` — bilingual SES OTP emails. **Must handle every trigger source**
  (SignUp, ResendCode, ForgotPassword, UpdateUserAttribute, VerifyUserAttribute,
  AdminCreateUser) and return the event untouched for `CustomMessage_Authentication`,
  or Cognito throws InvalidLambdaResponseException at callers.

## AWS services
- **Cognito** — user pool; username = raw studentId, email alias for login; custom
  in-app UI via aws-amplify (NO hosted UI).
- **DynamoDB** — `tokaihub-users` + single-table `userclass-entity` model
  (helpers in `lambdas/userclass-entity.mjs`).
- **SES** — OTP/verification email delivery.
- **API Gateway** — JWT (Cognito) authorizer in front of the data Lambdas.

Auth header: Amplify session JWT; lambdas read claims for identity. Env per Lambda:
`USERS_TABLE`, `AWS_REGION` (see each file's doc header for IAM).
