import React from 'react';
import { ChevronLeft, Bell, Moon, Shield, CircleUser, LogOut, ChevronRight } from 'lucide-react';
import { ScreenProps } from '../App';
import { motion } from 'motion/react';

const t = {
  en: {
    settings: "Settings",
    major: "ID: 4CJE1108",
    preferences: "Preferences",
    notifications: "Notifications",
    darkMode: "Dark Mode",
    privacy: "Privacy & Security",
    logout: "Log Out"
  },
  jp: {
    settings: "設定",
    major: "ID: 4CJE1108",
    preferences: "設定",
    notifications: "通知",
    darkMode: "ダークモード",
    privacy: "プライバシーとセキュリティ",
    logout: "ログアウト"
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

export default function TokaiSettings({ onNavigate, goBack, lang, settings, setSettings }: ScreenProps) {
  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-800' : 'bg-brand-gray';
  const itemBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-100';
  const hoverClass = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

  return (
    <div className="h-full relative flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-6 pt-12 shrink-0">
        <h1 className="text-[32px] font-bold tracking-tight">{t[lang].settings}</h1>
        <button
          onClick={() => setTimeout(goBack, 150)}
          className={`w-12 h-12 rounded-full border ${borderClass} flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} active:scale-95`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 px-6 py-4 overflow-y-auto overflow-x-hidden">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
          
          {/* Profile Section */}
          <motion.div variants={itemVariants} className={`flex items-center gap-4 ${bgClass} p-4 rounded-3xl`}>
            <div className="w-16 h-16 bg-brand-yellow rounded-full flex items-center justify-center">
              <CircleUser className="w-8 h-8 text-brand-black" />
            </div>
            <div>
              <h2 className="font-bold text-xl">Mohamed Fuad</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} font-medium`}>{t[lang].major}</p>
            </div>
          </motion.div>

          {/* Options */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className="font-bold text-lg px-2">{t[lang].preferences}</h3>

            <div className={`${itemBg} border ${borderClass} rounded-3xl p-2 shadow-sm space-y-2`}>
              
              {/* Notifications Toggle */}
              <div 
                className={`flex items-center justify-between p-3 rounded-2xl opacity-60 cursor-not-allowed`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-pink rounded-full flex items-center justify-center">
                    <Bell className="w-5 h-5 text-brand-black" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold">{t[lang].notifications}</span>
                    <span className="text-[10px] font-bold text-brand-pink uppercase tracking-wider">Coming Soon</span>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors bg-gray-300`}>
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm" />
                </div>
              </div>

              {/* Dark Mode Toggle */}
              <div 
                onClick={() => setSettings(s => ({...s, isDarkMode: !s.isDarkMode}))}
                className={`flex items-center justify-between p-3 ${hoverClass} rounded-2xl cursor-pointer transition-colors`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-black rounded-full flex items-center justify-center">
                    <Moon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold">{t[lang].darkMode}</span>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${settings.isDarkMode ? 'bg-brand-yellow' : 'bg-gray-300'}`}>
                  <motion.div 
                    layout
                    className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"
                    initial={false}
                    animate={{ x: settings.isDarkMode ? 24 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>

              {/* Privacy Toggle */}
              <div 
                onClick={() => setSettings(s => ({...s, privacy: !s.privacy}))}
                className={`flex items-center justify-between p-3 ${hoverClass} rounded-2xl cursor-pointer transition-colors`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-brand-black" />
                  </div>
                  <span className="font-bold">{t[lang].privacy}</span>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${settings.privacy ? 'bg-brand-black' : 'bg-gray-300'}`}>
                  <motion.div 
                    layout
                    className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"
                    initial={false}
                    animate={{ x: settings.privacy ? 24 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>

            </div>
          </motion.div>

          <motion.button 
            variants={itemVariants}
            onClick={() => onNavigate('home')}
            className={`w-full ${isDark ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40' : 'bg-red-50 text-red-600 hover:bg-red-100'} rounded-full py-4 font-bold flex items-center justify-center gap-2 transition-colors mt-8`}
          >
            <LogOut className="w-5 h-5" />
            {t[lang].logout}
          </motion.button>

          <motion.div variants={itemVariants} className="text-center pb-8">
            <p className={`text-xs font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>App Version 0.1</p>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
