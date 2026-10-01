/**
 * Open LMS (Moodle) pages and AJAX results, turned into what the app shows. Course names carry
 * the TIPS timetable code: "グローバルビジネス英語 火 3 （17TTX00500）" is TTX005, Tuesday period 3;
 * a two-period class is two LMS courses (…00 and …01).
 */
import { load, clean, lines, cellText, DAY_JP, type $ } from './util';

export interface LmsCourseRaw { id: number; fullname: string; shortname?: string; coursecategory?: string; startdate?: number; enddate?: number; viewurl?: string; hidden?: boolean }

export function parseCourse(c: LmsCourseRaw) {
  const name = c.fullname.normalize('NFKC');
  const code = /\(([0-9A-Z]{6,})\)\s*$/.exec(name)?.[1] ?? null;
  // 17TTX00500 → TTX005: the TIPS code is the letters and the first three digits after them.
  const tipsCode = code ? /([A-Z]{3}\d{3})\d*$/.exec(code)?.[1] ?? null : null;
  const slot = /\s([日月火水木金土])\s*(\d)?\s*\(/.exec(name);
  const title = name.replace(/\s*[日月火水木金土他]\s*\d?\s*\([0-9A-Z]+\)\s*$/, '').replace(/\s*\([0-9A-Z]+\)\s*$/, '').trim();
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
    }))
    .filter(s => s.items.length > 0);
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
  const intro = $('#intro .no-overflow').first();
  const introLinks = intro.find('a[href]').toArray().map(a => ({ text: clean($(a).text()), href: abs($(a).attr('href'))! }));
  const files = $('#intro a[href*="pluginfile.php"], .activity-description a[href*="pluginfile.php"]').toArray()
    .map(a => ({ name: clean($(a).text()) || decodeURIComponent((abs($(a).attr('href')) ?? '').split('/').pop()?.split('?')[0] ?? ''), href: abs($(a).attr('href'))! }));
  const status = $('.submissionstatustable table tr').toArray().map(tr => ({
    label: clean($(tr).find('th').first().text()),
    value: clean($(tr).find('td').first().text()),
    files: $(tr).find('a[href*="pluginfile.php"]').toArray().map(a => ({ name: clean($(a).text()), href: abs($(a).attr('href'))! })),
  })).filter(r => r.label);
  const editForm = $('form').filter((_, f) => $(f).find('input[name="action"][value="editsubmission"]').length > 0).first();
  return {
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

// ── Forum ──────────────────────────────────────────────────────────────────────────────────
export function parseForum(html: string) {
  const $ = load(html);
  return {
    title: clean($('h1').first().text()),
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

/** Labels' text from a course page, by module id (core_courseformat_get_state has only names). */
export function parseLabels(html: string, url: string) {
  const $ = load(html);
  const out: Record<number, Block[]> = {};
  $('li.modtype_label, [data-for="cmitem"].modtype_label, li[id^="module-"]').each((_, li) => {
    const id = Number(($(li).attr('id') ?? '').replace('module-', '') || $(li).attr('data-id'));
    const content = $(li).find('.activity-altcontent, .contentwithoutlink').first();
    if (id && content.length && ($(li).hasClass('modtype_label') || $(li).find('.modtype_label').length || /label/.test($(li).attr('class') ?? ''))) out[id] = blocks($, content, url);
  });
  return out;
}
