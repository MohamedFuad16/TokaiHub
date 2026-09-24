/**
 * Reads a syllabus's grading section (成績評価の基準・方法) into parts the course page can draw
 * the same way for every course: weights, the grade scale, and pass conditions. Instructors
 * write this field freely, so every piece is optional and anything not recognised stays in the
 * original text shown below the chart.
 */
import { gradingWeights } from './syllabusText';

export type GradingMode = 'weighted' | 'single' | 'unweighted' | 'none';
export interface GradingPart { label: string; en: string | null; pct: number | null }
export interface GradeBand { grade: string; min: number; max: number }
export interface GradingRule {
  kind: 'attendance' | 'late' | 'other';
  text: string;
  /** Share of classes that must be attended, 0–1. */
  minAttendance?: number;
  /** Absences allowed before the course is not graded. */
  maxAbsences?: number;
  /** Minutes late after which a class counts as an absence. */
  lateMinutes?: number;
}
export interface GradingAnalysis { mode: GradingMode; parts: GradingPart[]; scale: GradeBand[]; rules: GradingRule[]; rubric: boolean }

// What instructors grade on, with an English label. Specific kinds of exam come before the
// generic one so "中間試験" is not also counted as "試験".
const VOCAB: { re: RegExp; jp: string; en: string }[] = [
  { re: /中間(?:試験|テスト)|midterm/i, jp: '中間試験', en: 'Midterm exam' },
  { re: /期末(?:試験|テスト)|定期試験|最終試験|まとめの試験|final exam/i, jp: '期末試験', en: 'Final exam' },
  { re: /小テスト|確認テスト|確認問題|quiz/i, jp: '小テスト', en: 'Quizzes' },
  { re: /試験|テスト|\bexams?\b|\btests?\b/i, jp: '試験', en: 'Exam' },
  { re: /レポート|\breports?\b/i, jp: 'レポート', en: 'Reports' },
  { re: /課題|assignments?|homework/i, jp: '課題', en: 'Assignments' },
  { re: /発表|プレゼン|presentations?/i, jp: '発表', en: 'Presentations' },
  { re: /質疑応答|ディスカッション|議論|discussion|Q&A/i, jp: '質疑応答', en: 'Discussion' },
  { re: /平常点|授業態度|授業への参加|参加状況|participation|class activit/i, jp: '平常点', en: 'Participation' },
  { re: /実技|実習の成果|practical/i, jp: '実技', en: 'Practical work' },
  { re: /成果物|作品|制作物|deliverables?/i, jp: '成果物', en: 'Deliverables' },
  { re: /役割の遂行|team role/i, jp: '役割の遂行', en: 'Team role' },
];
const GENERIC_EXAM = 3;

/** English label for a weight label taken from the syllabus, when it names a known component. */
export function englishLabel(label: string) {
  return VOCAB.find(v => v.re.test(label))?.en ?? null;
}

const sentencesOf = (text: string) => text
  .replace(/\r/g, '')
  // Japanese syllabi end sentences with "。" or with "." and no space ("行います.学習成果…").
  .split(/\n|(?<=[。．!?！？])|(?<=[^\d]\.)\s|(?<=[\u3040-\u30ff\u4e00-\u9fff）)」]\.)(?=\S)/)
  .map(s => s.trim())
  .filter(Boolean);

const FAIL = /[「“"]?[/／][」”"]?|評価(?:を)?(?:しない|なし|対象と(?:しない|する))|対象としない|単位を認定しない|not (?:be )?(?:graded|credited|evaluated)|will fail/i;
const EVAL = /評価|成績|判断|採点|evaluat|grad(?:e|ing)|assess/i;

// A sentence can state the grade scale and then the attendance rule ("…60%未満はEとし、出席回数が…").
// Quote the rule from the clause that mentions attendance.
const fromClause = (s: string, re: RegExp) => {
  const clauses = s.split(/(?<=[、,，;；])/);
  const i = clauses.findIndex(c => re.test(c));
  return i > 0 && /[SABCDE]|以上|未満/.test(clauses.slice(0, i).join('')) ? clauses.slice(i).join('').trim() : s;
};

function ruleOf(s: string): GradingRule | null {
  const attendance = /出席|欠席|attend|absen/i.test(s);
  if (attendance && (FAIL.test(s) || /必要|満たない|required|at least|must/i.test(s))) {
    const r: GradingRule = { kind: 'attendance', text: fromClause(s, /出席|欠席|attend|absen/i) };
    const frac = /(\d)\s*[/／]\s*(\d)|(\d)\s*分の\s*(\d)/.exec(s);
    if (frac) {
      const f = frac[1] ? Number(frac[1]) / Number(frac[2]) : Number(frac[4]) / Number(frac[3]);
      // "欠席が1/3超" limits absences; "出席が2/3に満たない" sets the attendance floor.
      r.minAttendance = /欠席|absen/i.test(s.slice(0, frac.index + 12)) && !/出席.{0,8}[/／\d]/.test(s) ? 1 - f : f;
    }
    const pct = /出席率[^\d]{0,8}(\d{1,3})\s*[%％]\s*(以下|未満)|(\d{1,3})\s*%\s*(?:attendance|of (?:the )?(?:classes|sessions))/i.exec(s);
    if (pct) r.minAttendance = pct[1] ? (Number(pct[1]) + (pct[2] === '以下' ? 1 : 0)) / 100 : Number(pct[3]) / 100;
    const count = /(\d{1,2})\s*回以上の?欠席|欠席(?:が|を)?\s*(\d{1,2})\s*回以上|(\d{1,2}) or more absences|more than (\d{1,2}) absences/i.exec(s);
    if (count) r.maxAbsences = count[4] ? Number(count[4]) : Number(count[1] ?? count[2] ?? count[3]) - 1;
    return r;
  }
  if (/遅れ|遅刻|\blate\b/i.test(s) && /欠席|absen/i.test(s)) {
    const min = /(\d{1,3})\s*分|(\d{1,3})\s*min/i.exec(s);
    return { kind: 'late', text: s, lateMinutes: min ? Number(min[1] ?? min[2]) : undefined };
  }
  if (FAIL.test(s) && !/ルーブリック|rubric/i.test(s)) return { kind: 'other', text: s };
  return null;
}

/** Grade scale from "0〜59%:E、60〜69%:C…" or "90%以上でS、80%以上でA…、60%未満はE". */
export function gradeScale(text: string): GradeBand[] {
  const t = text.normalize('NFKC');
  const ranges = [...t.matchAll(/(\d{1,3})\s*[〜~\-–]\s*(\d{1,3})\s*[%点]?\s*[:：]\s*([SABCDE])(?![a-z])/g)]
    .map(m => ({ grade: m[3], min: Number(m[1]), max: Number(m[2]) }));
  if (ranges.length >= 3) return ranges.sort((a, b) => b.min - a.min);
  const at = [...t.matchAll(/(\d{1,3})\s*[%点]?\s*以上\s*(?:で|を|は)?\s*([SABCD])(?![a-z])/g)].map(m => ({ grade: m[2], min: Number(m[1]) }));
  if (at.length < 3) return [];
  at.sort((a, b) => b.min - a.min);
  const bands: GradeBand[] = at.map((b, i) => ({ grade: b.grade, min: b.min, max: i === 0 ? 100 : at[i - 1].min - 1 }));
  const floor = at[at.length - 1].min;
  if (floor > 0 && /未満|below|less than|E/.test(t)) bands.push({ grade: 'E', min: 0, max: floor - 1 });
  return bands;
}

export function analyzeGrading(text: string): GradingAnalysis {
  const sentences = sentencesOf(text);
  const ruleSentences = new Set<string>();
  const rules = sentences.map(s => { const r = ruleOf(s); if (r) ruleSentences.add(s); return r; }).filter((r): r is GradingRule => r !== null);
  const rubric = /ルーブリック|rubric/i.test(text);
  const scale = gradeScale(text);

  const weights = gradingWeights(text);
  if (weights) {
    return { mode: 'weighted', parts: weights.map(w => ({ label: w.label, en: englishLabel(w.label), pct: w.pct })), scale, rules, rubric };
  }

  // No weights: list what the evaluation sentences name, without inventing percentages.
  const found: typeof VOCAB = [];
  for (const s of sentences) {
    if (ruleSentences.has(s) || !EVAL.test(s) || /ルーブリック|rubric/i.test(s) && !/により|で評価|based on/i.test(s)) continue;
    VOCAB.forEach((v, i) => {
      if (i === GENERIC_EXAM && found.some(f => /試験|テスト/.test(f.jp))) return;
      if (v.re.test(s) && !found.includes(v)) found.push(v);
    });
  }
  const parts = found.map(v => ({ label: v.jp, en: v.en, pct: found.length === 1 ? 100 : null }));
  return { mode: parts.length === 0 ? 'none' : parts.length === 1 ? 'single' : 'unweighted', parts, scale, rules, rubric };
}
