import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ScreenProps } from '../App';
import PageShell, { Card, Loading, LoadError, Fresh, rise } from './ScreenHeader';
import { motion } from 'motion/react';
import RegistrationPlanner from './RegistrationPlanner';
import { useTips } from '../lib/useTips';
import { termLabel, pct } from '../lib/tipsAdapters';
import type { TipsTimetable } from '../lib/types';

const t = {
  en: {
    title: 'Registration', status: 'Registration deadline', credits: 'Credits registered', updated: 'Last updated on TIPS', loading: 'Loading from TIPS…',
    closedNote: 'TIPS reports this term is outside the registration period, so it will refuse changes until the period opens.',
  },
  jp: {
    title: '履修登録', status: '登録期限', credits: '登録単位数', updated: 'TIPS最終更新', loading: 'TIPSから読み込み中…',
    closedNote: 'TIPSではこの学期は登録期間外のため、期間が始まるまで変更は受け付けられません。',
  },
};

export default function TokaiRegistration(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const tt = useTips<TipsTimetable>('timetable');
  const data = tt.data;
  const closed = !!data && !data.registrationOpen;

  return (
    <PageShell {...props} title={tx.title} subtitle={termLabel(data?.term, data?.year, lang)} onRefresh={tt.refresh} refreshing={tt.loading}>
      {!data && (tt.error ? <LoadError error={tt.error} isDark={isDark} lang={lang} onRetry={tt.refresh} /> : <Loading text={tx.loading} isDark={isDark} />)}
      {data && (
        <div className="space-y-5">
          {/* Phone: deadline and credits side by side, last update full width (dates no longer clip). */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <motion.div {...rise(0)} className="min-w-0">
              <Card isDark={isDark} className="h-full p-4 sm:p-5">
                <div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 ${muted}`}>{tx.status}</div>
                <div className={`text-sm sm:text-lg font-bold leading-snug break-words ${closed ? 'text-red-500' : isDark ? 'text-green-400' : 'text-green-600'}`}>{data.registrationStatus ?? '—'}</div>
              </Card>
            </motion.div>
            <motion.div {...rise(1)} className="min-w-0">
              <Card isDark={isDark} className="h-full p-4 sm:p-5">
                <div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 ${muted}`}>{tx.credits}</div>
                <div className="text-lg font-bold"><Fresh value={data.credits.registered ?? 0}>{data.credits.registered ?? 0}</Fresh><span className={`text-sm ${muted}`}> / {data.credits.limit ?? '—'}</span></div>
                <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}><motion.div className="h-full rounded-full bg-brand-yellow" initial={false} animate={{ width: `${Math.min(pct(data.credits.registered, data.credits.limit), 100)}%` }} transition={{ duration: 0.5 }} /></div>
              </Card>
            </motion.div>
            <motion.div {...rise(2)} className="min-w-0 col-span-2 sm:col-span-1">
              <Card isDark={isDark} className="h-full p-4 sm:p-5">
                <div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 ${muted}`}>{tx.updated}</div>
                <div className="text-sm sm:text-lg font-bold leading-snug break-words">{data.lastUpdated ?? '—'}</div>
              </Card>
            </motion.div>
          </div>
          {closed && <div className={`flex items-start gap-2 p-4 rounded-2xl bg-red-500/10 text-sm font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{tx.closedNote}</div>}
          <RegistrationPlanner lang={lang} isDark={isDark} />
        </div>
      )}
    </PageShell>
  );
}
