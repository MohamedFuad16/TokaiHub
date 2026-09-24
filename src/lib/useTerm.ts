/**
 * Which term the Hub shows. "auto" follows TIPS's current term, but falls back to the other
 * term of the same year when the current one has no registered courses and registration is
 * closed. While registration is open it stays on the current term so the student can plan it. The choice persists per browser.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTips } from './useTips';
import { toCourseItems } from './tipsAdapters';
import type { Term, TipsTimetable } from './types';

type Choice = 'auto' | Term;
const KEY = 'tokaihub_term_choice';
const subs = new Set<(c: Choice) => void>();
let choice: Choice = (() => { try { return (localStorage.getItem(KEY) as Choice) || 'auto'; } catch { return 'auto'; } })();

export function useTimetable() {
  const [c, setC] = useState<Choice>(choice);
  useEffect(() => { subs.add(setC); return () => { subs.delete(setC); }; }, []);
  const setChoice = useCallback((next: Choice) => {
    choice = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
    subs.forEach(s => s(next));
  }, []);

  const current = useTips<TipsTimetable>('timetable');
  const currentTerm = current.data?.term ?? null;
  const other: Term = currentTerm === '1' ? '2' : '1';
  // Auto: stay on TIPS's current term, except when it is empty and registration is closed
  // (then show the other term, which has the student's actual classes).
  const wantTerm: Term | null = c === 'auto'
    ? (current.data && current.data.courses.length === 0 && !current.data.registrationOpen ? other : null)
    : (c === currentTerm ? null : c);
  const alt = useTips<TipsTimetable>('timetable', wantTerm ? { term: wantTerm } : undefined, { enabled: !!wantTerm });
  const active = wantTerm ? alt : current;

  return {
    choice: c,
    setChoice,
    timetable: active.data,
    items: toCourseItems(active.data),
    currentTerm,
    isFallback: c === 'auto' && !!wantTerm,
    loading: active.loading && !active.data,
    error: active.error,
    refresh: active.refresh,
  };
}
