import { describe, expect, it } from 'vitest';
import { assessmentOf, continuesFrom, deliveryKind, levelOf } from './courseFeatures';

describe('deliveryKind', () => {
  it('reads the syllabus delivery labels', () => {
    expect(deliveryKind('面接')).toBe('in_person');
    expect(deliveryKind('遠隔（リアルタイム）')).toBe('online');
    expect(deliveryKind('オンデマンド')).toBe('on_demand');
    expect(deliveryKind('面接・遠隔併用')).toBe('hybrid');
    expect(deliveryKind('')).toBe('unknown');
  });
});

describe('assessmentOf', () => {
  it('splits stated weights into exam and coursework', () => {
    const a = assessmentOf('レポート(70%)と期末試験(30%)で評価する。');
    expect(a.style).toBe('assignment');
    expect(a.assignmentShare).toBeCloseTo(0.7);
    expect(a.source).toBe('stated');
  });
  it('treats quizzes and tests as exams', () => {
    expect(assessmentOf('小テスト40%、定期試験60%').style).toBe('exam');
  });
  it('estimates evenly when only parts are named', () => {
    const a = assessmentOf('課題と中間試験で評価する。');
    expect(a.source).toBe('named');
    expect(a.style).toBe('mixed');
  });
});

describe('levels', () => {
  it('orders a language ladder', () => {
    const a = levelOf('中国語入門1B')!, b = levelOf('中国語初級1A')!, c = levelOf('中国語会話中級2')!;
    expect(a.root).toBe(b.root);
    expect(b.root).toBe(c.root);
    expect(a.rank).toBeLessThan(b.rank);
    expect(b.rank).toBeLessThan(c.rank);
  });
  it('finds the passed course a later level follows on from', () => {
    expect(continuesFrom('スペイン語初級2A', ['スペイン語入門1A', 'スペイン語初級1B', 'データ構造'])).toBe('スペイン語初級1B');
    expect(continuesFrom('スペイン語入門1A', ['スペイン語初級1B'])).toBeNull();
    expect(continuesFrom('Project Seminar 2', ['Project Seminar 1'])).toBe('Project Seminar 1');
  });
  it('ignores titles without a level', () => {
    expect(levelOf('データ分析')).toBeNull();
  });
});

describe('levels in TIPS title styles', () => {
  it('links a later level across tracks and letter suffixes', () => {
    expect(continuesFrom('ドイツ語初級1A', ['ドイツ語入門1A', 'ドイツ語入門1B'])).toBe('ドイツ語入門1B');
    expect(continuesFrom('ドイツ語会話初級2', ['ドイツ語入門1B'])).toBe('ドイツ語入門1B');
  });
  it('reads a level word at the start of an English title', () => {
    expect(levelOf('Elementary Korean 2A')!.root).toBe('KOREAN');
    expect(continuesFrom('Elementary Korean 2A', ['Elementary Korean 1B'])).toBe('Elementary Korean 1B');
  });
  it('only suggests the next level, not one beyond it', () => {
    expect(continuesFrom('ドイツ語中級2', ['ドイツ語入門1B'])).toBeNull();
    expect(continuesFrom('スペイン語上級2', ['スペイン語入門1A'])).toBeNull();
    expect(continuesFrom('ドイツ語中級2', ['ドイツ語入門1B', 'ドイツ語初級2B'])).toBe('ドイツ語初級2B');
    // Already past this level: nothing to continue.
    expect(continuesFrom('韓国語初級1A', ['韓国語初級2B'])).toBeNull();
  });
  it('does not link unrelated courses that share a level word', () => {
    expect(continuesFrom('入門ゼミナールB', ['入門ゼミナールA'])).toBeNull();
  });
});
