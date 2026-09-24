/** 出欠状況参照 (AAW0001000): course list for a term, and per-course session marks (JP/EN). */
import { load, clean, num, dayPeriods, termFromText } from './util';

export function parseList(html: string) {
  const $ = load(html);
  return $('#list tbody tr').toArray().map(tr => {
    const td = $(tr).children('td');
    return {
      slots: dayPeriods(td.eq(0).text()),
      slotText: clean(td.eq(0).text()),
      offering: clean(td.eq(1).text()),
      code: clean(td.eq(2).text()),
      title: clean(td.eq(3).text()),
      href: td.eq(3).find('a').attr('href') ?? '',
    };
  }).filter(r => r.code);
}

// Marks are the same symbols in both languages except 欠届 / N.A.
const MARK: Record<string, string> = {
  '○': 'present', '×': 'absent', '欠届': 'notice', 'N.A.': 'notice', '配慮': 'accommodation',
  '休': 'cancelled', '/': 'unrecorded', '遅': 'late', '早': 'early',
};

export function parseDetail(html: string) {
  const $ = load(html);
  const table = $('#shukketsuJokyoTable').length ? $('#shukketsuJokyoTable') : $('table').filter((_, t) => $(t).find('tr').first().children('th').length > 10).first();
  const headCells = table.find('tr').first().children('th').toArray().map(th => clean($(th).text()));
  const firstSession = headCells.findIndex(h => /^\d+\s+\d+\/\d+/.test(h));
  const row = table.find('tr').filter((_, tr) => $(tr).children('td').length > 0).first();
  const c = row.children('td').toArray().map(td => clean($(td).text()));
  if (!c.length || firstSession < 0) return null;
  const sessions = headCells.slice(firstSession).map((h, i) => {
    const m = /^(\d+)\s+(\d+)\/(\d+)\s*(\d+)?/.exec(h);
    const raw = c[firstSession + i] ?? '';
    return { no: Number(m?.[1]), month: Number(m?.[2]), day: Number(m?.[3]), period: m?.[4] ? Number(m[4]) : null, mark: raw, status: MARK[raw] ?? (raw ? 'other' : 'unrecorded') };
  });
  return {
    year: num(c[1]?.match(/\d{4}/)?.[0]), term: termFromText(c[2] ?? ''), code: c[3], title: c[4], slotText: c[5], teacher: c[6],
    attended: num(c[7]) ?? 0, absent: num(c[8]) ?? 0, other: num(c[9]) ?? 0,
    sessions,
  };
}
