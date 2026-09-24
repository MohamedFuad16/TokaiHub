/** Positional readers for the simple list tables (reports, exams, class changes), JP or EN. */
import { load, rowsOf, isNoDataRow, type $ } from './util';

/** Tables whose first header row has exactly `cols` cells (after colspan expansion). */
function tablesWithCols($: $, cols: number, cls = 'normal') {
  return $(`table.${cls}`).toArray().filter(t => (rowsOf($, t)[0]?.length ?? 0) === cols);
}
const dataRows = (rows: string[][]) => rows.slice(1).filter(r => r.some(Boolean) && !isNoDataRow(r));

export function parseReports(html: string) {
  const $ = load(html);
  const course = tablesWithCols($, 10)[0];
  const general = tablesWithCols($, 8)[0];
  return {
    courseReports: course ? dataRows(rowsOf($, course)).map(c => ({ slot: c[0], course: c[1], teacher: c[2], title: c[3], publishedAt: c[4], deadline: c[5], updatedAt: c[6], submitted: c[7], submittedAt: c[8] })) : [],
    generalReports: general ? dataRows(rowsOf($, general)).map(c => ({ slot: null, course: null, teacher: c[0], title: c[1], publishedAt: c[2], deadline: c[3], updatedAt: c[4], submitted: c[5], submittedAt: c[6] })) : [],
  };
}

export function parseExams(html: string) {
  const $ = load(html);
  const t = tablesWithCols($, 9)[0];
  return t ? dataRows(rowsOf($, t)).map(c => ({ date: c[0], weekday: c[1], period: c[2], title: c[3], term: c[4], room: c[5], teacher: c[6], allowed: c[7], notes: c[8] })) : [];
}

const STATUS: Record<string, string> = { 'kyuko-kaiko': 'normal', 'kyuko-kyoshitsu': 'roomChange', 'kyuko-kyuko': 'cancelled', 'kyuko-hoko': 'makeup', 'kyuko-kyukohoko': 'cancelledMakeup' };

export function parseScheduleList(html: string) {
  const $ = load(html);
  const t = tablesWithCols($, 10)[0];
  if (!t) return [];
  return $(t).find('tr').slice(1).toArray().map(tr => {
    const c = rowsOf($, $('<table>').append($(tr).clone()))[0] ?? [];
    if (!c.some(Boolean) || isNoDataRow(c)) return null;
    return { campus: c[0], term: c[1], date: c[2], weekday: c[3], period: c[4], code: c[5], title: c[6], teacher: c[8], room: c[9], status: STATUS[$(tr).attr('class') ?? ''] ?? 'normal' };
  }).filter(Boolean);
}
