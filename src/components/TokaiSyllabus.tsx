import React, { useMemo, useState } from 'react';
import { Search, ChevronRight, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ScreenProps } from '../App';
import PageShell, { Loading, Empty } from './ScreenHeader';
import { useTips } from '../lib/useTips';
import { tidy } from '../lib/tipsAdapters';

// TIPS returns the offering term as one kanji even in English mode.
const TERM_EN: Record<string, string> = { 春: 'Spring', 夏: 'Summer', 秋: 'Fall', 冬: 'Winter' };
import type { TipsOption, TipsProfile, TipsSyllabusOptions, TipsSyllabusResult, TipsTimetable } from '../lib/types';
import { termLabel } from '../lib/tipsAdapters';

const t = {
  en: {
    title: 'Syllabus', subtitle: 'Every course offered at Tokai, from TIPS', name: 'Course name or code',
    search: 'Search', filters: 'Filters', year: 'Year', term: 'Term', campus: 'Campus', faculty: 'Faculty', department: 'Department',
    faculties: 'Faculties', graduate: 'Graduate schools', others: 'Other programs',
    day: 'Day', period: 'Period', teacher: 'Teacher (katakana, partial)', keyword: 'Keyword', clear: 'Clear',
    hint: 'Search by course name, code, teacher or keyword. Add a faculty or day to narrow the results.',
    tooMany: 'More than 500 courses match. Add a filter to narrow the search.', none: 'No courses found.',
    preset: (term: string) => `${term} · my department`,
    results: (n: number, total: number) => total > n ? `Showing ${n} of ${total} courses. Add a filter to see the rest.` : `${n} course${n === 1 ? '' : 's'}`, loading: 'Searching TIPS…',
  },
  jp: {
    title: 'シラバス', subtitle: 'TIPSの全開講科目', name: '科目名・時間割番号',
    search: '検索', filters: '条件', year: '年度', term: '学期', campus: '校舎', faculty: '学部・研究科', department: '学科・専攻',
    faculties: '学部', graduate: '研究科', others: 'その他',
    day: '曜日', period: '時限', teacher: '担当教員（カナ・部分一致）', keyword: 'キーワード', clear: 'クリア',
    hint: '科目名・時間割番号・教員・キーワードで検索できます。学部や曜日を指定すると絞り込めます。',
    tooMany: '該当が500件を超えました。条件を追加してください。', none: '該当する科目はありません。',
    preset: (term: string) => `${term}・自分の学科`,
    results: (n: number, total: number) => total > n ? `全${total}件中${n}件を表示しています。条件を追加すると残りも表示できます。` : `${n}件`, loading: 'TIPSを検索中…',
  },
};

const FIELDS = ['q', 'year', 'term', 'campus', 'faculty', 'department', 'day', 'period', 'teacher', 'keyword'] as const;
type Field = typeof FIELDS[number];

export default function TokaiSyllabus(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  // The submitted search lives in the URL, so Back from a course returns to the same results.
  const submitted = useMemo(() => Object.fromEntries(FIELDS.map(f => [f, params.get(f) ?? ''])) as Record<Field, string>, [params]);
  const [draft, setDraft] = useState<Record<Field, string>>(submitted);
  const set = (f: Field, v: string) => setDraft(d => ({ ...d, [f]: v, ...(f === 'faculty' ? { department: '' } : {}) }));

  const options = useTips<TipsSyllabusOptions>('syllabus-options');
  // TIPS's English labels repeat names for a faculty and its graduate school (e.g. 19 and 0G
  // are both "Information and Telecommunication Engineering"). The Japanese list tells them
  // apart (…学部 / …研究科), so group the options by that.
  const optionsJa = useTips<TipsSyllabusOptions>('syllabus-options', { lang: 'jp' });
  const facultyGroup = useMemo(() => {
    const m = new Map<string, 'faculties' | 'graduate' | 'others'>();
    for (const o of optionsJa.data?.faculties ?? []) m.set(o.value, /研究科$/.test(o.label) ? 'graduate' : /学部$/.test(o.label) ? 'faculties' : 'others');
    return m;
  }, [optionsJa.data]);
  const deptOptions = useTips<TipsSyllabusOptions>('syllabus-options', { faculty: draft.faculty }, { enabled: !!draft.faculty });
  const year = submitted.year || options.data?.year || '';
  const hasQuery = FIELDS.some(f => f !== 'year' && submitted[f]);
  const isCode = /^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/.test(submitted.q.trim());
  const searchParams = isCode
    ? { code: submitted.q.trim().toUpperCase(), year }
    : { ...Object.fromEntries(FIELDS.filter(f => submitted[f]).map(f => [f, submitted[f]])), year };
  const results = useTips<{ results: TipsSyllabusResult[]; tooMany: boolean; total?: number }>('syllabus-search', searchParams, { enabled: hasQuery && !!year });

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setParams(Object.fromEntries(FIELDS.filter(f => draft[f]).map(f => [f, draft[f]])), { replace: true });
  };
  const clear = () => { const empty = Object.fromEntries(FIELDS.map(f => [f, ''])) as Record<Field, string>; setDraft(empty); setParams({}, { replace: true }); };

  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  // One control style for inputs and selects; appearance-none so Safari matches Chrome.
  const input = `block w-full h-11 rounded-xl px-3 text-sm font-medium outline-none appearance-none focus:ring-2 focus:ring-brand-yellow disabled:opacity-50 ${isDark ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'} border`;
  const labelCls = `block text-[11px] font-bold mb-1.5 ${muted}`;
  const select = (f: Field, label: string, opts?: TipsOption[], span = '') => (
    <label className={`block min-w-0 ${span}`}>
      <span className={labelCls}>{label}</span>
      <span className="relative block">
        <select value={draft[f]} onChange={e => set(f, e.target.value)} className={`${input} pr-9 truncate`} disabled={!opts?.length}>
          {(opts ?? []).map(o => <option key={o.value} value={o.value}>{tidy(o.label)}</option>)}
        </select>
        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${muted}`} />
      </span>
    </label>
  );
  const facultySelect = (span: string) => {
    const opts = options.data?.faculties ?? [];
    const groups = (['faculties', 'graduate', 'others'] as const).map(g => ({ g, items: opts.filter(o => o.value && (facultyGroup.get(o.value) ?? 'others') === g) })).filter(x => x.items.length);
    return (
      <label className={`block min-w-0 ${span}`}>
        <span className={labelCls}>{tx.faculty}</span>
        <span className="relative block">
          <select value={draft.faculty} onChange={e => set('faculty', e.target.value)} className={`${input} pr-9 truncate`} disabled={!opts.length}>
            {opts.filter(o => !o.value).map(o => <option key="none" value="">{tidy(o.label)}</option>)}
            {groups.map(({ g, items }) => (
              <optgroup key={g} label={tx[g]}>
                {items.map(o => <option key={o.value} value={o.value}>{tidy(o.label)}</option>)}
              </optgroup>
            ))}
          </select>
          <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${muted}`} />
        </span>
      </label>
    );
  };
  const text = (f: Field, label: string, span = '', props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={`block min-w-0 ${span}`}>
      <span className={labelCls}>{label}</span>
      <input value={draft[f]} onChange={e => set(f, e.target.value)} className={input} {...props} />
    </label>
  );
  // Shortcut: TIPS's current term + the student's own faculty. The faculty code is the one
  // TIPS uses for the student's curriculum; the term option is the one whose label is that term.
  const current = useTips<TipsTimetable>('timetable');
  const curriculum = useTips<{ s: string }[]>('registration-curriculum');
  const myFaculty = curriculum.data?.[0]?.s ?? '';
  const termRe = current.data?.term === '2' ? /秋|autumn|fall/i : /春|spring/i;
  const termOpt = options.data?.terms.find(o => o.value && termRe.test(o.label))?.value ?? '';
  // Department: the option whose label ends the student's affiliation (same language), e.g.
  // "情報通信学部情報通信学科" → "情報通信学科". Campus: the code TIPS puts on registration cells.
  const profile = useTips<TipsProfile>('profile');
  const myDepts = useTips<TipsSyllabusOptions>('syllabus-options', { faculty: myFaculty }, { enabled: !!myFaculty });
  const myDept = (myDepts.data?.departments ?? []).filter(o => o.value && profile.data?.department?.endsWith(o.label))
    .sort((a, b) => b.label.length - a.label.length)[0]?.value ?? '';
  const myCampus = current.data?.campusCode ?? '';
  const applyPreset = () => {
    const next = { ...(Object.fromEntries(FIELDS.map(f => [f, ''])) as Record<Field, string>), term: termOpt, faculty: myFaculty, department: myDept, campus: myCampus, year: options.data?.year ?? '' };
    setDraft(next);
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true });
  };

  const activeFilters = FIELDS.filter(f => !['q', 'year'].includes(f) && submitted[f]).length;

  return (
    <PageShell {...props} title={tx.title} subtitle={tx.subtitle}>
      <form onSubmit={submit} className="space-y-3 mb-6">
        <div className="flex gap-2">
          <div className={`flex-1 h-12 flex items-center rounded-2xl px-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <Search className={`w-5 h-5 mr-3 shrink-0 ${muted}`} />
            <input value={draft.q} onChange={e => set('q', e.target.value)} placeholder={tx.name} className="bg-transparent outline-none w-full text-sm font-medium placeholder:text-gray-400" />
          </div>
          <button type="button" onClick={() => setShowFilters(s => !s)} aria-expanded={showFilters} className={`relative h-12 px-4 rounded-2xl font-bold text-sm flex items-center gap-2 ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <SlidersHorizontal className="w-4 h-4" /><span className="hidden sm:inline">{tx.filters}</span>
            {activeFilters > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-yellow text-brand-black text-[10px] flex items-center justify-center">{activeFilters}</span>}
          </button>
          <button type="submit" className="h-12 px-5 rounded-2xl bg-[#0B1F3A] text-white font-bold text-sm">{tx.search}</button>
        </div>

        {myFaculty && termOpt && (
          <button type="button" onClick={applyPreset} className={`px-4 py-2 rounded-full text-xs font-bold border ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}>
            {tx.preset(termLabel(current.data?.term, current.data?.year, lang))}
          </button>
        )}

        {showFilters && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-3xl p-4 sm:p-5 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-4">
              <label className="block min-w-0">
                <span className={labelCls}>{tx.year}</span>
                <input inputMode="numeric" value={draft.year || options.data?.year || ''} onChange={e => set('year', e.target.value.replace(/\D/g, '').slice(0, 4))} className={input} />
              </label>
              {select('term', tx.term, options.data?.terms)}
              {select('campus', tx.campus, options.data?.campuses)}
              {select('day', tx.day, options.data?.days)}
              {facultySelect('col-span-2')}
              {select('department', tx.department, draft.faculty ? deptOptions.data?.departments : options.data?.departments, 'col-span-2')}
              {select('period', tx.period, options.data?.periods)}
              {text('teacher', tx.teacher)}
              {text('keyword', tx.keyword, 'col-span-2')}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={clear} className={`h-10 px-4 rounded-xl text-sm font-bold flex items-center gap-1 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}><X className="w-4 h-4" />{tx.clear}</button>
              <button type="submit" className="h-10 px-5 rounded-xl bg-[#0B1F3A] text-white text-sm font-bold">{tx.search}</button>
            </div>
          </motion.div>
        )}
      </form>

      {!hasQuery && <Empty text={tx.hint} isDark={isDark} />}
      {hasQuery && results.loading && !results.data && <Loading text={tx.loading} isDark={isDark} />}
      {results.error && <Empty text={results.error.message} isDark={isDark} />}
      {hasQuery && results.data?.tooMany && <p className="text-sm font-bold text-red-500 mb-3">{tx.tooMany}</p>}
      {hasQuery && results.data && !results.data.tooMany && results.data.results.length === 0 && <Empty text={tx.none} isDark={isDark} />}

      {hasQuery && results.data && results.data.results.length > 0 && (
        <>
          <p className={`text-xs font-bold mb-2 ${muted}`}>{tx.results(results.data.results.length, results.data.total ?? results.data.results.length)}</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {results.data.results.map((r, i) => (
              <button
                key={`${r.ref?.code}-${i}`}
                onClick={() => r.ref && navigate(`/course/${r.ref.code}?year=${r.ref.year}`)}
                className={`text-left flex items-center gap-4 p-4 rounded-2xl transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="w-14 shrink-0 text-center">
                  <div className="text-[11px] font-black tracking-tight">{r.ref?.code}</div>
                  <div className={`text-[10px] font-bold mt-0.5 ${muted}`}>{lang === 'en' ? r.term.split('').map(c => TERM_EN[c] ?? c).join(' ') : r.term}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm leading-snug line-clamp-2">{tidy(r.title)}</div>
                  <div className={`text-xs font-medium mt-1 truncate ${muted}`}>{[r.slotText, tidy(r.campus), tidy(r.teacher)].filter(Boolean).join(' · ')}</div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${muted}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
