/**
 * Open LMS (Moodle) pages and AJAX results, turned into what the app shows. Course names carry
 * the TIPS timetable code: "グローバルビジネス英語 火 3 （17TTX00500）" is TTX005, Tuesday period 3;
 * a two-period class is two LMS courses (…00 and …01).
 */
import * as cheerio from 'cheerio';
import { load, DAY_JP, type $ } from './util';

// LMS text keeps the characters the LMS shows (課題１, 23：59): util's clean() folds full-width forms
// with NFKC, fine for TIPS but it made the same item read differently on the course page and on its
// own page. Whitespace is the only thing collapsed here; NFKC stays where text is matched (parseCourse).
const clean = (s: string | undefined | null) => (s ?? '').replace(/[\s\u3000]+/g, ' ').trim();
const wrapperText = (h: string) => cheerio.load(`<div id="__fragment">${h}</div>`)('#__fragment').text();
function lines($: $, el: any): string[] {
  const h = ($(el).html() ?? '').replace(/<br\s*\/?>/gi, '\n');
  return wrapperText(h).split('\n').map(clean).filter(Boolean);
}
/** Writes the address after a link whose text does not show it, so it survives as plain text. File links stay out: they are returned separately. */
function keepLinkTargets($: $, node: cheerio.Cheerio<any>) {
  node.find('a[href]').each((_, a) => {
    const href = ($(a).attr('href') ?? '').trim();
    const target = /^mailto:/i.test(href) ? href.slice(7).split('?')[0] : /^https?:\/\//i.test(href) && !/pluginfile\.php/.test(href) ? href : '';
    const text = clean($(a).text());
    if (target && !text.includes(target)) $(a).append(text ? ` (${target})` : target);
  });
  return node;
}
function cellText($: $, el: any, drop?: string): string {
  const node = keepLinkTargets($, $(el).clone());
  if (drop) node.find(drop).remove();
  const h = (node.html() ?? '').replace(/[\r\n]+/g, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h\d)>/gi, '\n');
  return wrapperText(h).split('\n').map(clean).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export interface LmsCourseRaw { id: number; fullname: string; shortname?: string; coursecategory?: string; startdate?: number; enddate?: number; viewurl?: string; hidden?: boolean }

export function parseCourse(c: LmsCourseRaw) {
  const name = c.fullname.normalize('NFKC');
  const code = /\(([0-9A-Z]{6,})\)\s*$/.exec(name)?.[1] ?? null;
  // 17TTX00500 → TTX005: the TIPS code is the letters and the first three digits after them.
  const tipsCode = code ? /([A-Z]{3}\d{3})\d*$/.exec(code)?.[1] ?? null : null;
  const slot = /\s([日月火水木金土])\s*(\d)?\s*\(/.exec(name);
  // The title keeps the LMS's characters; only the match above is folded.
  const title = clean(c.fullname).replace(/\s*[日月火水木金土他]\s*[0-9０-９]?\s*[(（][0-9A-ZＡ-Ｚ０-９]+[)）]\s*$/, '').replace(/\s*[(（][0-9A-ZＡ-Ｚ０-９]+[)）]\s*$/, '').trim();
  return {
    id: c.id, title, fullname: c.fullname, code, tipsCode,
    day: slot ? DAY_JP[slot[1]] : null, period: slot?.[2] ? Number(slot[2]) : null,
    category: c.coursecategory ?? '', start: c.startdate ?? null, end: c.enddate ?? null,
  };
}

/** core_courseformat_get_state, reduced to sections and their visible items. */
export function parseState(raw: unknown) {
  const st = (typeof raw === 'string' ? JSON.parse(raw) : raw) as {
    section: { id: string; number: number; title: string; visible: boolean; cmlist: string[]; uservisible?: boolean }[];
    cm: { id: string; name: string; module: string; url?: string; visible: boolean; uservisible: boolean; sectionid: string; dates?: { label: string; timestamp: number }[]; completionstate?: number; isoverallcomplete?: boolean }[];
  };
  const cms = new Map(st.cm.map(m => [m.id, m]));
  return st.section
    .filter(s => s.uservisible !== false)
    .map(s => ({
      id: Number(s.id), number: s.number, title: s.title,
      items: s.cmlist.map(id => cms.get(id)).filter((m): m is NonNullable<typeof m> => !!m && m.uservisible)
        .map(m => ({ id: Number(m.id), name: m.name, module: m.module, url: m.url ?? null, dates: (m.dates ?? []).map(d => ({ label: d.label, at: d.timestamp })), done: m.isoverallcomplete ?? null })),
    }));
}

/** "2026年 10月 12日(月曜日) 23:59" (Japan time) as a unix time; null when the text is not a date. */
export function parseJaDate(text: string): number | null {
  const m = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:[^\d]*?(\d{1,2})\s*:\s*(\d{2}))?/.exec(text.normalize('NFKC'));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0) - 9, +(m[5] ?? 0)) / 1000 : null;
}

/** The "開始: …  期限: …" lines under an activity (assign, quiz, forum…). */
function activityDates($: $, root: any) {
  return $(root).find('[data-region="activity-dates"] > div').toArray().map(d => {
    const label = clean($(d).find('strong').text()).replace(/[:：]$/, '');
    const text = clean($(d).clone().find('strong').remove().end().text());
    return { label, text, at: parseJaDate(text) };
  }).filter(d => d.label || d.text);
}

/**
 * What a section page (/course/section.php?id=…) shows that the course state lacks: each activity's
 * dates and completion, each label's full text, and the section's summary.
 */
export function parseSectionPage(html: string, url: string) {
  const $ = load(html);
  const items: Record<number, { dates: { label: string; text: string; at: number | null }[]; done: boolean | null; blocks?: Block[] }> = {};
  $('li[data-for="cmitem"]').each((_, li) => {
    const id = Number($(li).attr('data-id') || ($(li).attr('id') ?? '').replace('module-', ''));
    if (!id) return;
    const info = $(li).find('[data-region="completion-info"]').first();
    const toggle = info.find('[data-toggletype]').attr('data-toggletype') ?? '';
    const shown = clean(info.text());
    // Manual: the button offers "mark done" (not done) or "undo" (done). Automatic: a "完了:"/"実行:" badge.
    const done = !info.length ? null : toggle ? /undo/.test(toggle) : /^(完了|Done)/.test(shown) ? true : /^(実行|To do)/.test(shown) ? false : null;
    const alt = $(li).find('.activity-altcontent').first();
    items[id] = { dates: activityDates($, li), done, ...(alt.length && $(li).hasClass('modtype_label') ? { blocks: blocks($, alt, url) } : {}) };
  });
  const sec = $('[data-for="section"]').first();
  const summary = sec.find('[data-for="sectioninfo"] .summarytext .no-overflow').first();
  return { items, summary: summary.length ? blocks($, summary, url) : [] };
}

/** Section summaries on the course page (/course/view.php), by section id. */
export function parseCourseSummaries(html: string, url: string) {
  const $ = load(html);
  const out: Record<number, Block[]> = {};
  $('[data-for="section"]').each((_, li) => {
    const id = Number($(li).attr('data-id'));
    const summary = $(li).find('[data-for="sectioninfo"] .summarytext .no-overflow').first();
    if (id && summary.length) { const b = blocks($, summary, url); if (b.length) out[id] = b; }
  });
  return out;
}

/**
 * The course as the app shows it: the state's sections and items, plus dates, completion and label
 * text from the section pages and section summaries. A section with neither items nor a summary is dropped.
 */
export function assembleCourse(
  state: ReturnType<typeof parseState>, summaries: Record<number, Block[]>,
  pages: Record<number, ReturnType<typeof parseSectionPage> | null | undefined>,
) {
  return state.map(sec => {
    const page = pages[sec.id];
    const items = sec.items.map(i => {
      const x = page?.items[i.id];
      const base = { ...i, dates: x?.dates?.length ? x.dates : i.dates.map(d => ({ label: d.label, text: '', at: d.at as number | null })), done: i.done ?? x?.done ?? null };
      return i.module === 'label' ? { ...base, blocks: x?.blocks?.length ? x.blocks : [{ t: 'text' as const, text: i.name }] } : base;
    });
    return { id: sec.id, number: sec.number, title: sec.title, summary: summaries[sec.id] ?? page?.summary ?? [], items };
  }).filter(s => s.items.length > 0 || s.summary.length > 0);
}

/** Moodle's own error page ("コーディングエラーが検出されました…"): its message, or null on a normal page. */
export function moodleError(html: string): string | null {
  const $ = load(html);
  const e = $('[data-rel="fatalerror"] .errormessage, .errorbox .errormessage').first();
  return e.length ? clean(e.text()) : null;
}

/**
 * A status cell as text. An online-text submission is a summary box (expand icon, "(37 語)", a
 * truncated copy) plus the full text; it reads "(37 語)" and the full text, with no icons or links.
 */
function statusValue($: $, td: cheerio.Cheerio<any>): string {
  const box = td.find('.plugincontentsummary').first();
  const full = td.find('.hidefull .no-overflow').first();
  if (box.length && full.length) {
    const count = clean(box.clone().find('noscript, .expandsummaryicon, .no-overflow, script').remove().end().text());
    return [count, cellText($, full)].filter(Boolean).join('\n');
  }
  return cellText($, td, 'noscript, script, .expandsummaryicon');
}

/** An assignment's page (mod/assign/view.php): dates, instructions, files, submission status. */
export function parseAssign(html: string, url: string) {
  const $ = load(html);
  const abs = (h?: string) => (h ? new URL(h.replace(/&amp;/g, '&'), url).toString() : null);
  const crumbs = $('li.breadcrumb-item a').toArray().map(a => ({ text: clean($(a).text()), href: abs($(a).attr('href')) }));
  const course = crumbs.find(c => /course\/view\.php/.test(c.href ?? ''));
  const dates = $('[data-region="activity-dates"] > div').toArray().map(d => {
    const label = clean($(d).find('strong').text()).replace(/[:：]$/, '');
    return { label, text: clean($(d).text().replace($(d).find('strong').text(), '')) };
  });
  const error = moodleError(html);
  const intro = $('#intro .no-overflow').first();
  const introLinks = intro.find('a[href]').toArray().map(a => ({ text: clean($(a).text()), href: abs($(a).attr('href'))! }));
  const files = $('#intro a[href*="pluginfile.php"], .activity-description a[href*="pluginfile.php"]').toArray()
    .map(a => ({ name: clean($(a).text()) || decodeURIComponent((abs($(a).attr('href')) ?? '').split('/').pop()?.split('?')[0] ?? ''), href: abs($(a).attr('href'))! }));
  const status = $('.submissionstatustable table tr').toArray().map(tr => ({
    label: clean($(tr).find('th').first().text()),
    value: statusValue($, $(tr).find('td').first()),
    files: $(tr).find('a[href*="pluginfile.php"]').toArray().map(a => ({ name: clean($(a).text()), href: abs($(a).attr('href'))! })),
  })).filter(r => r.label);
  const editForm = $('form').filter((_, f) => $(f).find('input[name="action"][value="editsubmission"]').length > 0).first();
  return {
    error,
    title: clean($('h1').first().text()),
    course: course ? { title: course.text, id: Number(new URL(course.href!).searchParams.get('id')) } : null,
    dates,
    intro: lines($, intro.get(0)),
    links: introLinks.filter(l => !/pluginfile\.php/.test(l.href)),
    files: [...new Map(files.map(f => [f.href, f])).values()],
    status,
    submitted: status.some(r => /提出済|Submitted for grading|Draft/i.test(r.value)),
    canSubmit: editForm.length > 0,
  };
}

// ── Rich text (posts, pages, labels) ─────────────────────────────────────────────────────────
export type Block = { t: 'text'; text: string } | { t: 'img'; src: string; alt: string } | { t: 'file'; name: string; href: string };

/**
 * LMS rich text as a short list of blocks: text (link addresses kept, see cellText), images and
 * attached files from pluginfile.php, which the app fetches through the bridge.
 */
export function blocks($: $, el: any, base: string): Block[] {
  const abs = (h: string) => new URL(h.replace(/&amp;/g, '&'), base).toString();
  const node = $(el).clone();
  const out: Block[] = [];
  const media: (Extract<Block, { t: 'img' }> | Extract<Block, { t: 'file' }>)[] = [];
  node.find('img[src*="pluginfile.php"]').each((_, img) => { media.push({ t: 'img', src: abs($(img).attr('src')!), alt: clean($(img).attr('alt')) }); $(img).remove(); });
  node.find('a[href*="pluginfile.php"]').each((_, a) => {
    const href = abs($(a).attr('href')!);
    media.push({ t: 'file', name: clean($(a).text()) || decodeURIComponent(new URL(href).pathname.split('/').pop() ?? 'file'), href });
    $(a).remove();
  });
  const text = cellText($, node);
  if (text) out.push({ t: 'text', text });
  // Images and files after the text, in page order, without repeats.
  const seen = new Set<string>();
  for (const m of media) { const k = m.t === 'img' ? m.src : m.href; if (!seen.has(k)) { seen.add(k); out.push(m); } }
  return out;
}

/** The main content area of a module page, without the site's accessibility panel. */
const mainOf = ($: $) => $('div[role="main"]').first();

const LMS_BASE = 'https://tlms.tsc.u-tokai.ac.jp/';

// ── Forum ──────────────────────────────────────────────────────────────────────────────────
export function parseForum(html: string, url = LMS_BASE) {
  const $ = load(html);
  return {
    title: clean($('h1').first().text()),
    // The teacher's description (team name, join code, room change…), above the discussions on the LMS.
    intro: blocks($, $('#intro .no-overflow').first(), url),
    discussions: $('tr[data-region="discussion-list-item"]').toArray().map(tr => {
      const stamps = $(tr).find('[data-timestamp]').toArray().map(e => Number($(e).attr('data-timestamp')));
      return {
        id: Number($(tr).attr('data-discussionid')),
        subject: clean($(tr).find('th.topic a').first().text()),
        // The author cell also holds the post date (<time>); the name alone.
        author: clean($(tr).find('td.author').first().clone().find('time').remove().end().text()),
        created: stamps[0] ?? null, lastPost: stamps[stamps.length - 1] ?? null,
        pinned: $(tr).hasClass('pinned'),
      };
    }).filter(d => d.id),
  };
}

export function parsePosts(raw: { posts: any[] }, base: string) {
  return raw.posts.map(p => {
    const $ = load(`<div id="m">${p.message ?? ''}</div>`);
    return {
      id: p.id, subject: p.subject, author: p.author?.fullname ?? '', created: p.timecreated, parentId: p.parentid ?? null,
      blocks: blocks($, $('#m'), base),
      attachments: (p.attachments ?? []).map((a: any) => ({ name: a.filename, href: a.url ?? a.fileurl })),
    };
  }).sort((a, b) => a.created - b.created);
}

// ── Folder ─────────────────────────────────────────────────────────────────────────────────
export function parseFolder(html: string, url: string) {
  const $ = load(html);
  const files = $('.foldertree a[href*="pluginfile.php"], #folder_tree0 a[href*="pluginfile.php"]').toArray().map(a => {
    const href = new URL(($(a).attr('href') ?? '').replace(/&amp;/g, '&'), url).toString();
    // The path inside the folder: the names of the enclosing list items' folders.
    const path = $(a).parents('li').toArray().slice(1).map(li => clean($(li).children('span, div').first().text())).filter(Boolean).reverse();
    return { name: clean($(a).text()), href, path: path.slice(1).join(' / ') };
  });
  return { title: clean($('h1').first().text()), intro: lines($, $('#intro .no-overflow').get(0)), files: [...new Map(files.map(f => [f.href, f])).values()] };
}

// ── Page ───────────────────────────────────────────────────────────────────────────────────
export function parsePage(html: string, url: string) {
  const $ = load(html);
  const main = mainOf($);
  return { title: clean($('h1').first().text()), blocks: blocks($, main.find('.generalbox .no-overflow').first(), url), modified: clean(main.find('.modified').text()) };
}

// ── Quiz ───────────────────────────────────────────────────────────────────────────────────
export function parseQuiz(html: string) {
  const $ = load(html);
  const main = mainOf($);
  const dates = $('[data-region="activity-dates"] > div').toArray().map(d => ({ label: clean($(d).find('strong').text()).replace(/[:：]$/, ''), text: clean($(d).text().replace($(d).find('strong').text(), '')) }));
  const info = main.find('.quizinfo p').toArray().map(p => clean($(p).text())).filter(Boolean);
  const table = main.find('table.quizattemptsummary, .quizattempt table').first();
  const head = table.find('thead th').toArray().map(th => clean($(th).text()));
  const attempts = table.find('tbody tr').toArray().map(tr => $(tr).find('td').toArray().map(td => clean($(td).text())));
  const button = main.find('.quizstartbuttondiv button, .quizstartbuttondiv input[type="submit"]').first();
  return {
    title: clean($('h1').first().text()), dates, info,
    intro: lines($, $('#intro .no-overflow').get(0)),
    attempts: { head, rows: attempts.filter(r => r.some(Boolean)) },
    feedback: clean(main.find('#feedback, .quizgradefeedback').text()),
    canAttempt: button.length > 0, attemptLabel: clean(button.text() || button.attr('value')),
    notice: clean(main.find('.quizattempt p, .alert').first().text()),
  };
}
