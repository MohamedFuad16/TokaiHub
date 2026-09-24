/** 履修登録・登録状況照会 (RSW0001000): registered courses for one term, JP or EN page. */
import { load, clean, lines, num, termFromText, rowsOf } from './util';

export interface TimetableCourse {
  code: string; title: string; teacher: string; campus: string; room: string;
  day: number; periods: number[]; note?: string;
  /** Present only during the registration period, when TIPS offers "delete" on the cell. */
  drop?: { year: string; jscd: string; code: string; day: string; period: string };
}

const CODE = /^[A-Z]{2,4}\d{3}[A-Z]?$/;

export function parse(html: string) {
  const $ = load(html);
  const heads = $('table').filter((_, t) => $(t).children('tbody,thead').children('tr').children('th.rishu-head').length > 0 || $(t).children('tr').children('th.rishu-head').length > 0);
  const head = rowsOf($, heads.get(0));
  const caps = rowsOf($, heads.get(1));
  // Row 3 of the header: [label, "2026年度 秋学期" | "2026 / Spring Semester", ..., label, deadline]
  const yearTerm = head[2]?.[1] ?? '';
  const deadline = head[2]?.filter(Boolean).slice(-1)[0] ?? null;
  const updatedCell = $('td').filter((_, td) => /最終更新日時|Last Updated/.test($(td).text())).last().text();
  const lastUpdated = /(?:最終更新日時|Last Updated on)\s*[：:]\s*(.+)/.exec(clean(updatedCell))?.[1] ?? null;
  const [registered, limit] = (caps[0]?.[1] ?? '').split(/[／/]/).map(num);

  // Grid rows = periods, columns = Mon..Sat. A two-period course appears in both rows,
  // so merge by (code, day). Empty cells carry InputCall(...) while registration is open.
  const byKey = new Map<string, TimetableCourse>();
  const openSlots: { day: number; period: number; flag: string; campus: string }[] = [];
  $('table.rishu-koma > tbody > tr, table.rishu-koma > tr').each((ri, tr) => {
    if (ri === 0) return;
    const period = num($(tr).children('td').first().text());
    $(tr).children('td').slice(1).each((ci, td) => {
      const day = ci + 1;
      const handlers = [$(td).attr('onclick') ?? '', ...$(td).find('[onclick],a[href^="javascript"]').toArray().map(e => ($(e).attr('onclick') ?? '') + ($(e).attr('href') ?? ''))].join(' ');
      const inner = $(td).find('table.rishu-koma-inner td').first();
      const parts = inner.length ? lines($, inner) : [];
      const note = parts.find(l => /^【.*】$/.test(l));
      const [code, title, teacher, campus, ...room] = parts.filter(l => !/^【.*】$/.test(l));
      if (!period) return;
      if (!code || !CODE.test(code)) {
        // During registration an empty cell links yobiJigen(day, period, flag, campus).
        const yj = /yobiJigen\('(\d+)',\s*'(\d+)',\s*'(\w*)',\s*'(\w*)'\)/.exec(handlers);
        if (yj) openSlots.push({ day, period, flag: yj[3], campus: yj[4] });
        else if (/yobiJigenCall\(|InputCall\(/.test(handlers)) openSlots.push({ day, period, flag: '1', campus: '' });
        return;
      }
      const del = /DeleteCall\('(\d+)',\s*'(\w+)',\s*'(\w+)',\s*'(\w+)',\s*'(\w+)'\)/.exec(handlers);
      const key = `${code}-${day}`;
      const cur = byKey.get(key);
      if (cur) { if (!cur.periods.includes(period)) cur.periods.push(period); return; }
      byKey.set(key, {
        code, title: title ?? '', teacher: teacher ?? '', campus: campus ?? '', room: room.join(' '), day, periods: [period],
        ...(note ? { note } : {}),
        ...(del ? { drop: { year: del[1], jscd: del[2], code: del[3], day: del[4], period: del[5] } } : {}),
      });
    });
  });

  // Grid shape and day headers exactly as TIPS draws them (localized by TIPS).
  const gridRows = $('table.rishu-koma > tbody > tr, table.rishu-koma > tr');
  const dayLabels = gridRows.first().children('td').slice(1).toArray().map(td => clean($(td).text()));
  const periodLabels = gridRows.slice(1).toArray().map(tr => clean($(tr).children('td').first().text()));

  const extra = (index: number) => {
    const tb = $('table.rishu-etc').get(index);
    return rowsOf($, tb).slice(2).filter(c => c.length >= 5 && CODE.test(c[2]))
      .map(c => ({ day: c[0], period: c[1], code: c[2], title: c[3], teacher: c[4] }));
  };

  return {
    year: num(yearTerm.match(/\d{4}/)?.[0]),
    term: termFromText(yearTerm),
    registrationStatus: deadline,
    grid: { days: dayLabels, periods: periodLabels },
    registrationOpen: openSlots.length > 0 || [...byKey.values()].some(c => c.drop),
    campusCode: openSlots.find(o => o.campus)?.campus ?? null,
    openSlots,
    lastUpdated,
    credits: { registered, limit },
    courses: [...byKey.values()].sort((a, b) => a.day - b.day || a.periods[0] - b.periods[0]),
    session: extra(0),
    other: extra(1),
  };
}
