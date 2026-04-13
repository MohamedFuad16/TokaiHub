// API types for TokaiHub
// These interfaces define the expected data shapes for the future AWS backend.
// Keep in sync with data.ts and any backend API responses.

export interface LocalizedString {
  en: string;
  jp: string;
}

export interface EvaluationBreakdown {
  label: LocalizedString;
  percentage: number;
  color: string;
}

export interface CourseItem {
  id: string;
  type: 'Classes' | 'Events' | 'Clubs';
  title: LocalizedString;
  teacher?: LocalizedString;
  location?: LocalizedString;
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, ...
  periods?: number[];
  time?: string;
  color?: string;
  icon?: string;
  image?: string;
  action?: string;
  code?: string;
  credits?: number;
  evaluation?: LocalizedString;
  evaluationBreakdown?: EvaluationBreakdown[];
  overview?: LocalizedString;
}

export interface Assignment {
  id: string;
  title: LocalizedString;
  course: LocalizedString;
  daysLeft: number;
  color: string;
  status: 'pending' | 'submitted';
  dueDate?: string; // ISO date string, e.g. "2026-04-09"
}

export interface UserProfileAPI {
  name: string;
  email: string;
  studentId: string;
  campus: string;
  selectedCourseIds: string[];
  cumulativeGpa: number;
  lastSemGpa: number;
  isVerified?: boolean;
}

export interface DashboardResponse {
  courses?: CourseItem[];
  assignments?: Assignment[];

  // possible backend shapes
  profile?: Partial<UserProfileAPI>;
  user?: Partial<UserProfileAPI>;
  Item?: Partial<UserProfileAPI>; // DynamoDB

  enrolledCourseIds?: string[];
}

/** Generic response envelope for future API responses */
export interface APIResponse<T> {
  data: T;
  error?: string;
  status: number;
}
