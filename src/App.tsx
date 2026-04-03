import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import TokaiHome from './components/TokaiHome';
import TokaiCourse from './components/TokaiCourse';
import TokaiSchedule from './components/TokaiSchedule';
import TokaiSettings from './components/TokaiSettings';
import TokaiAssignments from './components/TokaiAssignments';

export type Screen = 'home' | 'course' | 'schedule' | 'settings' | 'assignments';
export type Language = 'en' | 'jp';

export interface AppSettings {
  isDarkMode: boolean;
  notifications: boolean;
  privacy: boolean;
}

export interface ScreenProps {
  onNavigate: (s: Screen, params?: any) => void;
  goBack: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  params?: any;
}

export default function App() {
  const [history, setHistory] = useState<{ screen: Screen, params?: any }[]>([{ screen: 'home' }]);
  const currentScreenObj = history[history.length - 1];
  const currentScreen = currentScreenObj.screen;
  const currentParams = currentScreenObj.params;

  const handleNavigate = (s: Screen, params?: any) => {
    setHistory(prev => [...prev, { screen: s, params }]);
  };

  const goBack = () => {
    setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : [{ screen: 'home' }]);
  };

  const [lang, setLang] = useState<Language>(() => {
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('ja') ? 'jp' : 'en';
  });
  const [settings, setSettings] = useState<AppSettings>({
    isDarkMode: false,
    notifications: true,
    privacy: true
  });

  const screenProps: ScreenProps = {
    onNavigate: handleNavigate,
    goBack,
    lang,
    setLang,
    settings,
    setSettings,
    params: currentParams
  };

  return (
    <div className={`h-[100dvh] w-full overflow-hidden flex items-center justify-center sm:p-4 transition-colors duration-500 ${settings.isDarkMode ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}>
      <div className={`w-full h-full max-w-md relative sm:rounded-[40px] sm:shadow-2xl overflow-hidden transition-colors duration-500 ${settings.isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {currentScreen === 'home' && <TokaiHome {...screenProps} />}
            {currentScreen === 'course' && <TokaiCourse {...screenProps} />}
            {currentScreen === 'schedule' && <TokaiSchedule {...screenProps} />}
            {currentScreen === 'settings' && <TokaiSettings {...screenProps} />}
            {currentScreen === 'assignments' && <TokaiAssignments {...screenProps} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
