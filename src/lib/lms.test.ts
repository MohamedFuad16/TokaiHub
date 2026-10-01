import { describe, expect, it } from 'vitest';
import { groupSubjects, splitByTerm, termCategory, type LmsCourse } from './lms';

const c = (id: number, title: string, tipsCode: string | null, category: string, day: number | null = null, period: number | null = null): LmsCourse =>
  ({ id, title, fullname: title, code: null, tipsCode, day, period, category, start: null, end: null });

describe('LMS courses', () => {
  const courses = [
    c(1, 'Operating Systems', 'TTX030', '2026秋1', 3, 4), c(2, 'Operating Systems', 'TTX030', '2026秋1', 3, 3),
    c(3, 'Mobile Computing', 'TTX060', '2026秋1', 2, 2),
    c(4, 'Guidance', null, '2026秋'),
    c(5, 'Cloud Computing', 'TTK060', '2026春', 2, 3),
    c(6, 'Dropped elective', 'TTX099', '2026秋1', 5, 1),
  ];
  it('merges a two-period class into one subject with ordered slots', () => {
    const os = groupSubjects(courses).find(s => s.tipsCode === 'TTX030')!;
    expect(os.ids).toEqual([1, 2]);
    expect(os.slots).toEqual([{ day: 3, period: 3 }, { day: 3, period: 4 }]);
  });
  it('keeps this term to the codes registered in TIPS', () => {
    const { mine, other, past } = splitByTerm(groupSubjects(courses), new Set(['TTX030', 'TTX060']), termCategory(2026, '2'));
    expect(mine.map(s => s.tipsCode)).toEqual(['TTX030', 'TTX060']);
    expect(other.map(s => s.title)).toEqual(['Guidance', 'Dropped elective']);
    expect(past.map(s => s.title)).toEqual(['Cloud Computing']);
  });
});
