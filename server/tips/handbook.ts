/**
 * The class handbook (授業要覧) for the student's faculty and entry year, as text next to its PDF
 * in ~/.tokaihub/docs (`pdftotext -layout`). TIPS does not say which curriculum courses are
 * required (必修) or what their prerequisites are; the handbook's カリキュラム表 does, one row per
 * course: "Ⅳ421 卒業研究１   ○   4   …   ②７セメ＆③96単位". Legend (必選別): ○ required,
 * ◇ required elective, × elective, ☆ other-department course.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type Mark = 'required' | 'required-elective' | 'elective' | 'other';
export interface HandbookCourse {
  number: string;          // "Ⅳ421"
  title: string;           // as printed, NFKC-normalised
  mark: Mark | null;
  credits: number;
  prereq: { courses: string[]; semester: number | null; credits: number | null };
  /** "情報通信学科生履修不可" and similar: this department may not take it. */
  closed: boolean;
}

const DIR = path.join(os.homedir(), '.tokaihub', 'docs');
const MARKS: Record<string, Mark> = { '○': 'required', '◇': 'required-elective', '×': 'elective', '☆': 'other' };
const ROMAN: Record<string, string> = { I: 'Ⅰ', II: 'Ⅱ', III: 'Ⅲ', IV: 'Ⅳ', V: 'Ⅴ', VI: 'Ⅵ' };
const ROW = /(Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|Ⅵ)(\d{3})\s+(\S(?:.*?\S)?)\s{2,}([○◇×☆])?\s*(\d)(?:\s|$)(.*)$/;

export const normTitle = (s: string) => s.normalize('NFKC').toUpperCase().replace(/[\s・･·\-_,.、。()（）「」『』:：]/g, '');

/** Parses every curriculum row in a handbook text. Pure, for tests. */
export function parseHandbook(text: string): HandbookCourse[] {
  const out: HandbookCourse[] = [];
  for (const raw of text.split('\n')) {
    const m = ROW.exec(raw);
    if (!m) continue;
    const rest = m[6].normalize('NFKC');
    // NFKC turns ① into "1", so name the three conditions before normalising:
    // ① prior course, ② semester, ③ credits earned.
    const pre = (/([①②③][^\s]*)/.exec(m[6])?.[1] ?? '').replace(/①/g, 'C:').replace(/②/g, 'S:').replace(/③/g, 'N:').normalize('NFKC');
    out.push({
      number: `${m[1]}${m[2]}`,
      title: m[3].normalize('NFKC').replace(/\s+/g, ' ').trim(),
      mark: m[4] ? MARKS[m[4]] : null,
      credits: Number(m[5]),
      prereq: {
        courses: [...pre.matchAll(/C:(VI|IV|V|III|II|I)(\d{3})/g)].map(x => `${ROMAN[x[1]]}${x[2]}`),
        semester: Number(/S:(\d{1,2})セメ/.exec(pre)?.[1]) || null,
        credits: Number(/N:(\d{2,3})単位/.exec(pre)?.[1]) || null,
      },
      closed: /履修不可/.test(rest),
    });
  }
  return out;
}

let cached: { key: string; rows: Map<string, HandbookCourse> } | null = null;

/**
 * The handbook rows for a student's entry year, keyed by normalised title. Picks the text in
 * ~/.tokaihub/docs that names the year (e.g. "2024年度") and the department code (e.g. "（JE）").
 * Returns an empty map when no handbook is saved; the recommender then works from TIPS alone.
 */
export function handbookFor(entryYear: string | number | null, dept: string | null): Map<string, HandbookCourse> {
  const key = `${entryYear}:${dept}`;
  if (cached?.key === key) return cached.rows;
  const rows = new Map<string, HandbookCourse>();
  try {
    for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.txt'))) {
      const text = fs.readFileSync(path.join(DIR, f), 'utf8');
      if (entryYear && !text.includes(`${entryYear}年度`)) continue;
      if (dept && !text.normalize('NFKC').includes(`(${dept})`)) continue;
      for (const r of parseHandbook(text)) {
        const k = normTitle(r.title);
        // The department's own row wins over a shared table's row for the same title.
        if (!rows.has(k) || (rows.get(k)!.closed && !r.closed)) rows.set(k, r);
      }
    }
  } catch { /* no handbook saved */ }
  cached = { key, rows };
  return rows;
}
