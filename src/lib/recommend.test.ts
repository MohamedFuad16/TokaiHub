import { describe, expect, it } from 'vitest';
import { buildPlan, campusKey, DEFAULT_PREFS, misfitOf, scoreOf } from './recommend';
import type { Offering, RecommendData } from './recommendTypes';

const offering = (o: Partial<Offering> & { code: string; title: string }): Offering => ({
  year: '2026', jscd: 'Z1', kamoku: o.code, section: 'B', category: 'cat', credits: 2, mark: 'elective', requirement: '選択',
  slots: [], slotText: '', teacher: '', campus: '', canRegister: true, clash: null, prereq: { ok: true, note: null },
  delivery: { kind: 'in_person', label: '面接' }, assessment: { style: 'mixed', examShare: 0.5, assignmentShare: 0.5, source: 'stated' },
  continues: null, workload: null, ...o,
});

const data = (offerings: Offering[], over: Partial<RecommendData['credits']> = {}): RecommendData => ({
  builtAt: 0, year: 2026, term: '2', semester: 6, dept: 'XX', entryYear: 2024, handbook: true, model: false,
  credits: { limit: 20, registered: 4, remaining: 12, frozen: [], target: 6, ...over },
  sections: [
    { section: 'A', name: 'Major', required: 10, earned: 6, inProgress: 0, remaining: 4, items: [
      { name: 'Required course · Dept', required: 4, earned: 2, inProgress: 0, remaining: 2 },
      { name: 'Elective course · Dept', required: 6, earned: 4, inProgress: 0, remaining: 2 },
    ] },
    { section: 'B', name: 'Self-study', required: 10, earned: 6, inProgress: 0, remaining: 4, items: [
      { name: 'Other courses / Category A surplus', required: 10, earned: 6, inProgress: 0, remaining: 4 },
    ] },
  ],
  required: [], offerings, registered: [{ code: 'R1', title: 'Registered', slots: [{ day: 1, period: 1 }] }],
});

describe('scoreOf', () => {
  it('rewards what the student prefers', () => {
    const remote = offering({ code: 'X', title: 'Remote work', delivery: { kind: 'on_demand', label: '' }, assessment: { style: 'assignment', examShare: 0, assignmentShare: 1, source: 'stated' } });
    const exam = offering({ code: 'Y', title: 'Exam hall', assessment: { style: 'exam', examShare: 1, assignmentShare: 0, source: 'stated' } });
    const prefs = { ...DEFAULT_PREFS, delivery: 'remote' as const, assessment: 'assignment' as const };
    expect(scoreOf(remote, prefs).score).toBeGreaterThan(scoreOf(exam, prefs).score);
    expect(scoreOf(remote, prefs).reasons).toEqual(expect.arrayContaining(['remote', 'assignment']));
  });
  it('favours the next level of a passed course', () => {
    expect(scoreOf(offering({ code: 'L', title: 'Lang 2', continues: 'Lang 1' }), DEFAULT_PREFS).reasons).toContain('continues');
  });
});

describe('misfitOf', () => {
  const monday2 = offering({ code: 'M', title: 'Monday', slots: [{ day: 1, period: 2 }], campus: '湘南' });
  it('keeps days off, periods and format as hard limits', () => {
    expect(misfitOf(monday2, { ...DEFAULT_PREFS, daysOff: [1] })).toBe('day_off');
    expect(misfitOf(monday2, { ...DEFAULT_PREFS, periods: [3, 4] })).toBe('period');
    expect(misfitOf(monday2, { ...DEFAULT_PREFS, delivery: 'remote' })).toBe('format');
    expect(misfitOf(monday2, DEFAULT_PREFS)).toBeNull();
  });
  it('matches campuses in either language, and lets online sections through', () => {
    expect(campusKey('SHONAN')).toBe(campusKey('湘南'));
    expect(misfitOf(monday2, { ...DEFAULT_PREFS, campuses: ['shinagawa'] })).toBe('campus');
    expect(misfitOf(monday2, { ...DEFAULT_PREFS, campuses: ['shonan'] })).toBeNull();
    const online = { ...monday2, delivery: { kind: 'online' as const, label: '' } };
    expect(misfitOf(online, { ...DEFAULT_PREFS, campuses: ['shinagawa'] })).toBeNull();
  });
  it('treats a section with no timetable slot as fitting any day', () => {
    expect(misfitOf(offering({ code: 'I', title: 'Intensive' }), { ...DEFAULT_PREFS, daysOff: [1, 2, 3, 4, 5, 6], periods: [1] })).toBeNull();
  });
});

describe('buildPlan', () => {
  it('puts available required courses first and stays within the target', () => {
    const d = data([
      offering({ code: 'REQ', title: 'Seminar', section: 'A', mark: 'required', requirement: '必修' }),
      offering({ code: 'E1', title: 'Elective 1' }),
      offering({ code: 'E2', title: 'Elective 2' }),
      offering({ code: 'E3', title: 'Elective 3' }),
    ]);
    d.required = [{ title: 'Seminar', number: null, section: 'A', credits: 2, status: 'available', reason: null, offerings: ['REQ'] }];
    const plan = buildPlan(d, DEFAULT_PREFS);
    expect(plan.picks[0].o.code).toBe('REQ');
    expect(plan.credits).toBe(6);
  });
  it('skips clashes, blocked sections and a second section of the same course', () => {
    const d = data([
      offering({ code: 'C', title: 'Clash', slots: [{ day: 1, period: 1 }] }),
      offering({ code: 'N', title: 'Not allowed', canRegister: false }),
      offering({ code: 'S1', title: 'Same', slots: [{ day: 2, period: 1 }] }),
      offering({ code: 'S2', title: 'Same', slots: [{ day: 3, period: 1 }] }),
    ]);
    const codes = buildPlan(d, DEFAULT_PREFS).picks.map(p => p.o.code);
    expect(codes).not.toContain('C');
    expect(codes).not.toContain('N');
    expect(codes.filter(c => c.startsWith('S'))).toHaveLength(1);
  });
  it('leaves out sections that conflict with the answers and names a required course that cannot fit', () => {
    const d = data([
      offering({ code: 'REQ', title: 'Seminar', section: 'A', mark: 'required', slots: [{ day: 1, period: 3 }] }),
      offering({ code: 'W', title: 'Wednesday', slots: [{ day: 3, period: 2 }] }),
      offering({ code: 'M', title: 'Monday', slots: [{ day: 1, period: 4 }] }),
    ]);
    d.required = [{ title: 'Seminar', number: null, section: 'A', credits: 2, status: 'available', reason: null, offerings: ['REQ'] }];
    const plan = buildPlan(d, { ...DEFAULT_PREFS, daysOff: [1] });
    expect(plan.picks.map(p => p.o.code)).toEqual(['W']);
    expect(plan.unfit).toEqual([{ title: 'Seminar', why: 'day_off' }]);
    expect(plan.hidden).toBe(2);
  });
  it('counts an elective from a full section where its surplus goes', () => {
    const d = data([offering({ code: 'A1', title: 'Major elective', section: 'A', requirement: '選択' })], { target: 2 });
    d.sections[0].items[1].remaining = 0;
    d.sections[0].remaining = 2;
    expect(buildPlan(d, DEFAULT_PREFS).picks.map(p => p.o.code)).toEqual(['A1']);
  });
});
