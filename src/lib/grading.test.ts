import { describe, expect, it } from 'vitest';
import { analyzeGrading, gradeScale } from './grading';

// Synthetic sentences in the styles instructors use; no real syllabus text.
describe('analyzeGrading', () => {
  it('reads stated weights and keeps the grade scale and attendance floor', () => {
    const a = analyzeGrading('レポート(40%)と期末試験(60%)で評価する。\n85%以上でS、75%以上でA、65%以上でB、55%以上でC、55%未満はEとする。\nただし、出席が授業回数の2/3に満たない場合は「/」とする。');
    expect(a.mode).toBe('weighted');
    expect(a.parts.map(p => [p.label, p.pct, p.en])).toEqual([['レポート', 40, 'Reports'], ['期末試験', 60, 'Final exam']]);
    expect(a.scale.map(b => `${b.grade}${b.min}-${b.max}`)).toEqual(['S85-100', 'A75-84', 'B65-74', 'C55-64', 'E0-54']);
    expect(a.rules).toHaveLength(1);
    expect(a.rules[0].minAttendance).toBeCloseTo(2 / 3);
  });

  it('treats a single named component as the whole grade', () => {
    const a = analyzeGrading('・毎回の小テストの平均点で評価する。');
    expect(a.mode).toBe('single');
    expect(a.parts).toEqual([{ label: '小テスト', en: 'Quizzes', pct: 100 }]);
  });

  it('lists components without inventing weights', () => {
    const a = analyzeGrading('授業中の課題、レポート、発表の内容から総合的に評価する。');
    expect(a.mode).toBe('unweighted');
    expect(a.parts.map(p => p.label)).toEqual(['レポート', '課題', '発表']);
    expect(a.parts.every(p => p.pct === null)).toBe(true);
  });

  it('keeps the whole line as the label for numbered weights', () => {
    const a = analyzeGrading('1 グループ活動に参加し、意見をまとめる(60%)\n2 学んだことを文章で報告する(40%)');
    expect(a.parts.map(p => [p.label, p.pct])).toEqual([['グループ活動に参加し、意見をまとめる', 60], ['学んだことを文章で報告する', 40]]);
  });

  it('turns attendance and lateness rules into numbers', () => {
    const a = analyzeGrading('演習の成果で評価する.\n出席率が70%以下の者は/とする.\n授業開始から15分以上遅れた場合は欠席とする.\n4回以上の欠席は評価しない.');
    const attendance = a.rules.filter(r => r.kind === 'attendance');
    expect(attendance.map(r => r.minAttendance ?? r.maxAbsences)).toEqual([0.71, 3]);
    expect(a.rules.find(r => r.kind === 'late')?.lateMinutes).toBe(15);
  });

  it('converts an absence share into an attendance floor', () => {
    expect(analyzeGrading('欠席回数が授業回数の1/4以下の者を評価対象とする.').rules[0].minAttendance).toBeCloseTo(0.75);
  });

  it('reports a rubric-only description as not broken down', () => {
    const a = analyzeGrading('評価の基準と割合はルーブリックを参照すること。');
    expect(a.mode).toBe('none');
    expect(a.rubric).toBe(true);
  });

  it('does not read attendance thresholds or grade bands as weights', () => {
    const a = analyzeGrading('出席率80%以上を条件とし、100点満点の試験で評価する。90点以上でS、80点以上でA、70点以上でB、60点以上でCとする。');
    expect(a.mode).toBe('single');
    expect(a.parts[0].label).toBe('試験');
  });
});

describe('gradeScale', () => {
  it('reads explicit ranges', () => {
    expect(gradeScale('(0〜49%:E、50〜64%:C、65〜79%:B、80〜89%:A、90〜100%:S)').map(b => b.grade)).toEqual(['S', 'A', 'B', 'C', 'E']);
  });
  it('needs at least three bands', () => {
    expect(gradeScale('60%以上で合格')).toEqual([]);
  });
});
