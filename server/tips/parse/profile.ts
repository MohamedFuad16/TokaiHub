/**
 * Student profile from 学生ポートフォリオ (CHW0001000), JP or EN. Only the fields the Hub
 * shows are kept: the page also carries residence-card, birth-date, tuition and visa data,
 * which are dropped here on purpose so they never reach the cache or the browser.
 */
import { load, clean } from './util';

const KEEP: Record<string, string> = {
  '学生証番号': 'studentId', 'Student ID No.': 'studentId',
  '学生氏名': 'name', 'Student Name': 'name',
  '学生氏名(カナ)': 'nameKana', 'Name (Katakana)': 'nameKana',
  '学生氏名(英字)': 'nameEn', 'Name (Alphabet)': 'nameEn', 'Name (English)': 'nameEn',
  '校舎': 'campus', 'Campus': 'campus',
  '所属': 'department', 'Affiliation': 'department',
  '学年': 'year', 'Year': 'year', 'Grade': 'year',
  'セメスタ数': 'semester', 'No. of Semesters': 'semester', 'Number of Semesters': 'semester',
  '指導教員1': 'advisor', 'Academic adviser 1': 'advisor',
};

export function parse(html: string) {
  const $ = load(html);
  const out: Record<string, string> = {};
  $('td.gakuseki-head, th').each((_, h) => {
    const key = KEEP[clean($(h).text())];
    if (!key || out[key]) return;
    let v = clean($(h).next('td').text());
    // TIPS prints faculty + department back to back; drop an exact repeat.
    const half = v.length / 2;
    if (v.length % 2 === 0 && v.slice(0, half) === v.slice(half)) v = v.slice(0, half);
    if (v) out[key] = v;
  });
  // "3年" / "3Grade" → "3", so the UI can localize it.
  if (out.year) out.year = out.year.match(/\d+/)?.[0] ?? out.year;
  return out;
}
