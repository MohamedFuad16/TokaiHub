import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, ExternalLink, CalendarClock, Upload, CheckCircle2, AlertTriangle, Loader2, X, FilePlus2 } from 'lucide-react';
import type { ScreenProps } from '../App';
import PageShell, { Card, Loading, LoadError, SectionTitle } from './ScreenHeader';
import { useTips } from '../lib/useTips';
import { openTipsFile, lmsSubmission, lmsUpload, lmsRemoveDraft, lmsSubmit, type LmsSubmissionForm } from '../lib/api';
import type { Language } from '../App';
import { LMS_ORIGIN } from '../lib/lms';

const t = {
  en: {
    loading: 'Loading the assignment from the LMS…', instructions: 'Instructions', files: 'Files from the teacher', status: 'Your submission',
    submit: 'Submit on the LMS website', submitNote: 'Opens the LMS submission page.', course: 'Open course',
  },
  jp: {
    loading: 'LMSから課題を読み込み中…', instructions: '課題の説明', files: '教員からのファイル', status: '提出状況',
    submit: 'LMSのWebサイトで提出', submitNote: 'LMSの提出ページを開きます。', course: 'コースを開く',
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
                  <SubmitPanel id={Number(id)} title={d.title} lang={lang} isDark={isDark} onDone={a.refresh} />
                  <a href={`${LMS_ORIGIN}/mod/assign/view.php?id=${id}&action=editsubmission`} target="_blank" rel="noopener noreferrer"
                    className={`mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold underline underline-offset-2 ${muted}`}>
                    <ExternalLink className="w-3.5 h-3.5" />{tx.submit}
                  </a>
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

const p = {
  en: {
    add: 'Add your file', loading: 'Opening the submission form…', choose: 'Choose a file', types: (t: string) => `Accepted: ${t}`, max: (mb: number) => `up to ${mb} MB`,
    uploading: 'Uploading…', draft: 'Ready to hand in', handIn: 'Hand in', text: 'Your answer',
    confirm: (f: string, a: string) => `Hand in ${f} for “${a}”? Your teacher will see it on the LMS.`, cancel: 'Cancel', yes: 'Hand in now', sending: 'Handing in…',
    sent: 'Handed in. The status above is from the LMS.', noFiles: 'Add a file first.',
  },
  jp: {
    add: 'ファイルを追加', loading: '提出フォームを開いています…', choose: 'ファイルを選択', types: (t: string) => `提出できる形式: ${t}`, max: (mb: number) => `最大${mb}MB`,
    uploading: 'アップロード中…', draft: '提出するファイル', handIn: '提出する', text: '回答',
    confirm: (f: string, a: string) => `「${a}」に${f}を提出しますか？LMS上で教員に表示されます。`, cancel: 'キャンセル', yes: '今すぐ提出', sending: '提出中…',
    sent: '提出しました。上の状況はLMSから取得しています。', noFiles: '先にファイルを追加してください。',
  },
};

/**
 * In-app submission: the file goes into the LMS form's draft area first (nothing handed in), then
 * a separate confirmation posts the form. The confirmation names the file and the assignment.
 */
function SubmitPanel({ id, title, lang, isDark, onDone }: { id: number; title: string; lang: Language; isDark: boolean; onDone: () => void }) {
  const tx = p[lang];
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const [form, setForm] = useState<LmsSubmissionForm | null>(null);
  const [busy, setBusy] = useState<null | 'open' | 'upload' | 'send'>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const run = async <T,>(kind: 'open' | 'upload' | 'send', fn: () => Promise<T>) => {
    setBusy(kind); setError(null);
    try { return await fn(); } catch (e) { setError((e as Error).message); return null; } finally { setBusy(null); }
  };
  const open = () => run('open', async () => { const f = await lmsSubmission(id); setForm(f); setText(f.text); });
  const pick = async (file: File | undefined) => {
    if (!file) return;
    const r = await run('upload', () => lmsUpload(id, file));
    if (r && form) setForm({ ...form, files: r.files });
  };
  const remove = async (name: string) => {
    const r = await run('upload', () => lmsRemoveDraft(id, name));
    if (r && form) setForm({ ...form, files: r.files });
  };
  const send = async () => {
    const r = await run('send', () => lmsSubmit(id, form?.hasText ? text : undefined));
    setAsking(false);
    if (r) { setSent(true); onDone(); }
  };
  const btn = `w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white'}`;
  const soft = `w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`;
  const ready = !!form && ((form.takesFiles && form.files.length > 0) || (form.hasText && text.trim().length > 0));

  if (sent) return <p className={`mt-4 text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}><CheckCircle2 className="w-4 h-4" />{tx.sent}</p>;
  return (
    <div className="mt-4 space-y-2.5">
      {!form && <button onClick={open} disabled={!!busy} className={btn}>{busy === 'open' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{busy === 'open' ? tx.loading : tx.add}</button>}
      {form && (
        <>
          {form.takesFiles && (
            <>
              {form.files.length > 0 && <div className={`text-[11px] font-bold ${muted}`}>{tx.draft}</div>}
              {form.files.map(f => (
                <div key={f.name} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold ${isDark ? 'bg-gray-700/60' : 'bg-white'}`}>
                  <FilePlus2 className="w-4 h-4 text-brand-yellow shrink-0" /><span className="flex-1 min-w-0 truncate">{f.name}</span>
                  <button onClick={() => remove(f.name)} disabled={!!busy} aria-label="Remove" className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
              ))}
              {form.files.length < form.maxFiles && (
                <>
                  <input ref={picker} type="file" className="hidden" accept={form.accepted.join(',') || undefined} onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
                  <button onClick={() => picker.current?.click()} disabled={!!busy} className={soft}>
                    {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}{busy === 'upload' ? tx.uploading : tx.choose}
                  </button>
                  <p className={`text-[11px] font-medium ${muted}`}>{[form.accepted.length ? tx.types(form.accepted.join(', ')) : '', form.maxBytes ? tx.max(Math.round(form.maxBytes / 1_048_576)) : ''].filter(Boolean).join(' · ')}</p>
                </>
              )}
            </>
          )}
          {form.hasText && (
            <label className="block">
              <span className={`text-[11px] font-bold ${muted}`}>{tx.text}</span>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={6} className={`mt-1 w-full rounded-xl p-3 text-sm ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`} />
            </label>
          )}
          {!asking ? (
            <button onClick={() => (ready ? setAsking(true) : setError(tx.noFiles))} disabled={!!busy} className={btn}><Upload className="w-4 h-4" />{tx.handIn}</button>
          ) : (
            <div className={`rounded-xl p-3 space-y-2.5 ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
              <p className={`text-sm font-semibold ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>{tx.confirm(form.files.map(f => f.name).join(', ') || tx.text, title)}</p>
              <div className="flex gap-2">
                <button onClick={() => setAsking(false)} disabled={busy === 'send'} className={soft}>{tx.cancel}</button>
                <button onClick={send} disabled={busy === 'send'} className={btn}>{busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{busy === 'send' ? tx.sending : tx.yes}</button>
              </div>
            </div>
          )}
        </>
      )}
      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
}
