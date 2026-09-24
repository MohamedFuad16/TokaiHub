import { describe, expect, it } from 'vitest';
import { allocate, normTitle, type CategorySection } from './courseCategories';

describe('normTitle', () => {
  it('ignores case, full-width forms, spaces and punctuation', () => {
    expect(normTitle('Ｗｅｂアプリケーション 開発')).toBe(normTitle('WEBアプリケーション開発'));
    expect(normTitle('Project Practices (2)')).toBe('PROJECTPRACTICES2');
    expect(normTitle('情報・通信「基礎」')).toBe('情報通信基礎');
  });
});

// Synthetic graduation check: section IV has a required and an elective line; section V has a
// line that takes section IV's surplus, the way TIPS words it ("… Category IV surplus …").
const sections = (): CategorySection[] => [
  {
    section: 'IV', name: 'Specialised courses', required: 20, earned: 14, inProgress: 0, remaining: 6,
    items: [
      { name: '必修科目 · Required courses', required: 10, earned: 6, inProgress: 0, remaining: 4 },
      { name: '選択科目 · Elective courses', required: 10, earned: 8, inProgress: 0, remaining: 2 },
    ],
  },
  {
    section: 'V', name: 'Free electives', required: 10, earned: 4, inProgress: 0, remaining: 6,
    items: [{ name: 'Category IV surplus course', required: 10, earned: 4, inProgress: 0, remaining: 6 }],
  },
];

describe('allocate', () => {
  it('puts a planned course in its own section while that line has room', () => {
    const out = allocate([{ code: 'A1', title: 'Elective A', credits: 2, section: 'IV', requirement: '選択' }], sections());
    expect(out.get('A1')).toEqual({ section: 'IV', via: null, beyond: false });
  });

  it('sends an elective to the section that takes IV surplus once IV electives are full', () => {
    const out = allocate([
      { code: 'A1', title: 'Elective A', credits: 2, section: 'IV', requirement: '選択' },
      { code: 'A2', title: 'Elective B', credits: 2, section: 'IV', requirement: '選択' },
    ], sections());
    expect(out.get('A1')).toEqual({ section: 'IV', via: null, beyond: false });
    expect(out.get('A2')).toEqual({ section: 'V', via: 'IV', beyond: false });
  });

  it('keeps a required course in IV even when the IV electives are already full', () => {
    const out = allocate([
      { code: 'A1', title: 'Elective A', credits: 2, section: 'IV', requirement: '選択' },
      { code: 'R1', title: 'Required A', credits: 2, section: 'IV', requirement: '必修' },
    ], sections());
    expect(out.get('R1')).toEqual({ section: 'IV', via: null, beyond: false });
  });

  it('marks credits beyond every line that could take them', () => {
    const s = sections();
    s[1].items[0].remaining = 0;
    const out = allocate([
      { code: 'A1', title: 'Elective A', credits: 2, section: 'IV', requirement: '選択' },
      { code: 'A2', title: 'Elective B', credits: 2, section: 'IV', requirement: '選択' },
    ], s);
    expect(out.get('A2')).toEqual({ section: 'IV', via: null, beyond: true });
  });

  it('flags a course that only partly fits its line', () => {
    const out = allocate([{ code: 'R1', title: 'Required A', credits: 6, section: 'IV', requirement: '必修' }], sections());
    expect(out.get('R1')).toEqual({ section: 'IV', via: null, beyond: true });
  });

  it('passes through a course whose section the check does not list', () => {
    const out = allocate([{ code: 'X1', title: 'Other', credits: 2, section: 'VI' }], sections());
    expect(out.get('X1')).toEqual({ section: 'VI', via: null, beyond: false });
  });
});
