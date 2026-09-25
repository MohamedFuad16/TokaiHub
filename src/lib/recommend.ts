/**
 * Ranks the bridge's offerings against the student's preferences and builds this term's plan.
 * Runs in the app, so moving a preference re-ranks instantly without asking TIPS again.
 */
import { allocate, type PlanItem } from './courseCategories';
import { isRemote } from './courseFeatures';
import type { Offering, RecommendData } from './recommendTypes';

export type DeliveryPref = 'any' | 'remote' | 'in_person';
export type AssessmentPref = 'any' | 'assignment' | 'exam';
/** The student's answers to the "For you" questions. Empty lists mean no limit. */
export interface Prefs {
  /** Days with no classes wanted, 1 = Monday … 6 = Saturday. */
  daysOff: number[];
  /** Periods the student can attend. */
  periods: number[];
  /** Campuses the student can get to, as campusKey() values. Online sections fit any campus. */
  campuses: string[];
  delivery: DeliveryPref;
  assessment: AssessmentPref;
  /** Favour the next level of something already passed (a language, part 2 of a series). */
  continueSeries: boolean;
  lighter: boolean;
}
export const DEFAULT_PREFS: Prefs = { daysOff: [], periods: [], campuses: [], delivery: 'any', assessment: 'any', continueSeries: true, lighter: false };

/** One key per campus whatever the display language (TIPS gives 湘南 or SHONAN). */
export function campusKey(name: string): string {
  const x = name.normalize('NFKC').trim();
  for (const [key, re] of [['shonan', /湘南|shonan/i], ['shinagawa', /品川|shinagawa/i], ['takanawa', /高輪|takanawa/i], ['yoyogi', /代々木|yoyogi/i], ['kumamoto', /熊本|kumamoto/i], ['sapporo', /札幌|sapporo/i], ['isehara', /伊勢原|isehara/i], ['shimizu', /清水|shimizu/i]] as const) {
    if (re.test(x)) return key;
  }
  return x.toUpperCase();
}

/** Why a section does not fit the answers, or null when it does. */
export type Misfit = 'day_off' | 'period' | 'campus' | 'format';
export function misfitOf(o: Offering, p: Prefs): Misfit | null {
  if (o.slots.some(s => p.daysOff.includes(s.day))) return 'day_off';
  if (p.periods.length && o.slots.some(s => !p.periods.includes(s.period))) return 'period';
  const remote = isRemote(o.delivery.kind);
  if ((p.delivery === 'remote' && o.delivery.kind === 'in_person') || (p.delivery === 'in_person' && remote)) return 'format';
  if (p.campuses.length && !remote && o.campus && !p.campuses.includes(campusKey(o.campus))) return 'campus';
  return null;
}

export type Reason = 'remote' | 'in_person' | 'assignment' | 'exam' | 'continues' | 'light' | 'required' | 'required_elective';
export interface Ranked { o: Offering; score: number; reasons: Reason[] }

/** Whether the student can actually add this section now (TIPS allows it, no clash, prerequisites met). */
export const usable = (o: Offering) => o.canRegister && !o.clash && o.prereq.ok;

export function scoreOf(o: Offering, prefs: Prefs): Ranked {
  let score = 0;
  const reasons: Reason[] = [];
  if (o.mark === 'required') { score += 10; reasons.push('required'); }
  if (o.mark === 'required-elective') { score += 1; reasons.push('required_elective'); }
  const remote = isRemote(o.delivery.kind);
  // Sections of unknown format pass the filter; the ones known to match rank above them.
  if (prefs.delivery === 'remote') {
    if (remote) { score += 3; reasons.push('remote'); } else if (o.delivery.kind === 'hybrid') score += 1;
  } else if (prefs.delivery === 'in_person') {
    if (o.delivery.kind === 'in_person') { score += 2; reasons.push('in_person'); }
  }
  const { examShare, assignmentShare } = o.assessment;
  if (prefs.assessment === 'assignment') {
    score += 4 * assignmentShare - 2 * examShare;
    if (o.assessment.style === 'assignment') reasons.push('assignment');
  } else if (prefs.assessment === 'exam') {
    score += 4 * examShare - 2 * assignmentShare;
    if (o.assessment.style === 'exam') reasons.push('exam');
  }
  if (prefs.continueSeries && o.continues) { score += 4; reasons.push('continues'); }
  if (prefs.lighter && o.workload !== null) { score += (1 - o.workload) * 1.5; if (o.workload < 0.8) reasons.push('light'); }
  return { o, score, reasons };
}

const overlaps = (a: Offering['slots'], b: Offering['slots']) => a.some(x => b.some(y => x.day === y.day && x.period === y.period));
const toPlan = (o: Offering): PlanItem => ({ code: o.code, title: o.title, credits: o.credits, section: o.section, requirement: o.requirement });

export interface Plan {
  picks: Ranked[]; credits: number; target: number; budget: number;
  /** Required courses takeable now whose every section conflicts with the answers. */
  unfit: { title: string; why: Misfit }[];
  /** Registrable sections left out by the answers. */
  hidden: number;
}

/**
 * This term's plan: first the required courses that can be taken now, then the best-scoring
 * courses that fit the student's answers and still count toward a section the student needs (following the graduation lines,
 * so an elective in a full section counts where its surplus goes), without clashes, one section
 * per course, up to the credits worth taking now and within the registration limit.
 */
export function buildPlan(data: RecommendData, prefs: Prefs, extra: PlanItem[] = []): Plan {
  const budget = Math.min(data.credits.target, data.credits.limit !== null ? data.credits.limit - data.credits.registered : Infinity);
  const open = data.offerings.filter(usable);
  const fitting = open.filter(o => !misfitOf(o, prefs));
  const ranked = fitting.map(o => scoreOf(o, prefs)).sort((a, b) => b.score - a.score);
  const picks: Ranked[] = [];
  const busy = [...data.registered.map(r => r.slots)];
  const titles = new Set<string>();
  let credits = 0;
  const fits = (r: Ranked) => !titles.has(r.o.title) && !busy.some(s => overlaps(s, r.o.slots)) && credits + r.o.credits <= budget;
  const take = (r: Ranked) => { picks.push(r); busy.push(r.o.slots); titles.add(r.o.title); credits += r.o.credits; };

  const unfit: Plan['unfit'] = [];
  for (const req of data.required.filter(x => x.status === 'available')) {
    const best = ranked.find(r => r.o.title === req.title && fits(r));
    if (best) { take(best); continue; }
    const any = open.find(o => o.title === req.title);
    if (any && !fitting.some(o => o.title === req.title)) unfit.push({ title: req.title, why: misfitOf(any, prefs)! });
  }
  for (const r of ranked) {
    if (credits >= budget) break;
    if (!fits(r)) continue;
    // Keep it only if its credits land in a section that still has room.
    const where = allocate([...extra, ...picks.map(p => toPlan(p.o)), toPlan(r.o)], data.sections).get(r.o.code);
    if (!where || where.beyond) continue;
    take(r);
  }
  return { picks, credits, target: data.credits.target, budget, unfit, hidden: open.length - fitting.length };
}
