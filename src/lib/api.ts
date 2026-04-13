/**
 * Centralized API layer for TokaiHub.
 *
 * Connects to AWS Lambda functions via API Gateway.
 * All requests include the Cognito JWT ID token in the Authorization header.
 *
 * ─── Endpoints ────────────────────────────────────────────────────────────────
 *
 * GET  /user-course?action=profile    → user profile
 * GET  /user-course?action=courses    → courses (class group + all)
 * PUT  /user-course?action=updateCourses → enroll courses & update profile
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { fetchAuthSession } from 'aws-amplify/auth';
import { allItems } from '../data';
import type { Assignment, CourseItem, UserProfileAPI } from './types';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://4tsr153t0m.execute-api.ap-northeast-1.amazonaws.com/dev';

// ─── Auth Token ────────────────────────────────────────────────────────────────

/** Retrieves the Cognito ID token from the current session. Returns null in dev/offline mode. */
async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

// ─── Fetch Helper ──────────────────────────────────────────────────────────────

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/** Authenticated fetch — attaches Authorization: Bearer <token> header when a session exists. */
async function apiFetch<T>(path: string, signalOrOptions?: AbortSignal | ApiFetchOptions): Promise<T> {
  // Support both legacy apiFetch(path, signal) and new apiFetch(path, { method, body, signal })
  const opts: ApiFetchOptions = signalOrOptions instanceof AbortSignal
    ? { signal: signalOrOptions }
    : (signalOrOptions ?? {});

  const token = await getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const timeoutSignal = AbortSignal.timeout(15_000);
  const combinedSignal = opts.signal
    ? AbortSignal.any([opts.signal, timeoutSignal])
    : timeoutSignal;

  if (opts.method === 'PUT') {
    console.log(`[apiFetch] PUT ${path} body:`, opts.body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: combinedSignal,
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return (await res.json()) as T;
}

// ─── Normalization Helpers ───────────────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

/** Converts backend items (string days, string periods) into the numeric format frontend expects. */
function normalizeCourse(item: any): CourseItem {
  if (!item) return item;

  // 1. Day of week: "THU" -> 4 or ensure number
  let day = item.dayOfWeek;
  if (typeof day === 'string') {
    day = DAY_MAP[day.toUpperCase()] ?? Number(day);
  } else {
    day = Number(day);
  }
  if (isNaN(day)) day = 1;

  // 2. Periods: Ensure we always have an array of numbers
  let rawPeriods = item.periods;
  let periods: number[] = [];
  if (Array.isArray(rawPeriods)) {
    periods = rawPeriods.map((p: any) => Number(p)).filter((p: number) => !isNaN(p));
  } else if (typeof rawPeriods === 'number') {
    periods = [rawPeriods];
  } else if (typeof rawPeriods === 'string') {
    // Handles "1" or "1,2"
    periods = rawPeriods.split(',').map(p => Number(p.trim())).filter(p => !isNaN(p));
  }
  if (periods.length === 0) periods = [1]; // Fallback to period 1

  // 3. GPA & Credits casting
  const credits = Number(item.credits || 0);

  // 4. Unified ID/Code mapping
  const courseCode = item.courseCode || item.code || item.id || item.courseId;

  // 5. Categorize as 'Classes' for the Weekly view filter if type is missing
  const type = item.type || 'Classes';

  // 6. Map roomNumber -> location (LocalizedString)
  let location = item.location || item.roomNumber;
  if (typeof location === 'string') {
    location = { en: location, jp: location };
  }

  // 7. Map courseName -> title (LocalizedString)
  let title = item.title || item.courseName;
  if (typeof title === 'string') {
    title = { en: title, jp: title };
  }

  // 8. Generate time string from periods for the monthly view
  const PERIOD_TIMES: Record<number, string> = {
    1: '09:00 - 10:40',
    2: '10:55 - 12:35',
    3: '13:25 - 15:05',
    4: '15:20 - 17:00',
    5: '17:15 - 18:55',
    6: '19:05 - 20:45',
  };
  const time = item.time || (() => {
    if (!periods.length) return '';
    const first = PERIOD_TIMES[periods[0]];
    const last = PERIOD_TIMES[periods[periods.length - 1]];
    if (!first) return '';
    const startTime = first.split(' - ')[0];
    const endTime = (last || first).split(' - ')[1];
    return `${startTime} - ${endTime}`;
  })();

  return {
    ...item,
    id: courseCode,
    code: courseCode,
    type,
    title,
    location,
    dayOfWeek: day,
    periods: periods || [],
    credits: isNaN(credits) ? 0 : credits,
    time,
  };
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardResponse {
  courses?: CourseItem[];
  assignments?: Assignment[];
  userProfile?: UserProfileAPI;
  // Fields returned by the updated get-dashboard Lambda
  enrolledCourseIds?: string[];
  todayClasses?: Array<{
    courseId: string;
    courseName: string;
    startTime: string | null;
    endTime: string | null;
    roomNumber: string | null;
    professorName: string | null;
  }>;
  profile?: {
    fullName: string;
    studentId: string;
    institutionId: string;
    class: string;
    cumulativeGpa?: number;
    lastSemGpa?: number;
  };
}

/** Fetches dashboard summary data: user profile (with GPA/enrolled courses), and course catalog. */
export async function getDashboard(signal?: AbortSignal): Promise<DashboardResponse> {
  const [profileRes, courses] = await Promise.all([
    apiFetch<Record<string, any>>('/user-course?action=profile', { signal }),
    apiFetch<CourseItem[]>('/user-course?action=courses', { signal })
  ]);
  
  return {
    profile: profileRes,
    enrolledCourseIds: profileRes?.enrolledCourses || profileRes?.selectedCourseIds || [],
    courses: (courses || []).map(normalizeCourse),
    assignments: _mockAssignments,
  };
}

// ─── Schedule ──────────────────────────────────────────────────────────────────

/** Fetches the authenticated user's full schedule. Returns available courses the user can select/filter. */
export async function getSchedule(signal?: AbortSignal): Promise<CourseItem[]> {
  const courses = await apiFetch<any[]>('/user-course?action=courses', { signal });
  return (courses || []).map(normalizeCourse);
}

// ─── Course Details ────────────────────────────────────────────────────────────

/** Fetches detailed info for a single course. Looks up within the available courses. */
export async function getCourseDetails(courseId: string, signal?: AbortSignal): Promise<CourseItem> {
  const courses = await apiFetch<CourseItem[]>('/user-course?action=courses', { signal });
  const course = courses.find((c: any) => c.id === courseId || c.courseId === courseId || c.code === courseId);
  if (!course) throw new Error(`Course not found: ${courseId}`);
  return course;
}

// ─── Available Courses (for onboarding / edit-profile) ────────────────────────

/** In-memory cache — avoids redundant network round-trips within a session. */
let _coursesCache: CourseItem[] | null = null;

/**
 * Fetches all available courses from the course catalog Lambda.
 * Result is cached in memory for the lifetime of the page — subsequent calls
 * (Edit Profile, Credits page, Onboarding step transitions) return instantly.
 */
export async function fetchAvailableCourses(): Promise<CourseItem[]> {
  if (_coursesCache) return _coursesCache;
  const result = await apiFetch<any[]>('/user-course?action=courses');
  const normalized = (result || []).map(normalizeCourse);
  _coursesCache = normalized;
  return normalized;
}

/** Clear the courses cache (e.g. after sign-out). */
export function clearCoursesCache(): void {
  _coursesCache = null;
}

// ─── Enroll Courses ────────────────────────────────────────────────────────────

/**
 * Saves the student's selected course IDs to DynamoDB via the EnrollCourses Lambda.
 * Requires an active Cognito session — call only after signIn() completes.
 */
export async function enrollCourses(courseIds: string[]): Promise<void> {
  await apiFetch('/user-course?action=updateCourses', {
    method: 'PUT',
    body: {
      selectedCourseIds: courseIds,
      enrolledCourses: courseIds
    }
  });
}

// ─── Update Profile ────────────────────────────────────────────────────────────

export interface UpdateProfileRequest {
  /** Course codes e.g. ["TTK085", "TTT032"] */
  selectedCourseIds?: string[];
  enrolledCourses?: string[];
  cumulativeGpa?: number;
  lastSemGpa?: number;
}

export interface UpdateProfileResponse {
  success: boolean;
  profile?: Record<string, unknown>;
}

/**
 * Updates the authenticated student's profile in DynamoDB.
 * selectedCourseIds must be course codes (e.g. "TTK085"), not local IDs (e.g. "mon-1-2").
 * Use allItems to convert: allItems.find(i => i.id === localId)?.code ?? localId
 */
export async function updateProfile(
  updates: UpdateProfileRequest,
  signal?: AbortSignal,
): Promise<UpdateProfileResponse> {
  return apiFetch<UpdateProfileResponse>('/user-course?action=updateCourses', { 
    method: 'PUT', 
    body: updates, 
    signal 
  });
}

// ─── Mock assignment data — used as fallback in TokaiHome ─────────────────────

export const _mockAssignments: Assignment[] = [
  {
    id: '1',
    title: { en: 'VR Project Draft', jp: 'VRプロジェクト草案' },
    course: { en: 'CG & Virtual Reality', jp: 'CGとバーチャルリアリティ' },
    daysLeft: 2,
    color: 'bg-brand-yellow',
    status: 'pending',
  },
  {
    id: '2',
    title: { en: 'Cloud Architecture Essay', jp: 'クラウドアーキテクチャレポート' },
    course: { en: 'Cloud Computing', jp: 'クラウドコンピューティング' },
    daysLeft: 5,
    color: 'bg-brand-pink',
    status: 'pending',
  },
  {
    id: '3',
    title: { en: 'Mobile App Outline', jp: 'モバイルアプリの概要' },
    course: { en: 'Mobile App Dev', jp: 'モバイルアプリケーション開発' },
    daysLeft: 0,
    color: 'bg-brand-green',
    status: 'submitted',
  },
];

// ─── Admin Database CRUD (via /testDB Lambda) ─────────────────────────────────

export interface DbItem {
  PK: string;
  SK: string;
  [key: string]: unknown;
}

/** Browse/search the DynamoDB table. Optionally filter by PK prefix, SK prefix, or free-text search. */
export async function adminBrowse(opts?: { pk?: string; sk?: string; search?: string }): Promise<DbItem[]> {
  const params = new URLSearchParams({ action: 'browse' });
  if (opts?.pk) params.set('pk', opts.pk);
  if (opts?.sk) params.set('sk', opts.sk);
  if (opts?.search) params.set('search', opts.search);
  return apiFetch<DbItem[]>(`/testDB?${params.toString()}`);
}

/** Add a new item to DynamoDB. Body must include PK and SK. */
export async function adminAddItem(item: DbItem): Promise<{ message: string; item: DbItem }> {
  return apiFetch('/testDB?action=add', { method: 'POST', body: item });
}

/** Update an existing item. Body must include PK, SK, and the fields to update. */
export async function adminEditItem(item: DbItem): Promise<{ message: string }> {
  return apiFetch('/testDB?action=edit', { method: 'PUT', body: item });
}

/** Delete an item by PK + SK. */
export async function adminDeleteItem(pk: string, sk: string): Promise<{ message: string }> {
  return apiFetch('/testDB?action=delete', { method: 'DELETE', body: { PK: pk, SK: sk } });
}
