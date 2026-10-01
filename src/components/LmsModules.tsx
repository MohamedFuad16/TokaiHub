import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight, Download, ExternalLink, Pin, CalendarClock, Folder as FolderIcon, ImageOff } from 'lucide-react';
import type { Language, ScreenProps } from '../App';
import PageShell, { Card, Loading, LoadError, Empty, SectionTitle, rise } from './ScreenHeader';
import { RichText } from './SyllabusText';
import { useTips } from '../lib/useTips';
import { openTipsFile, lmsImageUrl } from '../lib/api';
import { LMS_ORIGIN } from '../lib/lms';
import { dueText } from './lmsShared';

export type Block = { t: 'text'; text: string } | { t: 'img'; src: string; alt: string } | { t: 'file'; name: string; href: string };

const t = {
  en: {
    loading: 'Loading from the LMS…', noPosts: 'Nothing posted yet.', noFiles: 'This folder is empty.', open: 'Open',
    attachments: 'Attachments', posted: 'Posted', quizOpen: 'Take the quiz on the LMS', quizNote: 'Quizzes run on the LMS website (timer and questions).',
    attempts: 'Your attempts', noAttempts: 'No attempts yet.', closed: 'This quiz is closed.', imageFailed: 'Image could not load',
  },
  jp: {
    loading: 'LMSから読み込み中…', noPosts: 'まだ投稿はありません。', noFiles: 'このフォルダは空です。', open: '開く',
    attachments: '添付ファイル', posted: '投稿', quizOpen: 'LMSで小テストを受験', quizNote: '小テストはLMSのWebサイトで受験します（タイマーと設問）。',
    attempts: '受験履歴', noAttempts: 'まだ受験していません。', closed: 'この小テストは終了しています。', imageFailed: '画像を読み込めませんでした',
  },
};

/** An LMS image, fetched through the bridge (it needs the device token). Tap opens it full size. */
function LmsImage({ src, alt, isDark, lang }: { src: string; alt: string; isDark: boolean; lang: Language }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const ctl = new AbortController();
    let made: string | null = null;
    lmsImageUrl(src, ctl.signal).then(u => { made = u; setUrl(u); }).catch(() => { if (!ctl.signal.aborted) setFailed(true); });
    return () => { ctl.abort(); if (made) URL.revokeObjectURL(made); };
  }, [src]);
  if (failed) return <p className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><ImageOff className="w-4 h-4" />{t[lang].imageFailed}</p>;
  if (!url) return <div className={`w-full h-48 rounded-2xl animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />;
  return (
    <button onClick={() => openTipsFile({ kind: 'lms', lmsUrl: src })} className="block w-full">
      <img src={url} alt={alt} className="w-full h-auto rounded-2xl" />
    </button>
  );
}

const fileButton = (name: string, href: string, isDark: boolean) => (
  <button key={href} onClick={() => openTipsFile({ kind: 'lms', lmsUrl: href })}
    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${isDark ? 'bg-gray-700/60 hover:bg-gray-700' : 'bg-white hover:bg-gray-100 border border-gray-100'}`}>
    <Download className="w-4 h-4 shrink-0 text-brand-yellow" /><span className="flex-1 min-w-0 truncate">{name}</span>
  </button>
);

/** LMS rich text: paragraphs with live links, images, attached files. */
export function Blocks({ blocks, isDark, lang }: { blocks: Block[]; isDark: boolean; lang: Language }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div key={i}>
          {b.t === 'text' ? <RichText text={b.text} isDark={isDark} keepLines />
            : b.t === 'img' ? <LmsImage src={b.src} alt={b.alt} isDark={isDark} lang={lang} />
              : fileButton(b.name, b.href, isDark)}
        </div>
      ))}
    </div>
  );
}

const when = (unix: number | null, lang: Language) => (unix ? dueText(unix, lang) : '');

// ── Forum: the discussion list ─────────────────────────────────────────────────────────────
interface Discussion { id: number; subject: string; author: string; created: number | null; lastPost: number | null; pinned: boolean }

export function LmsForum(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const navigate = useNavigate();
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const id = useParams().id ?? '';
  const f = useTips<{ title: string; discussions: Discussion[] }>('lms-forum', { id }, { enabled: /^\d+$/.test(id) });
  return (
    <PageShell {...props} title={f.data?.title || (lang === 'en' ? 'Forum' : 'フォーラム')} back onRefresh={f.refresh} refreshing={f.loading}>
      {!f.data && (f.error ? <LoadError error={f.error} isDark={isDark} lang={lang} onRetry={f.refresh} /> : <Loading text={tx.loading} isDark={isDark} />)}
      {f.data && f.data.discussions.length === 0 && <Empty text={tx.noPosts} isDark={isDark} />}
      <div className="space-y-2">
        {f.data?.discussions.map((d, k) => (
          <motion.button key={d.id} {...rise(k)} onClick={() => navigate(`/lms/discussion/${d.id}`)}
            className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
            {d.pinned && <Pin className="w-4 h-4 shrink-0 text-brand-yellow" />}
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold leading-snug line-clamp-2">{d.subject}</span>
              <span className={`block text-xs font-medium mt-0.5 ${muted}`}>{[d.author, when(d.lastPost ?? d.created, lang)].filter(Boolean).join(' · ')}</span>
            </span>
            <ChevronRight className={`w-4 h-4 shrink-0 ${muted}`} />
          </motion.button>
        ))}
      </div>
    </PageShell>
  );
}

// ── Forum: one discussion ──────────────────────────────────────────────────────────────────
interface Post { id: number; subject: string; author: string; created: number; parentId: number | null; blocks: Block[]; attachments: { name: string; href: string }[] }

export function LmsDiscussion(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const id = useParams().id ?? '';
  const d = useTips<{ posts: Post[] }>('lms-discussion', { id }, { enabled: /^\d+$/.test(id) });
  const first = d.data?.posts[0];
  return (
    <PageShell {...props} title={first?.subject || (lang === 'en' ? 'Discussion' : 'ディスカッション')} back onRefresh={d.refresh} refreshing={d.loading}>
      {!d.data && (d.error ? <LoadError error={d.error} isDark={isDark} lang={lang} onRetry={d.refresh} /> : <Loading text={tx.loading} isDark={isDark} />)}
      <div className="space-y-3 max-w-3xl">
        {d.data?.posts.map((p, k) => (
          <motion.div key={p.id} {...rise(k)}>
            <Card isDark={isDark} className={`p-5 ${p.parentId ? 'ml-4 sm:ml-8' : ''}`}>
              {k > 0 && <div className="font-bold text-sm mb-1">{p.subject}</div>}
              <div className={`text-xs font-semibold mb-3 ${muted}`}>{p.author} · {when(p.created, lang)}</div>
              <Blocks blocks={p.blocks} isDark={isDark} lang={lang} />
              {p.attachments.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <div className={`text-[11px] font-bold ${muted}`}>{tx.attachments}</div>
                  {p.attachments.map(a => fileButton(a.name, a.href, isDark))}
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
}

// ── Folder ─────────────────────────────────────────────────────────────────────────────────
export function LmsFolder(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const id = useParams().id ?? '';
  const f = useTips<{ title: string; intro: string[]; files: { name: string; href: string; path: string }[] }>('lms-folder', { id }, { enabled: /^\d+$/.test(id) });
  const groups = new Map<string, { name: string; href: string }[]>();
  for (const file of f.data?.files ?? []) groups.set(file.path, [...(groups.get(file.path) ?? []), file]);
  return (
    <PageShell {...props} title={f.data?.title || (lang === 'en' ? 'Folder' : 'フォルダ')} back onRefresh={f.refresh} refreshing={f.loading}>
      {!f.data && (f.error ? <LoadError error={f.error} isDark={isDark} lang={lang} onRetry={f.refresh} /> : <Loading text={tx.loading} isDark={isDark} />)}
      {f.data && f.data.intro.length > 0 && <Card isDark={isDark} className="p-5 mb-4"><RichText text={f.data.intro.join('\n')} isDark={isDark} keepLines /></Card>}
      {f.data && f.data.files.length === 0 && <Empty text={tx.noFiles} isDark={isDark} />}
      <div className="space-y-4 max-w-3xl">
        {[...groups].map(([path, files]) => (
          <div key={path || '/'}>
            {path && <div className={`flex items-center gap-1.5 text-xs font-bold mb-1.5 ${muted}`}><FolderIcon className="w-3.5 h-3.5" />{path}</div>}
            <div className="space-y-1.5">{files.map(file => fileButton(file.name, file.href, isDark))}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────────────────
export function LmsPage(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const id = useParams().id ?? '';
  const p = useTips<{ title: string; blocks: Block[]; modified: string }>('lms-page', { id }, { enabled: /^\d+$/.test(id) });
  return (
    <PageShell {...props} title={p.data?.title || (lang === 'en' ? 'Page' : 'ページ')} back onRefresh={p.refresh} refreshing={p.loading}>
      {!p.data && (p.error ? <LoadError error={p.error} isDark={isDark} lang={lang} onRetry={p.refresh} /> : <Loading text={tx.loading} isDark={isDark} />)}
      {p.data && (
        <Card isDark={isDark} className="p-5 max-w-3xl">
          <Blocks blocks={p.data.blocks} isDark={isDark} lang={lang} />
          {p.data.modified && <p className={`mt-4 text-[11px] font-semibold ${muted}`}>{p.data.modified}</p>}
        </Card>
      )}
    </PageShell>
  );
}

// ── Quiz ───────────────────────────────────────────────────────────────────────────────────
interface Quiz {
  title: string; dates: { label: string; text: string }[]; info: string[]; intro: string[];
  attempts: { head: string[]; rows: string[][] }; feedback: string; canAttempt: boolean; attemptLabel: string; notice: string;
}

/** A quiz's facts and your attempts. Answering happens on the LMS (timer, question types). */
export function LmsQuiz(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const id = useParams().id ?? '';
  const q = useTips<Quiz>('lms-quiz', { id }, { enabled: /^\d+$/.test(id) });
  const d = q.data;
  return (
    <PageShell {...props} title={d?.title || (lang === 'en' ? 'Quiz' : '小テスト')} back onRefresh={q.refresh} refreshing={q.loading}>
      {!d && (q.error ? <LoadError error={q.error} isDark={isDark} lang={lang} onRetry={q.refresh} /> : <Loading text={tx.loading} isDark={isDark} />)}
      {d && (
        <div className="space-y-4 max-w-3xl">
          {(d.dates.length > 0 || d.info.length > 0) && (
            <Card isDark={isDark} className="p-4 space-y-1.5">
              {d.dates.map(x => (
                <div key={x.label} className="flex items-center gap-2 text-sm"><CalendarClock className="w-4 h-4 text-brand-yellow shrink-0" /><span className={`font-semibold ${muted}`}>{x.label}</span><span className="font-bold">{x.text}</span></div>
              ))}
              {d.info.map(line => <div key={line} className="text-sm font-semibold">{line}</div>)}
            </Card>
          )}
          {d.intro.length > 0 && <Card isDark={isDark} className="p-5"><RichText text={d.intro.join('\n')} isDark={isDark} keepLines /></Card>}
          <Card isDark={isDark} className="p-5">
            <SectionTitle>{tx.attempts}</SectionTitle>
            {d.attempts.rows.length === 0 ? <p className={`text-sm font-medium ${muted}`}>{tx.noAttempts}</p> : (
              <div className="space-y-2">
                {d.attempts.rows.map((r, i) => (
                  <dl key={i} className={`rounded-xl p-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs ${isDark ? 'bg-gray-700/60' : 'bg-white'}`}>
                    {r.map((cell, c) => cell && <React.Fragment key={c}><dt className={`font-bold ${muted}`}>{d.attempts.head[c] ?? ''}</dt><dd className="font-semibold break-words">{cell}</dd></React.Fragment>)}
                  </dl>
                ))}
              </div>
            )}
            {d.feedback && <p className="mt-3 text-sm font-semibold">{d.feedback}</p>}
            {d.notice && <p className={`mt-3 text-sm font-semibold ${muted}`}>{d.notice}</p>}
            {d.canAttempt ? (
              <>
                <a href={`${LMS_ORIGIN}/mod/quiz/view.php?id=${id}`} target="_blank" rel="noopener noreferrer"
                  className={`mt-4 w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white'}`}>
                  <ExternalLink className="w-4 h-4" />{tx.quizOpen}
                </a>
                <p className={`mt-1.5 text-[11px] font-medium ${muted}`}>{tx.quizNote}</p>
              </>
            ) : !d.notice && <p className={`mt-3 text-sm font-semibold ${muted}`}>{tx.closed}</p>}
          </Card>
        </div>
      )}
    </PageShell>
  );
}
