# Components (src/components/)

One file per screen, `Tokai*` naming. All receive `ScreenProps` (lang, setLang,
settings, userProfile, setUserProfile) from `App.tsx`.

| Component | Responsibility |
|---|---|
| TokaiSplash | Entry/branding screen. |
| TokaiAuth | Custom Cognito login/signup/OTP flows (aws-amplify, no hosted UI). |
| TokaiOnboarding | Multi-step campus/course/GPA wizard (motion/react animations). |
| TokaiFederatedOnboarding | Onboarding variant for federated identities. |
| **TokaiHome** | Dashboard hub: calls `getDashboard`, merges API courses over local `data.ts` (protects `dayOfWeek`/`periods` + curated JP), caches courses, updates profile. **Highest-risk screen — the merge logic is subtle.** |
| TokaiSchedule + WeeklyTimetable | Weekly grid; scheduling truth comes from `data.ts` fields. |
| TokaiClass / TokaiCourse | Course browse + detail (get-course / get-course-detail). |
| TokaiCredits | GPA/credit progress. |
| TokaiEditProfile | PUT /profile (course ids, GPAs). |
| TokaiSettings | Prefs incl. theme/lang; `devSkipAuth` flag lives in App env flags. |
| SharedMenu | Bottom/global navigation shell. |
| AdminDatabase | Gated /admin/database console over admin-database Lambda. |
| MaintenanceBanner | Global notice banner. |

Shared libs: `lib/api.ts` (all HTTP + mocks), `lib/awsConfig.ts` (Amplify),
`lib/types.ts` + `src/types/` (shapes), `data.ts` (course catalog ground truth),
`src/assets` (incl. hidden fox mascot, pre-wired).

Conventions when adding a screen: create `components/TokaiX.tsx`, accept ScreenProps,
route it in `App.tsx`, add strings for BOTH en/jp, and keep API calls inside
`lib/api.ts` (never fetch directly from a component).
