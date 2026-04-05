import React, { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { AnimatePresence, motion } from 'motion/react';
import { Home, Calendar, ClipboardList, Settings } from 'lucide-react';
import { HashRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';

import TokaiHome from './components/TokaiHome';
import TokaiCourse from './components/TokaiCourse';
import TokaiSchedule from './components/TokaiSchedule';
import TokaiSettings from './components/TokaiSettings';
import TokaiAssignments from './components/TokaiAssignments';
import TokaiAssignmentDetail from './components/TokaiAssignmentDetail';
import TokaiAuth, { LoadingScreen } from './components/TokaiAuth';
import TokaiOnboarding from './components/TokaiOnboarding';
import TokaiEditProfile from './components/TokaiEditProfile';

export type Screen = string; // Legacy fallback
export type Language = 'en' | 'jp';
export type AuthScreen = 'signIn' | 'signUp';

export interface AppSettings {
  isDarkMode: boolean;
  notifications: boolean;
  privacy: boolean;
  devSkipAuth: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  studentId: string;
  campus: string;
  selectedCourseIds: string[];
  cumulativeGpa: number;
  lastSemGpa: number;
  isVerified?: boolean;
}

export interface ScreenProps {
  onNavigate?: (s: Screen, params?: any) => void; // Deprecated
  goBack?: () => void; // Deprecated
  lang: Language;
  setLang: (l: Language) => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  userProfile?: UserProfile;
  setUserProfile?: (p: UserProfile) => void;
  onSignOut?: () => void;
  params?: any; // Deprecated
}

const sidebarNav = [
  { path: '/', icon: Home, labelEn: 'Home', labelJp: 'ホーム' },
  { path: '/schedule', icon: Calendar, labelEn: 'Schedule', labelJp: 'スケジュール' },
  { path: '/assignments', icon: ClipboardList, labelEn: 'Assignments', labelJp: '課題' },
  { path: '/settings', icon: Settings, labelEn: 'Settings', labelJp: '設定' },
];

const DEV_PROFILE: UserProfile = {
  name: 'Mohamed Fuad',
  email: 'm.fuad@tokai.ac.jp',
  studentId: '4CJE1108',
  campus: 'shinagawa',
  selectedCourseIds: ['mon-1-2', 'tue-1', 'tue-2', 'tue-3', 'thu-1-2', 'thu-3-4', 'fri-1'],
  cumulativeGpa: 3.66,
  lastSemGpa: 3.73,
  isVerified: true,
};

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'ap-northeast-1_G22UBNCKK',
      userPoolClientId: '4ej101oqii0dopq22duiodvah7',
      loginWith: { email: true }
    }
  }
});

function MainAppContent({ screenProps, lang, userProfile, isDark, setLang, handleUpdateProfile, handleDevSkipChange }: any) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className={`h-[100dvh] w-full overflow-hidden flex transition-colors duration-500 ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col w-72 xl:w-80 shrink-0 h-full transition-colors duration-500 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-r`}>
        <div className="p-8 pb-4">
          <div className={`font-bold text-2xl leading-none tracking-tighter ${isDark ? 'text-white' : 'text-brand-black'}`}>
            TOKAI<br />HUB
          </div>
          <p className={`text-xs font-medium mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Student Hub v1.0</p>
          {userProfile && (
            <div className={`mt-4 flex items-center gap-3 p-3 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="w-9 h-9 bg-brand-yellow rounded-full flex items-center justify-center font-bold text-sm text-brand-black shrink-0">
                {userProfile.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-brand-black'}`}>{userProfile.name}</div>
                <div className={`text-xs font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{userProfile.studentId}</div>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {sidebarNav.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-semibold text-[15px] transition-all duration-200 ${
                  isActive
                    ? isDark
                      ? 'bg-brand-yellow text-brand-black shadow-lg shadow-yellow-500/20'
                      : 'bg-brand-black text-white shadow-lg shadow-black/20'
                    : isDark
                      ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-brand-black'
                }`}
              >
                <Icon className="w-5 h-5" />
                {lang === 'en' ? item.labelEn : item.labelJp}
              </button>
            );
          })}
        </nav>

        <div className={`p-6 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} space-y-4`}>
          <div>
            <div className={`text-xs font-bold mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Language / 言語</div>
            <div className="flex gap-2">
              {(['en', 'jp'] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                    lang === l
                      ? isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white'
                      : isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <p className={`text-[9px] font-bold tracking-wide text-center ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>
            © 2026 Mohamed Fuad™
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 h-full relative overflow-hidden transition-colors duration-500 ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
            style={{ willChange: 'opacity, transform' }}
          >
            <Routes location={location}>
               <Route path="/" element={<TokaiHome {...screenProps} />} />
               <Route path="/course/:id" element={<TokaiCourse {...screenProps} />} />
               <Route path="/schedule" element={<TokaiSchedule {...screenProps} />} />
               <Route path="/settings" element={<TokaiSettings {...screenProps} onDevSkipChange={handleDevSkipChange} />} />
               <Route path="/assignments" element={<TokaiAssignments {...screenProps} />} />
               <Route path="/assignments/:id" element={<TokaiAssignmentDetail {...screenProps} />} />
               <Route path="/editProfile" element={<TokaiEditProfile {...screenProps} onSave={handleUpdateProfile} />} />
               <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('ja') ? 'jp' : 'en';
  });

  const [settings, setSettings] = useState<AppSettings>({
    isDarkMode: false,
    notifications: true,
    privacy: true,
    devSkipAuth: false,
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('signIn');
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuthStatus() {
      try {
        const user = await getCurrentUser();
        const attrs = await fetchUserAttributes();
        setUserProfile({
          name: attrs.name || 'Student',
          email: attrs.email || user.username,
          studentId: '4CJE1108',
          campus: 'shinagawa',
          selectedCourseIds: ['mon-1-2', 'tue-1', 'tue-3'],
          cumulativeGpa: 3.66,
          lastSemGpa: 3.73,
          isVerified: true,
        });
        setIsAuthenticated(true);
      } catch (e) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }
    if (!settings.devSkipAuth) {
      checkAuthStatus();
    } else {
      setIsLoading(false);
    }
  }, [settings.devSkipAuth]);

  const handleSignIn = (id: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setUserProfile({ ...DEV_PROFILE, studentId: id });
      setIsAuthenticated(true);
      setIsLoading(false);
    }, 2500);
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setIsLoading(true);
    setTimeout(() => {
      setUserProfile(profile);
      setIsAuthenticated(true);
      setIsLoading(false);
    }, 2500);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
       console.error('Error signing out:', error);
    }
    setIsAuthenticated(false);
    setUserProfile(undefined);
    setAuthScreen('signIn');
  };

  const handleDevSkipChange = (val: boolean) => {
    setSettings(s => ({ ...s, devSkipAuth: val }));
    if (val) {
      setUserProfile(DEV_PROFILE);
      setIsAuthenticated(true);
    } else {
      handleSignOut();
    }
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    setUserProfile(updated);
  };

  const isDark = settings.isDarkMode;

  const screenProps: ScreenProps = {
    lang,
    setLang,
    settings,
    setSettings,
    userProfile,
    setUserProfile: handleUpdateProfile,
    onSignOut: handleSignOut,
  };

  if (isLoading) {
    return <LoadingScreen lang={lang} isDark={isDark} />;
  }

  if (!isAuthenticated && !settings.devSkipAuth) {
    return (
      <div className={`h-[100dvh] w-full overflow-hidden transition-colors duration-500 ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}>
        <AnimatePresence mode="wait">
          {authScreen === 'signIn' ? (
            <motion.div
              key="signIn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <TokaiAuth
                onSignIn={handleSignIn}
                onGoToSignUp={() => setAuthScreen('signUp')}
                lang={lang}
                setLang={setLang}
                settings={settings}
              />
            </motion.div>
          ) : (
            <motion.div
              key="signUp"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <TokaiOnboarding
                onComplete={handleOnboardingComplete}
                onBack={() => setAuthScreen('signIn')}
                lang={lang}
                setLang={setLang}
                settings={settings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <HashRouter>
      <MainAppContent 
         screenProps={screenProps} 
         lang={lang} 
         userProfile={userProfile} 
         isDark={isDark} 
         setLang={setLang}
         handleUpdateProfile={handleUpdateProfile}
         handleDevSkipChange={handleDevSkipChange}
      />
    </HashRouter>
  );
}
