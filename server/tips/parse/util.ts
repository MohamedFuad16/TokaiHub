import * as cheerio from 'cheerio';

export type $ = cheerio.CheerioAPI;
export const load = (html: string) => cheerio.load(html);

/** Collapses whitespace and folds full-width letters/digits (ＣＧ１Ｂ → CG1B) with NFKC. */
export const clean = (s: string | undefined | null) =>
  (s ?? '').normalize('NFKC').replace(/[\s　]+/g, ' ').trim();

export const num = (s: string | undefined | null) => {
  const t = clean(s).replace(/[^\d.-]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Splits "日本語／English" labels used across TIPS. */
export function bi(s: string): { jp: string; en: string } {
  const [jp, ...rest] = clean(s).split(/\s*[／/]\s*/);
  return { jp: jp ?? '', en: rest.join(' / ') || jp || '' };
}

/** Text of a cell keeping <br> as newlines. */
export function lines($: $, el: any): string[] {
  const h = ($(el).html() ?? '').replace(/<br\s*\/?>/gi, '\n');
  return cheerio.load(`<div>${h}</div>`)('div').text().split('\n').map(clean).filter(Boolean);
}

/**
 * Writes the address after a link whose text does not show it ("こちら" → "こちら (https://…)"),
 * so the address survives the conversion to plain text and the app can link it. Mutates `node`.
 */
export function keepLinkTargets($: $, node: cheerio.Cheerio<any>) {
  node.find('a[href]').each((_, a) => {
    const href = ($(a).attr('href') ?? '').trim();
    const target = /^mailto:/i.test(href) ? href.slice(7).split('?')[0] : /^https?:\/\//i.test(href) ? href : '';
    const text = clean($(a).text());
    if (target && !text.includes(target)) $(a).append(text ? ` (${target})` : target);
  });
  return node;
}

/**
 * Plain text of a rich cell: <br> and block ends become line breaks, one blank line is kept
 * between paragraphs, and link addresses are kept (keepLinkTargets). `drop` removes matching
 * elements first (e.g. file links that are returned separately).
 */
export function cellText($: $, el: any, drop?: string): string {
  const node = keepLinkTargets($, $(el).clone());
  if (drop) node.find(drop).remove();
  // Source newlines are layout, not content: TIPS marks real breaks with <br>.
  const h = (node.html() ?? '').replace(/[\r\n]+/g, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h\d)>/gi, '\n');
  return cheerio.load(`<div>${h}</div>`)('div').text().split('\n').map(clean).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export const DAY_JP: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
const DAY_EN: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

/** "月1 月2" / "水3, 水4" / "火／Tue 3" / "Mon1,Mon2" → [{day, period}] */
export function dayPeriods(s: string): { day: number; period: number }[] {
  const out: { day: number; period: number }[] = [];
  const t = clean(s);
  for (const m of t.matchAll(/([日月火水木金土])[^\d,]*?(\d+)/g)) out.push({ day: DAY_JP[m[1]], period: Number(m[2]) });
  if (!out.length) for (const m of t.matchAll(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)[a-z]*\s*(\d+)/gi)) out.push({ day: DAY_EN[m[1].toLowerCase()], period: Number(m[2]) });
  return out;
}

/** 春/Spring → '1', 秋/Fall/Autumn → '2' */
export const termFromText = (s: string) => (/秋|fall|autumn/i.test(s) ? '2' : /春|spring/i.test(s) ? '1' : null);

/** Rows of a table as cell texts, with colspans expanded to empty strings. */
export function rowsOf($: $, table: any): string[][] {
  return $(table).find('> tbody > tr, > thead > tr, > tr').toArray().map(tr =>
    $(tr).children('th,td').toArray().flatMap(c => {
      const span = Number($(c).attr('colspan') ?? 1);
      return [clean($(c).text()), ...Array(Math.max(0, span - 1)).fill('')];
    }));
}

/** A single cell spanning the table is TIPS's "no data" row. */
export const isNoDataRow = (cells: string[]) => cells.filter(Boolean).length <= 1 && cells.length > 1;
