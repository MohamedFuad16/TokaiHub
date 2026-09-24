import { describe, expect, it } from 'vitest';
import { gradingWeights, linkify, pickLang, reflow, withoutWeightLines } from './syllabusText';

// A line as long as a typical syllabus form row, so reflow treats it as wrapped.
const LONG = 'This course builds practical communication skills for engineering students, with';

describe('reflow', () => {
  it('joins lines the form wrapped mid-sentence', () => {
    expect(reflow(`${LONG}\na focus on conference talks.`)).toEqual([
      { kind: 'p', text: `${LONG} a focus on conference talks.` },
    ]);
  });

  it('joins Japanese lines without adding a space', () => {
    const line = '本科目では、ウェブアプリケーションの設計と実装について、基礎から応用まで段階的に学ぶ予定であり、';
    expect(reflow(`${line}\n最後に発表を行う。`)).toEqual([{ kind: 'p', text: `${line}最後に発表を行う。` }]);
  });

  it('keeps a line that ends a sentence as its own paragraph', () => {
    expect(reflow('First sentence.\nSecond sentence.')).toEqual([
      { kind: 'p', text: 'First sentence.' },
      { kind: 'p', text: 'Second sentence.' },
    ]);
  });

  it('turns ・ and • lines into list items and joins their wrapped continuation', () => {
    expect(reflow(`・${LONG}\nmore words here.\n• Second item.`)).toEqual([
      { kind: 'ul', items: [`${LONG} more words here.`, 'Second item.'] },
    ]);
  });

  it('does not join short lines typed one per line (an office list)', () => {
    expect(reflow('Teacher A Building 1 Room 101\nTeacher B Building 1 Room 102')).toEqual([
      { kind: 'p', text: 'Teacher A Building 1 Room 101' },
      { kind: 'p', text: 'Teacher B Building 1 Room 102' },
    ]);
  });

  it('starts numbered and labelled items on a new paragraph', () => {
    const blocks = reflow(`${LONG}\n(1)First topic\n(2)Second topic\n「知識」Knowledge of the field`);
    expect(blocks.map(b => (b.kind === 'p' ? b.text : ''))).toEqual([LONG, '(1)First topic', '(2)Second topic', '「知識」Knowledge of the field']);
  });

  it('keeps a line ending in an e-mail address, and an address line, apart from its neighbours', () => {
    expect(reflow(`${LONG}\nteacher@example.com\nOffice hours by appointment`)).toEqual([
      { kind: 'p', text: LONG },
      { kind: 'p', text: 'teacher@example.com' },
      { kind: 'p', text: 'Office hours by appointment' },
    ]);
  });

  it('joins a lower-case continuation even in a narrow cell and after "vs."', () => {
    expect(reflow('・demo of reading vs.\nhuman interaction.')).toEqual([{ kind: 'ul', items: ['demo of reading vs. human interaction.'] }]);
  });

  it('splits paragraphs on blank lines', () => {
    expect(reflow('One.\n\nTwo.')).toEqual([{ kind: 'p', text: 'One.' }, { kind: 'p', text: 'Two.' }]);
  });
});

describe('linkify', () => {
  it('marks web addresses and keeps the text around them', () => {
    expect(linkify('See https://example.com/a/b for details')).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'link', text: 'https://example.com/a/b', href: 'https://example.com/a/b' },
      { kind: 'text', text: ' for details' },
    ]);
  });

  it('turns e-mail addresses into mailto links', () => {
    expect(linkify('Mail teacher.a@example.ac.jp')).toEqual([
      { kind: 'text', text: 'Mail ' },
      { kind: 'link', text: 'teacher.a@example.ac.jp', href: 'mailto:teacher.a@example.ac.jp' },
    ]);
  });

  it('stops an address at Japanese text that follows without a space', () => {
    expect(linkify('随時メール対応teacher@example.com')[1]).toEqual({ kind: 'link', text: 'teacher@example.com', href: 'mailto:teacher@example.com' });
    expect(linkify('https://example.com/support/を参照')).toEqual([
      { kind: 'link', text: 'https://example.com/support/', href: 'https://example.com/support/' },
      { kind: 'text', text: 'を参照' },
    ]);
  });

  it('leaves trailing sentence punctuation and an unopened bracket outside the link', () => {
    expect(linkify('Go to https://example.com.')[1]).toMatchObject({ text: 'https://example.com' });
    expect(linkify('(see https://example.com/x)')[1]).toMatchObject({ text: 'https://example.com/x' });
    expect(linkify('https://example.com/wiki/A_(B)')[0]).toMatchObject({ text: 'https://example.com/wiki/A_(B)' });
  });

  it('adds https to a bare www. address', () => {
    expect(linkify('www.example.com')[0]).toEqual({ kind: 'link', text: 'www.example.com', href: 'https://www.example.com' });
  });

  it('returns plain text unchanged', () => {
    expect(linkify('No links here')).toEqual([{ kind: 'text', text: 'No links here' }]);
  });
});

describe('pickLang', () => {
  it('picks the half of "日本語(English)" for the UI language', () => {
    expect(pickLang('有(Yes)', 'en')).toBe('Yes');
    expect(pickLang('該当しない(No)', 'jp')).toBe('該当しない');
  });

  it('picks the half of "日本語 English"', () => {
    expect(pickLang('講義科目 Lectures', 'en')).toBe('Lectures');
    expect(pickLang('講義科目 Lectures', 'jp')).toBe('講義科目');
  });

  it('leaves values without two languages alone', () => {
    expect(pickLang('専門共通科目', 'en')).toBe('専門共通科目');
    expect(pickLang('Webページ、HTML', 'en')).toBe('Webページ、HTML');
    expect(pickLang('Class Activity (Group)', 'jp')).toBe('Class Activity (Group)');
  });
});

describe('gradingWeights', () => {
  it('reads one weight per line', () => {
    expect(gradingWeights('Class Activity: 30%\nPresentation(s): 40%\nAssignments: 30%')).toEqual([
      { label: 'Class Activity', pct: 30 }, { label: 'Presentation(s)', pct: 40 }, { label: 'Assignments', pct: 30 },
    ]);
  });

  it('reads weights joined by ・ and commas', () => {
    expect(gradingWeights('中間試験50%・期末試験50%として評価する')).toEqual([{ label: '中間試験', pct: 50 }, { label: '期末試験', pct: 50 }]);
    expect(gradingWeights('各回の課題30%,中間試験30%,期末試験40%で評価する。')).toEqual([
      { label: '各回の課題', pct: 30 }, { label: '中間試験', pct: 30 }, { label: '期末試験', pct: 40 },
    ]);
  });

  it('returns null when the numbers are conditions, not weights', () => {
    expect(gradingWeights('Students must attend 80% of classes.')).toBeNull();
    expect(gradingWeights('No percentages at all')).toBeNull();
  });
});

describe('withoutWeightLines', () => {
  it('drops lines that only state a weight and keeps the rest', () => {
    expect(withoutWeightLines('Class Activity: 30%\nPresentation: 70%\n\nGrades reflect steady work.')).toBe('Grades reflect steady work.');
  });

  it('keeps a sentence that mentions a weight', () => {
    const text = '各回の課題30%,期末試験70%で評価する。';
    expect(withoutWeightLines(text)).toBe(text);
  });
});
