import React from 'react';
import { ChevronLeft, ChevronRight, Bell, Moon, Shield, LogOut, Code2, Pencil, BadgeCheck } from 'lucide-react';
import { ScreenProps, UserProfile } from '../App';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const t = {
  en: {
    settings: "Settings",
    preferences: "Preferences",
    notifications: "Notifications",
    darkMode: "Dark Mode",
    privacy: "Privacy & Security",
    developer: "Developer",
    devSkipAuth: "Skip Login (Dev Mode)",
    devSkipAuthSub: "Bypass auth for testing",
    logout: "Log Out",
    account: "Account",
    verified: "Verified",
    notVerified: "Not Verified",
    devVerify: "Toggle Verification Badge",
    editProfile: "Edit Profile",
    editProfileSub: "Credits, courses & GPA",
  },
  jp: {
    settings: "設定",
    preferences: "設定",
    notifications: "通知",
    darkMode: "ダークモード",
    privacy: "プライバシーとセキュリティ",
    developer: "開発者",
    devSkipAuth: "ログインをスキップ（開発モード）",
    devSkipAuthSub: "テスト用に認証をバイパス",
    logout: "ログアウト",
    account: "アカウント",
    verified: "検証済み",
    notVerified: "未検証",
    devVerify: "検証バッジを切り替え",
    editProfile: "プロフィール編集",
    editProfileSub: "単位、授業 & GPA",
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

interface SettingsProps extends ScreenProps {
  onDevSkipChange?: (val: boolean) => void;
}

const Toggle = React.memo(function Toggle({ on, onToggle, ariaLabel }: { on: boolean; onToggle: () => void; ariaLabel: string }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${on ? 'bg-brand-yellow' : 'bg-gray-300'}`}
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

export default function TokaiSettings({ lang, settings, setSettings, userProfile, setUserProfile, onSignOut, onDevSkipChange }: SettingsProps) {
  const navigate = useNavigate();
  const goBack = () => navigate(-1);
  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-800' : 'bg-brand-gray';
  const itemBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-100';
  const hoverClass = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';

  const tx = t[lang];

  const toggleDarkMode = () => setSettings(s => ({ ...s, isDarkMode: !s.isDarkMode }));
  const togglePrivacy = () => setSettings(s => ({ ...s, privacy: !s.privacy }));

  return (
    <div className="h-full relative flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 sm:p-6 pt-8 sm:pt-12 lg:pt-8 shrink-0 max-w-3xl w-full mx-auto">
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight">{tx.settings}</h1>
        <button
          onClick={() => setTimeout(goBack, 150)}
          aria-label="Go back"
          className={`w-12 h-12 rounded-full border ${borderClass} flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} active:scale-95 lg:hidden`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto overflow-x-hidden">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-3xl w-full mx-auto">

          {/* Profile Section */}
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
                {userProfile?.campus === 'shinagawa' ? (lang === 'en' ? 'Shinagawa Campus' : '品川キャンパス') :
                 userProfile?.campus === 'shonan' ? (lang === 'en' ? 'Shonan Campus' : '湘南キャンパス') : '—'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">GPA {userProfile?.cumulativeGpa?.toFixed(2) ?? '—'}</div>
            </div>
          </motion.div>

          {/* Edit Profile Button */}
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

          {/* Preferences */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h3 className={`font-bold text-xs uppercase tracking-widest px-1 ${textMuted}`}>{tx.preferences}</h3>

            <div className={`${itemBg} border ${borderClass} rounded-3xl p-2 shadow-sm`}>
              {/* Notifications (disabled) */}
              <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <Bell className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{tx.notifications}</div>
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase tracking-wider ${isDark ? 'text-pink-400 bg-pink-500/20' : 'text-pink-600 bg-pink-100'}`}>Coming Soon</div>
                  </div>
                </div>
                <Toggle on={false} onToggle={() => {}} ariaLabel={`Enable ${tx.notifications}`} />
              </div>

              {/* Dark Mode — fixed: single handler, stopPropagation in Toggle */}
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
                <Toggle on={settings.isDarkMode} onToggle={toggleDarkMode} ariaLabel={tx.darkMode} />
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
                <Toggle on={settings.privacy} onToggle={togglePrivacy} ariaLabel={tx.privacy} />
              </div>
            </div>
          </motion.div>

          {/* Developer Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <h3 className={`font-bold text-xs uppercase tracking-widest px-1 ${textMuted}`}>{tx.developer}</h3>
            <div className={`${isDark ? 'bg-gray-800 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'} border-2 rounded-3xl p-2`}>
              {/* Toggle verification badge */}
              <div
                onClick={() => setUserProfile?.({ ...userProfile!, isVerified: !userProfile?.isVerified })}
                className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl cursor-pointer transition-colors ${isDark ? 'hover:bg-yellow-500/10' : 'hover:bg-yellow-100'}`}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="font-bold text-sm">{tx.devVerify}</div>
                </div>
                <Toggle on={!!userProfile?.isVerified} onToggle={() => setUserProfile?.({ ...userProfile!, isVerified: !userProfile?.isVerified })} ariaLabel={tx.devVerify} />
              </div>

              {/* Skip login (dev mode) */}
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
                <Toggle on={settings.devSkipAuth} onToggle={() => onDevSkipChange?.(!settings.devSkipAuth)} ariaLabel={tx.devSkipAuth} />
              </div>
            </div>
          </motion.div>

          {/* Sign Out */}
          <motion.button
            variants={itemVariants}
            onClick={onSignOut}
            className={`w-full ${isDark ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40' : 'bg-red-50 text-red-600 hover:bg-red-100'} rounded-full py-4 font-bold flex items-center justify-center gap-2 transition-colors`}
          >
            <LogOut className="w-5 h-5" />
            {tx.logout}
          </motion.button>

          {/* Version + Trademark */}
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
