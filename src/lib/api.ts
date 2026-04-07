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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { fetchAuthSession } from 'aws-amplify/auth';
import { allItems } from '../data';
import type { Assignment, CourseItem, UserProfileAPI } from './types';

export const API_BASE_URL = 'https://4tsr153t0m.execute-api.ap-northeast-1.amazonaws.com/dev';

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

/** Authenticated fetch — attaches Authorization: Bearer <token> header when a session exists. */
async function apiFetch<T>(path: string): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardResponse {
  courses?: CourseItem[];
  assignments?: Assignment[];
  userProfile?: UserProfileAPI;
}

/** Fetches dashboard summary data: courses, assignments, and user profile. */
export async function getDashboard(): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>('/dashboard');
}

// ─── Schedule ──────────────────────────────────────────────────────────────────

/** Fetches the authenticated user's full schedule. */
export async function getSchedule(): Promise<CourseItem[]> {
  return apiFetch<CourseItem[]>('/schedule');
}

// ─── Course Details ────────────────────────────────────────────────────────────

/** Fetches detailed info for a single course. */
export async function getCourseDetails(courseId: string): Promise<CourseItem> {
  return apiFetch<CourseItem>(`/course-details/${courseId}`);
}

// ─── Available Courses (for onboarding) ────────────────────────────────────────

/**
 * Fetches available courses filtered by the student's class (A, B, etc.).
 * During sign-up (no JWT yet), pass the studentId so the Lambda can derive the class.
 * After login, the JWT is used automatically and studentId is optional.
 *
 * Lambda reads x-student-id header → looks up class in tokai-classes table →
 * joins with tokai-courses → returns only the correct class sections for the student.
 */
export async function fetchAvailableCourses(
  studentId: string,
  studentClass: 'A' | 'B',
): Promise<CourseItem[]> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-student-id': studentId,
    'x-student-class': studentClass,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/course`, { headers });
  } catch (networkErr: any) {
    throw new Error(`Network error: ${networkErr?.message ?? 'failed to reach server'}`);
  }

  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(`HTTP ${res.status} — ${body || res.statusText}`);
  }

  return res.json() as Promise<CourseItem[]>;
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

// ─── Legacy helpers (kept for compatibility) ───────────────────────────────────

const _mockAssignments: Assignment[] = [
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

export async function getCourses(): Promise<CourseItem[]> {
  return allItems as CourseItem[];
}

export async function getAssignments(): Promise<Assignment[]> {
  return _mockAssignments;
}

export async function getUserProfile(_userId: string): Promise<UserProfileAPI | null> {
  return null;
}

export async function updateUserProfile(_profile: UserProfileAPI): Promise<void> {
  console.warn('updateUserProfile: no backend connected — changes are local session only');
}
