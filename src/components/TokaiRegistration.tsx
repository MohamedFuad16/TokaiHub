import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ScreenProps } from '../App';
import PageShell, { Card, Loading } from './ScreenHeader';
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
      {!data && <Loading text={tx.loading} isDark={isDark} />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Card isDark={isDark} className="p-3 sm:p-5 min-w-0">
              <div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 sm:mb-2 ${muted}`}>{tx.status}</div>
              <div className={`text-xs sm:text-lg font-bold leading-snug ${closed ? 'text-red-500' : 'text-green-600'}`}>{data.registrationStatus ?? '—'}</div>
            </Card>
            <Card isDark={isDark} className="p-3 sm:p-5 min-w-0">
              <div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 sm:mb-2 ${muted}`}>{tx.credits}</div>
              <div className="text-sm sm:text-lg font-bold">{data.credits.registered ?? 0}<span className={`text-xs sm:text-sm ${muted}`}> / {data.credits.limit ?? '—'}</span></div>
              <div className={`mt-2 h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}><div className="h-full rounded-full bg-brand-yellow" style={{ width: `${Math.min(pct(data.credits.registered, data.credits.limit), 100)}%` }} /></div>
            </Card>
            <Card isDark={isDark} className="p-3 sm:p-5 min-w-0">
              <div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 sm:mb-2 ${muted}`}>{tx.updated}</div>
              <div className="text-xs sm:text-lg font-bold leading-snug">{data.lastUpdated ?? '—'}</div>
            </Card>
          </div>
          {closed && <div className="flex items-start gap-2 p-4 rounded-2xl bg-red-500/10 text-red-600 text-sm font-semibold"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{tx.closedNote}</div>}
          <RegistrationPlanner lang={lang} isDark={isDark} />
        </div>
      )}
    </PageShell>
  );
}
