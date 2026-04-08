import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { getCurrentUser, fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { AnimatePresence, motion } from 'motion/react';
import { Home, Calendar, ClipboardList, Settings } from 'lucide-react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';

import TokaiAuth, { LoadingScreen } from './components/TokaiAuth';
import TokaiOnboarding from './components/TokaiOnboarding';
import { configureAmplify } from './lib/awsConfig';

configureAmplify();

// Lazy load route components — imports cached after first load
const lazyHome = () => import('./components/TokaiHome');
const lazyCourse = () => import('./components/TokaiCourse');
const lazySchedule = () => import('./components/TokaiSchedule');
const lazySettings = () => import('./components/TokaiSettings');
const lazyAssignments = () => import('./components/TokaiAssignments');
const lazyAssignmentDetail = () => import('./components/TokaiAssignmentDetail');
const lazyEditProfile = () => import('./components/TokaiEditProfile');

const TokaiHome = React.lazy(lazyHome);
const TokaiCourse = React.lazy(lazyCourse);
const TokaiSchedule = React.lazy(lazySchedule);
const TokaiSettings = React.lazy(lazySettings);
const TokaiAssignments = React.lazy(lazyAssignments);
const TokaiAssignmentDetail = React.lazy(lazyAssignmentDetail);
const TokaiEditProfile = React.lazy(lazyEditProfile);

// Preload all route components after initial paint
export function preloadRoutes() {
  lazyHome().catch(() => {});
  lazyCourse().catch(() => {});
  lazySchedule().catch(() => {});
  lazySettings().catch(() => {});
  lazyAssignments().catch(() => {});
  lazyAssignmentDetail().catch(() => {});
  lazyEditProfile().catch(() => {});
}

// Start preloading immediately to hide chunk fetch times
preloadRoutes();

export type Language = 'en' | 'jp';
export type AuthScreen = 'signIn' | 'signUp';

export interface AppSettings {
  isDarkMode: boolean;
  notifications: boolean;
  privacy: boolean;
  devSkipAuth: boolean;
  enableEnhancedUI: boolean;
  fontFamily: 'modern' | 'elegant' | 'minimal';
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
  lang: Language;
  setLang: (l: Language) => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  userProfile?: UserProfile;
  setUserProfile?: (p: UserProfile) => void;
  onSignOut?: () => void;
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

const DEFAULT_SETTINGS: AppSettings = {
  isDarkMode: false,
  notifications: true,
  privacy: true,
  devSkipAuth: false,
  enableEnhancedUI: false,
  fontFamily: 'modern',
};


interface MainAppContentProps {
  screenProps: ScreenProps;
  lang: Language;
  userProfile: UserProfile | undefined;
  isDark: boolean;
  setLang: (l: Language) => void;
  handleUpdateProfile: (updated: UserProfile) => void;
  handleDevSkipChange: (val: boolean) => void;
}

function MainAppContent({ screenProps, lang, userProfile, isDark, setLang, handleUpdateProfile, handleDevSkipChange }: MainAppContentProps) {
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
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-semibold text-[15px] transition-all duration-200 ${isActive
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
            style={{ willChange: 'opacity' }}
          >
            <Suspense fallback={
              <div className="h-full w-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-[3px] border-brand-yellow border-t-transparent animate-spin" />
              </div>
            }>
              <Routes location={location}>
                <Route path="/" element={<TokaiHome {...screenProps} />} />
                <Route path="/course/:id" element={<TokaiCourse {...screenProps} />} />
                <Route path="/schedule" element={<TokaiSchedule {...screenProps} />} />
                <Route path="/settings" element={<TokaiSettings {...screenProps} onDevSkipChange={handleDevSkipChange} />} />
                <Route path="/assignments" element={<TokaiAssignments {...screenProps} />} />
                <Route path="/assignments/:id" element={<TokaiAssignmentDetail {...screenProps} />} />
                <Route path="/editProfile" element={userProfile ? <TokaiEditProfile {...screenProps} onSave={handleUpdateProfile} /> : <Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
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

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('tokaihub_settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('signIn');
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(() => {
    try {
      const stored = localStorage.getItem('tokaihub_user_profile');
      return stored ? (JSON.parse(stored) as UserProfile) : undefined;
    } catch { return undefined; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSignOutLoading, setIsSignOutLoading] = useState(false);

  // Dynamic Font Loading & Styling
  useEffect(() => {
    const fontConfigs = {
      modern: {
        link: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Noto+Sans+JP:wght@300;400;500;700;900&display=swap',
        family: '"Outfit", "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      },
      elegant: {
        link: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&family=Shippori+Mincho:wght@400;500;600;700;800&display=swap',
        family: '"Playfair Display", "Shippori Mincho", serif'
      },
      minimal: {
        link: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800&family=Zen+Maru+Gothic:wght@300;400;500;700;900&display=swap',
        family: '"JetBrains Mono", "Zen Maru Gothic", monospace'
      }
    };

    const config = fontConfigs[settings.fontFamily || 'modern'];

    // 1. Inject/Update Font Link
    let linkElement = document.getElementById('app-font-link') as HTMLLinkElement;
    if (!linkElement) {
      linkElement = document.createElement('link');
      linkElement.id = 'app-font-link';
      linkElement.rel = 'stylesheet';
      document.head.appendChild(linkElement);
    }
    linkElement.href = config.link;

    // 2. Apply Font to Root
    document.documentElement.style.setProperty('--app-font-family', config.family);
  }, [settings.fontFamily]);

  useEffect(() => {
    async function checkAuthStatus() {
      try {
        const user = await getCurrentUser();
        const attrs = await fetchUserAttributes();
        // Apply locale from Cognito attribute so language matches what the user chose at sign-up
        if (attrs.locale) {
          setLang(attrs.locale.startsWith('ja') ? 'jp' : 'en');
        }
        // Preserve any persisted profile data (e.g. selectedCourseIds edited by the user)
        // and only fall back to defaults for fields not stored yet.
        setUserProfile(prev => ({
          name: attrs.name || 'Student',
          email: attrs.email || user.username,
          studentId: (attrs['custom:studentId'] as string) || '4CJE1108',
          campus: prev?.campus ?? 'shinagawa',
          selectedCourseIds: prev?.selectedCourseIds ?? ['mon-1-2', 'tue-1', 'tue-3'],
          cumulativeGpa: prev?.cumulativeGpa ?? 3.66,
          lastSemGpa: prev?.lastSemGpa ?? 3.73,
          isVerified: true,
        }));
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
      preloadRoutes();
      setIsLoading(false);
    }
  }, [settings.devSkipAuth]);

  // Persist userProfile to localStorage whenever it changes
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('tokaihub_user_profile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tokaihub_settings', JSON.stringify(settings));
  }, [settings]);

  const handleSignIn = async (_email: string) => {
    setIsLoading(true);

    try {
      const user = await getCurrentUser();
      const attrs = await fetchUserAttributes();

      // Restore language from Cognito locale attribute
      if (attrs.locale) {
        setLang(attrs.locale.startsWith('ja') ? 'jp' : 'en');
      }

      setUserProfile(prev => ({
        name: attrs.name || 'Student',
        email: attrs.email || user.username,
        studentId: attrs['custom:studentId'] as string,
        campus: prev?.campus ?? 'shinagawa',
        selectedCourseIds: prev?.selectedCourseIds ?? [],
        cumulativeGpa: prev?.cumulativeGpa ?? 0,
        lastSemGpa: prev?.lastSemGpa ?? 0,
        isVerified: true,
      }));

      setIsAuthenticated(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    // Clear persisted data so next login starts fresh
    localStorage.removeItem('tokaihub_user_profile');
    localStorage.removeItem('tokaihub_settings');
    // Reset URL to root so next login lands on home
    window.history.replaceState(null, '', '/');
    setIsAuthenticated(false);
    setUserProfile(undefined);
    setSettings(DEFAULT_SETTINGS);
    setAuthScreen('signIn');
  }, []);

  const handleDevSkipChange = useCallback((val: boolean) => {
    setSettings(s => ({ ...s, devSkipAuth: val }));
    if (val) {
      setUserProfile(DEV_PROFILE);
      setIsAuthenticated(true);
    } else {
      handleSignOut();
    }
  }, [handleSignOut]);

  const handleUpdateProfile = useCallback((updated: UserProfile) => {
    setUserProfile(updated);
  }, []);

  const handleOnboardingComplete = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
    setIsAuthenticated(true);
    preloadRoutes();
  }, []);

  const isDark = settings.isDarkMode;

  const screenProps: ScreenProps = React.useMemo(() => ({
    lang,
    setLang,
    settings,
    setSettings,
    userProfile,
    setUserProfile: handleUpdateProfile,
    onSignOut: handleSignOut,
  }), [lang, setLang, settings, userProfile, handleUpdateProfile, handleSignOut]);

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
    <BrowserRouter>
      <MainAppContent
        screenProps={screenProps}
        lang={lang}
        userProfile={userProfile}
        isDark={isDark}
        setLang={setLang}
        handleUpdateProfile={handleUpdateProfile}
        handleDevSkipChange={handleDevSkipChange}
      />
    </BrowserRouter>
  );
}
