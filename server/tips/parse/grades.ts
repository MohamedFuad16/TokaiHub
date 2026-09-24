/** 単位修得状況照会 (SIW0001300, display): GPA history, credits per term, grade list (JP/EN). */
import { load, clean, num, rowsOf, termFromText } from './util';

const REQ: Record<string, string> = { '○': 'required', '×': 'elective', '※': 'excluded', '☆': 'otherDept', '◇': 'selectiveRequired' };

export function parse(html: string) {
  const $ = load(html);
  const tables = $('table').toArray();
  const head = rowsOf($, tables.find(t => $(t).find('th.seiseki-head').length > 0 && rowsOf($, t).length >= 3));
  const totalEarned = num(head[2]?.filter(Boolean).slice(-1)[0]);

  // GPA table: first th mentions GPA; each row "24年度春学期GPA： 学期3.43 通算3.43 順位265人中146位"
  // or "24AY Spring Semester GPA： Semester 3.43 Cumulative 3.43 Ranking 146 of 265" style.
  const gpaTable = tables.find(t => /GPA/.test($(t).find('th').first().text()));
  const asOfM = /(\d{4})[年/](\d{2})[月/](\d{2})/.exec(clean($(gpaTable).find('th').first().text()));
  const gpa = $(gpaTable).find('td').toArray().map(td => {
    const s = clean($(td).text());
    const y = /(\d{2})(?:年度|AY)/.exec(s);
    const nums = [...s.replace(/^\d{2}(?:年度|AY)/, '').matchAll(/\d+(?:\.\d+)?/g)].map(m => Number(m[0]));
    if (!y || nums.length < 2) return null;
    const [termGpa, cumulativeGpa, a, b] = nums;
    // JP lists cohort then rank (265人中146位); EN lists rank then cohort. Rank is the smaller.
    const rank = a !== undefined && b !== undefined ? Math.min(a, b) : null;
    const cohort = a !== undefined && b !== undefined ? Math.max(a, b) : null;
    return { year: 2000 + Number(y[1]), term: termFromText(s), termGpa, cumulativeGpa, cohort, rank };
  }).filter(Boolean);

  const perTermRows = rowsOf($, tables.find(t => /学期ごとの|based on regist/i.test($(t).find('th').first().text())));
  const pick = (i: number) => (perTermRows[i] ?? []).slice(1);
  const perTerm = pick(1).map((sem, i) => ({ semester: num(sem), label: pick(2)[i], earned: num(pick(3)[i]), cumulative: num(pick(4)[i]) }))
    .filter(t => t.semester !== null);

  const courseRows = rowsOf($, tables.find(t => clean($(t).find('th').first().text()) === 'No.'));
  const courses = courseRows.slice(1).filter(c => c.length >= 11 && /^\d+$/.test(c[0])).map(c => ({
    category: c[1], subcategory: c[2], group: c[3], requirement: REQ[c[4]] ?? c[4], title: c[5],
    credits: num(c[6]), year: num(c[7]), term: termFromText(c[8]), termText: c[8], grade: c[9], passed: /^(合|Pass)/i.test(c[10]),
  }));

  return { asOf: asOfM ? `${asOfM[1]}-${asOfM[2]}-${asOfM[3]}` : null, totalEarned, gpa, perTerm, courses };
}
