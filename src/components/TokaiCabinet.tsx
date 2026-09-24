import React, { useMemo, useState } from 'react';
import { Folder, FolderOpen, FileText, ExternalLink, Download, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenProps } from '../App';
import PageShell, { Loading, LoadError, Empty, SearchField, since, EASE } from './ScreenHeader';
import { Linked } from './SyllabusText';
import { useTips } from '../lib/useTips';
import { tipsFileUrl, openTipsFile } from '../lib/api';
import type { TipsCabinetFile, TipsCabinetFolder } from '../lib/types';

const t = {
  en: { title: 'Cabinet', search: 'Search files and folders…', loading: 'Loading the cabinet from TIPS…', empty: 'No files.', none: 'Nothing matches.', files: (n: number) => `${n} file${n === 1 ? '' : 's'}`, external: 'Opens outside TIPS' },
  jp: { title: 'キャビネット', search: 'ファイル・フォルダを検索…', loading: 'TIPSからキャビネットを読み込み中…', empty: 'ファイルはありません。', none: '該当するものはありません。', files: (n: number) => `${n}件`, external: 'TIPS外のリンク' },
};

const countFiles = (f: TipsCabinetFolder): number => f.files.length + f.children.reduce((a, c) => a + countFiles(c), 0);

/**
 * One file. The name is the link, stretched over the whole row; addresses in the summary are
 * links of their own above it (a link cannot sit inside another link).
 */
export const FileRow: React.FC<{ f: TipsCabinetFile; isDark: boolean; lang: 'en' | 'jp' }> = ({ f, isDark, lang }) => {
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const ref = { url: f.url, fileId: f.fileId, folderId: f.folderId };
  return (
    <div className={`relative flex items-start gap-3 p-3 rounded-2xl transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-white'}`}>
      <FileText className="w-4 h-4 mt-0.5 shrink-0 text-brand-yellow" />
      <div className="flex-1 min-w-0">
        <a href={tipsFileUrl(ref)} target="_blank" rel="noopener noreferrer" onClick={e => { e.preventDefault(); openTipsFile(ref); }}
          className="block text-sm font-semibold leading-snug break-words [overflow-wrap:anywhere] outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-brand-yellow">
          {f.name}
        </a>
        {(f.date || f.summary) && (
          <div className={`relative z-10 w-fit max-w-full text-[11px] font-medium mt-0.5 break-words [overflow-wrap:anywhere] ${muted}`}>
            {f.date}{f.date && f.summary ? ' · ' : ''}{f.summary && <Linked text={f.summary} isDark={isDark} />}
          </div>
        )}
      </div>
      {f.url ? <ExternalLink className={`w-4 h-4 shrink-0 ${muted}`} aria-label={t[lang].external} /> : <Download className={`w-4 h-4 shrink-0 ${muted}`} />}
    </div>
  );
};

const FolderNode: React.FC<{ f: TipsCabinetFolder; depth: number; isDark: boolean; lang: 'en' | 'jp'; forceOpen: boolean }> = ({ f, depth, isDark, lang, forceOpen }) => {
  const [open, setOpen] = useState(false);
  const isOpen = open || forceOpen;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const n = countFiles(f);
  return (
    <div className={depth === 0 ? `rounded-3xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-2` : 'pl-3'}>
      <motion.button whileTap={{ scale: 0.985 }} onClick={() => setOpen(o => !o)} aria-expanded={isOpen} className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-white'}`}>
        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${muted}`} />
        {isOpen ? <FolderOpen className="w-5 h-5 shrink-0 text-brand-yellow" /> : <Folder className="w-5 h-5 shrink-0 text-brand-yellow" />}
        <div className="flex-1 min-w-0">
          <div className={`font-bold leading-snug break-words [overflow-wrap:anywhere] ${depth === 0 ? 'text-[15px]' : 'text-sm'}`}>{f.name}</div>
          {(f.summary || f.owner) && <div className={`text-[11px] font-medium truncate ${muted}`}>{[f.owner, f.summary].filter(Boolean).join(' · ')}</div>}
        </div>
        <span className={`text-[11px] font-bold shrink-0 ${muted}`}>{t[lang].files(n)}</span>
      </motion.button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26, ease: EASE }} className="overflow-hidden">
            {f.children.map(c => <FolderNode key={c.id} f={c} depth={depth + 1} isDark={isDark} lang={lang} forceOpen={forceOpen} />)}
            {f.files.length > 0 && <div className="pl-7">{f.files.map((x, i) => <FileRow key={`${x.name}-${i}`} f={x} isDark={isDark} lang={lang} />)}</div>}
            {!f.children.length && !f.files.length && <p className={`pl-10 py-2 text-xs ${muted}`}>{t[lang].empty}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Keeps folders that match (by name) or contain matching files/folders. */
function filterTree(folders: TipsCabinetFolder[], q: string): TipsCabinetFolder[] {
  return folders.flatMap(f => {
    const hit = f.name.toLowerCase().includes(q);
    const files = hit ? f.files : f.files.filter(x => `${x.name} ${x.summary}`.toLowerCase().includes(q));
    const children = hit ? f.children : filterTree(f.children, q);
    return hit || files.length || children.length ? [{ ...f, files, children }] : [];
  });
}

export default function TokaiCabinet(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const cab = useTips<{ folders: TipsCabinetFolder[] }>('cabinet');
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const folders = useMemo(() => (cab.data ? (query ? filterTree(cab.data.folders, query) : cab.data.folders) : []), [cab.data, query]);

  return (
    <PageShell {...props} title={tx.title} subtitle={since(cab.cachedAt, lang) || undefined} onRefresh={cab.refresh} refreshing={cab.loading}>
      <SearchField value={q} onChange={setQ} placeholder={tx.search} isDark={isDark} />
      {!cab.data && (cab.error ? <LoadError error={cab.error} isDark={isDark} lang={lang} onRetry={cab.refresh} /> : <Loading text={tx.loading} isDark={isDark} />)}
      {cab.data && folders.length === 0 && <Empty text={tx.none} isDark={isDark} />}
      <div className="space-y-3">
        {folders.map((f, i) => (
          <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: Math.min(i * 0.04, 0.28), ease: EASE }}>
            <FolderNode f={f} depth={0} isDark={isDark} lang={lang} forceOpen={!!query} />
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
}
