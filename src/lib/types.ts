// Shared shapes for TokaiHub. TIPS types mirror the JSON returned by the local bridge
// (server/tips/parse/*). Keep them in sync when a parser changes.

export interface LocalizedString {
  en: string;
  jp: string;
}

export interface EvaluationBreakdown {
  label: LocalizedString;
  percentage: number;
  color: string;
}

/** A course as the UI components render it (timetable cards, lists, detail). */
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

// ─── TIPS ────────────────────────────────────────────────────────────────────

export type Term = '1' | '2';

export interface TipsStatus {
  state: 'signed_out' | 'signing_in' | 'signed_in';
  hubExpiresAt: string | null;
  minutesLeft: number;
  lastError: string | null;
  /** Mac only: the TIPS account signed in on the bridge, the Hub owner, and passkey count. */
  accountId?: string | null;
  ownerId?: string | null;
  devices?: number;
}

export interface TipsEnvelope<T> {
  data: T;
  cachedAt: number;
  fromCache: boolean;
  stale: boolean;
}

export interface TipsProfile {
  studentId?: string; name?: string; nameKana?: string; nameEn?: string; campus?: string;
  department?: string; status?: string; year?: string; semester?: string; entryYear?: string;
  enrollment?: string; advisor?: string;
}

export interface TipsTimetableCourse {
  code: string; title: string; teacher: string; campus: string; room: string;
  day: number; periods: number[]; note?: string;
  drop?: { year: string; jscd: string; code: string; day: string; period: string };
}

export interface TipsTimetable {
  year: number | null;
  term: Term | null;
  registrationStatus: string | null;
  registrationOpen: boolean;
  openSlots: { day: number; period: number; flag: string; campus: string }[];
  campusCode: string | null;
  grid: { days: string[]; periods: string[] };
  lastUpdated: string | null;
  credits: { registered: number | null; limit: number | null };
  courses: TipsTimetableCourse[];
  session: { day: string; period: string; code: string; title: string; teacher: string }[];
  other: { day: string; period: string; code: string; title: string; teacher: string }[];
}

export type AttendanceStatus = 'present' | 'absent' | 'notice' | 'accommodation' | 'cancelled' | 'unrecorded' | 'late' | 'early' | 'other';

export interface TipsAttendanceCourse {
  code: string; title: string; slotText: string; offering: string;
  slots: { day: number; period: number }[];
  teacher?: string; attended?: number; absent?: number; other?: number;
  sessions?: { no: number; month: number; day: number; period: number | null; mark: string; status: AttendanceStatus }[];
}

export interface TipsGrades {
  asOf: string | null;
  totalEarned: number | null;
  gpa: { year: number; term: Term; termGpa: number; cumulativeGpa: number; cohort: number | null; rank: number | null }[];
  perTerm: { semester: number | null; label: string; earned: number | null; cumulative: number | null }[];
  courses: { category: string; subcategory: string; group: string; requirement: string; title: string; credits: number | null; year: number | null; term: Term | null; termText: string; grade: string; passed: boolean }[];
}

export interface TipsGraduation {
  groups: { section: string; name: string; items: { name: string; required: number | null; earned: number | null; inProgress: number | null; shortfall: number | null }[] }[];
  total: { required: number | null; earned: number | null; inProgress: number | null; shortfall: number | null } | null;
}

export interface TipsBulletin {
  id: string; category: 'notice' | 'personal'; postedAt: string; title: string; genre: string; poster: string; period: string; status: string; unread: boolean;
}

export interface TipsBulletins {
  posts: TipsBulletin[];
  genres: { name: string; type: string; code: string; count: number; unread: number }[];
  unreadCount: number;
}

export interface TipsBulletinDetail {
  title: string; genre: string; body: string; poster: string; contact: string | null; postedAt: string | null; attachments: string[];
}

export interface TipsReport {
  slot: string | null; course: string | null; teacher: string; title: string; publishedAt: string;
  deadline: string; updatedAt: string; submitted: string; submittedAt: string;
}

export interface TipsExam {
  date: string; weekday: string; period: string; title: string; term: string; room: string; teacher: string; allowed: string; notes: string;
}

export interface TipsChange {
  campus: string; term: string; date: string; weekday: string; period: string; code: string; title: string; teacher: string; room: string;
  status: 'normal' | 'roomChange' | 'cancelled' | 'makeup' | 'cancelledMakeup';
}

export interface TipsSyllabusResult {
  year: number | null; term: string; title: string; slotText: string; campus: string; teacher: string;
  ref: { year: string; jscd: string; code: string } | null; hasEnglish: boolean;
}

export interface TipsSyllabus {
  year: number | null; semester: LocalizedJpEn; code: string; title: LocalizedJpEn; dayPeriod: string;
  delivery: LocalizedJpEn; creditType: string; mainInstructor: LocalizedJpEn; credits: number | null;
  instructors: { name: LocalizedJpEn; affiliation: LocalizedJpEn }[];
  sections: { label: LocalizedJpEn; value: string }[];
  schedule: { no: number | null; when: string; topic: string; method: string; prep: string }[];
  /** Language the section texts are written in (English only when the teacher published it). */
  contentLang: 'jp' | 'en';
}

export interface TipsOption { value: string; label: string }
export interface TipsSyllabusOptions {
  year: string | null;
  terms: TipsOption[]; campuses: TipsOption[]; entryYears: TipsOption[];
  faculties: TipsOption[]; departments: TipsOption[]; days: TipsOption[]; periods: TipsOption[];
}

export interface TipsCandidate {
  code: string; number: string; title: string; teacher: string; requirement: string; credits: number | null;
  campus: string; slotText: string; jscd: string | null; year: string | null; canRegister: boolean;
}

export interface TipsActionResult {
  messages: string[];
  title: string;
  timetable: TipsTimetable | null;
}

export interface LocalizedJpEn { jp: string; en: string }

export interface TipsCabinetFile { name: string; date: string; summary: string; url?: string; fileId?: string; folderId?: string }
export interface TipsCabinetFolder { id: string; name: string; period: string; owner: string; summary: string; files: TipsCabinetFile[]; children: TipsCabinetFolder[] }
