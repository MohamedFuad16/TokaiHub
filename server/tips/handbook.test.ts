import { describe, expect, it } from 'vitest';
import { parseHandbook } from './handbook';

// Rows in the layout pdftotext -layout gives for a カリキュラム表; courses are made up.
const TEXT = [
  '                     Ⅳ210 サンプル演習A              ○   2   1',
  '                     Ⅳ330 サンプル講義B              ×   3                                    同2        講義１コマ',
  '                     Ⅳ451 サンプル研究1              ○   4   1                                    1      ②７セメ＆③90単位      ×',
  '                     Ⅳ452 サンプル研究2              ○   4   1                                    1      ①Ⅳ451＆②８セメ      ×',
  '                     Ⅳ100 サンプル入門              ×   2   1                                                   サンプル学科生履修不可',
  'not a row at all',
].join('\n');

describe('parseHandbook', () => {
  const rows = parseHandbook(TEXT);
  it('reads number, title, mark and credits', () => {
    expect(rows.map(r => [r.number, r.title, r.mark, r.credits])).toEqual([
      ['Ⅳ210', 'サンプル演習A', 'required', 2],
      ['Ⅳ330', 'サンプル講義B', 'elective', 3],
      ['Ⅳ451', 'サンプル研究1', 'required', 4],
      ['Ⅳ452', 'サンプル研究2', 'required', 4],
      ['Ⅳ100', 'サンプル入門', 'elective', 2],
    ]);
  });
  it('reads semester, credit and course prerequisites', () => {
    expect(rows[2].prereq).toEqual({ courses: [], semester: 7, credits: 90 });
    expect(rows[3].prereq).toEqual({ courses: ['Ⅳ451'], semester: 8, credits: null });
  });
  it('marks rows the department may not take', () => {
    expect(rows[4].closed).toBe(true);
    expect(rows[0].closed).toBe(false);
  });
});
