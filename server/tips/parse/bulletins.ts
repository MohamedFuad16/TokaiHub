/**
 * 掲示板 (KJW0001100). The flow's first page lists UNREAD posts only (links fire
 * displayMidoku, which marks a post read). The full lists are displayOshirase (notices) and
 * displayKojin (personal), whose links fire `confirm`. The Hub merges the full lists and
 * marks the ids that appear on the unread page.
 */
import * as cheerio from 'cheerio';
import { load, clean, keepLinkTargets } from './util';

/** Some titles repeat the genre as a " [genre]" suffix. */
const withoutGenre = (title: string, genre: string) =>
  genre ? title.replace(new RegExp(`\\s*\\[${genre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]$`), '') : title;

const idOf = (href: string) => {
  const q = new URLSearchParams(href.split('?')[1] ?? '');
  return q.get('seqNo') ? `${q.get('keijitype')}-${q.get('genrecd')}-${q.get('seqNo')}` : null;
};

/** Unread ids + genre counts from the flow's first page. */
export function parseHome(html: string) {
  const $ = load(html);
  const unread = [...new Set($('a[href*="displayMidoku"]').toArray().map(a => idOf($(a).attr('href') ?? '')).filter(Boolean) as string[])];
  const genres = $('a[href*="dispKeijiListGenre"]').toArray().map(a => {
    const q = new URLSearchParams(($(a).attr('href') ?? '').split('?')[1] ?? '');
    const countText = clean($(a).closest('tr').children('td').last().text());
    const m = /(\d+)\D+(?:\(|（)?\D*(\d+)?/.exec(countText);
    return { name: clean($(a).text()), type: q.get('keijitype') ?? '', code: q.get('genrecd') ?? '', count: m ? Number(m[1]) : 0, unread: m?.[2] ? Number(m[2]) : 0 };
  });
  return { unread, genres };
}

/** A full list page (notices or personal). Columns: genre, title, reply, status, period, posted, poster. */
export function parseList(html: string, category: 'notice' | 'personal') {
  const $ = load(html);
  const table = $('table.normal').filter((_, t) => $(t).find('a[href*="seqNo="]').length > 0).first();
  return table.find('tbody tr').toArray().map(tr => {
    const td = $(tr).children('td');
    const a = td.eq(1).find('a');
    const id = idOf(a.attr('href') ?? '');
    if (!id) return null;
    // Posted date is two inline spans ("2026/09/22" "17:31"); join them with a space.
    const posted = td.eq(5).find('span').toArray().map(s => clean($(s).text())).join(' ') || clean(td.eq(5).text());
    const genre = clean(td.eq(0).text());
    return {
      id, category, genre,
      title: withoutGenre(clean(a.text()), genre),
      status: clean(td.eq(3).text()),
      period: clean(td.eq(4).text()),
      postedAt: posted,
      poster: clean(td.eq(6).text()),
    };
  }).filter(Boolean);
}

export function parseDetail(html: string) {
  const $ = load(html);
  const meta = $('table.keiji-normal').first().find('td').toArray().map(td => clean($(td).text()));
  const naiyo = keepLinkTargets($, $('div.keiji-naiyo').first().clone());
  const body = cheerio.load(`<div>${(naiyo.html() ?? '').replace(/<br\s*\/?>/gi, '\n')}</div>`)('div').text()
    .split('\n').map(l => clean(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const pick = (re: RegExp) => meta.find(m => re.test(m))?.replace(re, '').replace(/^[／/:：\s]+/, '') ?? null;
  const genre = clean($('span.keiji-t-genre').first().text()).replace(/^\[|\]$/g, '');
  return {
    // Same " [genre]" suffix clean-up as the list.
    title: withoutGenre(clean($('span.keiji-title').first().text()), genre),
    genre,
    body,
    poster: meta[0] ?? '',
    contact: pick(/^(連絡先|Contact(?: Information)?)/i),
    postedAt: pick(/^(掲載日時|Posting Date(?: and Time)?)/i),
    // index: TIPS's own number for the file, which the bridge uses to download it.
    attachments: $('a[href*="_eventId=download"]').toArray().map((a, i) => ({
      name: clean($(a).text()),
      index: new URLSearchParams(($(a).attr('href') ?? '').split('?')[1] ?? '').get('index') ?? String(i),
    })),
  };
}

/** Href of the index-th attachment on a detail page. */
export function attachmentHref(html: string, index: string) {
  const $ = load(html);
  const a = $('a[href*="_eventId=download"]').filter((_, x) => new URLSearchParams(($(x).attr('href') ?? '').split('?')[1] ?? '').get('index') === index).first();
  return a.attr('href') ?? null;
}
