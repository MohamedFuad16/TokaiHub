# Data — models, storage, state

## DynamoDB (server truth)
- `tokaihub-users` — student profile rows: email, name, studentId, selectedCourseIds
  (course CODES like TTK085, not local ids), cumulativeGpa, lastSemGpa.
- Single-table **userclass-entity** model (`lambdas/userclass-entity.mjs`) — course
  catalog, enrollment, schedule entities.
- Region ap-northeast-1.

## Local course catalog (`src/data.ts`) — frontend truth for scheduling
Every course's `dayOfWeek`, `periods`, `time`, colors, credits, and curated JP
translations. TokaiHome merges API courses OVER this catalog but **protects
scheduling fields and curated translations** — the API may not carry them. If the API
misses an enrolled id, the local catalog supplements it. Course identity matches on
`id` OR `code` everywhere (the API sometimes returns codes only).

## Client state
- React state per screen + `userProfile` lifted to `App.tsx` (ScreenProps).
- localStorage caching: dashboard courses (`getCachedCourses`) for instant paint;
  language/theme prefs.
- Profile normalization: dashboard responses vary (`data.profile` / `.user` / `.Item` /
  flat) — TokaiHome picks whichever candidate actually has profile-ish fields. Keep
  this tolerance when touching the API shape.

## API types
`src/lib/api.ts` — `DashboardResponse` (profile, enrolledCourseIds, courses,
assignments?), `CourseItem`, `Assignment`, plus `_mock*` fixtures used as offline
fallbacks. NOTE: `assignments` has no UI consumer yet — the dead setter that crashed
the mock path was removed 2026-07-08 (see decisions ADR-0002); wire real state when an
assignments UI lands.
