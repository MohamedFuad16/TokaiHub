/**
 * Feature routes: each feature fetches its TIPS flow(s), parses the HTML, and caches the JSON.
 * Parsers are imported per call in dev so they can be edited while the session stays alive.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import type * as ClientMod from './client';
import * as cache from './cache';

const DEV = process.env.NODE_ENV !== 'production';
// In dev the client is re-imported too; its only state is the request queue, and session
// state lives in session.ts, which every copy shares.
async function getClient(): Promise<typeof ClientMod> {
  return DEV ? import(`./client.ts?t=${Date.now()}`) : import('./client');
}
async function parser(name: string) {
  return DEV ? import(`./parse/${name}.ts?t=${Date.now()}`) : import(`./parse/${name}`);
}

/** Dev only: saves raw HTML of a flow step to ~/.tokaihub/fixtures and summarizes its forms. */
export async function dump(flow: string, q: Record<string, string>) {
  const client = await getClient();
  let page = flow.startsWith('/') ? await client.get(flow) : await client.startFlow(flow);
  if (q.form) {
    const overrides = q.set ? JSON.parse(q.set) : {};
    page = await client.submitForm(page, q.form, overrides);
  }
  if (q.form2) page = await client.submitForm(page, q.form2, q.set2 ? JSON.parse(q.set2) : {});
  if (q.form3) page = await client.submitForm(page, q.form3, q.set3 ? JSON.parse(q.set3) : {});
  if (q.event) page = await client.event(page, q.event, q.params ? JSON.parse(q.params) : {});
  for (const sel of (q.follow ? q.follow.split('||') : [])) {
    const href = page.$(sel).first().attr('href');
    if (!href) throw new Error(`no link for ${sel}`);
    page = await client.get(new URL(href, page.url).toString());
  }
  const dir = path.join(os.homedir(), '.tokaihub', 'fixtures');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const name = (q.name ?? flow.replace(/\W+/g, '_')) + '.html';
  fs.writeFileSync(path.join(dir, name), page.html, { mode: 0o600 });
  const $ = page.$;
  return {
    saved: name,
    ms: page.ms,
    title: $('title').text(),
    forms: $('form').map((_, f) => ({
      name: $(f).attr('name'), id: $(f).attr('id'), method: $(f).attr('method'),
      action: ($(f).attr('action') ?? '').replace(/_flowExecutionKey=[^&]+/, '_flowExecutionKey=<k>'),
      fields: $(f).find('input,select,textarea').map((_, e) => `${$(e).attr('name')}:${$(e).attr('type') ?? e.tagName}`).get(),
    })).get(),
  };
}

const MIN = 60_000;
type Q = Record<string, string>;
type Feature = { ttl: number; key?: (q: Q) => string; run: (q: Q) => Promise<unknown> };
type Locale = 'ja_JP' | 'en_US';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
const localeOf = (q: Q): Locale => (q.lang === 'en' ? 'en_US' : 'ja_JP');
const notFound = (msg: string) => Object.assign(new Error(msg), { status: 404 });

async function timetablePage(term?: string) {
  const c = await getClient();
  let page = await c.startFlow('RSW0001000-flow');
  if (term) page = await c.submitForm(page, 'form[name=RishuReferForm]', { gakkiKbnCode: term });
  return page;
}

async function attendanceList(q: Q) {
  const c = await getClient();
  let page = await c.startFlow('AAW0001000-flow');
  if (q.year || q.term) page = await c.submitForm(page, 'form[name=InputForm]', { _eventId: 'search', ...(q.year ? { nendo: q.year } : {}), ...(q.term ? { gakkiKbnCd: q.term } : {}) });
  return page;
}

const FEATURES: Record<string, Feature> = {
  profile: {
    ttl: 24 * 60 * MIN,
    run: async () => (await parser('profile')).parse((await (await getClient()).startFlow('CHW0001000-flow')).html),
  },

  timetable: {
    ttl: 10 * MIN,
    key: q => `timetable:${q.term ?? 'current'}`,
    run: async q => (await parser('timetable')).parse((await timetablePage(q.term)).html),
  },

  attendance: {
    ttl: 60 * MIN,
    key: q => `attendance:${q.year ?? ''}:${q.term ?? 'current'}`,
    run: async q => {
      const c = await getClient();
      const p = await parser('attendance');
      let listPage = await attendanceList(q);
      const courses = [];
      for (const row of p.parseList(listPage.html)) {
        let detail = p.parseDetail((await c.get(new URL(row.href, listPage.url).toString())).html);
        if (!detail) {
          // The list step's flow key can expire after a detail view; reload the list once.
          listPage = await attendanceList(q);
          const fresh = p.parseList(listPage.html).find((r: any) => r.code === row.code);
          if (fresh) detail = p.parseDetail((await c.get(new URL(fresh.href, listPage.url).toString())).html);
        }
        const { href, ...rest } = row;
        courses.push({ ...rest, ...(detail ?? {}) });
      }
      return { courses };
    },
  },

  grades: {
    ttl: 24 * 60 * MIN,
    run: async () => {
      const c = await getClient();
      const page = await c.submitForm(await c.startFlow('SIW0001300-flow'), 'form[name=InputForm]', { _eventId: 'display', spanType: '0' });
      return (await parser('grades')).parse(page.html);
    },
  },

  graduation: {
    ttl: 24 * 60 * MIN,
    run: async () => (await parser('graduation')).parse((await (await getClient()).startFlow('HTW0001000-flow')).html),
  },

  // Full notice + personal lists, with the unread ids from the flow's first page.
  bulletins: {
    ttl: 10 * MIN,
    run: async () => {
      const c = await getClient();
      const p = await parser('bulletins');
      const home = await c.startFlow('KJW0001100-flow');
      const { unread, genres } = p.parseHome(home.html);
      const fetchAll = async (eventId: string) => {
        let page = await c.event(home, eventId);
        const paging = page.$('form[name="PagingForm"]').first();
        if (paging.length) page = await c.submitForm(page, 'form[name="PagingForm"]', { _displayCount: '200', _eventId_paging: 'DISPLAY' });
        return page;
      };
      const notices = p.parseList((await fetchAll('displayOshirase')).html, 'notice');
      const personal = p.parseList((await fetchAll('displayKojin')).html, 'personal');
      const unreadSet = new Set(unread);
      const posts = [...personal, ...notices]
        .map((x: any) => ({ ...x, unread: unreadSet.has(x.id) }))
        .sort((a: any, b: any) => b.postedAt.localeCompare(a.postedAt));
      return { posts, genres, unreadCount: unread.length };
    },
  },

  // Opening a post marks it read in TIPS, the same as reading it there.
  bulletin: {
    ttl: 7 * 24 * 60 * MIN,
    key: q => `bulletin:${q.id}`,
    run: async q => {
      const [type, genre, seq] = (q.id ?? '').split('-');
      const c = await getClient();
      const p = await parser('bulletins');
      const home = await c.startFlow('KJW0001100-flow');
      for (const eventId of [type === '3' ? 'displayKojin' : 'displayOshirase', type === '3' ? 'displayOshirase' : 'displayKojin']) {
        let list = await c.event(home, eventId);
        if (list.$('form[name="PagingForm"]').length) list = await c.submitForm(list, 'form[name="PagingForm"]', { _displayCount: '200', _eventId_paging: 'DISPLAY' });
        const a = list.$('a[href*="seqNo="]').filter((_, e) => {
          const s = new URLSearchParams((list.$(e).attr('href') ?? '').split('?')[1]);
          return s.get('seqNo') === seq && s.get('keijitype') === type && s.get('genrecd') === genre;
        }).first();
        if (a.length) return p.parseDetail((await c.get(new URL(a.attr('href')!, list.url).toString())).html);
      }
      throw notFound('post not found');
    },
  },

  reports: {
    ttl: 30 * MIN,
    run: async () => (await parser('tables')).parseReports((await (await getClient()).startFlow('RMW0001000-flow')).html),
  },

  exams: {
    ttl: 12 * 60 * MIN,
    key: q => `exams:${q.year ?? ''}:${q.term ?? ''}:${q.kind ?? 'T01'}`,
    run: async q => {
      const c = await getClient();
      const page = await c.submitForm(await c.startFlow('TEW0001200-flow'), 'form[name=InputForm]', {
        _eventId: 'search', ...(q.year ? { nendo: q.year } : {}), ...(q.term ? { gakkiKbnCd: `0${q.term}` } : {}), shikenKbnCd: q.kind ?? 'T01',
      });
      return (await parser('tables')).parseExams(page.html);
    },
  },

  // Class occurrences for registered courses in a date range. `all` includes normal classes,
  // otherwise only cancellations, room changes and make-ups.
  changes: {
    ttl: 60 * MIN,
    key: q => `changes:${q.from ?? ''}:${q.to ?? ''}:${q.all ?? ''}`,
    run: async q => {
      const today = new Date();
      const from = q.from ?? ymd(today);
      const to = q.to ?? ymd(new Date(today.getTime() + 13 * 24 * 60 * MIN));
      const c = await getClient();
      const page = await c.submitForm(await c.startFlow('KHW0001100-flow'), 'form[name=searchForm]', {
        _eventId: 'search', dispType: 'list', dispData: q.all ? 'all' : 'chg', startDay: from, endDay: to, rishuchuFlg: 'true', _rishuchuFlg: '1',
      });
      return { from, to, items: (await parser('tables')).parseScheduleList(page.html) };
    },
  },

  'syllabus-options': {
    ttl: 7 * 24 * 60 * MIN,
    key: q => `syllabus-options:${q.faculty ?? ''}`,
    run: async q => {
      const c = await getClient();
      let page = await c.startFlow('SBW3701300-flow');
      if (q.faculty) page = await c.submitForm(page, 'form[name=SearchForm]', { _eventId: 'gakubuChanged', gakubuShozokuCode: q.faculty });
      return (await parser('syllabus')).parseOptions(page.html);
    },
  },

  'syllabus-search': {
    ttl: 24 * 60 * MIN,
    key: q => `syllabus-search:${JSON.stringify(Object.entries(q).filter(([k]) => k !== 'lang').sort())}`,
    run: async q => {
      const c = await getClient();
      const form = await c.startFlow('SBW3701300-flow');
      const year = q.year ?? String(new Date().getFullYear());
      let page;
      if (q.code) {
        page = await c.submitForm(form, 'form[name=InputForm]', { _eventId: 'byCode', nendo: year, jikanwaricd: q.code });
      } else {
        // Departments only exist after TIPS reloads the form for the chosen faculty.
        const base = q.faculty && q.department ? await c.submitForm(form, 'form[name=SearchForm]', { _eventId: 'gakubuChanged', nendo: year, gakubuShozokuCode: q.faculty }) : form;
        page = await c.submitForm(base, 'form[name=SearchForm]', {
          _eventId: 'search', nendo: year, kaikoKamokunm: q.q ?? '', kyokankn: q.teacher ?? '', freeWord: q.keyword ?? '',
          kaikoKubunCode: q.term ?? '', campusCd: q.campus ?? '', gakubuShozokuCode: q.faculty ?? '', gakkaShozokuCode: q.department ?? '',
          yobi: q.day ?? '', jigen: q.period ?? '', _displayCount: '200',
        });
      }
      return (await parser('syllabus')).parseResults(page.html);
    },
  },

  syllabus: {
    ttl: 7 * 24 * 60 * MIN,
    key: q => `syllabus:${q.year}:${q.code}`,
    run: async q => {
      const c = await getClient();
      const year = q.year ?? String(new Date().getFullYear());
      const list = await c.submitForm(await c.startFlow('SBW3701300-flow'), 'form[name=InputForm]', { _eventId: 'byCode', nendo: year, jikanwaricd: q.code });
      const jscd = q.jscd ?? /refer\('\d+','(\w+)'/.exec(list.html)?.[1];
      if (!jscd) throw notFound(`no syllabus for ${q.code} in ${year}`);
      const p = await parser('syllabus');
      // Japanese-taught courses publish ja_JP (and maybe en_US); English-taught courses may
      // publish only en_US, where ja_JP answers "No Data Found". Both carry bilingual labels.
      const load = async (locale: string) => p.parseDetail((await c.event(list, 'input', { nendo: year, jikanwariShozokuCode: jscd, jikanwaricd: q.code, locale })).html);
      const ja = await load('ja_JP');
      const en = q.lang === 'en' || !ja.code ? await load('en_US') : null;
      const base = ja.code ? ja : en;
      if (!base?.code) throw notFound(`no syllabus for ${q.code} in ${year}`);
      const useEn = !!en?.sections.length && (q.lang === 'en' || !ja.sections.length);
      return useEn
        ? { ...base, sections: en!.sections, schedule: en!.schedule.length ? en!.schedule : base.schedule, contentLang: 'en' }
        : { ...base, contentLang: 'jp' };
    },
  },

  // キャビネット: the whole folder tree with files.
  cabinet: {
    ttl: 60 * MIN,
    run: async () => (await parser('cabinet')).parse((await (await getClient()).startFlow('SDW0001000-flow')).html),
  },

  // The student's curriculum categories for registration (TIPS search type 6).
  'registration-curriculum': {
    ttl: 24 * 60 * MIN,
    run: async () => {
      const c = await getClient();
      const page = await c.submitForm(await timetablePage(), 'form[name=SearchForm]', { _eventId: 'searchDisplay', searchDisplayFlg: '6', campusCd: '' });
      return (await parser('registration')).parseCurriculum(page.html);
    },
  },

  // Courses of one curriculum category, with spring/fall availability and prerequisites.
  'registration-curriculum-courses': {
    ttl: 60 * MIN,
    key: q => `registration-curriculum-courses:${q.d}:${q.s}:${q.m}`,
    run: async q => {
      const c = await getClient();
      return (await parser('registration')).parseCurriculumCourses((await curriculumPage(c, q)).html);
    },
  },

  // Courses offered in one slot (or by code) for the current registration term.
  'registration-candidates': {
    ttl: 10 * MIN,
    key: q => `registration-candidates:${q.code ?? ''}:${q.kamoku ?? ''}:${q.day ?? ''}:${q.period ?? ''}:${q.campus ?? ''}:${q.scope ?? ''}:${q.gakubu ?? ''}`,
    run: async q => {
      const c = await getClient();
      const page = await registrationSearch(c, q);
      return (await parser('registration')).parseCandidates(page.html);
    },
  },
};

async function curriculumPage(c: typeof ClientMod, q: Q) {
  const list = await c.submitForm(await timetablePage(), 'form[name=SearchForm]', { _eventId: 'searchDisplay', searchDisplayFlg: '6', campusCd: '' });
  return c.submitForm(list, 'form[name=SearchForm]', { _eventId: 'curriculumSearch', kamokuDKbncd: q.d, kamokuMShozokucd: q.s, kamokuMKbncd: q.m, kamokuMKbnnm: q.name ?? '' });
}

async function registrationSearch(c: typeof ClientMod, q: Q) {
  // From a curriculum course: its timetable sections (TIPS's "時間割へ").
  if (q.kamoku) return c.submitForm(await curriculumPage(c, q), 'form[name=SearchForm]', { kamokuCd: q.kamoku });
  const tt = await timetablePage();
  if (q.code) {
    const form = await c.submitForm(tt, 'form[name=SearchForm]', { _eventId: 'searchDisplay', searchDisplayFlg: '1', campusCd: '' });
    return c.submitForm(form, 'form[name=SearchForm]', { _eventId: 'search', jikanwariCode: q.code });
  }
  // Use the flag TIPS puts on the cell itself during registration ('1'); '0' otherwise.
  const slot = (await parser('timetable')).parse(tt.html).openSlots.find((o: any) => String(o.day) === q.day && String(o.period) === q.period);
  const form = await c.submitForm(tt, 'form[name=SearchForm]', { _eventId: 'yobiJigen', searchDisplayFlg: '3', yobi: q.day ?? '1', jigen: q.period ?? '1', yobiJigenFlg: slot?.flag ?? '0', campusCd: q.campus || slot?.campus || '' });
  // shozokuFlg 1 = own department (default), 2 = other departments (optionally one faculty).
  return c.submitForm(form, 'form[name=SearchForm]', {
    _eventId: 'search', yobi: q.day ?? '1', jigen: q.period ?? '1', ...(q.campus ? { campusCd: q.campus } : {}),
    ...(q.scope === 'other' ? { shozokuFlg: '2', gakubu: q.gakubu ?? '', gakka: q.gakka ?? '' } : {}),
  });
}

export async function handle(feature: string, q: Q) {
  const f = FEATURES[feature];
  if (!f) throw notFound(`unknown feature ${feature}`);
  const { mode, refresh, ...params } = q;
  const locale = localeOf(params);
  const key = `${f.key ? f.key(params) : feature}@${locale}`;
  const hit = cache.read(key);
  if (mode === 'cache') {
    if (!hit) throw notFound('not cached');
    return { data: hit.data, cachedAt: hit.cachedAt, fromCache: true, stale: Date.now() - hit.cachedAt > f.ttl };
  }
  if (hit && !refresh && Date.now() - hit.cachedAt < f.ttl) return { data: hit.data, cachedAt: hit.cachedAt, fromCache: true, stale: false };
  const { runFeature } = await import('./session');
  const t0 = Date.now();
  const data = await runFeature(locale, () => f.run(params));
  const entry = cache.write(key, data);
  console.log(`[tips] ${feature} (${locale}) fetched in ${Date.now() - t0} ms`);
  return { data: entry.data, cachedAt: entry.cachedAt, fromCache: false, stale: false };
}

/**
 * Write actions on the student's TIPS record. The bridge refuses them unless the request
 * carries confirm: true, which the UI sends only after the student confirms in a dialog.
 */
export async function act(action: string, body: Record<string, string | boolean>) {
  if (body.confirm !== true) throw Object.assign(new Error('confirmation required'), { status: 400 });
  const q = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])) as Q;
  const locale = localeOf(q);
  const { runFeature } = await import('./session');
  const result = await runFeature(locale, async () => {
    const c = await getClient();
    const reg = await parser('registration');
    let page;
    if (action === 'register') {
      const search = await registrationSearch(c, q);
      page = await c.submitForm(search, 'form[name=InputForm]', { nendo: q.year, jikanwariShozokuCode: q.jscd, jikanwariCode: q.code, _eventId: 'insert' });
    } else if (action === 'drop') {
      const tt = await timetablePage();
      // TIPS drops in two steps: DeleteForm opens a confirmation page (course, day, period),
      // whose own InputForm "delete" performs the removal.
      const confirmPage = await c.submitForm(tt, 'form[name=DeleteForm]', { nendo: q.year, jikanwariShozokuCode: q.jscd, jikanwariCode: q.code, yobi: q.day, jigen: q.period, _eventId: 'delete' });
      if (!confirmPage.html.includes(q.code)) throw Object.assign(new Error(`TIPS did not show a confirmation for ${q.code}`), { status: 409 });
      page = await c.submitForm(confirmPage, 'form[name=InputForm]', { _eventId: 'delete' });
    } else {
      throw notFound(`unknown action ${action}`);
    }
    const timetable = (await parser('timetable')).parse(page.html);
    return { messages: reg.messages(page.html), title: page.$('title').text(), timetable: timetable.courses.length || timetable.year ? timetable : null };
  });
  // Registration changes what several screens show; drop their caches.
  for (const k of ['timetable:current', 'registration-candidates']) for (const l of ['ja_JP', 'en_US']) cache.remove(`${k}@${l}`);
  console.log(`[tips] action ${action} ${q.code}: ${result.messages.join(' | ') || 'no message'}`);
  return result;
}

/** Streams a cabinet file (SDW-filerefer-flow) through the signed-in browser session. */
export async function file(q: Q) {
  if (!/^\d+$/.test(q.fileId ?? '') || !/^\d+$/.test(q.folderId ?? '')) throw Object.assign(new Error('bad file id'), { status: 400 });
  const { runFeature } = await import('./session');
  return runFeature('ja_JP', async () => (await getClient()).getBinary(`/campusweb/campussquare.do?_flowId=SDW-filerefer-flow&fileId=${q.fileId}&folderId=${q.folderId}`));
}
