import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ScreenProps } from '../App';
import PageShell, { SectionTitle, Loading, LoadError, SearchField } from './ScreenHeader';
import { colorFor } from '../lib/tipsAdapters';
import type { LmsSubject } from '../lib/lms';
import { useLmsSubjects, slotsLabel } from './lmsShared';

const t = {
  en: { title: 'Courses', mine: 'This term', other: 'Other courses this term', past: 'Earlier terms', show: (n: number) => `Show ${n} earlier courses`, search: 'Search courses', loading: 'Loading from the LMS…' },
  jp: { title: 'コース', mine: '今学期', other: '今学期のその他のコース', past: '過去の学期', show: (n: number) => `過去のコース${n}件を表示`, search: 'コースを検索', loading: 'LMSから読み込み中…' },
};

/** Every LMS course: this term first (the TIPS registration), earlier terms folded away. */
export default function LmsCourses(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const navigate = useNavigate();
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const { mine, other, past, courses } = useLmsSubjects();
  const [showPast, setShowPast] = useState(false);
  const [q, setQ] = useState('');
  const match = (s: LmsSubject) => !q.trim() || `${s.title} ${s.tipsCode ?? ''}`.toLowerCase().includes(q.trim().toLowerCase());

  // Earlier terms, newest first ("2026春" before "2025秋").
  const byTerm = new Map<string, LmsSubject[]>();
  for (const s of past.filter(match)) byTerm.set(s.category || '—', [...(byTerm.get(s.category || '—') ?? []), s]);
  const terms = [...byTerm.keys()].sort((a, b) => b.localeCompare(a, 'ja'));

  const row = (s: LmsSubject) => (
    <button key={s.key} onClick={() => navigate(`/lms/course/${s.ids.join(',')}`)}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
      <span className={`w-1.5 h-9 rounded-full shrink-0 ${colorFor(s.tipsCode ?? s.key)}`} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold leading-snug line-clamp-2">{s.title}</span>
        <span className={`block text-[11px] font-semibold ${muted}`}>{[slotsLabel(s.slots, lang), s.tipsCode].filter(Boolean).join(' · ')}</span>
      </span>
      <ChevronRight className={`w-4 h-4 shrink-0 ${muted}`} />
    </button>
  );

  return (
    <PageShell {...props} title={tx.title} onRefresh={courses.refresh} refreshing={courses.loading}>
      <SearchField value={q} onChange={v => { setQ(v); if (v) setShowPast(true); }} placeholder={tx.search} isDark={isDark} />
      {!courses.data && (courses.error ? <LoadError error={courses.error} isDark={isDark} lang={lang} onRetry={courses.refresh} /> : <Loading text={tx.loading} isDark={isDark} />)}
      {mine.filter(match).length > 0 && <><SectionTitle>{tx.mine}</SectionTitle><div className="space-y-2 mb-6">{mine.filter(match).map(row)}</div></>}
      {other.filter(match).length > 0 && <><SectionTitle>{tx.other}</SectionTitle><div className="space-y-2 mb-6">{other.filter(match).map(row)}</div></>}
      {past.length > 0 && !showPast && (
        <button onClick={() => setShowPast(true)} className={`w-full h-11 rounded-2xl text-sm font-bold ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>{tx.show(past.length)}</button>
      )}
      {showPast && terms.map(term => (
        <div key={term} className="mb-6">
          <SectionTitle>{term}</SectionTitle>
          <div className="space-y-2">{byTerm.get(term)!.map(row)}</div>
        </div>
      ))}
    </PageShell>
  );
}
