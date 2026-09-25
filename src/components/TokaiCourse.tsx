import React, { useMemo, useRef, useState } from 'react';
import { Clock, MapPin, Award, CalendarDays, User, CheckCircle2, CircleSlash, Languages, ChevronDown } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenProps } from '../App';
import PageShell, { Card, Loading, LoadError, Empty, Skeleton, SectionTitle, EASE } from './ScreenHeader';
import { useTips } from '../lib/useTips';
import { useTimetable } from '../lib/useTerm';
import { academicYearOf, slotLabel, tidy, firstSession, monthDay } from '../lib/tipsAdapters';
import { RichText, FileLink } from './SyllabusText';
import GradingPanel from './GradingPanel';
import { SectionChip } from './CreditsNeeded';
import { pickLang } from '../lib/syllabusText';
import { useCourseCategories } from '../lib/courseCategories';
import type { AttendanceStatus, TipsAttendanceCourse, TipsSyllabus } from '../lib/types';

const t = {
  en: {
    registered: 'Registered', notRegistered: 'Not registered', overview: 'Overview', attendance: 'Attendance', plan: 'Class plan', details: 'Syllabus',
    time: 'Time', room: 'Room', credits: 'Credits', when: 'Day & period', summary: 'Course summary', grading: 'Grading',
    keywords: 'Keywords', instructors: 'Instructors', rate: 'Attendance rate', firstClass: 'First class', attended: 'Attended', absent: 'Absent', other: 'Other',
    noAttendance: 'No attendance record for this course in the selected term.', noSyllabus: 'The syllabus for this course is not available on TIPS.',
    loading: 'Loading from TIPS…', jpOnly: 'The instructor published this syllabus in Japanese only.', prep: 'Preparation & review', method: 'Method',
    more: 'Show more', less: 'Show less', notListed: 'Not listed in the syllabus.', files: 'Attached files', gradingText: 'Syllabus wording',
    materials: 'Materials and notes', otherGroup: 'Other details',
    legend: { present: 'Present', absent: 'Absent', notice: 'Notice of absence', accommodation: 'Accommodation', cancelled: 'Cancelled', unrecorded: 'Not recorded', late: 'Late', early: 'Left early', other: 'Other' },
  },
  jp: {
    registered: '履修中', notRegistered: '未履修', overview: '概要', attendance: '出欠', plan: '授業計画', details: 'シラバス',
    time: '時間', room: '教室', credits: '単位', when: '曜日・時限', summary: '科目の要旨', grading: '成績評価',
    keywords: 'キーワード', instructors: '担当教員', rate: '出席率', firstClass: '初回授業', attended: '出席', absent: '欠席', other: 'その他',
    noAttendance: '選択中の学期にこの科目の出欠記録はありません。', noSyllabus: 'この科目のシラバスはTIPSにありません。',
    loading: 'TIPSから読み込み中…', jpOnly: '', prep: '予習・復習', method: '学習方法',
    more: 'もっと見る', less: '閉じる', notListed: 'シラバスに記載がありません。', files: '添付ファイル', gradingText: 'シラバスの記載',
    materials: '教材・履修上の注意', otherGroup: 'その他の項目',
    legend: { present: '出席', absent: '欠席', notice: '欠席届', accommodation: '合理的配慮', cancelled: '休講', unrecorded: '未登録', late: '遅刻', early: '早退', other: 'その他' },
  },
};

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  present: 'bg-blue-500 text-white', absent: 'bg-red-500 text-white', late: 'bg-orange-400 text-white', early: 'bg-orange-400 text-white',
  notice: 'bg-purple-300 text-brand-black', accommodation: 'bg-purple-300 text-brand-black', cancelled: 'bg-gray-400 text-white',
  unrecorded: 'bg-transparent', other: 'bg-gray-300 text-brand-black',
};

type Tab = 'overview' | 'attendance' | 'plan' | 'details';
type Section = TipsSyllabus['sections'][number];

// Shown on the Overview tab, so the Syllabus tab leaves them out.
const OVERVIEW = new Set(['科目の要旨・概要', '成績評価の基準・方法', '科目キーワード']);
// TIPS files these under 成績評価基準・方法; they are about materials and preparation.
const MATERIALS = new Set(['履修上の注意点', 'シラバス配付方法・授業資料の概要', '教科書', '参考図書・その他の教材']);
// A value such as 有(Yes) or 専門共通科目 is listed as a fact; a sentence gets a card of its own.
const isShort = (s: Section) => s.value.length <= 24 && !/[\n。．.]/.test(s.value) && !s.files?.length;

// Five lines of 15px text at leading-relaxed (1.625).
const CLAMPED = '7.625rem';

function Expandable({ text, isDark, more, less, size }: { text: string; isDark: boolean; more: string; less: string; size?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 280;
  const para = <RichText text={text} isDark={isDark} size={size} />;
  if (!long) return para;
  return (
    <div>
      {/* Height animates between five lines and the full text; a fade marks the cut. */}
      <motion.div initial={false} animate={{ height: open ? 'auto' : CLAMPED }} transition={{ duration: 0.3, ease: EASE }} className="relative overflow-hidden">
        {para}
        <motion.div initial={false} animate={{ opacity: open ? 0 : 1 }} className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t ${isDark ? 'from-gray-800' : 'from-gray-50'} to-transparent`} />
      </motion.div>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className={`mt-1 h-10 text-xs font-bold flex items-center gap-1 ${isDark ? 'text-brand-yellow' : 'text-blue-600'}`}>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />{open ? less : more}
      </button>
    </div>
  );
}

/** Files attached to a syllabus field (rubrics, handouts), fetched through the bridge. */
function Files({ files, syl, isDark, label }: { files: Section['files']; syl: TipsSyllabus; isDark: boolean; label: string }) {
  if (!files?.length || !syl.year) return null;
  const locale = syl.contentLang === 'en' ? 'en_US' : 'ja_JP';
  return (
    <div className="mt-4">
      <div className={`text-[11px] font-bold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
      <div className="space-y-1.5">
        {files.map(f => <FileLink key={`${f.column}-${f.renban}`} name={f.name} isDark={isDark} file={{ kind: 'syllabus', year: String(syl.year), code: syl.code, column: f.column, renban: f.renban, locale }} />)}
      </div>
    </div>
  );
}

export default function TokaiCourse(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const { id } = useParams();
  const [params] = useSearchParams();
  const code = (id ?? '').toUpperCase();

  const tt = useTimetable();
  const course = tt.items.find(c => c.code === code);
  const raw = tt.timetable?.courses.find(c => c.code === code);
  const year = Number(params.get('year')) || tt.timetable?.year || academicYearOf(new Date());
  const term = tt.timetable?.term ?? '1';

  const syllabus = useTips<TipsSyllabus>('syllabus', { code, year }, { enabled: !!code });
  const attendance = useTips<{ courses: TipsAttendanceCourse[] }>('attendance', { year, term }, { enabled: !!course });
  const record = attendance.data?.courses.find(c => c.code === code);
  const syl = syllabus.data;
  const [tab, setTab] = useState<Tab>('overview');
  // Marks where the tab bar sits before it pins (a sticky element's own position moves).
  const tabsMark = useRef<HTMLDivElement>(null);
  // Switching tabs while the bar is pinned: start the new tab at its top, not somewhere below its end.
  const openTab = (id: Tab) => {
    setTab(id);
    const mark = tabsMark.current;
    const scroller = mark?.closest('.overflow-y-auto');
    if (!mark || !scroller) return;
    const top = mark.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    if (scroller.scrollTop > top) requestAnimationFrame(() => scroller.scrollTo({ top, behavior: 'smooth' }));
  };

  const section = (jp: string) => syl?.sections.find(s => s.label.jp === jp)?.value;
  const title = course?.title[lang] ?? tidy(syl ? (lang === 'en' ? syl.title.en || syl.title.jp : syl.title.jp) : code);
  const teacher = course?.teacher?.[lang] ?? tidy(syl ? syl.mainInstructor[lang] : '');
  const days = tt.timetable?.grid.days ?? [];
  const periods = tt.timetable?.grid.periods ?? [];
  // Syllabus gives "月/Mon 2"; keep the half for the UI language.
  const sylWhen = syl?.dayPeriod?.replace(/([^/\s]+)\/([A-Za-z]+)/g, (_, jp: string, en: string) => (lang === 'en' ? en : jp));
  const when = course?.periods?.length ? slotLabel(days[(course.dayOfWeek ?? 1) - 1], course.periods, lang) : sylWhen;
  const keywords = (section('科目キーワード') ?? '').split(/[、,，]/).map(s => s.trim()).filter(Boolean);
  // Syllabus tab: the fields not on Overview, in TIPS's groups (materials split out of grading).
  const detailGroups = useMemo(() => {
    const groups: { key: string; title: { jp: string; en: string }; sections: Section[] }[] = [];
    for (const s of syl?.sections ?? []) {
      if (OVERVIEW.has(s.label.jp) || (!s.value && !s.files?.length)) continue;
      const title = MATERIALS.has(s.label.jp) ? { jp: t.jp.materials, en: t.en.materials } : s.group ?? { jp: t.jp.otherGroup, en: t.en.otherGroup };
      const g = groups.find(x => x.key === title.jp) ?? groups[groups.push({ key: title.jp, title, sections: [] }) - 1];
      g.sections.push(s);
    }
    return groups;
  }, [syl]);

  const recorded = (record?.attended ?? 0) + (record?.absent ?? 0);
  const rate = recorded ? Math.round(((record?.attended ?? 0) / recorded) * 100) : null;
  const byMonth = useMemo(() => {
    const m = new Map<number, NonNullable<TipsAttendanceCourse['sessions']>>();
    for (const s of record?.sessions ?? []) m.set(s.month, [...(m.get(s.month) ?? []), s]);
    return [...m.entries()];
  }, [record]);
  const usedStatuses = [...new Set((record?.sessions ?? []).map(s => s.status))];

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'overview', label: tx.overview, show: true },
    { id: 'attendance', label: tx.attendance, show: !!course },
    { id: 'plan', label: tx.plan, show: !!syl?.schedule.length },
    { id: 'details', label: tx.details, show: detailGroups.length > 0 },
  ];

  const facts = [
    { icon: CalendarDays, label: tx.when, value: when },
    { icon: Clock, label: tx.time, value: course?.time },
    { icon: MapPin, label: tx.room, value: raw?.room || raw?.campus },
    { icon: Award, label: tx.credits, value: syl?.credits != null ? String(syl.credits) : undefined },
  ].filter(f => f.value);

  const exp = { isDark, more: tx.more, less: tx.less };
  const gradingSection = syl?.sections.find(s => s.label.jp === '成績評価の基準・方法');
  const gradingText = gradingSection?.value;
  const grad = useCourseCategories();
  const cat = grad.sectionFor(course?.title.jp) ?? grad.sectionFor(syl?.title.jp) ?? grad.sectionFor(syl?.title.en) ?? grad.sectionFor(course?.title.en);

  return (
    <PageShell {...props} title={code} subtitle={syl?.semester?.[lang] || undefined} back onRefresh={() => { syllabus.refresh(); attendance.refresh(); }} refreshing={syllabus.loading || attendance.loading}>
      {!course && !syl && (syllabus.loading || tt.loading) && (
        <>
          <Loading text={tx.loading} isDark={isDark} rows={0} />
          <Skeleton isDark={isDark} className="h-56 rounded-[32px]" />
          <Skeleton isDark={isDark} className="mt-6 h-12 rounded-full" />
          <Skeleton isDark={isDark} className="mt-5 h-40 rounded-3xl" />
        </>
      )}
      {!course && !syl && !syllabus.loading && syllabus.error && (
        (syllabus.error as Error & { status?: number }).status === 404
          ? <Empty text={tx.noSyllabus} isDark={isDark} />
          : <LoadError error={syllabus.error} isDark={isDark} lang={lang} onRetry={syllabus.refresh} />
      )}

      {(course || syl) && (
        <>
          {/* Summary card */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] bg-brand-black text-white p-5 sm:p-8">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-brand-yellow/10" />
            <div className="relative flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
              {course
                ? <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-400 text-brand-black flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{tx.registered}</span>
                : <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15 flex items-center gap-1"><CircleSlash className="w-3.5 h-3.5" />{tx.notRegistered}</span>}
              {cat?.section && <SectionChip section={cat.section} needed={grad.needed.has(cat.section)} done={grad.done.has(cat.section)} category={cat.category} isDark lang={lang} />}
              {/* TIPS says 面接 (face to face), which reads as "interview"; 対面 is the usual word. */}
              {syl?.delivery?.[lang] && <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15">{syl.delivery[lang].replace(/面接/g, '対面')}</span>}
              {/* TIPS gives "講義科目 Lectures": show the half in the UI language. */}
              {syl?.creditType && <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15">{pickLang(syl.creditType, lang)}</span>}
            </div>
            <h2 className="relative text-[22px] sm:text-[34px] font-bold leading-tight tracking-tight break-words [overflow-wrap:anywhere]">{title}</h2>
            {teacher && <p className="relative mt-1.5 sm:mt-2 text-sm text-white/70 flex items-center gap-2"><User className="w-4 h-4" />{teacher}</p>}
            {facts.length > 0 && (
              <div className="relative mt-4 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {facts.map(f => (
                  <div key={f.label} className="rounded-2xl bg-white/10 px-3 py-2 sm:px-4 sm:py-3 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/60"><f.icon className="w-3.5 h-3.5 text-brand-yellow" />{f.label}</div>
                    <div className="mt-0.5 sm:mt-1 text-sm font-bold line-clamp-2 break-words">{f.value}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Tabs stay on screen while the content scrolls, so switching never means scrolling up past the card. */}
          <div ref={tabsMark} aria-hidden />
          <div className={`sticky top-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pt-4 pb-3 mb-2 sm:pt-6 sm:pb-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
          <div role="tablist" className={`flex gap-1 p-1 rounded-full overflow-x-auto no-scrollbar ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {tabs.filter(x => x.show).map(x => (
              <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => openTab(x.id)}
                className={`relative isolate flex-1 min-w-fit h-10 px-2 sm:px-4 rounded-full text-[13px] sm:text-sm font-bold whitespace-nowrap transition-colors ${tab === x.id ? (isDark ? 'text-white' : 'text-brand-black') : muted}`}>
                {/* The selected tab's background slides to the new tab. */}
                {tab === x.id && <motion.span layoutId="course-tab" transition={{ type: 'spring', stiffness: 500, damping: 40 }} className={`absolute inset-0 -z-10 rounded-full ${isDark ? 'bg-gray-700' : 'bg-white shadow-sm'}`} />}
                {x.label}
              </button>
            ))}
          </div>
          </div>

          {lang === 'en' && syl?.contentLang === 'jp' && tab !== 'attendance' && (
            <p className={`mb-4 text-xs font-semibold flex items-center gap-1.5 ${muted}`}><Languages className="w-3.5 h-3.5" />{tx.jpOnly}</p>
          )}
          {syllabus.loading && !syl && tab !== 'attendance' && <Loading text={tx.loading} isDark={isDark} />}

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: EASE }}>
              {tab === 'overview' && !syl && !syllabus.loading && syllabus.error && (
                (syllabus.error as Error & { status?: number }).status === 404
                  ? <Empty text={tx.noSyllabus} isDark={isDark} />
                  : <LoadError error={syllabus.error} isDark={isDark} lang={lang} onRetry={syllabus.refresh} />
              )}
              {tab === 'overview' && syl && (
                // items-start: the summary card keeps its own height instead of stretching to the side column.
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                  <Card isDark={isDark} className="p-5 sm:p-6 lg:col-span-2">
                    <h3 className="font-bold mb-3">{tx.summary}</h3>
                    <Expandable text={section('科目の要旨・概要') || tx.notListed} {...exp} />
                  </Card>
                  <div className="space-y-4">
                    <Card isDark={isDark} className="p-5">
                      <h3 className="font-bold mb-3">{tx.grading}</h3>
                      {gradingText ? (
                        <GradingPanel text={gradingText} lang={lang} isDark={isDark} attendance={record ? { attended: record.attended, absent: record.absent } : null}
                          after={(
                            <>
                              <Files files={gradingSection?.files} syl={syl} isDark={isDark} label={tx.files} />
                              <details className="group">
                                <summary className={`min-h-10 flex items-center gap-1.5 text-xs font-bold cursor-pointer list-none ${isDark ? 'text-brand-yellow' : 'text-blue-600'}`}>
                                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />{tx.gradingText}
                                </summary>
                                <div className="mt-1"><RichText text={gradingText} isDark={isDark} size="text-[13px]" /></div>
                              </details>
                            </>
                          )} />
                      ) : <p className={`text-sm ${muted}`}>{tx.notListed}</p>}
                    </Card>
                    {keywords.length > 0 && (
                      <Card isDark={isDark} className="p-5">
                        <h3 className="font-bold mb-3">{tx.keywords}</h3>
                        <div className="flex flex-wrap gap-1.5">{keywords.map(k => <span key={k} className={`max-w-full px-3 py-1 rounded-full text-xs font-semibold [overflow-wrap:anywhere] ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>{k}</span>)}</div>
                      </Card>
                    )}
                    {syl.instructors.length > 0 && (
                      <Card isDark={isDark} className="p-5">
                        <h3 className="font-bold mb-3">{tx.instructors}</h3>
                        <ul className="space-y-2">{syl.instructors.map(i => (
                          <li key={i.name.jp} className="text-sm"><div className="font-semibold">{tidy(i.name[lang])}</div><div className={`text-xs ${muted}`}>{tidy(i.affiliation[lang])}</div></li>
                        ))}</ul>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {tab === 'attendance' && (
                !record ? (attendance.loading ? <Loading text={tx.loading} isDark={isDark} />
                  : attendance.error && !attendance.data ? <LoadError error={attendance.error} isDark={isDark} lang={lang} onRetry={attendance.refresh} />
                  : <Empty text={tx.noAttendance} isDark={isDark} />) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    <Card isDark={isDark} className="p-6 flex flex-col items-center justify-center text-center">
                      <div className="relative w-36 h-36">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.2" className={isDark ? 'stroke-gray-700' : 'stroke-gray-200'} />
                          {/* No arc before anything is recorded: a zero-length round cap draws a dot at 12 o'clock. */}
                          {rate !== null && <motion.circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.2" strokeLinecap="round" pathLength={100} className={rate < 80 ? 'stroke-red-500' : 'stroke-blue-500'}
                            strokeDasharray="100 100" initial={{ strokeDashoffset: 100 }} animate={{ strokeDashoffset: 100 - rate }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          {rate === null && firstSession(record.sessions) ? (<>
                            <span className="text-2xl font-bold">{monthDay(firstSession(record.sessions)!, lang)}</span>
                            <span className={`text-[11px] font-bold ${muted}`}>{tx.firstClass}</span>
                          </>) : (<>
                            <span className="text-3xl font-bold">{rate === null ? '—' : `${rate}%`}</span>
                            <span className={`text-[11px] font-bold ${muted}`}>{tx.rate}</span>
                          </>)}
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-2 w-full">
                        {([[tx.attended, record.attended], [tx.absent, record.absent], [tx.other, record.other]] as const).map(([l, v]) => (
                          <div key={l} className={`rounded-2xl py-2 ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                            <div className="text-lg font-bold">{v ?? 0}</div>
                            <div className={`text-[10px] font-bold ${muted}`}>{l}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card isDark={isDark} className="p-5 sm:p-6 lg:col-span-2">
                      <div className="space-y-5">
                        {byMonth.map(([month, sessions]) => (
                          <div key={month}>
                            <div className={`text-xs font-bold mb-2 ${muted}`}>{new Date(2000, month - 1, 1).toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP', { month: 'long' })}</div>
                            <div className="flex flex-wrap gap-2">
                              {sessions.map(s => (
                                <div key={`${s.no}-${s.period}`} title={`${tx.legend[s.status]}${s.period ? ` · ${periods[s.period - 1] ?? s.period}` : ''}`}
                                  className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-sm font-bold ${STATUS_STYLE[s.status]} ${s.status === 'unrecorded' ? `border-2 border-dashed ${isDark ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-400'}` : ''}`}>
                                  {s.day}
                                  {s.period && <span className="text-[9px] font-semibold opacity-80 leading-none">{s.period}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
                        {usedStatuses.map(st => (
                          <span key={st} className={`flex items-center gap-1.5 text-[11px] font-semibold ${muted}`}>
                            <span className={`w-3 h-3 rounded ${STATUS_STYLE[st]} ${st === 'unrecorded' ? 'border border-dashed border-gray-400' : ''}`} />{tx.legend[st]}
                          </span>
                        ))}
                      </div>
                    </Card>
                  </div>
                )
              )}

              {tab === 'plan' && syl && (
                <ol className="space-y-1">
                  {syl.schedule.map((row, i) => (
                    <li key={`${row.no}-${i}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-brand-yellow text-brand-black font-bold text-sm flex items-center justify-center shrink-0">{row.no ?? i + 1}</div>
                        {i < syl.schedule.length - 1 && <div className={`w-0.5 flex-1 my-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />}
                      </div>
                      <Card isDark={isDark} className="flex-1 p-4 mb-2">
                        <div className={`text-[11px] font-bold ${muted}`}>{row.when}</div>
                        <div className="font-bold text-[15px] mt-0.5 [&_p]:font-bold [&_li]:font-semibold"><RichText text={row.topic} isDark={isDark} size="text-[15px]" /></div>
                        {row.method && <details className="mt-2"><summary className={`min-h-10 flex items-center text-xs font-bold cursor-pointer ${muted}`}>{tx.method}</summary><div className="mt-1"><RichText text={row.method} isDark={isDark} size="text-sm" /></div></details>}
                        {row.prep && <details className="mt-1"><summary className={`min-h-10 flex items-center text-xs font-bold cursor-pointer ${muted}`}>{tx.prep}</summary><div className="mt-1"><RichText text={row.prep} isDark={isDark} size="text-sm" /></div></details>}
                      </Card>
                    </li>
                  ))}
                </ol>
              )}

              {tab === 'details' && syl && (
                <div className="space-y-8">
                  {detailGroups.map(g => {
                    // Consecutive one-line values share a card; everything keeps TIPS's order.
                    const runs: Section[][] = [];
                    for (const s of g.sections) {
                      const last = runs[runs.length - 1];
                      if (isShort(s) && last && isShort(last[0])) last.push(s); else runs.push([s]);
                    }
                    return (
                      <section key={g.key}>
                        <SectionTitle>{g.title[lang] || g.title.jp}</SectionTitle>
                        {/* items-start: a short card keeps its height next to a long one. */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                          {runs.map(run => isShort(run[0]) ? (
                            <Card key={run[0].label.jp} isDark={isDark} className="p-5">
                              <dl className="space-y-3">
                                {run.map(s => (
                                  <div key={s.label.jp} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                                    <dt className={`text-xs font-bold [word-break:keep-all] ${muted}`}>{s.label[lang] || s.label.jp}</dt>
                                    <dd className="text-sm font-semibold [overflow-wrap:anywhere]">{pickLang(s.value, lang)}</dd>
                                  </div>
                                ))}
                              </dl>
                            </Card>
                          ) : (
                            <Card key={run[0].label.jp} isDark={isDark} className={`p-5 min-w-0 ${run[0].value.length > 300 ? 'md:col-span-2' : ''}`}>
                              <h3 className={`text-xs font-bold mb-2 [word-break:keep-all] ${muted}`}>{run[0].label[lang] || run[0].label.jp}</h3>
                              {run[0].value && <Expandable text={run[0].value} {...exp} />}
                              <Files files={run[0].files} syl={syl} isDark={isDark} label={tx.files} />
                            </Card>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </PageShell>
  );
}
