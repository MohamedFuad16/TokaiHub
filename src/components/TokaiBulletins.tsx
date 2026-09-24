import React, { useMemo, useState } from 'react';
import { ChevronRight, Paperclip, Mail, ExternalLink } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenProps } from '../App';
import PageShell, { Card, Pill, Select, Skeleton, Loading, LoadError, Empty, SearchField, since, EASE } from './ScreenHeader';
import { RichText, Linked, FileLink } from './SyllabusText';
import { useTips } from '../lib/useTips';
import type { TipsBulletinDetail, TipsBulletins } from '../lib/types';

const t = {
  en: {
    title: 'Bulletins', search: 'Search titles or senders…', all: 'All', notice: 'Notices', personal: 'Personal', unread: 'Unread only',
    genre: 'All genres', newest: 'Newest first', oldest: 'Oldest first', none: 'No posts match these filters.', loading: 'Loading bulletins from TIPS…',
    opening: 'Opening post…', attachments: 'Attachments', openTips: 'Open TIPS bulletin board', readNote: 'Opening a post marks it as read in TIPS too.',
    count: (n: number, u: number) => `${n} posts · ${u} unread`, period: 'Posting period',
  },
  jp: {
    title: '掲示板', search: '表題・掲載者で検索…', all: 'すべて', notice: 'お知らせ', personal: '個人連絡', unread: '未読のみ',
    genre: 'すべてのジャンル', newest: '新しい順', oldest: '古い順', none: '条件に合う掲示はありません。', loading: 'TIPSから掲示を読み込み中…',
    opening: '掲示を開いています…', attachments: '添付ファイル', openTips: 'TIPSの掲示板を開く', readNote: '掲示を開くとTIPS上でも既読になります。',
    count: (n: number, u: number) => `${n}件 · 未読${u}件`, period: '掲示期間',
  },
};

function Detail(props: ScreenProps & { id: string }) {
  const { lang, settings, id } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const post = useTips<TipsBulletinDetail>('bulletin', { id });
  const d = post.data;
  return (
    <PageShell {...props} title={d?.genre || tx.title} back>
      {!d && (post.error ? <LoadError error={post.error} isDark={isDark} lang={lang} onRetry={post.refresh} /> : (
        <div className="max-w-3xl">
          <Loading text={tx.opening} isDark={isDark} rows={0} />
          <Skeleton isDark={isDark} className="h-8 w-4/5 rounded-xl" />
          <Skeleton isDark={isDark} className="mt-3 h-4 w-1/3 rounded-lg" />
          <Skeleton isDark={isDark} className="mt-6 h-64 rounded-3xl" />
        </div>
      ))}
      {d && (
        <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="max-w-3xl">
          <h2 className="text-[24px] sm:text-[30px] font-bold leading-tight tracking-tight break-words [overflow-wrap:anywhere]">{d.title}</h2>
          <p className={`text-xs font-semibold mt-3 ${muted}`}>{[d.poster, d.postedAt].filter(Boolean).join(' · ')}</p>
          <Card isDark={isDark} className="mt-6 p-5 sm:p-6">
            {/* keepLines: posts are laid out line by line (dates, venues), unlike syllabus prose. */}
            <RichText text={d.body} isDark={isDark} keepLines />
          </Card>
          {d.contact && (
            <p className="mt-4 flex items-start gap-2 text-sm font-semibold break-words [overflow-wrap:anywhere]">
              <Mail className={`w-4 h-4 mt-0.5 shrink-0 ${muted}`} /><span className="min-w-0"><Linked text={d.contact} isDark={isDark} /></span>
            </p>
          )}
          {d.attachments.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className={`text-xs font-bold ${muted}`}>{tx.attachments}</div>
              {d.attachments.map((a, i) => typeof a === 'string'
                // Copy cached before the bridge kept each file's TIPS index: name only.
                ? <Card key={a} isDark={isDark} className="flex items-center gap-3 p-3 text-sm font-medium"><Paperclip className="w-4 h-4 shrink-0" />{a}</Card>
                : <FileLink key={`${a.index}-${i}`} name={a.name} isDark={isDark} file={{ kind: 'bulletin', id, index: a.index }} />)}
              {d.attachments.some(a => typeof a === 'string') && (
                <a href="https://tips.u-tokai.ac.jp/campusweb/campussquare.do?_flowId=KJW0001100-flow" target="_blank" rel="noopener noreferrer" className={`h-10 inline-flex items-center gap-1.5 text-xs font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}><ExternalLink className="w-3.5 h-3.5" />{tx.openTips}</a>
              )}
            </div>
          )}
        </motion.article>
      )}
    </PageShell>
  );
}

export default function TokaiBulletins(props: ScreenProps) {
  const { id } = useParams();
  if (id) return <Detail {...props} id={id} />;
  return <List {...props} />;
}

function List(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const navigate = useNavigate();
  const isDark = settings.isDarkMode;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const list = useTips<TipsBulletins>('bulletins');
  const [category, setCategory] = useState<'all' | 'notice' | 'personal'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [genre, setGenre] = useState('');
  const [order, setOrder] = useState<'new' | 'old'>('new');
  const [q, setQ] = useState('');

  const all = useMemo(() => list.data?.posts ?? [], [list.data]);
  const genres = useMemo(() => [...new Set(all.map(p => p.genre))].sort(), [all]);
  const unreadCount = all.filter(p => p.unread).length;
  const posts = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = all.filter(p =>
      (category === 'all' || p.category === category) && (!unreadOnly || p.unread) && (!genre || p.genre === genre) &&
      (!s || p.title.toLowerCase().includes(s) || p.poster.toLowerCase().includes(s)));
    return order === 'new' ? out : [...out].reverse();
  }, [all, category, unreadOnly, genre, order, q]);

  return (
    <PageShell {...props} title={tx.title} subtitle={list.data ? `${tx.count(all.length, unreadCount)} · ${since(list.cachedAt, lang)}` : undefined} onRefresh={list.refresh} refreshing={list.loading}>
      <SearchField value={q} onChange={setQ} placeholder={tx.search} isDark={isDark} />
      {/* Phone: chips scroll sideways in one row and the two selects share the next; wider screens fit one row. */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mb-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {(['all', 'notice', 'personal'] as const).map(c => <Pill key={c} layoutId="bulletin-category" active={category === c} isDark={isDark} onClick={() => setCategory(c)}>{tx[c]}</Pill>)}
          <Pill active={unreadOnly} isDark={isDark} onClick={() => setUnreadOnly(u => !u)}>
            {tx.unread}{unreadCount > 0 && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${unreadOnly && isDark ? 'bg-brand-black text-white' : 'bg-brand-yellow text-brand-black'}`}>{unreadCount}</span>}
          </Pill>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={genre} onChange={setGenre} isDark={isDark} label={tx.genre} className="min-w-0 sm:max-w-[240px]">
            <option value="">{tx.genre}</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </Select>
          <Select value={order} onChange={v => setOrder(v as 'new' | 'old')} isDark={isDark} label={tx.newest} className="min-w-0">
            <option value="new">{tx.newest}</option>
            <option value="old">{tx.oldest}</option>
          </Select>
        </div>
      </div>

      {!list.data && (list.error ? <LoadError error={list.error} isDark={isDark} lang={lang} onRetry={list.refresh} /> : <Loading text={tx.loading} isDark={isDark} />)}
      {list.data && posts.length === 0 && <Empty text={tx.none} isDark={isDark} />}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
        {posts.map((p, i) => (
          // layout: when a filter hides posts, the rest slide up instead of snapping.
          <motion.button
            key={p.id}
            layout="position"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.25, delay: Math.min(i * 0.02, 0.24), ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ layout: { type: 'spring', stiffness: 450, damping: 42 } }}
            whileTap={{ scale: 0.985 }}
            onClick={() => navigate(`/bulletins/${p.id}`)}
            className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${p.unread ? 'bg-brand-yellow' : 'bg-transparent'}`} aria-hidden />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.category === 'personal' ? 'bg-brand-pink text-brand-black' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>{p.genre}</span>
                <span className={`text-[11px] font-semibold ${muted}`}>{p.postedAt}</span>
              </div>
              <div className={`text-sm leading-snug line-clamp-2 ${p.unread ? 'font-bold' : 'font-semibold'}`}>{p.title}</div>
              <div className={`text-xs font-medium mt-1 truncate ${muted}`}>{p.poster}</div>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 ${muted}`} />
          </motion.button>
        ))}
        </AnimatePresence>
      </div>
      {list.data && <p className={`pt-4 text-[11px] font-medium ${muted}`}>{tx.readNote}</p>}
    </PageShell>
  );
}
