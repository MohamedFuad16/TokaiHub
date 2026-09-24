/** シラバス参照 (SBW3701300): search results and the bilingual detail page. */
import { load, clean, bi, num, cellText, isNoDataRow } from './util';

export function parseResults(html: string) {
  const $ = load(html);
  const t = $('table.normal').filter((_, x) => clean($(x).find('th').first().text()) === 'No.').first();
  const tooMany = /最大表示件数|maximum number/i.test(clean($('body').text()));
  const trs = t.find('tr').slice(1).toArray();
  const results = trs.map(tr => {
    const c = $(tr).children('td').toArray().map(td => clean($(td).text()));
    if (c.length < 7 || isNoDataRow(c)) return null;
    const ref = /refer\('(\d+)','(\w+)','(\w+)'/.exec($(tr).find('[onclick*="refer("]').first().attr('onclick') ?? '');
    return {
      year: num(c[1]), term: c[2], title: c[3], slotText: c[4], campus: c[5], teacher: c[6],
      ref: ref ? { year: ref[1], jscd: ref[2], code: ref[3] } : null,
      hasEnglish: $(tr).find('[onclick*="en_US"]').length > 0,
    };
  }).filter(Boolean);
  // "（全部で 523件あります）" / "（Out of 523）": TIPS pages at 200, so report the real total.
  const text = clean($('body').text());
  const total = Number(/全部で\s*(\d+)\s*件/.exec(text)?.[1] ?? /Out of\s*(\d+)/i.exec(text)?.[1] ?? results.length);
  return { results, tooMany, total };
}

/** Options of the detailed search form, straight from TIPS (labels in the page language). */
export function parseOptions(html: string) {
  const $ = load(html);
  const form = $('form[name="SearchForm"]').first();
  const opts = (name: string) => form.find(`select[name="${name}"] option`).toArray()
    .map(o => ({ value: $(o).attr('value') ?? '', label: clean($(o).text()) }));
  return {
    year: form.find('input[name="nendo"]').attr('value') ?? null,
    terms: opts('kaikoKubunCode'), campuses: opts('campusCd'), entryYears: opts('curNendo'),
    faculties: opts('gakubuShozokuCode'), departments: opts('gakkaShozokuCode'), days: opts('yobi'), periods: opts('jigen'),
  };
}

/** A file the teacher attached to a syllabus field (rubric, handout). TIPS serves it through the
 * detail page's own flow: downloadFile with the field's column id and a running number. */
export interface SyllabusFile { name: string; column: string; renban: string }
export interface SyllabusSection { label: { jp: string; en: string }; group: { jp: string; en: string } | null; value: string; files: SyllabusFile[] }

const FILE_LINK = 'a[href*="_eventId=downloadFile"]';
const HEADER_FIELDS = ['時間割年度', '時間割学期', '時間割番号', '科目名', '曜日・時限', '授業形態', '単位算定基準', '代表教員', '単位数', '教員名', '教員所属名', 'No.'];

export function parseDetail(html: string) {
  const $ = load(html);
  // Every field is a th.syllabus-prin label next to its value cell. Group labels (基本事項,
  // 成績評価基準・方法, ...) hold a nested table of fields; each field keeps its group, because
  // one label can appear in two groups (地域志向: a yes/no flag and a content field).
  const fields: SyllabusSection[] = [];
  const seen = new Set<string>();
  $('th.syllabus-prin').each((_, th) => {
    const td = $(th).next('td');
    if (!td.length || td.find('table').length) return;
    const label = bi($(th).text());
    const groupTh = $(th).closest('table').parent('td').prev('th.syllabus-prin');
    const group = groupTh.length ? bi(groupTh.text()) : null;
    const key = `${group?.jp ?? ''}|${label.jp}`;
    if (seen.has(key)) return;
    seen.add(key);
    const files = td.find(FILE_LINK).toArray().flatMap(a => {
      const q = new URLSearchParams(($(a).attr('href') ?? '').split('?')[1] ?? '');
      const column = q.get('columnId'), renban = q.get('renban');
      return column && renban ? [{ name: clean($(a).text()), column, renban }] : [];
    });
    fields.push({ label, group, value: cellText($, td, FILE_LINK), files });
  });
  const get = (jp: string) => fields.find(f => f.label.jp === jp)?.value ?? '';
  const schedTable = $('table.syllabus-normal').filter((_, t) => clean($(t).find('th').first().text()) === 'No.').first();
  const schedule = schedTable.find('tr').slice(1).toArray().map(tr => {
    const c = $(tr).children('td').toArray().map(td => cellText($, td));
    return { no: num(c[0]), when: c[1] ?? '', topic: c[2] ?? '', method: c[3] ?? '', prep: c[4] ?? '' };
  });
  const instructors = $('td.syllabus-top-info').toArray().map(td => clean($(td).text()));
  const title = bi(get('科目名'));
  return {
    year: num(get('時間割年度')), semester: bi(get('時間割学期')), code: get('時間割番号'), title,
    dayPeriod: get('曜日・時限'), delivery: bi(get('授業形態')), creditType: get('単位算定基準'),
    mainInstructor: bi(get('代表教員')), credits: num(get('単位数')),
    instructors: instructors.filter((_, i) => i % 2 === 0).map((n, i) => ({ name: bi(n), affiliation: bi(instructors[i * 2 + 1] ?? '') })),
    // 開講クラス stays: it is empty for most courses, and the app hides empty fields.
    sections: fields.filter(f => !HEADER_FIELDS.includes(f.label.jp)),
    schedule,
  };
}

/** Href of an attached file on a detail page (null when the page no longer lists it). */
export function fileHref(html: string, column: string, renban: string) {
  const $ = load(html);
  const a = $(FILE_LINK).filter((_, x) => {
    const q = new URLSearchParams(($(x).attr('href') ?? '').split('?')[1] ?? '');
    return q.get('columnId') === column && q.get('renban') === renban;
  }).first();
  return a.attr('href') ?? null;
}
