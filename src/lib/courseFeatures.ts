/**
 * What the recommender knows about a course without asking a model: delivery from the syllabus
 * label, the exam/coursework balance from the grading text, and whether the course is a later
 * level of one the student passed (韓国語入門1B → 韓国語初級1A). Pure, shared by bridge and app.
 */
import { analyzeGrading } from './grading';

export type DeliveryKind = 'in_person' | 'online' | 'on_demand' | 'hybrid' | 'unknown';

export function deliveryKind(label: string | null | undefined): DeliveryKind {
  const x = (label ?? '').normalize('NFKC');
  if (/併用|ハイブリッド|混合|hybrid|blended/i.test(x)) return 'hybrid';
  if (/オンデマンド|on.?demand/i.test(x)) return 'on_demand';
  if (/遠隔|オンライン|online|remote/i.test(x)) return 'online';
  if (/面接|対面|in.?person/i.test(x)) return 'in_person';
  return 'unknown';
}
export const isRemote = (k: DeliveryKind) => k === 'online' || k === 'on_demand';

export type AssessmentStyle = 'assignment' | 'exam' | 'mixed' | 'participation' | 'unknown';
export interface Assessment {
  style: AssessmentStyle;
  /** Shares of the grade, 0–1. Estimated evenly when the syllabus names parts without weights. */
  examShare: number;
  assignmentShare: number;
  source: 'stated' | 'named' | 'model' | 'none';
}

const EXAM = /試験|テスト|exam|test|quiz|確認問題/i;
const WORK = /課題|レポート|report|assignment|homework|発表|プレゼン|presentation|project|成果物|制作|演習|実技|practical|deliverable/i;

export function styleOf(examShare: number, assignmentShare: number): AssessmentStyle {
  if (examShare >= 0.6) return 'exam';
  if (assignmentShare >= 0.6) return 'assignment';
  if (examShare + assignmentShare < 0.4) return 'participation';
  return 'mixed';
}

export function assessmentOf(gradingText: string | null | undefined): Assessment {
  const a = analyzeGrading(gradingText ?? '');
  if (a.parts.length === 0) return { style: 'unknown', examShare: 0, assignmentShare: 0, source: 'none' };
  const weight = (p: { pct: number | null }) => (p.pct ?? 100 / a.parts.length) / 100;
  let exam = 0, work = 0, total = 0;
  for (const p of a.parts) {
    const w = weight(p);
    total += w;
    const label = `${p.label} ${p.en ?? ''}`;
    if (EXAM.test(label)) exam += w;
    else if (WORK.test(label)) work += w;
  }
  const examShare = total ? exam / total : 0, assignmentShare = total ? work / total : 0;
  return { style: styleOf(examShare, assignmentShare), examShare, assignmentShare, source: a.mode === 'weighted' || a.mode === 'single' ? 'stated' : 'named' };
}

// Level words in order, Japanese and English, and the tracks a language series runs in. Compare
// Japanese titles where possible: TIPS's English titles do not follow the Japanese levels
// (ドイツ語入門1A is "ELEMENTARY GERMAN 1A").
const LEVELS: [RegExp, number][] = [[/入門|beginning|introductory/i, 1], [/初級|elementary/i, 2], [/中級|intermediate/i, 3], [/上級|advanced/i, 4]];
const TRACKS = /会話|講読|文法|作文|演習|conversation|reading|grammar|writing/gi;

/** The series a course belongs to and its place in it, or null when the title has no level. */
export function levelOf(title: string): { root: string; rank: number } | null {
  let t = title.normalize('NFKC').replace(/\s+/g, ' ').trim();
  let word = 0;
  for (const [re, n] of LEVELS) {
    if (re.test(t)) { if (!word) word = n; t = t.replace(re, ' '); }
  }
  const tail = /(\d{1,2})\s*([A-D])?\s*$/i.exec(t);
  if (!word && !tail) return null;
  const root = (tail ? t.slice(0, tail.index) : t).replace(TRACKS, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  if (root.length < 2) return null;
  const num = tail ? Number(tail[1]) : 0;
  const letter = tail?.[2] ? tail[2].toUpperCase().charCodeAt(0) - 64 : 0;
  return { root, rank: word * 1000 + num * 10 + letter };
}

/**
 * The highest passed course this one follows on from (same series, lower level), if any. Only
 * the next step counts: at most one level word above the highest passed, so 入門 leads to 初級,
 * not straight to 中級 or 上級.
 */
export function continuesFrom(title: string, passed: string[]): string | null {
  const l = levelOf(title);
  if (!l) return null;
  let best: { title: string; rank: number } | null = null;
  for (const p of passed) {
    const lp = levelOf(p);
    if (lp && lp.root === l.root && (!best || lp.rank > best.rank)) best = { title: p, rank: lp.rank };
  }
  if (!best || best.rank >= l.rank) return null;
  return Math.floor(l.rank / 1000) - Math.floor(best.rank / 1000) <= 1 ? best.title : null;
}
