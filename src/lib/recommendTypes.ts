/** What the bridge's recommender (server/tips/recommend.ts) sends to the app. */
import type { Assessment, DeliveryKind } from './courseFeatures';
import type { CategorySection } from './courseCategories';
import type { Mark } from '../../server/tips/handbook';

export type { Mark };

/** One registrable section of a course offered this term. */
export interface Offering {
  code: string; year: string | null; jscd: string | null; kamoku: string | null;
  title: string; section: string | null; category: string; credits: number;
  /** Handbook 必選別 (○ ◇ × ☆) when the handbook is saved; TIPS's own 必修/選択 below. */
  mark: Mark | null; requirement: string;
  slots: { day: number; period: number }[]; slotText: string; teacher: string; campus: string;
  canRegister: boolean;
  /** Title of the registered course it clashes with. */
  clash: string | null;
  prereq: { ok: boolean; note: string | null };
  delivery: { kind: DeliveryKind; label: string };
  assessment: Assessment;
  /** A passed course this one follows on from (next level of a language, part 2 of a series). */
  continues: string | null;
  /** 0 light – 2 heavy, when the model rated it. */
  workload: number | null;
}

export type RequiredStatus = 'earned' | 'registered' | 'available' | 'locked' | 'not_offered';
export interface RequiredCourse {
  title: string; number: string | null; section: string | null; credits: number;
  status: RequiredStatus; reason: string | null;
  /** Codes of this term's offerings of the course. */
  offerings: string[];
}

export interface RecommendData {
  builtAt: number; year: number | null; term: string | null; semester: number | null;
  dept: string | null; entryYear: number | null; handbook: boolean; model: boolean;
  credits: {
    limit: number | null; registered: number; remaining: number;
    /** Required credits that cannot be taken yet (prerequisite semester later, e.g. 卒業研究). */
    frozen: { title: string; credits: number; reason: string }[];
    /** Credits worth planning now: remaining minus frozen, within the term's limit. */
    target: number;
  };
  sections: CategorySection[];
  required: RequiredCourse[];
  offerings: Offering[];
  registered: { code: string; title: string; slots: { day: number; period: number }[] }[];
}

export interface RecommendStatus {
  building: boolean;
  progress: { step: string; done: number; total: number } | null;
  error: string | null;
  data: RecommendData | null;
}
