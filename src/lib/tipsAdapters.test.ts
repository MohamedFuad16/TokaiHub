import { describe, expect, it } from 'vitest';
import { slotLabel, tidy } from './tipsAdapters';

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
