import React, { useMemo, useState } from 'react';
import { Check, BookOpenText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenProps } from '../App';
import PageShell, { Pill, Empty, Skeleton, LoadError, SearchField, EASE, TAP } from './ScreenHeader';
import { useTimetable } from '../lib/useTerm';
import { termLabel, academicYearOf, slotLabel } from '../lib/tipsAdapters';
import type { Term } from '../lib/types';

const t = {
  en: {
    title: 'Classes', search: 'Search my courses, teachers, rooms…', spring: 'Spring', fall: 'Fall', follow: 'Follow TIPS',
    none: 'No registered courses in this term.', view: 'View course', loading: 'Loading courses from TIPS…',
    syllabus: 'Looking for other courses?', syllabusCta: 'Search the syllabus', enrolled: 'Enrolled',
    register: (term: string) => `Registration is open: choose your ${term} classes`,
  },
  jp: {
    title: '授業', search: '履修科目・教員・教室で検索…', spring: '春学期', fall: '秋学期', follow: 'TIPSに合わせる',
    none: 'この学期の履修科目はありません。', view: '詳細を見る', loading: 'TIPSから履修科目を読み込み中…',
    syllabus: '他の科目を探す', syllabusCta: 'シラバスを検索', enrolled: '履修中',
    register: (term: string) => `履修登録期間中：${term}の科目を選ぶ`,
  },
};

export default function TokaiClass(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const navigate = useNavigate();
  const isDark = settings.isDarkMode;
  const [q, setQ] = useState('');
  const tt = useTimetable();
  const term: Term = tt.timetable?.term ?? '1';
  const year = tt.timetable?.year ?? academicYearOf(new Date());
  const days = tt.timetable?.grid.days ?? [];

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? tt.items.filter(i => [i.title[lang], i.code, i.teacher?.[lang], i.location?.[lang]].some(v => v?.toLowerCase().includes(s))) : tt.items;
  }, [tt.items, q, lang]);

  return (
    <PageShell {...props} title={tx.title} subtitle={tt.timetable ? termLabel(term, year, lang) : undefined} onRefresh={tt.refresh} refreshing={tt.loading}>
      <SearchField value={q} onChange={setQ} placeholder={tx.search} isDark={isDark} />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(['1', '2'] as Term[]).map(tm => (
          <Pill key={tm} layoutId="class-term" active={term === tm} isDark={isDark} onClick={() => tt.setChoice(tm)}>{tm === '1' ? tx.spring : tx.fall}</Pill>
        ))}
        {tt.choice !== 'auto' && (
          <button onClick={() => tt.setChoice('auto')} className={`h-10 px-2 text-xs font-bold underline underline-offset-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.follow}</button>
        )}
      </div>

      {tt.loading && (
        <div role="status" aria-label={tx.loading} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[0, 1, 2].map(i => <Skeleton key={i} isDark={isDark} className="h-[340px] rounded-[28px]" />)}
        </div>
      )}
      {!tt.timetable && !tt.loading && tt.error && <LoadError error={tt.error} isDark={isDark} lang={lang} onRetry={tt.refresh} />}
      {!tt.loading && tt.timetable && items.length === 0 && (
        tt.timetable.registrationOpen && tt.timetable.term === tt.currentTerm ? (
          <button onClick={() => navigate('/registration')} className={`w-full flex items-center gap-3 p-5 rounded-3xl bg-green-500/10 text-left font-bold text-sm active:scale-[0.99] transition-transform ${isDark ? 'text-green-400' : 'text-green-700'}`}>
            <span className="flex-1">{tx.register(termLabel(term, year, lang))}</span><ArrowRight className="w-4 h-4" />
          </button>
        ) : <Empty text={tx.none} isDark={isDark} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr gap-5">
        <AnimatePresence mode="popLayout">
        {items.map((item, i) => {
          const slot = slotLabel(days[(item.dayOfWeek ?? 1) - 1], item.periods, lang);
          return (
            <motion.article
              key={item.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, delay: Math.min(i * 0.04, 0.3), ease: EASE } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98, transition: TAP.transition }}
              role="link"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') navigate(`/course/${item.code}`); }}
              onClick={() => navigate(`/course/${item.code}`)}
              className="group relative isolate flex h-full flex-col overflow-hidden rounded-[28px] cursor-pointer bg-[#1A1D24] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
            >
              <div className="relative h-48 w-full shrink-0 overflow-hidden bg-[#1A1D24]">
                <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#1A1D24] to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-400 text-brand-black flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" />{tx.enrolled}
                </span>
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/50 text-white backdrop-blur-sm">{item.code}</span>
              </div>
              <div className="flex flex-1 flex-col gap-4 px-5 pb-6 pt-5">
                <div>
                  <h2 className="text-[17px] font-bold leading-snug text-white line-clamp-2 min-h-[2.75rem]">{item.title[lang]}</h2>
                  <p className="mt-1 text-[13px] text-white/60 truncate min-h-[1.25rem]">{item.teacher?.[lang]}</p>
                </div>
                <div className="flex flex-wrap content-start gap-1.5 min-h-[3.75rem]">
                  {slot && <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white">{slot}</span>}
                  {item.time && <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white">{item.time}</span>}
                  {item.location?.[lang] && <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white max-w-full truncate">{item.location[lang]}</span>}
                </div>
                <div className="mt-auto flex items-center justify-center gap-2 w-full rounded-full bg-white py-3 text-[14px] font-bold text-black transition-colors group-hover:bg-brand-yellow">
                  {tx.view}<ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </motion.article>
          );
        })}
        </AnimatePresence>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/syllabus')}
        className={`mt-8 w-full sm:w-auto sm:min-w-[320px] flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}
      >
        <BookOpenText className="w-5 h-5 shrink-0 text-brand-yellow" />
        <span className="flex-1 min-w-0">
          <span className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.syllabus}</span>
          <span className="block text-sm font-bold">{tx.syllabusCta}</span>
        </span>
        <ArrowRight className="w-4 h-4 shrink-0" />
      </motion.button>
    </PageShell>
  );
}
