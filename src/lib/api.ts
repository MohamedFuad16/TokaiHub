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

export const API_BASE_URL = 'https://4tsr153t0m.execute-api.ap-northeast-1.amazonaws.com';

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
