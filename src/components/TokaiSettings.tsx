import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronRight, Bell, Moon, Shield, LogOut,
  Code2, BadgeCheck, CheckCircle, MessageSquare, Send, Loader2, Clock, Trash2, Smartphone, Laptop, KeyRound, Cloud,
} from 'lucide-react';
import { IS_LOCAL, createSetupCode, listDevices, removeDevice, removeSession, type HubDevice } from '../lib/api';
import { ScreenProps } from '../App';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import PageShell from './ScreenHeader';

// ─── i18n ────────────────────────────────────────────────────────────────────

const t = {
  en: {
    settings: 'Settings',
    preferences: 'Preferences',
    notifications: 'Notifications',
    darkMode: 'Dark Mode',
    privacy: 'Privacy & Security',
    developer: 'Developer',
    session: 'TIPS Session',
    sessionSub: 'Signed in with your university Microsoft account',
    minutesLeft: (m: number) => `${Math.floor(m / 60)}h ${m % 60}m left`,
    extend: 'Extend',
    clearAndLogout: IS_LOCAL ? 'Log out and clear cached data' : 'Lock and clear data on this device',
    staysSignedIn: 'Stays signed in on your Mac',
    addPhone: 'Add a device',
    addPhoneSub: 'On the phone or MacBook, open tokaihub.mohamedfuad.com, choose "Set up this device" and enter:',
    devices: 'Passkeys and signed-in devices',
    noDevices: 'No devices yet.',
    thisDevice: 'This device',
    added: 'Added',
    lastUsed: 'last used',
    remove: 'Remove',
    confirmRemove: 'Remove?',
    passkeyFrom: (d: string) => `Passkey created on ${d}`,
    synced: 'Synced with iCloud Keychain, works on your other Apple devices',
    notSynced: 'Stored on that device only',
    unknownDevice: 'Device signed in earlier',
    signOut: 'Sign out',
    confirmSignOut: 'Sign out?',
    removePasskey: 'Remove passkey',
    confirmRemovePasskey: 'Remove passkey and sign out all?',
    noSessions: 'No device signed in with it right now.',
    codeValid: 'Valid for 10 minutes, once.',
    enhancedUI: 'Enhanced UI',
    enhancedUISub: 'Enable enhanced animations and visual upgrades',
    logout: IS_LOCAL ? 'Log Out' : 'Lock this device',
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
    session: 'TIPSセッション',
    sessionSub: '大学のMicrosoftアカウントでサインイン中',
    minutesLeft: (m: number) => `残り ${Math.floor(m / 60)}時間${m % 60}分`,
    extend: '延長',
    clearAndLogout: IS_LOCAL ? 'ログアウトしてキャッシュを削除' : 'ロックしてこの端末のデータを削除',
    staysSignedIn: 'Macでサインインしたままです',
    addPhone: '端末を追加',
    addPhoneSub: 'スマホやMacBookでtokaihub.mohamedfuad.comを開き「この端末を設定」を選んで入力：',
    devices: 'パスキーとサインイン中の端末',
    noDevices: 'まだ端末はありません。',
    thisDevice: 'この端末',
    added: '追加',
    lastUsed: '最終使用',
    remove: '削除',
    confirmRemove: '削除しますか？',
    passkeyFrom: (d: string) => `${d}で作成したパスキー`,
    synced: 'iCloudキーチェーンで同期、他のApple端末でも使えます',
    notSynced: 'その端末にのみ保存',
    unknownDevice: '以前サインインした端末',
    signOut: 'サインアウト',
    confirmSignOut: 'サインアウトしますか？',
    removePasskey: 'パスキーを削除',
    confirmRemovePasskey: '削除して全端末をサインアウト？',
    noSessions: '現在このパスキーでサインイン中の端末はありません。',
    codeValid: '10分間、1回だけ有効です。',
    enhancedUI: '強化UI',
    enhancedUISub: '拡張アニメーションとビジュアルアップグレードを有効化',
    logout: IS_LOCAL ? 'ログアウト' : 'この端末をロック',
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

type SettingsProps = ScreenProps;

// ─── Passkey devices ──────────────────────────────────────────────────────────

function DeviceList({ lang, isDark, tx, borderClass, textMuted, watching, onNewDevice }: {
  lang: 'en' | 'jp'; isDark: boolean; tx: typeof t['en']; borderClass: string; textMuted: string;
  /** A setup code is on screen: poll so the new device shows up as soon as it registers. */
  watching: boolean; onNewDevice: () => void;
}) {
  const [devices, setDevices] = useState<HubDevice[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let count = -1;
    const load = () => listDevices().then(d => {
      if (!alive) return;
      const n = d.reduce((a, p) => a + 1 + p.sessions.length, 0);
      if (count >= 0 && n > count) onNewDevice();
      count = n;
      setDevices(d);
    }).catch(() => {});
    load();
    const id = setInterval(load, watching ? 3000 : 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [watching, onNewDevice]);

  const date = (iso: string | null) => iso ? new Date(iso).toLocaleString(lang === 'en' ? 'en-US' : 'ja-JP', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const phone = (label: string | null) => /iPhone|iPad|Android/.test(label ?? '');
  // Two taps: the first arms the button, the second acts.
  const twoTap = (key: string, act: () => Promise<HubDevice[]>) => async () => {
    if (confirming !== key) { setConfirming(key); return; }
    setConfirming(null);
    try { setDevices(await act()); } catch { /* signing out this device locks it */ }
  };
  const btn = (armed: boolean) => `shrink-0 h-10 min-w-10 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${armed ? 'bg-red-500 text-white' : isDark ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200'}`;

  return (
    <div className={`mt-4 pt-4 border-t ${borderClass}`}>
      <div className="flex items-center gap-2 mb-2 text-xs font-bold"><KeyRound className="w-3.5 h-3.5 text-brand-yellow" />{tx.devices}</div>
      {devices?.length === 0 && <p className={`text-xs font-medium ${textMuted}`}>{tx.noDevices}</p>}
      <div className="space-y-2">
        {devices?.map(p => (
          <div key={p.id} className={`rounded-xl p-2 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3 px-1 pb-1.5">
              {p.synced ? <Cloud className="w-4 h-4 shrink-0 text-brand-yellow" /> : <KeyRound className="w-4 h-4 shrink-0 text-brand-yellow" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">{tx.passkeyFrom(p.label)}</div>
                <div className={`text-[11px] font-medium ${textMuted}`}>{p.synced ? tx.synced : tx.notSynced}</div>
              </div>
              <button onClick={twoTap(`p:${p.id}`, () => removeDevice(p.id))} onBlur={() => setConfirming(null)} aria-label={tx.removePasskey} className={btn(confirming === `p:${p.id}`)}>
                {confirming === `p:${p.id}` ? tx.confirmRemovePasskey : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="space-y-1">
              {p.sessions.length === 0 && <p className={`px-1 text-[11px] font-medium ${textMuted}`}>{tx.noSessions}</p>}
              {p.sessions.map(d => (
                <div key={d.id} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  {phone(d.label) ? <Smartphone className="w-4 h-4 shrink-0" /> : <Laptop className="w-4 h-4 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate flex items-center gap-2">
                      {d.label ?? tx.unknownDevice}
                      {d.current && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-green-500/15 text-green-600">{tx.thisDevice}</span>}
                    </div>
                    <div className={`text-[11px] font-medium ${textMuted}`}>{d.lastUsedAt ? `${tx.lastUsed} ${date(d.lastUsedAt)}` : `${tx.added} ${date(d.createdAt)}`}</div>
                  </div>
                  <button onClick={twoTap(`s:${d.id}`, () => removeSession(d.id))} onBlur={() => setConfirming(null)} aria-label={`${tx.signOut} ${d.label ?? ''}`} className={btn(confirming === `s:${d.id}`)}>
                    {confirming === `s:${d.id}` ? tx.confirmSignOut : tx.signOut}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TokaiSettings(props: SettingsProps) {
  const { lang, settings, setSettings, userProfile, onSignOut, session, onExtendSession } = props;
  const navigate = useNavigate();
  const isDark = settings.isDarkMode;
  const [setupCode, setSetupCode] = useState<string | null>(null);
  const clearSetupCode = useCallback(() => setSetupCode(null), []);

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

  const totalCredits = userProfile?.creditsEarned ?? 0;
  const [extending, setExtending] = useState(false);

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

  // Same page frame as every other screen: menu button on phones, title, scrolling body.
  return (
    <PageShell {...props} title={tx.settings}>
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-3xl w-full">

          {/* ── Profile card ──────────────────────────────────────────────── */}
          <motion.div variants={itemVariants} className={`flex items-center gap-4 ${bgClass} p-4 sm:p-5 rounded-3xl`}>
            <div className="w-14 h-14 bg-brand-yellow rounded-full flex items-center justify-center font-bold text-xl text-brand-black shrink-0">
              {(lang === 'en' ? userProfile?.givenName : userProfile?.nameJp)?.charAt(0) ?? 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-0.5">
                <h2 className="min-w-0 font-bold text-lg leading-snug break-words">{(lang === 'en' ? userProfile?.name : userProfile?.nameJp) ?? 'TokaiHub User'}</h2>
                <AnimatePresence>
                  {!!userProfile && (
                    <motion.div
                      key="verified-badge"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="mt-1 bg-blue-500 rounded-full p-0.5 flex items-center justify-center shrink-0"
                    >
                      <BadgeCheck className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className={`text-sm font-medium ${textMuted}`}>{userProfile?.studentId ?? '—'}</p>
              <p className={`text-xs font-medium mt-0.5 ${textMuted}`}>
                {[userProfile?.department, userProfile?.campus, userProfile?.year ? (lang === 'en' ? `Year ${userProfile.year}` : `${userProfile.year}年`) : ''].filter(Boolean).join(' · ') || '—'}
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
              onClick={() => navigate('/grades')}
              className={`p-5 rounded-3xl shadow-sm cursor-pointer ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-brand-black'} border`}
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
              onClick={() => navigate('/grades')}
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
                  style={{ width: `${Math.min((totalCredits / 124) * 100, 100)}%` }}
                />
              </div>
              <p className={`text-[10px] font-bold mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-tighter`}>
                {lang === 'en' ? 'View Breakdown →' : '内訳を表示 →'}
              </p>
            </motion.div>
          </motion.div>

          {/* ── TIPS session ──────────────────────────────────────────────── */}
          <motion.div variants={itemVariants} className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${borderClass}`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-brand-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{tx.session}</div>
                <div className={`text-xs font-medium ${textMuted}`}>
                  {tx.sessionSub} · {session?.hubExpiresAt ? tx.minutesLeft(session.minutesLeft) : tx.staysSignedIn}
                </div>
              </div>
            </div>
            {session?.hubExpiresAt && <div className="flex gap-2 mt-4">
              {[30, 60, 120].map(m => (
                <button
                  key={m}
                  disabled={extending}
                  onClick={async () => { setExtending(true); await onExtendSession?.(m); setExtending(false); }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${extending ? 'opacity-60' : ''}`}
                >
                  {tx.extend} +{m}{lang === 'en' ? 'm' : '分'}
                </button>
              ))}
            </div>}
            {(!IS_LOCAL || session?.ownerId) && (
              <DeviceList lang={lang} isDark={isDark} tx={tx} borderClass={borderClass} textMuted={textMuted} watching={Boolean(setupCode && !setupCode.startsWith('! '))} onNewDevice={clearSetupCode} />
            )}
            {IS_LOCAL && session?.ownerId && (
              <div className={`mt-4 pt-4 border-t ${borderClass}`}>
                <button
                  onClick={async () => { setSetupCode(null); try { setSetupCode((await createSetupCode()).code); } catch (e) { setSetupCode(`! ${(e as Error).message}`); } }}
                  className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  <Smartphone className="w-4 h-4" />{tx.addPhone}
                </button>
                {setupCode && (setupCode.startsWith('! ')
                  ? <p className="mt-3 text-xs font-bold text-red-500">{setupCode.slice(2)}</p>
                  : (
                    <div className="mt-3 text-xs font-medium">
                      <p className={textMuted}>{tx.addPhoneSub}</p>
                      <p className="my-2 text-center text-2xl font-black tracking-[0.3em]">{setupCode}</p>
                      <p className={textMuted}>{tx.codeValid}</p>
                    </div>
                  ))}
              </div>
            )}
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
            onClick={() => onSignOut?.(true)}
            className={`w-full ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} h-10 text-xs font-bold flex items-center justify-center gap-1.5`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {tx.clearAndLogout}
          </motion.button>

          <motion.button
            variants={itemVariants}
            onClick={() => onSignOut?.(false)}
            className={`w-full ${isDark ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40' : 'bg-red-50 text-red-600 hover:bg-red-100'} rounded-full py-4 font-bold flex items-center justify-center gap-2 transition-colors`}
          >
            <LogOut className="w-5 h-5" />
            {tx.logout}
          </motion.button>

          {/* Version footer */}
          <motion.div variants={itemVariants} className="text-center pb-8 space-y-1">
            <p className={`text-xs font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>TokaiHub v1.0 PWA</p>
            <p className={`text-[10px] font-bold tracking-wide ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              © 2026 Mohamed Fuad™ — All rights reserved
            </p>
          </motion.div>

        </motion.div>
    </PageShell>
  );
}
