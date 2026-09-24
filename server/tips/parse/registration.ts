/** 履修登録 search results (RSW0001000 → yobiJigen/search): candidate courses for a slot. */
import { load, clean, num, isNoDataRow } from './util';

export function parseCandidates(html: string) {
  const $ = load(html);
  const table = $('table.normal').filter((_, t) => $(t).find('[onclick*="syllabus("]').length > 0 || $(t).find('th').length >= 9).first();
  const rows = table.find('tr').slice(1).toArray().map(tr => {
    const td = $(tr).children('td');
    const c = td.toArray().map(x => clean($(x).text()));
    if (c.length < 9 || isNoDataRow(c)) return null;
    const ins = /rishuInsert\('(\d+)',\s*'(\w+)',\s*'(\w+)'\)/.exec($(tr).find('[onclick*="rishuInsert"]').attr('onclick') ?? '');
    const syl = /syllabus\('(\d+)','(\w+)','(\w+)'/.exec($(tr).find('[onclick*="syllabus("]').attr('onclick') ?? '');
    return {
      code: c[1], number: c[2], title: c[3], teacher: c[4], requirement: c[5], credits: num(c[6]), campus: c[7], slotText: c[8],
      jscd: ins?.[2] ?? syl?.[2] ?? null, year: ins?.[1] ?? syl?.[1] ?? null,
      canRegister: !!ins,
    };
  }).filter(Boolean);
  return { candidates: rows, messages: messages(html) };
}

/** Error / info messages TIPS shows after an action (red text, error blocks). */
export function messages(html: string) {
  const $ = load(html);
  const out = new Set<string>();
  $('[class*="error"], [class*="Error"], [class*="message"], font[color="red"], font[color="#FF0000"], .red').each((_, e) => {
    const t = clean($(e).text());
    if (t && t.length < 400 && !/Internet Explorer/.test(t)) out.add(t);
  });
  return [...out];
}

/** "Register from curriculum": the student's requirement categories (search type 6). */
export function parseCurriculum(html: string) {
  const $ = load(html);
  return $('[onclick*="curriculumSearch("]').toArray().map(e => {
    const m = /curriculumSearch\('(\w*)',\s*'(\w*)',\s*'(\w*)',\s*'([^']*)'\)/.exec($(e).attr('onclick') ?? '');
    return m ? { d: m[1], s: m[2], m: m[3], name: clean($(e).text()) || m[4], rawName: m[4] } : null;
  }).filter(Boolean);
}

/**
 * Courses of one curriculum category. Columns: button search(kamokuCd), grade number,
 * title, credits, spring slots/week, spring intensive, fall slots/week, fall intensive,
 * prerequisites.
 */
export function parseCurriculumCourses(html: string) {
  const $ = load(html);
  const table = $('table.normal').filter((_, t) => $(t).find('[onclick*="search("]').length > 0).first();
  return table.find('tr').toArray().map(tr => {
    const td = $(tr).children('td');
    if (td.length < 9) return null;
    const kamoku = /search\('(\w+)'\)/.exec(td.eq(0).find('[onclick]').attr('onclick') ?? '')?.[1] ?? null;
    const c = td.toArray().map(x => clean($(x).text()));
    return {
      kamoku, number: c[1], title: c[2], credits: num(c[3]),
      spring: num(c[4]), springIntensive: num(c[5]), fall: num(c[6]), fallIntensive: num(c[7]),
      prerequisite: c[8] || null,
    };
  }).filter(Boolean);
}
