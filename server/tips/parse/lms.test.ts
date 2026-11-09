import { describe, expect, it } from 'vitest';
import { assembleCourse, moodleError, parseAssign, parseCourse, parseCourseSummaries, parseForum, parseJaDate, parseSectionPage, parseState } from './lms';

const BASE = 'https://lms.example/';

// Shaped like /course/section.php?id=…: an assignment with dates and completion, and a label.
const SECTION = `
<div role="main"><ul class="topics section-list"><li id="section-2" data-for="section" data-id="500">
  <div data-for="sectioninfo"><div class="summarytext"><div class="no-overflow"><p>今週の内容<br>課題１を提出</p></div></div></div>
  <ul data-for="cmlist">
    <li class="activity assign modtype_assign" id="module-11" data-for="cmitem" data-id="11">
      <div data-region="activity-dates" class="activity-dates">
        <div><strong>開始:</strong> 2026年 10月 6日(火曜日) 00:00</div>
        <div><strong>期限:</strong> 2026年 10月 12日(月曜日) 23:59</div>
      </div>
      <div class="activity-completion"><div data-region="completion-info"><button data-toggletype="manual:mark-done">完了マークする</button></div></div>
    </li>
    <li class="activity assign modtype_assign" id="module-12" data-for="cmitem" data-id="12">
      <div class="activity-completion"><div data-region="completion-info"><button data-toggletype="manual:undo">完了</button></div></div>
    </li>
    <li class="activity label modtype_label" id="module-13" data-for="cmitem" data-id="13">
      <div class="activity-altcontent"><div class="no-overflow"><p>フリガナあり<br><a href="https://example.org/x">こちら</a></p><img src="${BASE}pluginfile.php/1/a.png" alt="図１"></div></div>
    </li>
    <li class="activity forum modtype_forum" id="module-14" data-for="cmitem" data-id="14"></li>
  </ul></li></ul></div>`;

describe('section page', () => {
  const page = parseSectionPage(SECTION, BASE);
  it('reads each activity\'s dates in Japan time', () => {
    expect(page.items[11].dates.map(d => d.label)).toEqual(['開始', '期限']);
    // 2026-10-12 23:59 JST = 14:59 UTC
    expect(page.items[11].dates[1].at).toBe(Date.UTC(2026, 9, 12, 14, 59) / 1000);
    expect(page.items[11].dates[1].text).toBe('2026年 10月 12日(月曜日) 23:59');
    expect(page.items[14].dates).toEqual([]);
  });
  it('reads completion', () => {
    expect(page.items[11].done).toBe(false);
    expect(page.items[12].done).toBe(true);
    expect(page.items[14].done).toBeNull();
  });
  it('reads a label\'s full content: text, link address, image', () => {
    const b = page.items[13].blocks!;
    expect(b[0]).toMatchObject({ t: 'text' });
    expect((b[0] as any).text).toContain('フリガナあり');
    expect((b[0] as any).text).toContain('https://example.org/x');
    expect(b[1]).toEqual({ t: 'img', src: `${BASE}pluginfile.php/1/a.png`, alt: '図１' });
    expect(page.items[11].blocks).toBeUndefined();
  });
  it('reads the section summary', () => {
    expect((page.summary[0] as any).text).toBe('今週の内容\n課題１を提出');
  });
  it('parses dates', () => {
    expect(parseJaDate('2026年 10月 6日(火曜日) 00:00')).toBe(Date.UTC(2026, 9, 5, 15, 0) / 1000);
    expect(parseJaDate('なし')).toBeNull();
  });
});

describe('course assembly', () => {
  const state = parseState({
    section: [
      { id: '500', number: 2, title: '第2回', visible: true, cmlist: ['11', '13'] },
      { id: '501', number: 3, title: '教職課程', visible: true, cmlist: [] },
      { id: '502', number: 4, title: '新しいセクション', visible: true, cmlist: [] },
    ],
    cm: [
      { id: '11', name: '課題１', module: 'assign', url: '', visible: true, uservisible: true, sectionid: '500' },
      { id: '13', name: '---', module: 'label', visible: true, uservisible: true, sectionid: '500' },
    ],
  });
  const view = parseCourseSummaries(`<ul><li data-for="section" data-id="501"><div data-for="sectioninfo"><div class="summarytext"><div class="no-overflow"><p>ガイダンス</p></div></div></div></li>
    <li data-for="section" data-id="502"><div data-for="sectioninfo"></div></li></ul>`, BASE);
  const out = assembleCourse(state, view, { 500: parseSectionPage(SECTION, BASE) });
  it('puts dates, completion and label text on the items', () => {
    const a = out[0].items[0];
    expect(a.name).toBe('課題１');
    expect(a.dates).toHaveLength(2);
    expect(a.done).toBe(false);
    expect((out[0].items[1] as any).blocks[0].text).toContain('フリガナあり');
  });
  it('keeps a section with a summary but no items, drops one with neither', () => {
    expect(out.map(s => s.title)).toEqual(['第2回', '教職課程']);
    expect(out[1].items).toEqual([]);
    expect((out[1].summary[0] as any).text).toBe('ガイダンス');
  });
});

describe('assignment page', () => {
  const html = `<h1>課題１</h1>
  <div class="submissionstatustable"><table><tbody>
    <tr><th>提出ステータス</th><td>評定のために提出済み</td></tr>
    <tr><th>最終更新日時</th><td>2026年 10月 20日(火曜日) 13:41</td></tr>
    <tr><th>オンラインテキスト</th><td><div class="box plugincontentsummary summary_x"><a class="expandsummaryicon expand_x" href=""><i class="icon fa fa-plus"></i></a><noscript><a id="action_link1" href="${BASE}mod/assign/view.php?id=1&sid=2"><i class="icon fa fa-magnifying-glass-plus"></i></a></noscript><img class="icon spacer" src="${BASE}spacer">(37 語)<div class="no-overflow">The lion and ...</div></div><div class="box hidefull full_x"><a class="expandsummaryicon contract_x" href=""><i class="icon fa fa-minus"></i></a><div class="no-overflow">The lion and the unicorn.</div></div></td></tr>
  </tbody></table></div>`;
  const a = parseAssign(html, `${BASE}mod/assign/view.php?id=1`);
  it('shows online text as clean text', () => {
    const row = a.status.find(r => r.label === 'オンラインテキスト')!;
    expect(row.value).toBe('(37 語)\nThe lion and the unicorn.');
    expect(row.value).not.toMatch(/[<>]|action_link|fa-/);
  });
  it('keeps the last modified row and full-width characters', () => {
    expect(a.status.find(r => r.label === '最終更新日時')?.value).toBe('2026年 10月 20日(火曜日) 13:41');
    expect(a.title).toBe('課題１');
    expect(a.error).toBeNull();
  });
  it('detects the Moodle error page', () => {
    const err = `<div data-rel="fatalerror" class="box errorbox alert alert-danger"><p class="errormessage">コーディングエラーが検出されました。 Cannot load the grade item.</p></div>`;
    expect(moodleError(err)).toBe('コーディングエラーが検出されました。 Cannot load the grade item.');
    expect(parseAssign(err, BASE).error).toContain('Cannot load the grade item');
    expect(moodleError('<h1>ok</h1>')).toBeNull();
  });
});

describe('forum page', () => {
  it('returns the intro with its text', () => {
    const f = parseForum(`<h1>連絡</h1><div class="activity-description" id="intro"><div class="no-overflow"><p>◎講義教室<br>　・ 4201</p><p>参加コード： ７udnv</p></div></div>`, BASE);
    expect(f.title).toBe('連絡');
    expect((f.intro[0] as any).text).toContain('4201');
    expect((f.intro[0] as any).text).toContain('７udnv');
    expect(f.discussions).toEqual([]);
  });
  it('has no intro blocks when there is none', () => {
    expect(parseForum('<h1>x</h1>', BASE).intro).toEqual([]);
  });
});

describe('full-width characters', () => {
  it('stay in titles while the TIPS code is still matched', () => {
    const c = parseCourse({ id: 1, fullname: '課題１ グローバル英語 火 ３ （１７ＴＴＸ００５００）' });
    expect(c.title).toBe('課題１ グローバル英語');
    expect(c.tipsCode).toBe('TTX005');
    expect(c.day).toBe(2);
    expect(c.period).toBe(3);
  });
  it('keeps the colon and digits of dates in text', () => {
    const f = parseForum(`<div id="intro"><div class="no-overflow"><p>２３：５９まで</p></div></div>`, BASE);
    expect((f.intro[0] as any).text).toBe('２３：５９まで');
  });
});
