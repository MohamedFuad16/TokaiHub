# Critique Report — TokaiHub UI Improvement Sprint

**Reviewer:** Critic & QA Agent
**Date:** 2026-04-07
**Scope:** Changes from Task #1 (Visual Design) and Task #2 (Technical Implementation)

---

## 1. Schedule Data Consistency Fix (src/data.ts)

**Change:** `getClassesForDate` parameter changed from `courseIds?: string[]` (optional) to `selectedCourseIds: string[]` (required). Removed the fallthrough that showed ALL classes when the array was empty.

**Risk Level:** MEDIUM

**Assessment:** This is the correct fix. All three schedule views (daily, weekly, monthly) now derive from the same source of truth. The old behavior was a bug — it silently showed unselected courses when `selectedCourseIds` was empty.

**Edge case found:** New users who sign in via Cognito get `selectedCourseIds: []` (App.tsx:276). With the old code, they would see all classes as an accidental "preview." With the new code, they see nothing. This was flagged and addressed with contextual empty states (see item #8 below).

**Follow-up needed:** None — resolved.

---

## 2. TypeScript Hygiene — `any` Removal (src/App.tsx, src/components/TokaiAssignmentDetail.tsx, src/components/TokaiSettings.tsx)

**Changes:**
- `MainAppContent` props: `any` replaced with `MainAppContentProps` interface
- `TokaiAssignmentDetail`: `Record<string, any>` replaced with `Record<string, AssignmentDetail>`
- `TokaiSettings`: `(settings as any).enableEnhancedUI` casts removed (field already exists on `AppSettings`)
- Deprecated `Screen` type, `params`, and `onNavigate` removed from `ScreenProps`

**Risk Level:** LOW

**Assessment:** All changes verified as correct. The `AssignmentDetail` interface properly captures `title`, `course`, `daysLeft`, `color`, and `desc` fields. The `MainAppContentProps` interface matches all actual prop usage. Removing deprecated fields is clean — grep confirms no remaining references to `params`, `onNavigate`, or `Screen` type in any component.

**Edge case:** `attrs['custom:studentId'] as string` cast remains in App.tsx:241,274. This is a Cognito attribute access pattern and is acceptable — the `as string` is the standard way to narrow Amplify's `FetchUserAttributesOutput` values.

**Follow-up needed:** None.

---

## 3. Unused Import Cleanup (Multiple files)

**Changes:** Removed `signIn` from aws-amplify/auth; `Clock`, `MapPin`, `BookOpen`, `Users` from lucide-react across TokaiSchedule, TokaiHome, TokaiEditProfile; `AnimatePresence` from TokaiEditProfile.

**Risk Level:** LOW

**Assessment:** Verified — none of these symbols are referenced in the updated files. Clean removal.

**Follow-up needed:** None.

---

## 4. Dead Code Removal — `currentWeekOffset` (src/components/TokaiSchedule.tsx)

**Change:** Removed `currentWeekOffset` state and the prev/next week navigation buttons in the weekly timetable header. The semester label was hardcoded as "2026 — 1st Semester" and the offset was never used for any data computation.

**Risk Level:** LOW

**Assessment:** Correct. The state was set but never read by any rendering logic. The weekly timetable renders all selected classes regardless of week offset (it's a fixed semester timetable, not a week-by-week view). Removing non-functional UI buttons is the right call.

**Edge case:** If a future feature needs week navigation for the weekly view, it will need to be re-implemented. But removing dead UI that suggests functionality that doesn't exist is better than keeping a broken affordance.

**Follow-up needed:** None.

---

## 5. `EditProfileProps` Simplification (src/components/TokaiEditProfile.tsx)

**Change:** Removed `goBack` from `EditProfileProps` and changed the component signature from `Omit<EditProfileProps, 'goBack'>` to just `EditProfileProps`.

**Risk Level:** LOW

**Assessment:** The component uses `navigate(-1)` directly and never referenced the `goBack` prop. Clean removal.

**Follow-up needed:** None.

---

## 6. `handleSignIn` Parameter Rename (src/App.tsx)

**Change:** Renamed unused `email` parameter to `_email`.

**Risk Level:** LOW

**Assessment:** Standard TypeScript convention for unused parameters. The function body calls `getCurrentUser()` / `fetchUserAttributes()` instead of using the email parameter directly.

**Follow-up needed:** None.

---

## 7. Assignment Detail — Improved Empty State (src/components/TokaiAssignmentDetail.tsx)

**Change:** The "not found" fallback was upgraded from a bare `<div className="p-8 font-bold">Assignment not found...</div>` to a styled empty state with mascot image, localized text, dark mode support, and a "Go Back" button.

**Risk Level:** LOW

**Assessment:** Good improvement. The new empty state respects `isDark` and `lang`, includes the mascot (per CLAUDE.md guidelines), and provides a clear action. However, this is now the only component importing `mascotIdle` that didn't previously — build verified it resolves correctly.

**Follow-up needed:** None.

---

## 8. Contextual Empty States for No Courses Selected (src/components/TokaiSchedule.tsx, src/components/TokaiHome.tsx)

**Change:** Added "Select your courses in Edit Profile" messaging with mascot and "Edit Profile" navigation button in:
- TokaiSchedule: top-level (when no courses selected at all), daily empty state, and weekly/monthly fallback
- TokaiHome: schedule bottom sheet and calendar bottom sheet

**Risk Level:** LOW

**Assessment:** Well-implemented. The empty states:
- Use the mascot (per CLAUDE.md)
- Are localized (EN/JP)
- Provide clear CTA to `/editProfile`
- In bottom sheets, correctly close the sheet before navigating

**Minor inconsistency:** TokaiSchedule uses `t[lang].goToEditProfile` from its translation object, while TokaiHome uses inline `lang === 'en' ? 'Edit Profile' : 'プロフィール編集'`. Not a bug, but a style inconsistency.

**Follow-up needed:** Optional — could unify the translation approach, but low priority.

---

## 9. TokaiAssignments — Dark Mode Border, Border Radius & Flex Fix, Empty State (src/components/TokaiAssignments.tsx)

**Changes (visual-designer):**
- Header border now dark-mode-aware: `${isDark ? 'border-gray-800' : 'border-gray-100'}` (was hardcoded `border-gray-100 dark:border-gray-800` which relies on Tailwind's `dark:` variant — the app uses manual `isDark` state, not Tailwind dark mode class)
- Card border radius changed from `rounded-[24px]` to `rounded-[32px]` for consistency with other components (TokaiSchedule daily cards, TokaiAssignmentDetail)
- Deadline pill flex fix: changed from `flex ... inline-flex` (conflicting display properties) to `inline-flex` only
- Added mascot empty state for when `deadlines.length === 0` with localized text

**Risk Level:** LOW

**Assessment:** All changes are correct and improve consistency.
- The border fix is important: the app does NOT use Tailwind's `darkMode: 'class'` strategy, so `dark:border-gray-800` would never activate. The explicit `isDark` ternary is the correct pattern used everywhere else.
- Border radius standardization to `rounded-[32px]` matches TokaiSchedule and TokaiAssignmentDetail.
- The flex fix resolves a real CSS conflict — `flex` and `inline-flex` on the same element is invalid; only the last one wins.
- Empty state is currently unreachable (deadlines is a hardcoded non-empty array), but it's defensive and will be useful when assignments come from an API.

**Follow-up needed:** None.

---

## 10. TokaiCourse — Dark Mode Icon Colors (src/components/TokaiCourse.tsx)

**Change (visual-designer):** Clock, Award, and BookOpen icons in the details grid now use `${isDark ? 'text-brand-yellow' : 'text-brand-black'}` instead of hardcoded `text-brand-black`.

**Risk Level:** LOW

**Assessment:** Correct fix. In dark mode, `text-brand-black` icons were invisible against the dark background. Using `text-brand-yellow` in dark mode provides good contrast and matches the app's accent color convention.

**Follow-up needed:** None.

---

## 11. Accessibility — `prefers-reduced-motion` NOT Addressed

**Risk Level:** MEDIUM

**Assessment:** No component in the codebase includes `prefers-reduced-motion` guards. All Framer Motion animations (stagger children, spring transitions, AnimatePresence, whileHover, whileTap) will play regardless of user accessibility preferences. This is a pre-existing gap that was not addressed by either agent.

Affected components: ALL (TokaiHome, TokaiSchedule, TokaiCourse, TokaiSettings, TokaiEditProfile, SharedMenu, App.tsx route transitions).

**Follow-up needed:** Add a global `useReducedMotion()` hook (from `motion/react`) or a CSS `@media (prefers-reduced-motion: reduce)` approach. This could be a separate task.

---

## 12. Pre-existing Issues NOT Introduced by These Changes

These are observations from the baseline read, not regressions:

- **Hardcoded date in TokaiSchedule** (line 69): `new Date(2026, 3, 8)` — works for the current semester but will need updating.
- **TokaiHome `todayClasses`** uses `new Date()` — will show 0 classes when running outside the April-October 2026 window defined in `getClassesForDate`.
- **No offline handling** anywhere — the app will silently fail if Cognito auth check fails for network reasons vs. not-authenticated.

---

## Overall Assessment

**Verdict: APPROVE with minor notes**

The changes are sound, well-scoped, and improve the codebase. Key wins:
1. Schedule data consistency is genuinely fixed — the weekly view bug (showing all classes regardless of selection) is resolved
2. TypeScript is cleaner — no more `any` types in component props
3. Empty states are user-friendly and follow design guidelines (mascot, localized text, clear CTAs)
4. Dead code is removed without breaking anything
5. Dark mode visual regressions fixed (TokaiAssignments border, TokaiCourse icon colors)
6. CSS consistency improved (border radius standardization, flex property conflict resolved)

The only medium-priority gap is the missing `prefers-reduced-motion` support, which is a pre-existing issue and should be tracked as a separate task rather than blocking this work.

Build passes cleanly. No regressions identified.
