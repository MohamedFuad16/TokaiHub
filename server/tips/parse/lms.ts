/**
 * Open LMS (Moodle) pages and AJAX results, turned into what the app shows. Course names carry
 * the TIPS timetable code: "グローバルビジネス英語 火 3 （17TTX00500）" is TTX005, Tuesday period 3;
 * a two-period class is two LMS courses (…00 and …01).
 */
import { load, clean, lines, DAY_JP } from './util';

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
