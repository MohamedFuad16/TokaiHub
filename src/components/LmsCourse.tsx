import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight, Download, ExternalLink } from 'lucide-react';
import type { ScreenProps } from '../App';
import PageShell, { Card, Loading, LoadError, Empty, rise } from './ScreenHeader';
import { useTips } from '../lib/useTips';
import { getFeature, openTipsFile } from '../lib/api';
import type { LmsCourse as Course } from '../lib/lms';
import { ModuleIcon, dueText } from './lmsShared';

const t = {
  en: { loading: 'Loading the course from the LMS…', empty: 'This course has nothing posted yet.', web: 'Opens the LMS website' },
  jp: { loading: 'LMSからコースを読み込み中…', empty: 'このコースにはまだ何も掲載されていません。', web: 'LMSのWebサイトで開きます' },
};

interface Item { id: number; name: string; module: string; url: string | null; dates: { label: string; at: number }[]; done: boolean | null }
interface Section { id: number; number: number; title: string; items: Item[] }

/**
 * One subject's LMS content. A two-period class is two LMS courses (/lms/course/172107,172108);
 * their weeks are merged by section number, and items posted in both appear once.
 */
export default function LmsCourse(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const navigate = useNavigate();
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const ids = (useParams().id ?? '').split(',').filter(x => /^\d+$/.test(x)).slice(0, 3);
  const a = useTips<{ sections: Section[] }>('lms-course', { id: ids[0] }, { enabled: !!ids[0] });
  const b = useTips<{ sections: Section[] }>('lms-course', { id: ids[1] }, { enabled: !!ids[1] });
  const c = useTips<{ sections: Section[] }>('lms-course', { id: ids[2] }, { enabled: !!ids[2] });
  const list = useTips<{ courses: Course[] }>('lms-courses');
  const parts = [a, b, c].slice(0, ids.length);
  const title = list.data?.courses.find(x => x.id === Number(ids[0]))?.title;

  const sections = useMemo(() => {
    const by = new Map<number, Section>();
    for (const p of parts) for (const s of p.data?.sections ?? []) {
      const into = by.get(s.number) ?? { ...s, items: [] };
      for (const i of s.items) if (!into.items.some(x => x.name === i.name && x.module === i.module)) into.items.push(i);
      by.set(s.number, into);
    }
    return [...by.values()].sort((x, y) => x.number - y.number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.data, b.data, c.data]);

  const open = (i: Item) => {
    if (i.module === 'assign') return navigate(`/lms/assign/${i.id}`);
    if (i.module === 'resource' && i.url) return openTipsFile({ kind: 'lms', lmsUrl: i.url });
    if (i.module === 'url') {
      // Open the tab now (keeps the tap's popup permission), then point it at the link's address.
      const tab = window.open('', '_blank');
      getFeature<{ url: string }>('lms-link', { id: i.id }).then(r => { if (tab) tab.location.href = r.data.url; }).catch(() => tab?.close());
      return;
    }
    if (i.url) window.open(i.url, '_blank', 'noopener');
  };
  const action = (m: string) => (m === 'assign' ? ChevronRight : m === 'resource' ? Download : ExternalLink);

  const loading = parts.some(p => !p.data && !p.error);
  const error = parts.find(p => p.error && !p.data)?.error;

  return (
    <PageShell {...props} title={title ?? (lang === 'en' ? 'Course' : 'コース')}
      back onRefresh={() => parts.forEach(p => p.refresh())} refreshing={parts.some(p => p.loading)}>
      {loading && sections.length === 0 && <Loading text={tx.loading} isDark={isDark} />}
      {error && <LoadError error={error} isDark={isDark} lang={lang} onRetry={() => parts.forEach(p => p.refresh())} />}
      {!loading && !error && sections.length === 0 && <Empty text={tx.empty} isDark={isDark} />}
      <div className="space-y-4">
        {sections.map((s, k) => (
          <motion.div key={s.number} {...rise(k)}>
            <Card isDark={isDark} className="p-4 sm:p-5">
              <h2 className="font-bold mb-2">{s.title}</h2>
              <div className="space-y-1">
                {s.items.map(i => {
                  const Arrow = action(i.module);
                  const due = i.dates.find(d => /期限|due/i.test(d.label));
                  return (
                    <button key={i.id} onClick={() => open(i)} title={['resource', 'assign', 'url'].includes(i.module) ? undefined : tx.web}
                      className={`w-full text-left flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-white'}`}>
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${i.module === 'assign' ? 'bg-brand-yellow text-brand-black' : isDark ? 'bg-gray-700' : 'bg-white'}`}>
                        <ModuleIcon module={i.module} className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold leading-snug line-clamp-2">{i.name}</span>
                        {due && <span className={`block text-[11px] font-semibold ${muted}`}>{(lang === 'en' ? 'Due ' : '期限 ') + dueText(due.at, lang)}</span>}
                      </span>
                      <Arrow className={`w-4 h-4 shrink-0 ${muted}`} />
                    </button>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
}
