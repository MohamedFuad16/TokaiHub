import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Loader2, Terminal, RefreshCw, ShieldCheck, ScanFace, Laptop, KeyRound } from 'lucide-react';
import { Language, AppSettings } from '../App';
import { signIn, unlockWithPasskey, registerPasskey, deviceLabel } from '../lib/api';
import type { TipsStatus } from '../lib/types';
import mascotIdle from '../assets/mascots/mascot_1_2.png';
import mascotCover from '../assets/mascots/mascot_2_2.png';
import mascotLoading from '../assets/mascots/mascot_0_2.png';

interface SignInProps {
  lang: Language;
  setLang: (l: Language) => void;
  settings: AppSettings;
  bridgeDown: boolean;
  lastError: string | null;
  onSignedIn: (s: TipsStatus) => void;
  onRetryBridge: () => void;
  /** Not on the Mac: TIPS sign-in happens there, this device unlocks with a passkey. */
  remote: boolean;
  locked: boolean;
  onUnlocked: () => void;
}

/* ═══════════════════════════════════════════════════════════════
   Premium App Mascot
   ═══════════════════════════════════════════════════════════════ */
function AppMascot({ covering, isDark }: { covering: boolean; isDark: boolean }) {
  // Hardcoded background colors to prevent "white box" flicker during blend transition
  const mascotBg = isDark ? 'bg-gray-900' : 'bg-[#EBF2D9]';
  
  return (
    <div className={`relative w-full h-full rounded-full overflow-hidden ${mascotBg}`}>
      <AnimatePresence mode="wait">
        <motion.img
          key={covering ? 'cover' : 'idle'}
          src={covering ? mascotCover : mascotIdle}
          alt="Tokai Mascot"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 w-full h-full object-contain mix-blend-multiply"
        />
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Loading Screen
   ═══════════════════════════════════════════════════ */
const QUOTES_EN = [
  "Getting your schedule ready…",
  "Loading your courses…",
  "Preparing your campus hub…",
  "Almost there…",
  "Syncing your GPA data…",
  "Building your dashboard…",
];
const QUOTES_JP = [
  "スケジュールを準備中…",
  "授業データを読み込み中…",
  "キャンパスハブを準備中…",
  "もう少しです…",
  "GPA データを同期中…",
  "ダッシュボードを構築中…",
];

function LoadingScreen({ lang, isDark }: { lang: Language; isDark: boolean }) {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const quotes = lang === 'en' ? QUOTES_EN : QUOTES_JP;

  useEffect(() => {
    const id = setInterval(() => {
      setQuoteIdx(prev => (prev + 1) % quotes.length);
    }, 1800);
    return () => clearInterval(id);
  }, [quotes.length]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}
      style={{ willChange: 'opacity, transform' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
      >
        {/* Mascot in loading screen */}
        <div className={`w-40 h-40 mb-2 mt-4 relative rounded-full overflow-hidden ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}>
          <img 
            src={mascotLoading} 
            alt="Loading Mascot" 
            className="w-full h-full object-contain mix-blend-multiply" 
          />
        </div>
        <h1 className={`text-2xl font-bold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-brand-black'}`}>
          TOKAI HUB
        </h1>
      </motion.div>

      <div className="mt-6 mb-6">
        <motion.div
          className="w-8 h-8 rounded-full border-[3px] border-brand-yellow border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={quoteIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {quotes[quoteIdx]}
        </motion.p>
      </AnimatePresence>

      <p className={`absolute bottom-8 text-[10px] font-bold tracking-wide ${isDark ? 'text-gray-700' : 'text-gray-400'}`}>
        © 2026 Mohamed Fuad™ — All rights reserved
      </p>
    </motion.div>
  );
}

export { LoadingScreen };

// What the passkey prompt will ask for on this device. A passkey saved in iCloud Keychain on the
// iPhone also appears on a Mac signed in to the same Apple ID, and the reverse.
const BIOMETRIC = (() => {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/iPhone|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return { en: 'Face ID', jp: 'Face ID' };
  if (/Macintosh/.test(ua)) return { en: 'Touch ID', jp: 'Touch ID' };
  return { en: 'passkey', jp: 'パスキー' };
})();

function MicrosoftLogo() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   Sign-in Screen — university Microsoft account via TIPS
   ═══════════════════════════════════════════════════ */
export default function TokaiSignIn({ lang, setLang, settings, bridgeDown, lastError, onSignedIn, onRetryBridge, remote, locked, onUnlocked }: SignInProps) {
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const [code, setCode] = useState('');
  const isDark = settings.isDarkMode;

  const t = {
    en: {
      welcome: 'Welcome Back',
      sub: 'Sign in with your Tokai University Microsoft account. Your TIPS data loads straight into TokaiHub.',
      button: 'Sign in with Microsoft',
      waiting: 'A sign-in window opened on this Mac. Finish signing in there.',
      unlockTitle: 'Unlock TokaiHub',
      unlockSub: 'This Hub opens for one student only. Unlock with the passkey saved on this device.',
      unlock: `Unlock with ${BIOMETRIC.en}`,
      setup: 'Set up this device',
      setupSub: 'On the Mac Mini, open TokaiHub at 127.0.0.1:8791, go to Settings, choose "Add a device", and enter the code here. If this device shares your iCloud Keychain with one already set up, just unlock instead.',
      codePlaceholder: 'Setup code',
      createPasskey: 'Create passkey',
      unlockFailed: 'Unlock did not finish. Try again.',
      macTitle: 'Sign in on your Mac',
      macSub: 'The TIPS session on your Mac has ended. Open TokaiHub on the Mac and sign in with Microsoft, then retry here.',
      serverTitle: 'Your TokaiHub server is offline',
      serverSub: 'The Mac may be asleep or offline. Retry when it is back.',
      privacy: 'Your password goes only to Microsoft. TokaiHub never sees or stores it.',
      bridgeTitle: 'TIPS bridge is not running',
      bridgeSub: 'Start it in a terminal in the TokaiHub folder, then retry:',
      retry: 'Retry',
      failed: 'Sign-in did not finish. Try again.',
      tipsDown: 'TIPS is not answering right now (the portal may be down). Try again later.',
      expired: 'Your session ended. Please sign in again.',
    },
    jp: {
      welcome: 'おかえりなさい',
      sub: '東海大学のMicrosoftアカウントでサインインしてください。TIPSのデータがそのままTokaiHubに表示されます。',
      button: 'Microsoftでサインイン',
      waiting: 'このMacにサインイン画面が開きました。そちらでサインインを完了してください。',
      unlockTitle: 'TokaiHubのロック解除',
      unlockSub: 'このHubは1人の学生専用です。この端末に保存したパスキーでロックを解除してください。',
      unlock: `${BIOMETRIC.jp}でロック解除`,
      setup: 'この端末を設定',
      setupSub: 'Mac MiniでTokaiHub（127.0.0.1:8791）を開き、設定の「端末を追加」で表示されたコードをここに入力してください。設定済みの端末とiCloudキーチェーンを共有している場合は、そのままロック解除できます。',
      codePlaceholder: '設定コード',
      createPasskey: 'パスキーを作成',
      unlockFailed: 'ロック解除が完了しませんでした。もう一度お試しください。',
      macTitle: 'Macでサインインしてください',
      macSub: 'MacのTIPSセッションが終了しました。MacでTokaiHubを開いてMicrosoftでサインインしてから、ここで再試行してください。',
      serverTitle: 'TokaiHubサーバーがオフラインです',
      serverSub: 'Macがスリープ中かオフラインの可能性があります。復帰したら再試行してください。',
      privacy: 'パスワードはMicrosoftにのみ送信され、TokaiHubが見たり保存したりすることはありません。',
      bridgeTitle: 'TIPSブリッジが起動していません',
      bridgeSub: 'TokaiHubフォルダのターミナルで起動してから、再試行してください：',
      retry: '再試行',
      failed: 'サインインが完了しませんでした。もう一度お試しください。',
      tipsDown: 'TIPSが応答していません（ポータルが停止している可能性があります）。しばらくしてからお試しください。',
      expired: 'セッションが終了しました。もう一度サインインしてください。',
    },
  };
  const tx = t[lang];

  useEffect(() => { if (lastError) setError(tx.expired); }, [lastError, tx.expired]);

  const handleSignIn = async () => {
    setError('');
    setWaiting(true);
    try {
      onSignedIn(await signIn());
    } catch (e) {
      // The bridge refuses any TIPS account other than the Hub owner's and says so.
      const status = (e as { status?: number }).status;
      setError(status === 503 ? tx.tipsDown : status === 403 ? (e as Error).message : tx.failed);
    } finally {
      setWaiting(false);
    }
  };

  const handleUnlock = async (setup: boolean) => {
    setError('');
    setWaiting(true);
    try {
      if (setup) await registerPasskey(code.trim(), deviceLabel());
      else await unlockWithPasskey();
      onUnlocked();
    } catch (e) {
      const status = (e as { status?: number }).status;
      setError(status && status < 500 ? (e as Error).message : tx.unlockFailed);
    } finally {
      setWaiting(false);
    }
  };

  const primaryBtn = `w-full rounded-2xl py-4 font-bold text-[15px] flex items-center justify-center gap-3 transition-colors shadow-lg shadow-black/20 bg-brand-black text-white ${waiting ? 'opacity-80 cursor-wait' : 'hover:bg-gray-800'}`;
  const heading = `text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-brand-black'}`;
  const subText = `text-xs font-medium mb-5 leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-400'}`;
  const errorLine = error && <p className="text-xs font-bold px-1 mb-3 text-red-500">{error}</p>;

  return (
    <div
      className={`h-full w-full flex flex-col items-center justify-center transition-colors duration-500 p-6 relative ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}
    >
      {/* Language toggle */}
      <div className="absolute top-6 right-6 flex gap-1.5 z-10">
        {(['en', 'jp'] as Language[]).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            aria-label={l === 'en' ? "Switch to English" : "日本語に切り替え"}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${lang === l
                ? (isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white')
                : (isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white/70 text-gray-500 hover:bg-white shadow-sm')
              }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        {/* Logo — above mascot */}
        <div className="flex flex-col items-center mb-4">
          <div className={`font-black text-3xl tracking-tighter leading-none ${isDark ? 'text-white' : 'text-brand-black'}`}>
            TOKAI<span className="text-brand-yellow">HUB</span>
          </div>
          <p className={`text-[10px] font-semibold tracking-widest uppercase mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            {lang === 'en' ? 'Student Portal' : '学生ポータル'}
          </p>
        </div>

        {/* Card with mascot resting on top edge */}
        <div className="relative w-full mt-20">
          <div
            role="img"
            aria-label="Student mascot illustration"
            className={`absolute -top-24 left-1/2 -translate-x-1/2 z-30 w-[140px] h-[140px] pointer-events-none rounded-full overflow-hidden ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}
          >
            <motion.div animate={{ y: waiting ? 10 : 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="w-full h-full">
              <AppMascot covering={waiting} isDark={isDark} />
            </motion.div>
          </div>

          <div className={`w-full rounded-[32px] p-6 pt-14 shadow-xl relative z-20 ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}>
            {remote && locked ? (
              <>
                <h2 className={heading}>{tx.unlockTitle}</h2>
                <p className={subText}>{setupOpen ? tx.setupSub : tx.unlockSub}</p>
                {errorLine}
                {setupOpen ? (
                  <>
                    <input
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder={tx.codePlaceholder}
                      autoCapitalize="characters" autoComplete="one-time-code" spellCheck={false} maxLength={8}
                      className={`w-full mb-3 rounded-2xl px-4 py-3.5 text-center text-lg font-black tracking-[0.3em] outline-none ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-brand-black'}`}
                    />
                    <motion.button whileTap={!waiting ? { scale: 0.97 } : {}} disabled={waiting || code.trim().length !== 8} onClick={() => handleUnlock(true)} className={`${primaryBtn} disabled:opacity-50`}>
                      {waiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-5 h-5" />}{tx.createPasskey}
                    </motion.button>
                  </>
                ) : (
                  <motion.button whileTap={!waiting ? { scale: 0.97 } : {}} disabled={waiting} onClick={() => handleUnlock(false)} className={primaryBtn}>
                    {waiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanFace className="w-5 h-5" />}{tx.unlock}
                  </motion.button>
                )}
                <button onClick={() => { setSetupOpen(o => !o); setError(''); }} className={`mt-4 w-full text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {setupOpen ? tx.unlock : tx.setup}
                </button>
              </>
            ) : remote ? (
              <>
                <h2 className={`${heading} flex items-center gap-2`}>
                  <Laptop className="w-5 h-5 text-brand-yellow" /> {bridgeDown ? tx.serverTitle : tx.macTitle}
                </h2>
                <p className={subText}>{bridgeDown ? tx.serverSub : tx.macSub}</p>
                <motion.button whileTap={{ scale: 0.97 }} onClick={onRetryBridge} className={primaryBtn}>
                  <RefreshCw className="w-4 h-4" /> {tx.retry}
                </motion.button>
              </>
            ) : bridgeDown ? (
              <>
                <h2 className={`text-xl font-bold mb-1 flex items-center gap-2 ${isDark ? 'text-white' : 'text-brand-black'}`}>
                  <Terminal className="w-5 h-5 text-brand-yellow" /> {tx.bridgeTitle}
                </h2>
                <p className={`text-xs font-medium mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{tx.bridgeSub}</p>
                <code className={`block rounded-2xl px-4 py-3 text-sm font-bold mb-4 ${isDark ? 'bg-gray-800 text-brand-yellow' : 'bg-gray-100 text-brand-black'}`}>npm run bridge</code>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onRetryBridge}
                  className="w-full bg-brand-black text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 hover:bg-gray-800 shadow-lg shadow-black/20"
                >
                  <RefreshCw className="w-4 h-4" /> {tx.retry}
                </motion.button>
              </>
            ) : (
              <>
                <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-brand-black'}`}>{tx.welcome}</h2>
                <p className={`text-xs font-medium mb-5 leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{tx.sub}</p>

                <AnimatePresence>
                  {(error || waiting) && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`text-xs font-bold px-1 mb-3 ${waiting ? (isDark ? 'text-brand-yellow' : 'text-blue-600') : 'text-red-500'}`}
                    >
                      {waiting ? tx.waiting : error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  type="button"
                  onClick={handleSignIn}
                  disabled={waiting}
                  whileTap={!waiting ? { scale: 0.97 } : {}}
                  className={`w-full rounded-2xl py-4 font-bold text-[15px] flex items-center justify-center gap-3 transition-colors shadow-lg shadow-black/20 bg-brand-black text-white ${waiting ? 'opacity-80 cursor-wait' : 'hover:bg-gray-800'}`}
                >
                  {waiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MicrosoftLogo />}
                  {waiting ? (lang === 'en' ? 'Waiting for Microsoft…' : 'Microsoftの応答を待っています…') : tx.button}
                  {!waiting && <ArrowRight className="w-4 h-4" />}
                </motion.button>

                <p className={`mt-4 flex items-start gap-2 text-[11px] font-medium leading-snug ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <ShieldCheck className="w-4 h-4 shrink-0 text-brand-green" /> {tx.privacy}
                </p>
              </>
            )}
          </div>
        </div>

        <p className={`text-center mt-6 text-[10px] font-bold tracking-wide ${isDark ? 'text-gray-700' : 'text-gray-400'}`}>
          © 2026 Mohamed Fuad™
        </p>
      </motion.div>
    </div>
  );
}
