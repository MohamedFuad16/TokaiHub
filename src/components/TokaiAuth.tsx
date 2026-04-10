import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ArrowRight, Mail, Loader2 } from 'lucide-react';
import { signIn } from 'aws-amplify/auth';
import { Language, AppSettings } from '../App';
import mascotIdle from '../assets/mascots/mascot_1_2.png';
import mascotCover from '../assets/mascots/mascot_2_2.png';
import mascotLoading from '../assets/mascots/mascot_0_2.png';

interface AuthProps {
  onSignIn: (email: string) => void; // Fixed signature to match usage or App.tsx
  onGoToSignUp: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  settings: AppSettings;
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

/* ═══════════════════════════════════════════════════
   Auth Screen
   ═══════════════════════════════════════════════════ */
export default function TokaiAuth({ onSignIn, onGoToSignUp, lang, setLang, settings }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isDark = settings.isDarkMode;


  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError('');
  };

  const t = {
    en: {
      welcome: 'Welcome Back',
      sub: 'Sign in to your TokaiHub account',
      emailLbl: 'Email Address',
      emailPlaceholder: 'your.email@tokai.ac.jp',
      password: 'Password',
      pwPlaceholder: '••••••••',
      signIn: 'Sign In',
      noAccount: "Don't have an account?",
      signUp: 'Sign Up',
      errorEmail: 'Please enter a valid email',
      errorPw: 'Password must be at least 8 characters',
    },
    jp: {
      welcome: 'おかえりなさい',
      sub: 'TokaiHubにサインイン',
      emailLbl: 'メールアドレス',
      emailPlaceholder: 'you.email@tokai.ac.jp',
      password: 'パスワード',
      pwPlaceholder: '••••••••',
      signIn: 'サインイン',
      noAccount: 'アカウントをお持ちでないですか？',
      signUp: '登録する',
      errorEmail: '有効なメールアドレスを入力してください',
      errorPw: 'パスワードは8文字以上必要です',
    },
  };
  const tx = t[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError(tx.errorEmail); return;
    }
    if (password.length < 8) {
      setError(tx.errorPw); return;
    }
    setError('');
    setIsSigningIn(true);
    try {
      await signIn({ username: email, password });
      // Artificial delay to let the loading quotes/animation be seen
      setTimeout(() => {
        onSignIn(email);
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error signing in');
      setIsSigningIn(false);
    }
  };

  const inputCls = `w-full rounded-2xl px-4 py-4 font-medium outline-none focus:ring-2 focus:ring-brand-yellow transition-all text-base ${isDark ? 'bg-gray-800 text-white placeholder-gray-600' : 'bg-gray-100 text-brand-black placeholder-gray-400'
    }`;

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
          {/* Mascot — sitting on the card top edge */}
          <div
            role="img"
            aria-label="Student mascot illustration"
            className={`absolute -top-24 left-1/2 -translate-x-1/2 z-30 w-[140px] h-[140px] pointer-events-none rounded-full overflow-hidden ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}
          >
            <motion.div
              animate={{
                y: isPasswordFocused ? 10 : 0
              }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full h-full"
            >
              <AppMascot covering={isPasswordFocused} isDark={isDark} />
            </motion.div>
          </div>

          {/* Card */}
          <div
            ref={cardRef}
            className={`w-full rounded-[32px] p-6 pt-14 shadow-xl relative z-20 ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}
          >
            <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-brand-black'}`}>
              {tx.welcome}
            </h2>
            <p className={`text-xs font-medium mb-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {tx.sub}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {tx.emailLbl}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder={tx.emailPlaceholder}
                    value={email}
                    onChange={handleEmailChange}
                    onFocus={() => setIsPasswordFocused(false)}
                    className={`${inputCls} pl-11`}
                  />
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {tx.password}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder={tx.pwPlaceholder}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-500 text-xs font-bold px-1"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={isSigningIn}
                whileTap={!isSigningIn ? { scale: 0.97 } : {}}
                className={`w-full bg-brand-black text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 transition-colors mt-2 shadow-lg shadow-black/20 ${isSigningIn ? 'opacity-80 cursor-wait' : 'hover:bg-gray-800'}`}
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === 'en' ? 'Signing in…' : 'サインイン中…'}
                  </>
                ) : (
                  <>
                    {tx.signIn}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>

        {/* Sign up link */}
        <p className={`text-center mt-6 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {tx.noAccount}{' '}
          <button
            onClick={onGoToSignUp}
            className={`font-bold underline underline-offset-2 hover:opacity-70 transition-opacity ${isDark ? 'text-brand-yellow' : 'text-brand-black'}`}
          >
            {tx.signUp}
          </button>
        </p>

        <p className={`text-center mt-4 text-[10px] font-bold tracking-wide ${isDark ? 'text-gray-700' : 'text-gray-400'}`}>
          © 2026 Mohamed Fuad™
        </p>
      </motion.div>
    </div>
  );
}
