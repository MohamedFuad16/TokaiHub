import React from 'react';
import { FileText, CalendarClock, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { ScreenProps } from '../App';
import PageShell, { Card, SectionTitle, Loading, Empty, since } from './ScreenHeader';
import { useTips } from '../lib/useTips';
import { useTimetable } from '../lib/useTerm';
import { termLabel, academicYearOf } from '../lib/tipsAdapters';
import type { TipsExam, TipsReport } from '../lib/types';

const t = {
  en: {
    title: 'Reports & Exams', reports: 'Reports', exams: 'Exam timetable', noReports: 'No reports are open on TIPS right now.',
    noExams: 'No exam timetable published for this term.', submitted: 'Submitted', due: 'Not submitted', deadline: 'Deadline',
    allowed: 'Allowed', submit: 'Submit reports on TIPS', loading: 'Loading from TIPS…',
  },
  jp: {
    title: 'レポート・試験', reports: 'レポート', exams: '定期試験時間割', noReports: '現在TIPSで公開中のレポートはありません。',
    noExams: 'この学期の試験時間割はまだ公開されていません。', submitted: '提出済', due: '未提出', deadline: '提出期限',
    allowed: '持込', submit: 'レポートの提出はTIPSで', loading: 'TIPSから読み込み中…',
  },
};

export default function TokaiTasks(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const tt = useTimetable();
  const year = tt.timetable?.year ?? academicYearOf(new Date());
  const term = tt.timetable?.term ?? '1';
  const reports = useTips<{ courseReports: TipsReport[]; generalReports: TipsReport[] }>('reports');
  const exams = useTips<TipsExam[]>('exams', { year, term }, { enabled: !!tt.timetable });
  const allReports = [...(reports.data?.courseReports ?? []), ...(reports.data?.generalReports ?? [])];

  return (
    <PageShell {...props} title={tx.title} subtitle={since(reports.cachedAt, lang) || undefined} onRefresh={() => { reports.refresh(); exams.refresh(); }} refreshing={reports.loading || exams.loading}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <SectionTitle><FileText className="w-4 h-4" />{tx.reports}</SectionTitle>
          {!reports.data ? <Loading text={tx.loading} isDark={isDark} /> : allReports.length === 0 ? <Empty text={tx.noReports} isDark={isDark} /> : (
            <div className="space-y-2">
              {allReports.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Card isDark={isDark} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">{r.title}</div>
                        <div className={`text-xs font-medium mt-1 ${muted}`}>{[r.slot, r.course, r.teacher].filter(Boolean).join(' · ')}</div>
                      </div>
                      <span className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg ${r.submittedAt ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>{r.submittedAt ? tx.submitted : tx.due}</span>
                    </div>
                    <div className={`text-xs font-bold mt-2 ${muted}`}>{tx.deadline}: {r.deadline || '—'}</div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          <a href="https://tips.u-tokai.ac.jp/campusweb/campussquare.do?_flowId=RMW0001000-flow" target="_blank" rel="noreferrer" className={`mt-3 inline-flex items-center gap-1.5 text-xs font-bold ${isDark ? 'text-brand-yellow' : 'text-blue-600'}`}>
            <ExternalLink className="w-3.5 h-3.5" />{tx.submit}
          </a>
        </section>

        <section>
          <SectionTitle right={<span className={`text-xs font-semibold ${muted}`}>{termLabel(term, year, lang)}</span>}><CalendarClock className="w-4 h-4" />{tx.exams}</SectionTitle>
          {!exams.data ? <Loading text={tx.loading} isDark={isDark} /> : exams.data.length === 0 ? <Empty text={tx.noExams} isDark={isDark} /> : (
            <div className="space-y-2">
              {exams.data.map((e, i) => (
                <Card key={i} isDark={isDark} className="flex gap-4 p-4">
                  <div className="w-16 shrink-0 text-center">
                    <div className="text-sm font-bold">{e.date}</div>
                    <div className={`text-[10px] font-bold ${muted}`}>{e.weekday} {e.period}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{e.title}</div>
                    <div className={`text-xs font-medium mt-0.5 ${muted}`}>{[e.room, e.teacher].filter(Boolean).join(' · ')}</div>
                    {e.allowed && <div className={`text-xs mt-1 ${muted}`}>{tx.allowed}: {e.allowed}</div>}
                    {e.notes && <div className="text-xs mt-1 font-semibold">{e.notes}</div>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
