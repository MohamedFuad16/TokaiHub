import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, ExternalLink, CalendarClock, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ScreenProps } from '../App';
import PageShell, { Card, Loading, LoadError, SectionTitle } from './ScreenHeader';
import { useTips } from '../lib/useTips';
import { openTipsFile } from '../lib/api';
import { LMS_ORIGIN } from '../lib/lms';

const t = {
  en: {
    loading: 'Loading the assignment from the LMS…', instructions: 'Instructions', files: 'Files from the teacher', status: 'Your submission',
    submit: 'Submit on the LMS', submitNote: 'Opens the LMS submission page.', course: 'Open course',
  },
  jp: {
    loading: 'LMSから課題を読み込み中…', instructions: '課題の説明', files: '教員からのファイル', status: '提出状況',
    submit: 'LMSで提出する', submitNote: 'LMSの提出ページを開きます。', course: 'コースを開く',
  },
};

interface Assign {
  title: string; course: { title: string; id: number } | null; dates: { label: string; text: string }[];
  intro: string[]; links: { text: string; href: string }[]; files: { name: string; href: string }[];
  status: { label: string; value: string; files: { name: string; href: string }[] }[]; submitted: boolean; canSubmit: boolean;
}

/** An LMS assignment: due date, status, the teacher's instructions and files. */
export default function LmsAssign(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const navigate = useNavigate();
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const id = useParams().id ?? '';
  const a = useTips<Assign>('lms-assign', { id }, { enabled: /^\d+$/.test(id) });
  const d = a.data;
  const fileRow = (f: { name: string; href: string }) => (
    <button key={f.href} onClick={() => openTipsFile({ kind: 'lms', lmsUrl: f.href })}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${isDark ? 'bg-gray-700/60 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}`}>
      <Download className="w-4 h-4 shrink-0 text-brand-yellow" /><span className="flex-1 min-w-0 truncate">{f.name}</span>
    </button>
  );
  // The status table's first row says submitted or not; colour it so it reads at a glance.
  const statusTone = (label: string) =>
    /提出ステータス|Submission status/i.test(label) ? (d?.submitted ? (isDark ? 'text-green-400' : 'text-green-700') : 'text-red-500') : '';

  return (
    <PageShell {...props} title={d?.title || (lang === 'en' ? 'Assignment' : '課題')} subtitle={d?.course?.title} back onRefresh={a.refresh} refreshing={a.loading}>
      {!d && (a.error ? <LoadError error={a.error} isDark={isDark} lang={lang} onRetry={a.refresh} /> : <Loading text={tx.loading} isDark={isDark} />)}
      {d && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="space-y-4 lg:col-span-2">
            {d.dates.length > 0 && (
              <Card isDark={isDark} className="p-4 flex flex-wrap gap-x-6 gap-y-2">
                {d.dates.map(x => (
                  <div key={x.label} className="flex items-center gap-2 text-sm">
                    <CalendarClock className="w-4 h-4 text-brand-yellow shrink-0" />
                    <span className={`font-semibold ${muted}`}>{x.label}</span><span className="font-bold">{x.text}</span>
                  </div>
                ))}
              </Card>
            )}
            <Card isDark={isDark} className="p-5">
              <SectionTitle>{tx.instructions}</SectionTitle>
              <div className="space-y-2 text-sm leading-relaxed">
                {d.intro.map((line, i) => <p key={i} className="break-words">{line}</p>)}
              </div>
              {d.links.length > 0 && (
                <div className="mt-3 space-y-1">
                  {d.links.map(l => (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-sm font-semibold underline underline-offset-2 break-all ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />{l.text || l.href}
                    </a>
                  ))}
                </div>
              )}
            </Card>
            {d.files.length > 0 && (
              <Card isDark={isDark} className="p-5"><SectionTitle>{tx.files}</SectionTitle><div className="space-y-1.5">{d.files.map(fileRow)}</div></Card>
            )}
          </div>
          <div className="space-y-4">
            <Card isDark={isDark} className="p-5">
              <div className="flex items-center gap-2 mb-3 font-bold">
                {d.submitted ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}{tx.status}
              </div>
              <dl className="space-y-2.5">
                {d.status.map(r => (
                  <div key={r.label}>
                    <dt className={`text-[11px] font-bold ${muted}`}>{r.label}</dt>
                    <dd className={`text-sm font-semibold break-words ${statusTone(r.label)}`}>{r.value || '—'}</dd>
                    {r.files.length > 0 && <div className="mt-1.5 space-y-1">{r.files.map(fileRow)}</div>}
                  </div>
                ))}
              </dl>
              {d.canSubmit && (
                <>
                  <a href={`${LMS_ORIGIN}/mod/assign/view.php?id=${id}&action=editsubmission`} target="_blank" rel="noopener noreferrer"
                    className={`mt-4 w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white'}`}>
                    <Upload className="w-4 h-4" />{tx.submit}
                  </a>
                  <p className={`mt-1.5 text-[11px] font-medium ${muted}`}>{tx.submitNote}</p>
                </>
              )}
            </Card>
            {d.course && (
              <button onClick={() => navigate(`/lms/course/${d.course!.id}`)} className={`w-full h-11 rounded-xl text-sm font-bold ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>{tx.course}</button>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
