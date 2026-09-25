import { describe, expect, it } from 'vitest';
import { absencesLeft, firstSession, slotLabel, termStart, tidy } from './tipsAdapters';

describe('slotLabel', () => {
  it('shortens TIPS day headers and lists the periods', () => {
    expect(slotLabel('Thursday', [1, 2], 'en')).toBe('Thu 1・2');
    expect(slotLabel('木曜日', [1, 2], 'jp')).toBe('木 1・2限');
  });

  it('copes with a missing day or periods', () => {
    expect(slotLabel(undefined, [3], 'en')).toBe('3');
    expect(slotLabel('Monday', [], 'en')).toBe('Mon');
  });
});

describe('tidy', () => {
  it('title-cases TIPS capitals and keeps acronyms and roman numerals', () => {
    expect(tidy('WEB APPLICATION DEVELOPMENT')).toBe('Web Application Development');
    expect(tidy('PROJECT PRACTICES II')).toBe('Project Practices II');
    expect(tidy('ENGLISH FOR IT COMMUNICATION')).toBe('English for IT Communication');
  });

  it('leaves Japanese and mixed-case text alone', () => {
    expect(tidy('ビッグデータ')).toBe('ビッグデータ');
    expect(tidy('Big Data')).toBe('Big Data');
  });
});

describe('attendance before and during the term', () => {
  const s = (month: number, day: number) => ({ no: 1, month, day, period: 1, mark: '/', status: 'unrecorded' as const });
  const course = (over: object) => ({ code: 'X', title: 'X', slotText: '', offering: '', slots: [], attended: 0, absent: 0, other: 0, ...over });
  it('finds the first class of a fall term that runs into January', () => {
    expect(firstSession([s(1, 12), s(10, 6), s(9, 29)])).toEqual(s(9, 29));
  });
  it('gives the start date only while nothing is recorded', () => {
    expect(termStart([course({ sessions: [s(10, 6)] }), course({ sessions: [s(9, 30)] })])).toMatchObject({ month: 9, day: 30 });
    expect(termStart([course({ attended: 1, sessions: [s(9, 30)] })])).toBeNull();
  });
  it('counts the absences left above 80%', () => {
    const fifteen = Array.from({ length: 15 }, (_, i) => s(10, i + 1));
    expect(absencesLeft(course({ sessions: fifteen }))).toBe(3);
    expect(absencesLeft(course({ sessions: fifteen, absent: 2 }))).toBe(1);
    expect(absencesLeft(course({ sessions: fifteen, absent: 5 }))).toBe(0);
  });
});
