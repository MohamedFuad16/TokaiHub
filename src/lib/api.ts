/**
 * Centralized API layer for TokaiHub.
 *
 * Currently uses mock data. Each function is structured so you can replace
 * the mock return with a real fetch() call once the API Gateway endpoint is available.
 *
 * ─── Future Backend Endpoints ────────────────────────────────────────────────
 *
 * GET  /courses                      → getCourses()          → CourseItem[]
 * GET  /courses/:id                  → (future) getCourse()  → CourseItem
 *
 * GET  /assignments                  → getAssignments()      → Assignment[]
 * GET  /assignments/:id              → (future) getAssignment()
 * POST /assignments                  → (future) createAssignment()
 * PUT  /assignments/:id              → (future) updateAssignment()
 * DEL  /assignments/:id              → (future) deleteAssignment()
 *
 * GET  /users/:userId                → getUserProfile()      → UserProfileAPI | null
 * PUT  /users/:userId                → updateUserProfile()   → void
 *
 * GET  /schedule?date=YYYY-MM-DD     → (future) getScheduleForDate()
 * GET  /schedule?userId=:id&date=... → (future) getUserSchedule() (with selectedCourseIds filter)
 *
 * ─── Migration Pattern ───────────────────────────────────────────────────────
 *
 *   // Before (mock):
 *   return allItems as CourseItem[];
 *
 *   // After (real API):
 *   const res = await fetch(`${API_BASE_URL}/courses`, {
 *     headers: { Authorization: `Bearer ${token}` },
 *   });
 *   if (!res.ok) throw new Error(`getCourses failed: ${res.status}`);
 *   return res.json();
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { allItems } from '../data';
import type { Assignment, CourseItem, UserProfileAPI } from './types';

/** Base URL — set VITE_API_BASE_URL in .env when the backend is ready */
const _API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Mock assignment data (mirrors TokaiAssignments.tsx deadlines)
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

/**
 * Fetch all courses/items.
 * Replace mock with: fetch(`${API_BASE_URL}/courses`) when API Gateway endpoint is available.
 */
export async function getCourses(): Promise<CourseItem[]> {
  return allItems as CourseItem[];
}

/**
 * Fetch all assignments.
 * Replace mock with: fetch(`${API_BASE_URL}/assignments`) when API Gateway endpoint is available.
 */
export async function getAssignments(): Promise<Assignment[]> {
  return _mockAssignments;
}

/**
 * Fetch a user profile by userId.
 * Replace mock with: fetch(`${API_BASE_URL}/users/${userId}`) when API Gateway endpoint is available.
 */
export async function getUserProfile(_userId: string): Promise<UserProfileAPI | null> {
  // No backend connected yet — Cognito attributes are loaded via fetchUserAttributes() in App.tsx
  return null;
}

/**
 * Persist a user profile update.
 * Replace mock with: fetch(`${API_BASE_URL}/users/${profile.studentId}`, { method: 'PUT', body: JSON.stringify(profile) })
 * when API Gateway endpoint is available.
 */
export async function updateUserProfile(_profile: UserProfileAPI): Promise<void> {
  console.warn('updateUserProfile: no backend connected — changes are local session only');
}
