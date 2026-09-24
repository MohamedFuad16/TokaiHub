import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, Plus, RefreshCw, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';

import TokaiSignIn, { LoadingScreen } from './components/TokaiSignIn';
import { getStatus, signOut as bridgeSignOut, extendSession, needsUnlock, IS_LOCAL, LOCKED_EVENT, LockedError } from './lib/api';
import { useTips, clearTipsStore, setTipsLang, SIGNED_OUT_EVENT, UPDATED_EVENT } from './lib/useTips';
import { displayName, tidy } from './lib/tipsAdapters';
import { NAV_ITEMS } from './lib/nav';
import type { TipsGrades, TipsProfile, TipsStatus } from './lib/types';
import mascotLogo from './assets/mascots/mascot_1_1.png';

// Lazy load route components — imports cached after first load
const lazyHome = () => import('./components/TokaiHome');
const lazyCourse = () => import('./components/TokaiCourse');
const lazySchedule = () => import('./components/TokaiSchedule');
const lazySettings = () => import('./components/TokaiSettings');
const lazyGrades = () => import('./components/TokaiCredits');
const lazyClass = () => import('./components/TokaiClass');
const lazyAttendance = () => import('./components/TokaiAttendance');
const lazyBulletins = () => import('./components/TokaiBulletins');
const lazyTasks = () => import('./components/TokaiTasks');
const lazySyllabus = () => import('./components/TokaiSyllabus');
const lazyRegistration = () => import('./components/TokaiRegistration');
const lazyCabinet = () => import('./components/TokaiCabinet');

const TokaiHome = React.lazy(lazyHome);
const TokaiCourse = React.lazy(lazyCourse);
const TokaiSchedule = React.lazy(lazySchedule);
const TokaiSettings = React.lazy(lazySettings);
const TokaiCredits = React.lazy(lazyGrades);
const TokaiClass = React.lazy(lazyClass);
const TokaiAttendance = React.lazy(lazyAttendance);
const TokaiBulletins = React.lazy(lazyBulletins);
const TokaiTasks = React.lazy(lazyTasks);
const TokaiSyllabus = React.lazy(lazySyllabus);
const TokaiRegistration = React.lazy(lazyRegistration);
const TokaiCabinet = React.lazy(lazyCabinet);

// Preload all route components after initial paint
export function preloadRoutes() {
  [lazyHome, lazyCourse, lazySchedule, lazySettings, lazyGrades, lazyClass, lazyAttendance, lazyBulletins, lazyTasks, lazySyllabus, lazyRegistration, lazyCabinet]
    .forEach(l => l().catch(() => {}));
}

preloadRoutes();

export type Language = 'en' | 'jp';

export interface AppSettings {
  isDarkMode: boolean;
  notifications: boolean;
  privacy: boolean;
  enableEnhancedUI: boolean;
  fontFamily: 'default' | 'merry_varsity' | 'moshi_moshi' | 'one_more' | 'pramukh_rounded';
}

/** The signed-in student, built from TIPS (学生ポートフォリオ + 単位修得状況). */
export interface UserProfile {
  name: string;        // English name as TIPS lists it
  nameJp: string;      // katakana/kanji name
  givenName: string;   // for greetings, in the current language
  studentId: string;
  campus: string;      // e.g. 品川
  department: string;
  year: string;
  semester: string;
  advisor: string;
  cumulativeGpa: number;
  lastSemGpa: number;
  creditsEarned: number;
}

export interface ScreenProps {
  lang: Language;
  setLang: (l: Language) => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  userProfile?: UserProfile;
  session?: TipsStatus | null;
  onExtendSession?: (minutes: number) => Promise<void>;
  onSignOut?: (clearCache?: boolean) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  isDarkMode: false,
  notifications: true,
  privacy: true,
  enableEnhancedUI: false,
  fontFamily: 'default',
};

function SessionPill({ session, lang, isDark, onExtend }: { session: TipsStatus | null; lang: Language; isDark: boolean; onExtend: (m: number) => Promise<void> }) {
  if (!session || session.state !== 'signed_in' || !session.hubExpiresAt) return null;
  const low = session.minutesLeft <= 15;
  const h = Math.floor(session.minutesLeft / 60);
  const m = session.minutesLeft % 60;
  const left = h ? `${h}h ${m}m` : `${m}m`;
  return (
    <div className={`mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-2xl text-xs font-bold ${low ? 'bg-red-500/10 text-red-500' : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
      <span className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        {lang === 'en' ? `Session ${left} left` : `セッション残り ${left}`}
      </span>
      <button
        onClick={() => onExtend(60)}
        aria-label={lang === 'en' ? 'Extend session by 60 minutes' : 'セッションを60分延長'}
        className={`flex items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-brand-black shadow-sm'}`}
      >
        <Plus className="w-3 h-3" />60m
      </button>
    </div>
  );
}

/** Shown for the split second a route's code is still loading: the page frame, not a spinner. */
function RouteSkeleton({ isDark }: { isDark: boolean }) {
  const block = isDark ? 'skeleton-dark' : 'skeleton';
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8" style={{ paddingTop: 'calc(1.75rem + env(safe-area-inset-top, 0px))' }} aria-hidden>
      <div className={`h-9 w-44 rounded-xl ${block}`} />
      <div className={`mt-8 h-12 rounded-2xl ${block}`} />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => <div key={i} className={`h-28 rounded-3xl ${block}`} />)}
      </div>
    </div>
  );
}

interface MainAppContentProps {
  screenProps: ScreenProps;
  lang: Language;
  userProfile: UserProfile | undefined;
  isDark: boolean;
  setLang: (l: Language) => void;
}

/** Brief pill when a background refresh brought newer TIPS data. */
function UpdatedPill({ lang, isDark }: { lang: Language; isDark: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let t: number | undefined;
    const on = () => { setShow(true); clearTimeout(t); t = window.setTimeout(() => setShow(false), 2500); };
    window.addEventListener(UPDATED_EVENT, on);
    return () => { window.removeEventListener(UPDATED_EVENT, on); clearTimeout(t); };
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
          className={`fixed left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 ${isDark ? 'bg-white text-brand-black' : 'bg-brand-black text-white'}`}>
          <RefreshCw className="w-3.5 h-3.5" />{lang === 'en' ? 'Updated from TIPS' : 'TIPSの最新情報に更新しました'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Desktop sidebar can fold to an icon rail; the choice is kept on this device. */
function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('tokaihub_sidebar_collapsed') === '1'; } catch { return false; }
  });
  const toggle = useCallback(() => setCollapsed(c => {
    try { localStorage.setItem('tokaihub_sidebar_collapsed', c ? '0' : '1'); } catch { /* private mode */ }
    return !c;
  }), []);
  // ⌘B / Ctrl+B, the usual sidebar shortcut in editors and mail apps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); toggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
  return [collapsed, toggle] as const;
}

const FADE = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.18, delay: 0.08 } }, exit: { opacity: 0, transition: { duration: 0.1 } } };

function MainAppContent({ screenProps, lang, userProfile, isDark, setLang }: MainAppContentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const muted = isDark ? 'text-gray-500' : 'text-gray-400';
  const toggleLabel = collapsed ? (lang === 'en' ? 'Expand sidebar (⌘B)' : 'サイドバーを開く (⌘B)') : (lang === 'en' ? 'Collapse sidebar (⌘B)' : 'サイドバーを閉じる (⌘B)');
  return (
    <div className={`h-[100dvh] w-full overflow-hidden flex transition-colors duration-500 ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}>
      <UpdatedPill lang={lang} isDark={isDark} />
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 88 : 296 }}
        transition={{ type: 'spring', stiffness: 420, damping: 40 }}
        className={`hidden lg:flex flex-col shrink-0 h-full overflow-hidden transition-colors duration-500 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-r`}
      >
        <div className={collapsed ? 'px-3 pt-6 pb-3 flex flex-col items-center gap-3' : 'p-7 pb-4'}>
          <div className={`flex items-center ${collapsed ? 'flex-col gap-3' : 'gap-1'}`}>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div key="word" {...FADE} className={`font-bold text-2xl leading-none tracking-tighter whitespace-nowrap ${isDark ? 'text-white' : 'text-brand-black'}`}>
                  TOKAI<br /><span className="text-brand-yellow">HUB</span>
                </motion.div>
              )}
            </AnimatePresence>
            <img src={mascotLogo} alt="Tokai Mascot" className="w-auto h-12 object-contain ml-1 drop-shadow-sm hover:rotate-6 hover:scale-105 transition-all cursor-pointer" />
            <motion.button whileTap={{ scale: 0.92 }} onClick={toggleCollapsed} aria-label={toggleLabel} title={toggleLabel} aria-expanded={!collapsed}
              className={`${collapsed ? '' : 'ml-auto'} w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-brand-black'}`}>
              {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </motion.button>
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && <motion.p key="ver" {...FADE} className={`text-xs font-medium mt-3 whitespace-nowrap ${muted}`}>{lang === 'en' ? 'Student Hub v1.0' : '学生ポータル v1.0'}</motion.p>}
          </AnimatePresence>
          {userProfile && (
            <div title={collapsed ? `${lang === 'en' ? userProfile.name : userProfile.nameJp} · ${userProfile.studentId}` : undefined}
              className={`flex items-center gap-3 rounded-2xl ${collapsed ? '' : `mt-4 p-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}`}>
              <div className="w-9 h-9 bg-brand-yellow rounded-full flex items-center justify-center font-bold text-sm text-brand-black shrink-0">
                {(lang === 'en' ? userProfile.givenName : userProfile.nameJp).charAt(0)}
              </div>
              {!collapsed && (
                <motion.div {...FADE} className="min-w-0">
                  <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-brand-black'}`}>{lang === 'en' ? userProfile.name : userProfile.nameJp}</div>
                  <div className={`text-xs font-medium ${muted}`}>{userProfile.studentId}</div>
                </motion.div>
              )}
            </div>
          )}
          {!collapsed && <SessionPill session={screenProps.session ?? null} lang={lang} isDark={isDark} onExtend={screenProps.onExtendSession!} />}
        </div>

        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden no-scrollbar ${collapsed ? 'px-3' : 'px-4'}`}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const label = lang === 'en' ? item.labelEn : item.labelJp;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(item.path)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
                className={`relative isolate w-full h-11 flex items-center gap-4 rounded-2xl font-semibold text-[15px] whitespace-nowrap transition-colors duration-200 ${collapsed ? 'justify-center px-0' : 'px-5'} ${isActive
                  ? isDark ? 'text-brand-black' : 'text-white'
                  : isDark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-brand-black'
                  }`}
              >
                {/* One highlight that slides to the active item instead of jumping. */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    className={`absolute inset-0 -z-10 rounded-2xl ${isDark ? 'bg-brand-yellow shadow-lg shadow-yellow-500/20' : 'bg-brand-black shadow-lg shadow-black/20'}`}
                  />
                )}
                <Icon className="w-5 h-5 shrink-0" />
                <AnimatePresence initial={false}>{!collapsed && <motion.span key="l" {...FADE}>{label}</motion.span>}</AnimatePresence>
              </motion.button>
            );
          })}
        </nav>

        <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} ${collapsed ? 'p-3 flex justify-center' : 'p-6 space-y-4'}`}>
          {collapsed ? (
            <button onClick={() => setLang(lang === 'en' ? 'jp' : 'en')} aria-label="Language / 言語" title="Language / 言語"
              className={`w-11 h-11 rounded-xl font-bold text-sm transition-colors ${isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white'}`}>
              {lang.toUpperCase()}
            </button>
          ) : (
            <>
              <div>
                <div className={`text-xs font-bold mb-3 whitespace-nowrap ${muted}`}>Language / 言語</div>
                <div className="flex gap-2">
                  {(['en', 'jp'] as Language[]).map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${lang === l
                        ? isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white'
                        : isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <p className={`text-[9px] font-bold tracking-wide text-center whitespace-nowrap ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>
                © 2026 Mohamed Fuad™
              </p>
            </>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main
        className={`flex-1 min-w-0 h-full relative overflow-hidden transition-colors duration-500 ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
            className="absolute inset-0"
            // Side insets keep content clear of the notch when an iPhone is held sideways.
            style={{ willChange: 'opacity, transform', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}
          >
            <Suspense fallback={<RouteSkeleton isDark={isDark} />}>
              <Routes location={location}>
                <Route path="/" element={<TokaiHome {...screenProps} />} />
                <Route path="/course/:id" element={<TokaiCourse {...screenProps} />} />
                <Route path="/schedule" element={<TokaiSchedule {...screenProps} />} />
                <Route path="/settings" element={<TokaiSettings {...screenProps} />} />
                <Route path="/grades" element={<TokaiCredits {...screenProps} />} />
                <Route path="/class" element={<TokaiClass {...screenProps} />} />
                <Route path="/attendance" element={<TokaiAttendance {...screenProps} />} />
                <Route path="/bulletins" element={<TokaiBulletins {...screenProps} />} />
                <Route path="/bulletins/:id" element={<TokaiBulletins {...screenProps} />} />
                <Route path="/tasks" element={<TokaiTasks {...screenProps} />} />
                <Route path="/syllabus" element={<TokaiSyllabus {...screenProps} />} />
                <Route path="/registration" element={<TokaiRegistration {...screenProps} />} />
                <Route path="/cabinet" element={<TokaiCabinet {...screenProps} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/** Everything that needs a live TIPS session lives below this component. */
function SignedInApp({ base, session, onExtendSession }: { base: Omit<ScreenProps, 'userProfile'>; session: TipsStatus | null; onExtendSession: (m: number) => Promise<void> }) {
  const profile = useTips<TipsProfile>('profile');
  const grades = useTips<TipsGrades>('grades');
  const { lang } = base;

  // The local cache belongs to one student. If a different student signs in on this
  // device, drop the previous student's cached data before anything else renders from it.
  useEffect(() => {
    const id = profile.data?.studentId;
    if (!id) return;
    let owner: string | null = null;
    try { owner = localStorage.getItem('tokaihub_owner'); } catch { /* private mode */ }
    if (owner && owner !== id) clearTipsStore();
    try { localStorage.setItem('tokaihub_owner', id); } catch { /* private mode */ }
  }, [profile.data?.studentId]);

  const userProfile: UserProfile | undefined = React.useMemo(() => {
    const p = profile.data;
    if (!p) return undefined;
    const names = displayName(p, lang);
    // In English mode TIPS returns English department/campus; name stays in both scripts.
    const gpa = grades.data?.gpa ?? [];
    const last = gpa[gpa.length - 1];
    return {
      name: names.en || names.jp,
      nameJp: names.jp || names.en,
      givenName: names.given,
      studentId: p.studentId ?? '',
      campus: tidy(p.campus ?? ''),
      department: tidy(p.department ?? ''),
      year: p.year ?? '',
      semester: p.semester ?? '',
      advisor: tidy(p.advisor ?? ''),
      cumulativeGpa: last?.cumulativeGpa ?? 0,
      lastSemGpa: last?.termGpa ?? 0,
      creditsEarned: grades.data?.totalEarned ?? 0,
    };
  }, [profile.data, grades.data, lang]);

  const screenProps: ScreenProps = React.useMemo(
    () => ({ ...base, userProfile, session, onExtendSession }),
    [base, userProfile, session, onExtendSession],
  );

  return (
    <BrowserRouter>
      <MainAppContent
        screenProps={screenProps}
        lang={lang}
        userProfile={userProfile}
        isDark={base.settings.isDarkMode}
        setLang={base.setLang}
      />
    </BrowserRouter>
  );
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('tokaihub_lang');
      if (stored === 'en' || stored === 'jp') return stored;
    } catch { /* private mode */ }
    return navigator.language.toLowerCase().startsWith('ja') ? 'jp' : 'en';
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('tokaihub_settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  // Off the Mac the app opens straight from the last known status and the phone's cached
  // data; the bridge is asked in the background. This keeps start-up instant on a phone.
  const [session, setSession] = useState<TipsStatus | null>(() => {
    if (IS_LOCAL || needsUnlock()) return null;
    try { return JSON.parse(localStorage.getItem('tokaihub_status') ?? 'null'); } catch { return null; }
  });
  const [locked, setLocked] = useState(needsUnlock);
  const [bridgeDown, setBridgeDown] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !session && !locked);

  // Dynamic Font Loading & Styling
  useEffect(() => {
    // If language is Japanese, don't change anything (use default Gilroy + M PLUS 2)
    if (lang === 'jp') {
      document.documentElement.style.setProperty('--app-font-family', '"Gilroy", "M PLUS 2", -apple-system, BlinkMacSystemFont, sans-serif');
      return;
    }

    const fontConfigs = {
      default: {
        family: '"Gilroy", "M PLUS 2", -apple-system, BlinkMacSystemFont, sans-serif'
      },
      moshi_moshi: {
        family: '"MoshiMoshi Small", "Gilroy", sans-serif'
      },
      one_more: {
        family: '"One More", "Gilroy", sans-serif'
      }
    };

    const config = fontConfigs[settings.fontFamily as keyof typeof fontConfigs] || fontConfigs.default;
    document.documentElement.style.setProperty('--app-font-family', config.family);
    document.documentElement.setAttribute('data-font', settings.fontFamily);
  }, [settings.fontFamily, lang]);

  const refreshStatus = useCallback(async () => {
    if (needsUnlock()) { setLocked(true); setIsLoading(false); return null; }
    try {
      const s = await getStatus();
      setSession(s);
      setLocked(false);
      setBridgeDown(false);
      try { localStorage.setItem('tokaihub_status', JSON.stringify(s)); } catch { /* private mode */ }
      return s;
    } catch (e) {
      if (e instanceof LockedError) setLocked(true);
      else setBridgeDown(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Session status on boot and every minute (drives the countdown and the auto sign-out).
  useEffect(() => {
    refreshStatus();
    const id = setInterval(refreshStatus, 60_000);
    const onSignedOut = () => { refreshStatus(); };
    const onLocked = () => setLocked(true);
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    window.addEventListener(LOCKED_EVENT, onLocked);
    return () => { clearInterval(id); window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut); window.removeEventListener(LOCKED_EVENT, onLocked); };
  }, [refreshStatus]);

  useEffect(() => {
    try { localStorage.setItem('tokaihub_settings', JSON.stringify(settings)); } catch { /* private mode */ }
  }, [settings]);

  useEffect(() => {
    try { localStorage.setItem('tokaihub_lang', lang); } catch { /* private mode */ }
    document.documentElement.lang = lang === 'jp' ? 'ja' : 'en';
  }, [lang]);

  // TIPS answers in the UI language; set before children render so first fetches match.
  setTipsLang(lang);

  const handleSignOut = useCallback(async (clearCache = false) => {
    await bridgeSignOut(clearCache).catch(() => {});
    clearTipsStore();
    try { localStorage.removeItem('tokaihub_status'); } catch { /* private mode */ }
    if (!IS_LOCAL) { setSession(null); setLocked(true); }
    window.history.replaceState(null, '', '/');
    await refreshStatus();
  }, [refreshStatus]);

  const handleExtend = useCallback(async (minutes: number) => {
    try { setSession(await extendSession(minutes)); } catch { await refreshStatus(); }
  }, [refreshStatus]);

  const isDark = settings.isDarkMode;

  const base = React.useMemo(() => ({
    lang, setLang, settings, setSettings, onSignOut: handleSignOut,
  }), [lang, settings, handleSignOut]);

  if (isLoading) {
    return <LoadingScreen lang={lang} isDark={isDark} />;
  }

  if ((!IS_LOCAL && locked) || session?.state !== 'signed_in') {
    return (
      <div className={`h-[100dvh] w-full overflow-hidden transition-colors duration-500 ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}>
        <TokaiSignIn
          lang={lang}
          setLang={setLang}
          settings={settings}
          bridgeDown={bridgeDown}
          lastError={session?.lastError ?? null}
          onSignedIn={s => { setSession(s); preloadRoutes(); }}
          onRetryBridge={refreshStatus}
          remote={!IS_LOCAL}
          locked={locked}
          onUnlocked={() => { setLocked(false); setIsLoading(true); refreshStatus().then(s => { if (s?.state === 'signed_in') preloadRoutes(); }); }}
        />
      </div>
    );
  }

  return <SignedInApp base={base} session={session} onExtendSession={handleExtend} />;
}
