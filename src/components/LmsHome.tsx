import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { ScreenProps } from '../App';
import PageShell, { Card, SectionTitle, Loading, LoadError, Empty, since, rise } from './ScreenHeader';
import { useTips } from '../lib/useTips';
import { colorFor } from '../lib/tipsAdapters';
import { useLmsSubjects, ModuleIcon, slotsLabel, courseTitle, dueText, dueIn } from './lmsShared';

const t = {
  en: {
    title: 'LMS', news: 'Announcements', noNews: 'No announcements this term yet.', due: 'Due soon', none: 'Nothing due in the next weeks.', mine: 'This term', other: 'Other courses this term',
    loading: 'Loading from the LMS…', overdue: 'Overdue', todo: 'Not submitted', later: 'Opens later', done: 'Done', showAll: (n: number) => `Show ${n} later deadlines`, noCourses: 'No LMS courses match this term’s TIPS registration yet.',
  },
  jp: {
    title: 'LMS', news: 'お知らせ', noNews: '今学期のお知らせはまだありません。', due: '締切が近いもの', none: '数週間以内の締切はありません。', mine: '今学期の科目', other: '今学期のその他のコース',
    loading: 'LMSから読み込み中…', overdue: '期限切れ', todo: '未提出', later: '受付前', done: '完了', showAll: (n: number) => `その後の締切${n}件を表示`, noCourses: '今学期のTIPS履修科目に一致するLMSコースはまだありません。',
  },
};

export interface LmsDueItem {
  id: number; cmid: number | null; name: string; module: string; due: number; overdue: boolean; url: string;
  course: { id: number; fullname: string } | null; action: { name: string; actionable: boolean } | null;
}

/** LMS home: deadlines first, then this term's subjects (matched to the TIPS registration). */
export default function LmsHome(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const navigate = useNavigate();
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const due = useTips<{ items: LmsDueItem[] }>('lms-due');
  const { mine, other, courses } = useLmsSubjects();
  // Announcements from this term's courses (both LMS courses of a two-period class).
  const termIds = [...mine, ...other].flatMap(s => s.ids).sort((a, b) => a - b).join(',');
  const news = useTips<{ items: { id: number; subject: string; author: string; lastPost: number | null; created: number | null; courseId: number }[] }>('lms-announcements', { ids: termIds }, { enabled: !!termIds });
  const titleOf = (courseId: number) => [...mine, ...other].find(s => s.ids.includes(courseId))?.title ?? '';
  const [moreNews, setMoreNews] = useState(false);
  const all = (due.data?.items ?? []).filter(i => !i.overdue || i.action?.actionable).sort((a, b) => a.due - b.due);
  // The next two weeks and anything open for submission now; the rest behind "Show all".
  const [showAll, setShowAll] = useState(false);
  const soon = all.filter(i => i.action?.actionable || i.due * 1000 < Date.now() + 14 * 86_400_000);
  const items = showAll ? all : soon;

  const open = (i: LmsDueItem) => (i.module === 'assign' && i.cmid ? navigate(`/lms/assign/${i.cmid}`) : window.open(i.url, '_blank', 'noopener'));

  return (
    <PageShell {...props} title={tx.title} subtitle={due.cachedAt ? since(due.cachedAt, lang) : 'Open LMS'}
      onRefresh={() => { due.refresh(); courses.refresh(); }} refreshing={due.loading || courses.loading}>
      <SectionTitle>{tx.due}</SectionTitle>
      {!due.data && (due.error ? <LoadError error={due.error} isDark={isDark} lang={lang} onRetry={due.refresh} /> : <Loading text={tx.loading} isDark={isDark} rows={2} />)}
      {due.data && all.length === 0 && <Empty text={tx.none} isDark={isDark} />}
      <div className="space-y-2 mb-8">
        {items.map((i, k) => {
          const late = i.due * 1000 < Date.now();
          // Moodle: actionable = can submit now; an action not yet actionable = submissions not
          // open yet; no action = nothing left to do.
          const todo = !!i.action?.actionable;
          const later = !!i.action && !i.action.actionable;
          return (
            <motion.button key={i.id} {...rise(k)} onClick={() => open(i)}
              className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${late && todo ? 'bg-red-500/15 text-red-500' : isDark ? 'bg-gray-700' : 'bg-white'}`}>
                <ModuleIcon module={i.module} className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm leading-snug line-clamp-2">{i.name}</span>
                <span className={`block text-xs font-medium mt-0.5 truncate ${muted}`}>{i.course ? courseTitle(i.course.fullname) : ''}</span>
              </span>
              <span className="text-right shrink-0">
                <span className={`block text-xs font-bold ${late && todo ? 'text-red-500' : ''}`}>{dueIn(i.due, lang)}</span>
                <span className={`block text-[11px] font-semibold ${muted}`}>{dueText(i.due, lang)}</span>
                <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold ${todo ? (late ? 'text-red-500' : isDark ? 'text-amber-300' : 'text-amber-700') : later ? muted : isDark ? 'text-green-400' : 'text-green-700'}`}>
                  {todo ? <AlertTriangle className="w-3 h-3" /> : later ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {todo ? (late ? tx.overdue : tx.todo) : later ? tx.later : tx.done}
                </span>
              </span>
            </motion.button>
          );
        })}
        {!showAll && all.length > soon.length && (
          <button onClick={() => setShowAll(true)} className={`w-full h-11 rounded-2xl text-sm font-bold ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>{tx.showAll(all.length - soon.length)}</button>
        )}
      </div>

      <SectionTitle>{tx.news}</SectionTitle>
      {!news.data && termIds && (news.error ? <LoadError error={news.error} isDark={isDark} lang={lang} onRetry={news.refresh} /> : <Loading text={tx.loading} isDark={isDark} rows={1} />)}
      {news.data && news.data.items.length === 0 && <Empty text={tx.noNews} isDark={isDark} />}
      <div className="space-y-2 mb-8">
        {(news.data?.items ?? []).slice(0, moreNews ? 30 : 4).map(n => (
          <button key={n.id} onClick={() => navigate(`/lms/discussion/${n.id}`)}
            className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
            <span className={`w-1.5 self-stretch rounded-full shrink-0 ${colorFor(String(n.courseId))}`} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold leading-snug line-clamp-2">{n.subject}</span>
              <span className={`block text-xs font-medium mt-0.5 truncate ${muted}`}>{[titleOf(n.courseId), n.author, n.lastPost ? dueText(n.lastPost, lang) : ''].filter(Boolean).join(' · ')}</span>
            </span>
            <ChevronRight className={`w-4 h-4 shrink-0 ${muted}`} />
          </button>
        ))}
        {!moreNews && (news.data?.items.length ?? 0) > 4 && (
          <button onClick={() => setMoreNews(true)} className={`w-full h-11 rounded-2xl text-sm font-bold ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>{lang === 'en' ? 'Show more' : 'もっと見る'}</button>
        )}
      </div>

      <SectionTitle>{tx.mine}</SectionTitle>
      {!courses.data && (courses.error ? <LoadError error={courses.error} isDark={isDark} lang={lang} onRetry={courses.refresh} /> : <Loading text={tx.loading} isDark={isDark} rows={2} />)}
      {courses.data && mine.length === 0 && <Empty text={tx.noCourses} isDark={isDark} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {mine.map((s, k) => (
          <motion.div key={s.key} {...rise(k)}>
            <Card isDark={isDark} className="p-4 h-full" onClick={() => navigate(`/lms/course/${s.ids.join(',')}`)}>
              <div className="flex items-center gap-3">
                <span className={`w-1.5 self-stretch rounded-full ${colorFor(s.tipsCode ?? s.key)}`} />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-[15px] leading-snug line-clamp-2">{s.title}</span>
                  <span className={`block text-xs font-semibold mt-0.5 ${muted}`}>{[slotsLabel(s.slots, lang), s.tipsCode].filter(Boolean).join(' · ')}</span>
                </span>
                <ChevronRight className={`w-4 h-4 shrink-0 ${muted}`} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {other.length > 0 && (
        <>
          <SectionTitle>{tx.other}</SectionTitle>
          <div className="space-y-1.5">
            {other.map(s => (
              <button key={s.key} onClick={() => navigate(`/lms/course/${s.ids.join(',')}`)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${isDark ? 'bg-gray-800/60 hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <span className="flex-1 min-w-0 truncate">{s.title}</span><ChevronRight className={`w-4 h-4 shrink-0 ${muted}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
