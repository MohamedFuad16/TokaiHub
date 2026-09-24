// Synthetic HTML shaped like TIPS pages. No real TIPS content, names or IDs belong here.
import { describe, expect, it } from 'vitest';
import { fileHref, parseDetail } from './syllabus';
import { attachmentHref, parseDetail as parseBulletin } from './bulletins';
import { cellText, load } from './util';

const row = (label: string, value: string) => `<tr><th class="syllabus-prin">${label}</th><td>${value}</td></tr>`;
const group = (label: string, rows: string) => `<tr><th class="syllabus-prin syllabus-break-word">${label}</th><td class="syllabus-break-word"><table>${rows}</table></td></tr>`;
const FILE = '/campusweb/campussquare.do?_flowExecutionKey=_cX_kY&_eventId=downloadFile&columnId=023&renban=1';

const DETAIL = `<html><body>
<table>
  ${row('時間割年度／Academic Year', '2026')}
  ${row('時間割学期／Semester', '秋学期／Fall Semester')}
  ${row('時間割番号／Course Code', 'ABC123')}
  ${row('科目名／Course Title', 'テスト科目／TEST COURSE')}
  ${row('曜日・時限／Day/Period', '月／Mon 1')}
  ${row('授業形態／Course delivery', '面接／In-person')}
  ${row('単位算定基準／Credit calculation', '講義科目 Lectures')}
  ${row('開講クラス／Offering Department', '')}
  ${row('代表教員／Main Instructor', '教員 甲／TEACHER A')}
  ${row('単位数／Credits', '2.0')}
</table>
<table><tr><td class="syllabus-top-info">教員 甲／TEACHER A</td><td class="syllabus-top-info">テスト学科／TEST DEPARTMENT</td></tr></table>
<table>
  ${group('基本事項／Basic Information',
    row('科目キーワード／Course Keywords', 'Web、HTML') +
    row('地域志向による学修内容／Local-oriented', '無(No)'))}
  ${group('科目の目的・学修内容／Course Objectives and Content',
    row('科目の要旨・概要／Course Description/Summary', 'First line<br>second line<br><br>New paragraph') +
    row('地域志向による学修内容／Local-oriented', 'Content about the region'))}
  ${group('成績評価基準・方法／Grading Method',
    row('成績評価の基準・方法／Grading Method', `Exam 100%<br>See the rubric.<br><a href="${FILE}">rubric.pdf</a>`))}
  ${group('担当教員への連絡方法／Method of Communication with Instructor',
    row('連絡方法／Contact Information', 'Mail <a href="mailto:teacher@example.com">the teacher</a><br><a href="https://example.com/help">Help page</a>'))}
</table>
<table class="syllabus-normal">
  <tr><th class="syllabus-prin">No.</th><th>回</th><th>主題</th><th>方法</th><th>予習</th></tr>
  <tr><td>1</td><td>第1回</td><td>Intro<br>and setup</td><td>Lecture</td><td>Read chapter 1</td></tr>
</table>
</body></html>`;

describe('syllabus parseDetail', () => {
  const d = parseDetail(DETAIL);

  it('reads the header fields in both languages', () => {
    expect(d).toMatchObject({
      year: 2026, code: 'ABC123', credits: 2, dayPeriod: '月/Mon 1', creditType: '講義科目 Lectures',
      title: { jp: 'テスト科目', en: 'TEST COURSE' }, semester: { jp: '秋学期', en: 'Fall Semester' },
      delivery: { jp: '面接', en: 'In-person' }, mainInstructor: { jp: '教員 甲', en: 'TEACHER A' },
    });
    expect(d.instructors).toEqual([{ name: { jp: '教員 甲', en: 'TEACHER A' }, affiliation: { jp: 'テスト学科', en: 'TEST DEPARTMENT' } }]);
  });

  it('keeps each field with its TIPS group, including a label that appears in two groups', () => {
    const local = d.sections.filter(s => s.label.jp === '地域志向による学修内容');
    expect(local.map(s => [s.group?.en, s.value])).toEqual([
      ['Basic Information', '無(No)'],
      ['Course Objectives and Content', 'Content about the region'],
    ]);
  });

  it('keeps line breaks and one blank line between paragraphs', () => {
    expect(d.sections.find(s => s.label.jp === '科目の要旨・概要')?.value).toBe('First line\nsecond line\n\nNew paragraph');
  });

  it('returns attached files separately and leaves their names out of the text', () => {
    const grading = d.sections.find(s => s.label.jp === '成績評価の基準・方法');
    expect(grading?.files).toEqual([{ name: 'rubric.pdf', column: '023', renban: '1' }]);
    expect(grading?.value).toBe('Exam 100%\nSee the rubric.');
  });

  it('keeps the address of a link whose text does not show it', () => {
    expect(d.sections.find(s => s.label.jp === '連絡方法')?.value).toBe('Mail the teacher (teacher@example.com)\nHelp page (https://example.com/help)');
  });

  it('keeps the empty offering-department field (the app hides empty fields) and drops header fields', () => {
    expect(d.sections.some(s => s.label.jp === '開講クラス')).toBe(true);
    expect(d.sections.some(s => s.label.jp === '時間割番号')).toBe(false);
  });

  it('reads the class schedule rows', () => {
    expect(d.schedule).toEqual([{ no: 1, when: '第1回', topic: 'Intro\nand setup', method: 'Lecture', prep: 'Read chapter 1' }]);
  });

  it('finds a file link by column and number', () => {
    expect(fileHref(DETAIL, '023', '1')).toBe(FILE);
    expect(fileHref(DETAIL, '023', '2')).toBeNull();
  });
});

describe('cellText', () => {
  it('treats source newlines as spaces and <br> as line breaks', () => {
    const $ = load('<div id="c">one\n  two<br/>three</div>');
    expect(cellText($, $('#c'))).toBe('one two\nthree');
  });

  it('removes elements matching drop', () => {
    const $ = load('<div id="c">keep <a class="x" href="#">drop me</a></div>');
    expect(cellText($, $('#c'), 'a.x')).toBe('keep');
  });
});

const BULLETIN = `<html><body>
<span class="keiji-t-genre">[Notice]</span><span class="keiji-title">Test post [Notice]</span>
<table class="keiji-normal"><tr><td>Office A</td><td>連絡先／office@example.com</td><td>掲載日時／2026/01/01 10:00</td></tr></table>
<div class="keiji-naiyo">Line one<br>Details at <a href="https://example.com/event">this page</a></div>
<a href="campussquare.do?_flowExecutionKey=K&_eventId=download&index=0">schedule.pdf</a>
<a href="campussquare.do?_flowExecutionKey=K&_eventId=download&index=1">map.pdf</a>
</body></html>`;

describe('bulletin parseDetail', () => {
  const b = parseBulletin(BULLETIN);

  it('reads the post and keeps link addresses in the body', () => {
    expect(b).toMatchObject({ title: 'Test post', genre: 'Notice', poster: 'Office A', contact: 'office@example.com', postedAt: '2026/01/01 10:00' });
    expect(b.body).toBe('Line one\nDetails at this page (https://example.com/event)');
  });

  it('lists attachments with their TIPS index', () => {
    expect(b.attachments).toEqual([{ name: 'schedule.pdf', index: '0' }, { name: 'map.pdf', index: '1' }]);
    expect(attachmentHref(BULLETIN, '1')).toBe('campussquare.do?_flowExecutionKey=K&_eventId=download&index=1');
    expect(attachmentHref(BULLETIN, '5')).toBeNull();
  });
});
