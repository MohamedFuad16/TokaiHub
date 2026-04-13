/**
 * Centralized API layer for TokaiHub.
 *
 * Connects to AWS Lambda functions via API Gateway.
 * All requests include the Cognito JWT ID token in the Authorization header.
 *
 * ─── Endpoints ────────────────────────────────────────────────────────────────
 *
 * GET  /dashboard                    → getDashboard()         → DashboardResponse
 * GET  /schedule                     → getSchedule()          → CourseItem[]
 * GET  /course-details/{courseId}    → getCourseDetails()     → CourseItem
 * GET  /course                       → fetchAvailableCourses() → CourseItem[]
 * POST /enroll-courses               → enrollCourses()        → void
 * PUT  /profile                      → updateProfile()        → UpdateProfileResponse
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

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: combinedSignal,
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return (await res.json()) as T;
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

/** Fetches dashboard summary data: courses, assignments, and user profile. */
export async function getDashboard(signal?: AbortSignal): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>('/dashboard', { signal });
}

// ─── Schedule ──────────────────────────────────────────────────────────────────

/** Fetches the authenticated user's full schedule. */
export async function getSchedule(signal?: AbortSignal): Promise<CourseItem[]> {
  return apiFetch<CourseItem[]>('/schedule', signal);
}

// ─── Course Details ────────────────────────────────────────────────────────────

/** Fetches detailed info for a single course. */
export async function getCourseDetails(courseId: string, signal?: AbortSignal): Promise<CourseItem> {
  return apiFetch<CourseItem>(`/course-details/${courseId}`, signal);
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
  const result = await apiFetch<CourseItem[]>('/course');
  _coursesCache = result;
  return result;
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
  const token = await getAuthToken();
  if (!token) throw new Error('enrollCourses: no auth session — call after signIn()');

  const res = await fetch(`${API_BASE_URL}/enroll-courses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ courseIds }),
  });
  if (!res.ok) throw new Error(`enrollCourses → ${res.status}`);
}

// ─── Update Profile ────────────────────────────────────────────────────────────

export interface UpdateProfileRequest {
  /** Course codes e.g. ["TTK085", "TTT032"] — convert from local IDs before calling */
  selectedCourseIds?: string[];
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
  return apiFetch<UpdateProfileResponse>('/profile', { method: 'PUT', body: updates, signal });
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
