import React, { useCallback, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Bell, Moon, Shield, LogOut,
  Code2, Pencil, BadgeCheck, CheckCircle, MessageSquare, Send, Loader2,
} from 'lucide-react';
import { ScreenProps, UserProfile } from '../App';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { allItems } from '../data';

// ─── i18n ────────────────────────────────────────────────────────────────────

const t = {
  en: {
    settings: 'Settings',
    preferences: 'Preferences',
    notifications: 'Notifications',
    darkMode: 'Dark Mode',
    privacy: 'Privacy & Security',
    developer: 'Developer',
    devSkipAuth: 'Skip Login (Dev Mode)',
    devSkipAuthSub: 'Bypass auth for testing',
    enhancedUI: 'Enhanced UI',
    enhancedUISub: 'Enable enhanced animations and visual upgrades',
    logout: 'Log Out',
    account: 'Account',
    verified: 'Verified',
    notVerified: 'Not Verified',
    devVerify: 'Toggle Verification Badge',
    editProfile: 'Edit Profile',
    editProfileSub: 'Credits, courses & GPA',
    feedback: 'Feedback',
    feedbackTitle: 'Send a Message',
    feedbackSub: 'Bug report or suggestion? We\'d love to hear it.',
    feedbackSubject: 'Subject',
    feedbackSubjectPh: 'e.g. Bug in schedule, Feature request…',
    feedbackBody: 'Message',
    feedbackBodyPh: 'Describe the bug or suggestion in detail…',
    feedbackSend: 'Send Feedback',
    feedbackSuccess: 'Thanks! Your mail app should open now.',
    comingSoon: 'Coming Soon',
  },
  jp: {
    settings: '設定',
    preferences: '設定',
    notifications: '通知',
    darkMode: 'ダークモード',
    privacy: 'プライバシーとセキュリティ',
    developer: '開発者',
    devSkipAuth: 'ログインをスキップ（開発モード）',
    devSkipAuthSub: 'テスト用に認証をバイパス',
    enhancedUI: '強化UI',
    enhancedUISub: '拡張アニメーションとビジュアルアップグレードを有効化',
    logout: 'ログアウト',
    account: 'アカウント',
    verified: '検証済み',
    notVerified: '未検証',
    devVerify: '検証バッジを切り替え',
    editProfile: 'プロフィール編集',
    editProfileSub: '単位、授業 & GPA',
    feedback: 'フィードバック',
    feedbackTitle: 'メッセージを送る',
    feedbackSub: 'バグ報告やご提案がありましたら、お知らせください。',
    feedbackSubject: '件名',
    feedbackSubjectPh: '例：スケジュールのバグ、機能リクエスト…',
    feedbackBody: 'メッセージ',
    feedbackBodyPh: 'バグや提案の詳細を記入してください…',
    feedbackSend: 'フィードバックを送る',
    feedbackSuccess: 'ありがとうございます！メールアプリが開きます。',
    comingSoon: '近日公開',
  },
};

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Reusable Toggle switch ───────────────────────────────────────────────────

interface ToggleProps {
  on: boolean;
  onToggle: () => void;
  ariaLabel: string;
  isDark?: boolean;
}

const Toggle = React.memo(function Toggle({ on, onToggle, ariaLabel, isDark }: ToggleProps) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${on ? 'bg-brand-yellow' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
    >
      <motion.div
        className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"
        initial={false}
        animate={{ x: on ? 24 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
});

// ─── Settings props ───────────────────────────────────────────────────────────

interface SettingsProps extends ScreenProps {
  onDevSkipChange?: (val: boolean) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TokaiSettings({
  lang, settings, setSettings, userProfile, setUserProfile, onSignOut, onDevSkipChange,
}: SettingsProps) {
  const navigate = useNavigate();
  const isDark = settings.isDarkMode;

  // Derived theme tokens
  const bgClass   = isDark ? 'bg-gray-800' : 'bg-brand-gray';
  const itemBg    = isDark ? 'bg-gray-800' : 'bg-white';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-100';
  const hoverClass  = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  const textMuted   = isDark ? 'text-gray-400' : 'text-gray-600';

  const tx = t[lang];

  // Feedback panel state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackBody, setFeedbackBody] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);

  // Total enrolled credits — computed once, reused in both the card and progress bar
  const totalCredits = useMemo(() => {
    const ids = userProfile?.selectedCourseIds ?? [];
    return allItems
      .filter(item => item.type === 'Classes' && (ids.includes(item.id) || ids.includes(item.code ?? '')))
      .reduce((acc, item) => acc + (item.credits || 0), 0);
  }, [userProfile?.selectedCourseIds]);

  const toggleDarkMode = useCallback(() => setSettings(s => ({ ...s, isDarkMode: !s.isDarkMode })), [setSettings]);
  const togglePrivacy  = useCallback(() => setSettings(s => ({ ...s, privacy: !s.privacy })), [setSettings]);

  /** Opens the system mail app with a pre-filled feedback email. */
  const handleSendFeedback = () => {
    if (!feedbackBody.trim()) return;
    setFeedbackSending(true);

    const subject = encodeURIComponent(
      feedbackSubject.trim() || (lang === 'en' ? 'TokaiHub Feedback' : 'TokaiHubフィードバック')
    );
    const body = encodeURIComponent(
      `${feedbackBody}\n\n---\nStudent: ${userProfile?.name ?? 'Unknown'} (${userProfile?.studentId ?? '—'})\nApp: TokaiHub v1.0`
    );

    window.open(`mailto:mohamed.fuad.jp@gmail.com?subject=${subject}&body=${body}`);

    setTimeout(() => {
      setFeedbackSending(false);
      setFeedbackSent(true);
      setFeedbackSubject('');
      setFeedbackBody('');
    }, 800);
  };

  return (
    <div className="h-full relative flex flex-col">

      {/* Page header */}
      <header
        style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
        className="flex justify-between items-center p-4 sm:p-6 shrink-0 max-w-3xl w-full mx-auto"
      >
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight">{tx.settings}</h1>
        <button
          onClick={() => navigate('/')}
          aria-label="Go back"
          className={`w-12 h-12 rounded-full border ${borderClass} flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} active:scale-95`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto overflow-x-hidden">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-3xl w-full mx-auto">

          {/* ── Profile card ──────────────────────────────────────────────── */}
          <motion.div variants={itemVariants} className={`flex items-center gap-4 ${bgClass} p-4 sm:p-5 rounded-3xl`}>
            <div className="w-14 h-14 bg-brand-yellow rounded-full flex items-center justify-center font-bold text-xl text-brand-black shrink-0">
              {userProfile?.name?.charAt(0) ?? 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-bold text-lg truncate">{userProfile?.name ?? 'TokaiHub User'}</h2>
                <AnimatePresence>
                  {userProfile?.isVerified && (
                    <motion.div
                      key="verified-badge"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="bg-blue-500 rounded-full p-0.5 flex items-center justify-center shrink-0"
                    >
                      <BadgeCheck className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className={`text-sm font-medium ${textMuted}`}>{userProfile?.studentId ?? '—'}</p>
              <p className={`text-xs font-medium mt-0.5 capitalize ${textMuted}`}>
                {userProfile?.campus === 'shinagawa'
                  ? (lang === 'en' ? 'Shinagawa Campus' : '品川キャンパス')
                  : userProfile?.campus === 'shonan'
                  ? (lang === 'en' ? 'Shonan Campus' : '湘南キャンパス')
                  : '—'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">
                GPA {userProfile?.cumulativeGpa?.toFixed(2) ?? '—'}
              </div>
            </div>
          </motion.div>

          {/* ── Academic overview: GPA + Credits ──────────────────────────── */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">

            {/* GPA card */}
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`p-5 rounded-3xl shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-brand-black'} border`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-brand-yellow" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GPA</span>
              </div>
              <div className="text-3xl font-bold tracking-tight text-white">
                {userProfile?.cumulativeGpa?.toFixed(2) ?? '0.00'}
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-brand-yellow transition-all duration-700"
                  style={{ width: `${Math.min(((userProfile?.cumulativeGpa || 0) / 4) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                  {lang === 'en'
                    ? `Last Sem: ${userProfile?.lastSemGpa?.toFixed(2)}`
                    : `前学期: ${userProfile?.lastSemGpa?.toFixed(2)}`}
                </span>
              </div>
            </motion.div>

            {/* Credits card */}
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/credits')}
              className={`p-5 rounded-3xl shadow-sm cursor-pointer ${isDark ? 'bg-gray-800' : 'bg-brand-gray'} border ${borderClass}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BadgeCheck className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lang === 'en' ? 'Credits' : '単位'}
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
              <div className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-brand-black'}`}>
                {totalCredits}
              </div>
              <div className={`mt-3 h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min((totalCredits / 20) * 100, 100)}%` }}
                />
              </div>
              <p className={`text-[10px] font-bold mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-tighter`}>
                {lang === 'en' ? 'View Breakdown →' : '内訳を表示 →'}
              </p>
            </motion.div>
          </motion.div>

          {/* ── Edit Profile button ────────────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <button
              onClick={() => navigate('/editProfile')}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow-sm border ${borderClass}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center shrink-0">
                  <Pencil className="w-5 h-5 text-brand-black" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm">{tx.editProfile}</div>
                  <div className={`text-xs font-medium ${textMuted}`}>{tx.editProfileSub}</div>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 ${textMuted}`} />
            </button>
          </motion.div>

          {/* ── Preferences ───────────────────────────────────────────────── */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h3 className={`font-bold text-xs uppercase tracking-widest px-1 ${textMuted}`}>{tx.preferences}</h3>
            <div className={`${itemBg} border ${borderClass} rounded-3xl p-2 shadow-sm`}>

              {/* Notifications — disabled (coming soon) */}
              <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl pointer-events-none opacity-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <Bell className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{tx.notifications}</div>
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase tracking-wider ${isDark ? 'text-pink-400 bg-pink-500/20' : 'text-pink-600 bg-pink-100'}`}>
                      {tx.comingSoon}
                    </div>
                  </div>
                </div>
                <Toggle on={false} onToggle={() => {}} ariaLabel={`Enable ${tx.notifications}`} isDark={isDark} />
              </div>

              {/* Dark mode */}
              <div
                onClick={toggleDarkMode}
                className={`flex items-center justify-between p-3 sm:p-4 ${hoverClass} rounded-2xl cursor-pointer transition-colors`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-black rounded-full flex items-center justify-center shrink-0">
                    <Moon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-sm">{tx.darkMode}</span>
                </div>
                <Toggle on={settings.isDarkMode} onToggle={toggleDarkMode} ariaLabel={tx.darkMode} isDark={isDark} />
              </div>

              {/* Privacy */}
              <div
                onClick={togglePrivacy}
                className={`flex items-center justify-between p-3 sm:p-4 ${hoverClass} rounded-2xl cursor-pointer transition-colors`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-brand-black" />
                  </div>
                  <span className="font-bold text-sm">{tx.privacy}</span>
                </div>
                <Toggle on={settings.privacy} onToggle={togglePrivacy} ariaLabel={tx.privacy} isDark={isDark} />
              </div>
            </div>
          </motion.div>

          {/* ── Appearance / font selection ───────────────────────────────── */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h3 className={`font-bold text-xs uppercase tracking-widest px-1 ${textMuted}`}>
              {lang === 'en' ? 'Appearance' : '外観'}
            </h3>
            <div className={`${itemBg} border ${borderClass} rounded-3xl p-4 shadow-sm space-y-4`}>
              <div className="flex items-center gap-3 mb-2 px-1">
                <div className={`w-8 h-8 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                  <span className="font-bold text-sm">Aa</span>
                </div>
                <span className="font-bold text-sm">{lang === 'en' ? 'App Font Style' : 'アプリのフォント'}</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'default',    name: lang === 'en' ? 'Default (Gilroy)' : 'デフォルト（ギロイ）', preview: 'Hello Tokai', family: '"Gilroy", sans-serif' },
                  { id: 'moshi_moshi', name: lang === 'en' ? 'MoshiMoshi' : 'もしもし',             preview: 'Hello Tokai', family: '"MoshiMoshi Small", sans-serif' },
                  { id: 'one_more',   name: lang === 'en' ? 'One More' : 'ワン・モア',              preview: 'Hello Tokai', family: '"One More", sans-serif' },
                ].map((font) => (
                  <button
                    key={font.id}
                    onClick={() => setSettings(s => ({ ...s, fontFamily: font.id as any }))}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${settings.fontFamily === font.id ? 'border-brand-yellow bg-brand-yellow/5' : `${borderClass} ${hoverClass}`}`}
                  >
                    <div className="text-left overflow-hidden">
                      <div className="font-bold text-[10px] mb-1 opacity-60 uppercase tracking-widest">{font.name}</div>
                      <span style={{ fontFamily: font.family }} className="text-xl font-medium whitespace-nowrap">
                        {font.preview}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center justify-center ml-2">
                      {settings.fontFamily === font.id ? (
                        <div className="w-6 h-6 bg-brand-yellow rounded-full flex items-center justify-center shadow-sm">
                          <CheckCircle className="w-4 h-4 text-brand-black" />
                        </div>
                      ) : (
                        <div className={`w-6 h-6 rounded-full border-2 ${borderClass}`} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Feedback / contact creator ────────────────────────────────── */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h3 className={`font-bold text-xs uppercase tracking-widest px-1 ${textMuted}`}>{tx.feedback}</h3>

            <div className={`${itemBg} border ${borderClass} rounded-3xl shadow-sm overflow-hidden`}>
              {/* Tap row to expand / collapse */}
              <button
                onClick={() => { setFeedbackOpen(o => !o); setFeedbackSent(false); }}
                className={`w-full flex items-center justify-between p-4 ${hoverClass} transition-colors`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-brand-black" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">{tx.feedbackTitle}</div>
                    <div className={`text-xs font-medium ${textMuted}`}>{tx.feedbackSub}</div>
                  </div>
                </div>
                <motion.div animate={{ rotate: feedbackOpen ? 90 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronRight className={`w-5 h-5 ${textMuted}`} />
                </motion.div>
              </button>

              {/* Expandable form */}
              <AnimatePresence>
                {feedbackOpen && (
                  <motion.div
                    key="feedback-form"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className={`px-4 pb-4 pt-1 space-y-3 border-t ${borderClass}`}>
                      <AnimatePresence mode="wait">
                        {feedbackSent ? (
                          /* Success state */
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-6 flex flex-col items-center gap-3 text-center"
                          >
                            <div className="w-14 h-14 bg-brand-yellow rounded-full flex items-center justify-center shadow-md">
                              <CheckCircle className="w-7 h-7 text-brand-black" />
                            </div>
                            <p className="font-bold text-sm">{tx.feedbackSuccess}</p>
                            <button
                              onClick={() => setFeedbackSent(false)}
                              className={`text-xs font-bold underline underline-offset-2 ${textMuted}`}
                            >
                              {lang === 'en' ? 'Send another' : 'もう一件送る'}
                            </button>
                          </motion.div>
                        ) : (
                          /* Input form */
                          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-2">
                            {/* Subject */}
                            <div className="space-y-1.5">
                              <label className={`text-xs font-bold ml-1 ${textMuted}`}>{tx.feedbackSubject}</label>
                              <input
                                type="text"
                                value={feedbackSubject}
                                onChange={e => setFeedbackSubject(e.target.value)}
                                placeholder={tx.feedbackSubjectPh}
                                className={`w-full rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-yellow transition-all ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-brand-black placeholder-gray-400'}`}
                              />
                            </div>

                            {/* Body */}
                            <div className="space-y-1.5">
                              <label className={`text-xs font-bold ml-1 ${textMuted}`}>{tx.feedbackBody}</label>
                              <textarea
                                value={feedbackBody}
                                onChange={e => setFeedbackBody(e.target.value)}
                                placeholder={tx.feedbackBodyPh}
                                rows={4}
                                className={`w-full rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-yellow transition-all resize-none ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-brand-black placeholder-gray-400'}`}
                              />
                            </div>

                            {/* Send button */}
                            <motion.button
                              onClick={handleSendFeedback}
                              disabled={!feedbackBody.trim() || feedbackSending}
                              whileTap={feedbackBody.trim() ? { scale: 0.97 } : {}}
                              className={`w-full bg-brand-yellow text-brand-black rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-yellow/20 ${!feedbackBody.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-95 active:scale-95'}`}
                            >
                              {feedbackSending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              {tx.feedbackSend}
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── Developer options ─────────────────────────────────────────── */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h3 className={`font-bold text-xs uppercase tracking-widest px-1 ${textMuted}`}>{tx.developer}</h3>
            <div className={`${isDark ? 'bg-gray-800 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'} border-2 rounded-3xl p-2`}>

              {/* Toggle verification badge */}
              <div
                onClick={() => userProfile && setUserProfile?.({ ...userProfile, isVerified: !userProfile.isVerified })}
                className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl cursor-pointer transition-colors ${isDark ? 'hover:bg-yellow-500/10' : 'hover:bg-yellow-100'}`}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="font-bold text-sm">{tx.devVerify}</div>
                </div>
                <Toggle
                  on={!!userProfile?.isVerified}
                  onToggle={() => userProfile && setUserProfile?.({ ...userProfile, isVerified: !userProfile.isVerified })}
                  ariaLabel={tx.devVerify}
                  isDark={isDark}
                />
              </div>

              {/* Skip login */}
              <div
                onClick={() => onDevSkipChange?.(!settings.devSkipAuth)}
                className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl cursor-pointer transition-colors ${isDark ? 'hover:bg-yellow-500/10' : 'hover:bg-yellow-100'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center shrink-0">
                    <Code2 className="w-5 h-5 text-brand-black" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{tx.devSkipAuth}</div>
                    <div className={`text-xs font-medium ${textMuted}`}>{tx.devSkipAuthSub}</div>
                  </div>
                </div>
                <Toggle
                  on={settings.devSkipAuth}
                  onToggle={() => onDevSkipChange?.(!settings.devSkipAuth)}
                  ariaLabel={tx.devSkipAuth}
                  isDark={isDark}
                />
              </div>

              {/* Enhanced UI animations */}
              <div
                onClick={() => setSettings(s => ({ ...s, enableEnhancedUI: !s.enableEnhancedUI }))}
                className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl cursor-pointer transition-colors ${isDark ? 'hover:bg-yellow-500/10' : 'hover:bg-yellow-100'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center shrink-0">
                    <Code2 className="w-5 h-5 text-brand-black" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{tx.enhancedUI}</div>
                    <div className={`text-xs font-medium ${textMuted}`}>{tx.enhancedUISub}</div>
                  </div>
                </div>
                <Toggle
                  on={settings.enableEnhancedUI}
                  onToggle={() => setSettings(s => ({ ...s, enableEnhancedUI: !s.enableEnhancedUI }))}
                  ariaLabel={tx.enhancedUI}
                  isDark={isDark}
                />
              </div>
            </div>
          </motion.div>

          {/* ── Sign out ──────────────────────────────────────────────────── */}
          <motion.button
            variants={itemVariants}
            onClick={onSignOut}
            className={`w-full ${isDark ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40' : 'bg-red-50 text-red-600 hover:bg-red-100'} rounded-full py-4 font-bold flex items-center justify-center gap-2 transition-colors`}
          >
            <LogOut className="w-5 h-5" />
            {tx.logout}
          </motion.button>

          {/* Version footer */}
          <motion.div variants={itemVariants} className="text-center pb-8 space-y-1">
            <p className={`text-xs font-bold ${isDark ? 'text-gray-700' : 'text-gray-400'}`}>TokaiHub v1.0 PWA</p>
            <p className={`text-[10px] font-bold tracking-wide ${isDark ? 'text-gray-800' : 'text-gray-300'}`}>
              © 2026 Mohamed Fuad™ — All rights reserved
            </p>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
