import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Check, BookOpen, MapPin, GraduationCap, Star, Building2, Waves, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { signUp, confirmSignUp, signIn, signOut } from 'aws-amplify/auth';
import { Language, AppSettings, UserProfile } from '../App';
import { enrollCourses, fetchAvailableCourses } from '../lib/api';
import { allItems } from '../data';
import type { CourseItem } from '../lib/types';
import mascotVerify from '../assets/mascots/mascot_1_1.png';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  onBack: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  settings: AppSettings;
}

const CAMPUSES = [
  { id: 'shinagawa', labelEn: 'Shinagawa Campus', labelJp: '品川キャンパス', icon: Building2 },
  { id: 'shonan', labelEn: 'Shonan Campus', labelJp: '湘南キャンパス', icon: Waves },
];

// Color accent per step
const STEP_COLORS = ['bg-brand-yellow', 'bg-brand-pink', 'bg-brand-green'];

/** Derives class A or B from the numeric suffix of the student ID (last 4 chars). */
function deriveStudentClass(id: string): 'A' | 'B' {
  const num = parseInt(id.slice(4), 10);
  return !isNaN(num) && num >= 1200 && num <= 1299 ? 'B' : 'A';
}

export default function TokaiOnboarding({ onComplete, onBack, lang, setLang, settings }: OnboardingProps) {
  // 0=Profile  1=GPA  2=Courses  3=OTP
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState('');

  // Step 0
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [campus, setCampus] = useState('');
  const [studentClass, setStudentClass] = useState<'A' | 'B'>('A');

  // Step 1 — GPA
  const [cumulativeGpa, setCumulativeGpa] = useState('');
  const [lastSemGpa, setLastSemGpa] = useState('');

  // Step 2 — Courses
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<CourseItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [classFilter, setClassFilter] = useState<'A' | 'B' | 'all'>('all');
  const [courseLoadAttempt, setCourseLoadAttempt] = useState(0);

  // Step 3 — OTP
  const [otpCode, setOtpCode] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isDark = settings.isDarkMode;

  // Dynamic credit limit — computed from GPA entered in step 1
  const cumGpaNum = parseFloat(cumulativeGpa);
  const maxCredits = !isNaN(cumGpaNum) && cumGpaNum > 3.8 ? 24 : 20;

  // A valid student ID is exactly 8 chars and starts with "4C"
  const studentIdValid = studentId.length === 8 && studentId.toUpperCase().startsWith('4C');

  // Fetch available courses from the API when entering step 2 or when classFilter changes.
  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    const load = async () => {
      setLoadingCourses(true);
      setCoursesError('');
      try {
        let courses: CourseItem[];
        if (classFilter === 'all') {
          const [a, b] = await Promise.all([
            fetchAvailableCourses(studentId.toUpperCase(), 'A'),
            fetchAvailableCourses(studentId.toUpperCase(), 'B'),
          ]);
          // Merge and deduplicate by id
          const seen = new Set<string>();
          courses = [...a, ...b].filter(c => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
          });
        } else {
          courses = await fetchAvailableCourses(studentId.toUpperCase(), classFilter);
        }
        if (!cancelled) {
          const merged = courses.map(apiCourse => {
            const local = (allItems as CourseItem[]).find(item => item.id === apiCourse.id || item.code === apiCourse.code);
            if (!local) return apiCourse;
            return {
              ...apiCourse,
              title: typeof apiCourse.title === 'string'
                ? { en: apiCourse.title, jp: local.title.jp }
                : (apiCourse.title ? { ...local.title, ...apiCourse.title } : local.title),
              location: typeof apiCourse.location === 'string'
                ? { en: apiCourse.location, jp: local.location?.jp || '' }
                : (apiCourse.location ? { ...local.location, ...apiCourse.location } : local.location),
              teacher: typeof apiCourse.teacher === 'string'
                ? { en: apiCourse.teacher, jp: local.teacher?.jp || '' }
                : (apiCourse.teacher ? { ...local.teacher, ...apiCourse.teacher } : local.teacher),
            };
          });
          setAvailableCourses(merged);
        }
      } catch (err: unknown) {
        if (!cancelled) setCoursesError(err instanceof Error ? err.message : 'Failed to load courses');
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [step, classFilter, studentId, courseLoadAttempt]);

  const selectedCredits = selectedCourseIds.reduce((acc, id) => {
    const c = availableCourses.find(c => c.id === id);
    return acc + (c?.credits || 0);
  }, 0);
  const creditsLeft = maxCredits - selectedCredits;

  const t = {
    en: {
      stepLabels: ['Profile', 'GPA', 'Courses'],
      // Step 0
      profileTitle: 'Create your profile',
      profileSub: 'Tell us about yourself',
      nameLbl: 'Full Name',
      namePh: 'e.g., Mohamed Al-Fuad',
      emailLbl: 'Email Address',
      emailPh: 'your.email@tokai.ac.jp',
      passwordLbl: 'Password',
      passwordPh: 'Create a password',
      idLbl: 'Student ID',
      idPh: '4C + 6 chars — e.g. 4CJE1108',
      campusLbl: 'Your Campus',
      // Step 1
      courseTitle: 'Pick your courses',
      courseSub: (max: number) => `Select up to ${max} credits`,
      creditsUsed: (u: number, max: number) => `${u} / ${max} credits`,
      tooMany: (max: number) => `You've exceeded ${max} credits`,
      // Step 2
      gpaTitle: 'Previous scores',
      gpaSub: 'Used to personalise your dashboard',
      cumGpaLbl: 'Cumulative GPA',
      semGpaLbl: 'Last Semester GPA',
      gpaPlaceholder: '0.00 – 4.30',
      // Step 3
      verifyTitle: 'Check your email',
      verifySub: 'We sent a verification code to your email',
      otpLbl: 'Verification Code',
      otpPh: 'Enter 6-digit code',
      errOtp: 'Please enter the verification code',
      verify: 'Verify Account',
      // Buttons
      next: 'Continue',
      back: 'Back',
      finish: 'Create Account',
      // Errors
      errName: 'Please enter your name',
      errEmail: 'Enter a valid email address',
      errPassword: 'Min 8 chars, 1 uppercase, 1 number, 1 special char',
      errId: 'Must be exactly 8 characters starting with 4C',
      errCampus: 'Please select a campus',
      errCourses: 'Select at least 1 course',
      errGpa: 'Enter a value between 0.00 and 4.30',
    },
    jp: {
      stepLabels: ['プロフィール', 'GPA', '授業'],
      profileTitle: 'プロフィール作成',
      profileSub: '自己紹介をしてください',
      nameLbl: '氏名',
      namePh: '例：山田 太郎',
      emailLbl: 'メールアドレス',
      emailPh: 'your.email@tokai.ac.jp',
      passwordLbl: 'パスワード',
      passwordPh: 'パスワードを作成',
      idLbl: '学籍番号',
      idPh: '4C + 6文字 — 例: 4CJE1108',
      campusLbl: 'キャンパス',
      courseTitle: '履修科目を選択',
      courseSub: (max: number) => `最大${max}単位まで`,
      creditsUsed: (u: number, max: number) => `${u} / ${max} 単位`,
      tooMany: (max: number) => `${max}単位を超えています`,
      gpaTitle: '成績の入力',
      gpaSub: 'ダッシュボードのパーソナライズに使用します',
      cumGpaLbl: '累積 GPA',
      semGpaLbl: '前学期 GPA',
      gpaPlaceholder: '0.00 – 4.30',
      verifyTitle: 'メールを確認してください',
      verifySub: 'メールアドレスに確認コードを送信しました',
      otpLbl: '確認コード',
      otpPh: '6桁のコードを入力',
      errOtp: '確認コードを入力してください',
      verify: 'アカウントの確認',
      next: '次へ',
      back: '戻る',
      finish: 'アカウント作成',
      errName: '名前を入力してください',
      errEmail: '有効なメールアドレスを入力してください',
      errPassword: '8文字以上、大文字1つ、数字1つ、記号1つが必要です',
      errId: '4Cで始まる8文字の学籍番号を入力してください',
      errCampus: 'キャンパスを選択してください',
      errCourses: '1つ以上の授業を選択してください',
      errGpa: '0.00から4.30の値を入力してください',
    },
  };
  const tx = t[lang];

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!name.trim()) e.name = tx.errName;
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) e.email = tx.errEmail;
      const pwRe = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()[\]{},.<>/?_=+\-|;:'"`~]).{8,}$/;
      if (!pwRe.test(password)) e.password = tx.errPassword;
      // Must be exactly 8 chars and start with 4C
      if (!studentIdValid) e.id = tx.errId;
      if (!campus) e.campus = tx.errCampus;
    }
    if (step === 1) {
      // GPA step — validate range 0.00–4.30
      const cumVal = parseFloat(cumulativeGpa);
      const semVal = parseFloat(lastSemGpa);
      if (isNaN(cumVal) || cumVal < 0 || cumVal > 4.3) e.cumGpa = tx.errGpa;
      if (isNaN(semVal) || semVal < 0 || semVal > 4.3) e.semGpa = tx.errGpa;
    }
    if (step === 2) {
      // Courses step
      if (selectedCourseIds.length === 0) e.courses = tx.errCourses;
      if (selectedCredits > maxCredits) e.courses = tx.tooMany(maxCredits);
    }
    if (step === 3) {
      if (otpCode.length < 3) e.otp = tx.errOtp;
    }
    return e;
  };

  const handleNext = async () => {
    const e = validateStep();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setBackendError('');

    if (step < 2) {
      // Derive student class (A/B) from student ID when leaving step 0
      if (step === 0) setStudentClass(deriveStudentClass(studentId.toUpperCase()));
      setStep(s => s + 1);
    }
    else if (step === 2) {
      setIsSubmitting(true);
      try {
        await signUp({
          // Cognito is configured with Email Alias, so the primary username cannot be an email.
          // We use the unique Student ID as the primary username instead.
          username: studentId.toUpperCase(),
          password,
          options: {
            userAttributes: {
              email: email.trim(),
              name: name.trim(),
              'custom:studentId': studentId.toUpperCase(),
              locale: lang === 'jp' ? 'ja' : 'en',
            }
          }
        });
        setStep(3);
      } catch (err: unknown) {
        setBackendError(err instanceof Error ? err.message : 'An error occurred during sign up.');
      } finally {
        setIsSubmitting(false);
      }
    }
    else if (step === 3) {
      setIsSubmitting(true);
      try {
        // ✅ Confirm user
        await confirmSignUp({
          username: studentId.toUpperCase(),
          confirmationCode: otpCode.trim()
        });

        // ⚠️ CRITICAL FIX: clear any existing session
        try {
          await signOut();
        } catch (e) {
          // ignore if no session exists
        }

        // ✅ Fresh login
        await signIn({
          username: studentId.toUpperCase(),
          password
        });

        // selectedCourseIds are API course IDs (e.g. "TTK085") — send directly to backend.
        try {
          await enrollCourses(selectedCourseIds);
        } catch (enrollErr) {
          console.error('enrollCourses failed:', enrollErr);
          // Non-fatal — user still proceeds; they can re-select later
        }

        onComplete({
          name: name.trim(),
          email: email.trim(),
          studentId: studentId.toUpperCase(),
          campus,
          selectedCourseIds,
          cumulativeGpa: parseFloat(cumulativeGpa),
          lastSemGpa: parseFloat(lastSemGpa),
        });

      } catch (err: unknown) {
        console.error(err);
        setBackendError(err instanceof Error ? err.message : 'Invalid verification code.');
        setIsSubmitting(false);
      }

    }
  };



  const toggleCourse = (id: string) => {
    const c = availableCourses.find(c => c.id === id)!;
    if (selectedCourseIds.includes(id)) {
      setSelectedCourseIds(p => p.filter(x => x !== id));
    } else {
      if (selectedCredits + (c?.credits ?? 0) > maxCredits) return;
      setSelectedCourseIds(p => [...p, id]);
    }
    setErrors({});
  };

  const inputCls = `w-full rounded-2xl px-4 py-4 font-medium outline-none focus:ring-2 focus:ring-brand-yellow transition-all text-base ${isDark ? 'bg-gray-800 text-white placeholder-gray-600' : 'bg-white text-brand-black placeholder-gray-400 shadow-sm'
    }`;

  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';

  // Full-screen loading overlay shown while creating account (step 3 submitting)
  if (isSubmitting && step === 3) {
    return (
      <div className={`h-full w-full flex flex-col items-center justify-center gap-6 transition-colors duration-500 ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-6"
        >
          <div className={`w-28 h-28 rounded-full overflow-hidden ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}>
            <motion.img
              src={mascotVerify}
              alt="Loading"
              className="w-full h-full object-contain mix-blend-multiply"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-brand-yellow' : 'text-brand-black'}`} />
            <p className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-brand-black'}`}>
              {lang === 'en' ? 'Setting up your account…' : 'アカウントを設定中…'}
            </p>
            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {lang === 'en' ? 'This only takes a moment' : 'しばらくお待ちください'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full flex flex-col items-center justify-start transition-colors duration-500 overflow-y-auto relative ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'
      }`}>
      {/* Language toggle — top right */}
      <div className="absolute top-6 right-6 flex gap-1.5 z-10">
        {(['en', 'jp'] as Language[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${lang === l
              ? (isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white')
              : (isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white/70 text-gray-500 hover:bg-white shadow-sm')
              }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="w-full max-w-lg px-4 sm:px-6 py-8 sm:py-12">

        {/* Back button */}
        <button
          onClick={() => {
            setBackendError('');
            step === 0 ? onBack() : setStep(s => s - 1);
          }}
          aria-label="Go back to previous step"
          className={`flex items-center gap-2 text-sm font-bold mb-8 transition-opacity hover:opacity-70 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
        >
          <ChevronLeft className="w-4 h-4" /> {tx.back}
        </button>

        {/* Step indicator */}
        <div className="flex gap-2 mb-8 items-center">
          {tx.stepLabels.map((label, i) => (
            i < 3 && (<React.Fragment key={i}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${i < step || step === 3
                  ? 'bg-brand-black text-white'
                  : i === step
                    ? `${STEP_COLORS[i]} text-brand-black shadow-lg`
                    : (isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-400')
                  }`}>
                  {i < step || step === 3 ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-bold hidden md:block ${i === step || step === 3 ? (isDark ? 'text-white' : 'text-brand-black') : (isDark ? 'text-gray-600' : 'text-gray-400')
                  }`}>
                  {label}
                </span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 rounded-full ${i < step || step === 3 ? 'bg-brand-black' : (isDark ? 'bg-gray-800' : 'bg-gray-300')}`} />}
            </React.Fragment>)
          ))}
        </div>

        {/* Animated step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* ── STEP 0: PROFILE ── */}
            {step === 0 && (
              <div>
                <div className="mb-6">
                  <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-brand-black'}`}>
                    {tx.profileTitle}
                  </h2>
                  <p className={`text-sm font-medium mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{tx.profileSub}</p>
                </div>

                <div className={`${cardBg} rounded-[28px] p-5 space-y-4 shadow-sm`}>
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.nameLbl}</label>
                    <input type="text" placeholder={tx.namePh} value={name}
                      onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                      className={inputCls} />
                    {errors.name && <p className="text-red-500 text-xs font-bold px-1">{errors.name}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.emailLbl}</label>
                    <div className="relative">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                      <input type="email" placeholder={tx.emailPh} value={email}
                        onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                        className={`${inputCls} pl-11`} />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs font-bold px-1">{errors.email}</p>}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.passwordLbl}</label>
                    <div className="relative">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                      <input type={showPw ? 'text' : 'password'} placeholder={tx.passwordPh} value={password}
                        onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                        className={`${inputCls} pl-11 pr-12`} />
                      <button
                        type="button"
                        onClick={() => setShowPw(p => !p)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-[10.5px] leading-tight font-bold px-1">{errors.password}</p>}
                  </div>

                  {/* Student ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.idLbl}</label>
                      <span className={`text-xs font-bold tabular-nums ${studentId.length === 8 ? 'text-green-500' : (isDark ? 'text-gray-600' : 'text-gray-400')}`}>
                        {studentId.length}/8
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={tx.idPh}
                        value={studentId}
                        maxLength={8}
                        onChange={e => {
                          // Only allow alphanumeric, force uppercase, max 8 chars
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
                          setStudentId(val);
                          setErrors(p => ({ ...p, id: '' }));
                        }}
                        className={inputCls}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      {studentIdValid && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </div>
                    {errors.id && <p className="text-red-500 text-xs font-bold px-1">{errors.id}</p>}
                  </div>

                  {/* Campus */}
                  <div className="space-y-2">
                    <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.campusLbl}</label>
                    <div className="grid grid-cols-2 gap-3">
                      {CAMPUSES.map(c => {
                        const Icon = c.icon;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setCampus(c.id); setErrors(p => ({ ...p, campus: '' })); }}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2.5 transition-all duration-200 active:scale-95 ${campus === c.id
                              ? 'border-brand-black bg-brand-yellow text-brand-black shadow-lg shadow-yellow-400/20'
                              : (isDark ? 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:text-gray-700')
                              }`}
                          >
                            <Icon className={`w-6 h-6 ${campus === c.id ? 'text-brand-black' : ''}`} />
                            <span className={`text-xs font-bold text-center leading-tight ${campus === c.id ? 'text-brand-black' : ''}`}>
                              {lang === 'en' ? c.labelEn : c.labelJp}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.campus && <p className="text-red-500 text-xs font-bold px-1">{errors.campus}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 1: GPA ── */}
            {step === 1 && (
              <div>
                <div className="mb-6">
                  <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-brand-black'}`}>
                    {tx.gpaTitle}
                  </h2>
                  <p className={`text-sm font-medium mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.gpaSub}</p>
                </div>

                <div className={`${cardBg} rounded-[28px] p-5 space-y-5 shadow-sm`}>
                  {/* Cumulative GPA */}
                  <div className="space-y-2">
                    <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.cumGpaLbl}</label>
                    <div className="relative">
                      <GraduationCap className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                      <input
                        type="number" step="0.01" min="0" max="4.3" placeholder={tx.gpaPlaceholder}
                        value={cumulativeGpa}
                        onChange={e => { setCumulativeGpa(e.target.value); setErrors(p => ({ ...p, cumGpa: '' })); }}
                        className={`${inputCls} pl-12`}
                      />
                    </div>
                    {errors.cumGpa && <p className="text-red-500 text-xs font-bold px-1">{errors.cumGpa}</p>}
                    {cumulativeGpa && !isNaN(parseFloat(cumulativeGpa)) && (
                      <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden mt-2`}>
                        <motion.div
                          animate={{ width: `${Math.min((parseFloat(cumulativeGpa) / 4.3) * 100, 100)}%` }}
                          className="h-full rounded-full bg-brand-yellow"
                        />
                      </div>
                    )}
                  </div>

                  {/* Last Semester GPA */}
                  <div className="space-y-2">
                    <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.semGpaLbl}</label>
                    <div className="relative">
                      <Star className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                      <input
                        type="number" step="0.01" min="0" max="4.3" placeholder={tx.gpaPlaceholder}
                        value={lastSemGpa}
                        onChange={e => { setLastSemGpa(e.target.value); setErrors(p => ({ ...p, semGpa: '' })); }}
                        className={`${inputCls} pl-12`}
                      />
                    </div>
                    {errors.semGpa && <p className="text-red-500 text-xs font-bold px-1">{errors.semGpa}</p>}
                    {lastSemGpa && !isNaN(parseFloat(lastSemGpa)) && (
                      <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden mt-2`}>
                        <motion.div
                          animate={{ width: `${Math.min((parseFloat(lastSemGpa) / 4.3) * 100, 100)}%` }}
                          className="h-full rounded-full bg-brand-pink"
                        />
                      </div>
                    )}
                  </div>

                  {/* Scale hint */}
                  <div className={`text-xs font-medium ${isDark ? 'text-gray-600' : 'text-gray-400'} flex justify-between`}>
                    <span>0.00 — Failing</span>
                    <span>2.00 — Passing</span>
                    <span>4.30 — Perfect</span>
                  </div>

                  {/* Credit allowance hint */}
                  {cumulativeGpa && !isNaN(parseFloat(cumulativeGpa)) && (
                    <div className={`text-xs font-bold px-3 py-2 rounded-xl text-center ${parseFloat(cumulativeGpa) > 3.8 ? 'bg-green-100 text-green-700' : (isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                      {parseFloat(cumulativeGpa) > 3.8
                        ? (lang === 'en' ? '★ GPA above 3.8 — you can enroll up to 24 credits' : '★ GPA 3.8超 — 最大24単位まで履修可能')
                        : (lang === 'en' ? 'GPA 3.8 or below — up to 20 credits allowed' : 'GPA 3.8以下 — 最大20単位まで')
                      }
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 2: COURSES ── */}
            {step === 2 && (
              <div>
                <div className="mb-4">
                  <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-brand-black'}`}>
                    {tx.courseTitle}
                  </h2>
                  <p className={`text-sm font-medium mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.courseSub(maxCredits)}</p>
                </div>

                {/* Credits bar */}
                <div className={`${cardBg} rounded-2xl p-4 mb-4 flex items-center justify-between shadow-sm`}>
                  <div className="flex-1 mr-4">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Credits</span>
                      <span className={selectedCredits > maxCredits ? 'text-red-500' : (isDark ? 'text-white' : 'text-brand-black')}>
                        {tx.creditsUsed(selectedCredits, maxCredits)}
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                      <motion.div
                        animate={{ width: `${Math.min((selectedCredits / maxCredits) * 100, 100)}%` }}
                        transition={{ duration: 0.4 }}
                        className={`h-full rounded-full ${selectedCredits > maxCredits ? 'bg-red-500' : 'bg-brand-yellow'}`}
                      />
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${selectedCredits > maxCredits
                    ? 'bg-red-100 text-red-600'
                    : creditsLeft === 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-brand-yellow text-brand-black'
                    }`}>
                    {creditsLeft}
                  </div>
                </div>

                {/* Class filter tabs */}
                <div className="flex gap-2 mb-4">
                  {(['all', 'A', 'B'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setClassFilter(f)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${classFilter === f
                        ? (isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white')
                        : (isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-500 hover:bg-gray-100 shadow-sm')
                      }`}
                    >
                      {f === 'all' ? (lang === 'en' ? 'All' : 'すべて') : `Class ${f}`}
                    </button>
                  ))}
                </div>

                {errors.courses && <p className="text-red-500 text-xs font-bold px-1 mb-3">{errors.courses}</p>}

                {/* Loading state */}
                {loadingCourses && (
                  <div className="flex items-center justify-center gap-3 py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {lang === 'en' ? 'Loading your courses…' : '授業を読み込み中…'}
                    </span>
                  </div>
                )}

                {/* Error state — shows the raw error for debugging */}
                {!loadingCourses && coursesError && (
                  <div className={`rounded-2xl p-4 space-y-3 ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
                    <p className="text-xs font-bold uppercase tracking-wide opacity-70">Course load error</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">{coursesError}</pre>
                    <button
                      type="button"
                      onClick={() => {
                        setCoursesError('');
                        setCourseLoadAttempt(n => n + 1);
                      }}
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition-colors ${isDark ? 'bg-red-800 hover:bg-red-700 text-red-200' : 'bg-red-100 hover:bg-red-200 text-red-700'}`}
                    >
                      {lang === 'en' ? 'Retry' : '再試行'}
                    </button>
                  </div>
                )}

                {/* Course list */}
                {!loadingCourses && !coursesError && (
                  <div className="space-y-3">
                    {availableCourses.map(course => {
                      const isSelected = selectedCourseIds.includes(course.id);
                      const wouldExceed = !isSelected && selectedCredits + (course.credits ?? 0) > maxCredits;
                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => toggleCourse(course.id)}
                          disabled={wouldExceed}
                          className={`w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] border-2 ${isSelected
                            ? `border-brand-black ${course.color ?? 'bg-brand-yellow'} shadow-md`
                            : wouldExceed
                              ? (isDark ? 'border-transparent bg-gray-800/50 opacity-40 cursor-not-allowed' : 'border-transparent bg-gray-100 opacity-40 cursor-not-allowed')
                              : (isDark ? 'border-transparent bg-gray-800 hover:border-gray-700' : 'border-transparent bg-white hover:border-gray-200 shadow-sm')
                            }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-brand-black border-brand-black' : (isDark ? 'border-gray-600' : 'border-gray-300')
                            }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold text-sm leading-tight truncate ${isSelected ? 'text-brand-black' : (isDark ? 'text-white' : 'text-brand-black')
                              }`}>
                              {course.title?.[lang]}
                            </div>
                            {/* Teacher row */}
                            {course.teacher && (
                              <div className={`text-xs mt-0.5 truncate ${isSelected ? 'text-brand-black/70' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                                {course.teacher?.[lang]}
                              </div>
                            )}
                            <div className={`text-xs mt-0.5 flex items-center gap-2 ${isSelected ? 'text-brand-black/70' : (isDark ? 'text-gray-500' : 'text-gray-500')
                              }`}>
                              {course.code && <span>{course.code}</span>}
                              {course.time && <><span>·</span><span>{course.time}</span></>}
                              {course.location && (
                                <>
                                  <span>·</span>
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">{course.location.en.replace('Shinagawa ', '')}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Credits badge */}
                          <div className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${isSelected
                            ? 'bg-brand-black text-white'
                            : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                            }`}>
                            {course.credits ?? '—'}cr
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: OTP VERIFICATION ── */}
            {step === 3 && (
              <div>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-brand-black'}`}>
                      {tx.verifyTitle}
                    </h2>
                    <p className={`text-sm font-medium mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{tx.verifySub}</p>
                  </div>
                  <div className={`w-20 h-20 rounded-full overflow-hidden shrink-0 ${isDark ? 'bg-gray-900' : 'bg-[#EBF2D9]'}`}>
                    <img src={mascotVerify} alt="Mascot" className="w-full h-full object-contain mix-blend-multiply" />
                  </div>
                </div>

                <div className={`${cardBg} rounded-[28px] p-5 space-y-5 shadow-sm`}>
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.otpLbl}</label>
                    <input type="text" placeholder={tx.otpPh} value={otpCode}
                      onChange={e => { setOtpCode(e.target.value); setErrors(p => ({ ...p, otp: '' })); }}
                      className={inputCls} />
                    {errors.otp && <p className="text-red-500 text-xs font-bold px-1">{errors.otp}</p>}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {backendError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-500 text-xs font-bold px-1 mt-4 text-center"
            >
              {backendError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Navigation button */}
        <motion.button
          onClick={handleNext}
          disabled={isSubmitting}
          whileTap={!isSubmitting ? { scale: 0.97 } : {}}
          className={`w-full mt-6 bg-brand-black text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-black/20 ${isSubmitting ? 'opacity-80 cursor-wait' : 'hover:bg-gray-800'}`}
        >
          {isSubmitting ? 'Processing...' : step < 2 ? tx.next : step === 2 ? tx.finish : tx.verify}
          {!isSubmitting && (step < 3 ? <ChevronRight className="w-4 h-4" /> : <Check className="w-4 h-4" />)}
        </motion.button>

        <p className={`text-center mt-4 text-xs ${isDark ? 'text-gray-700' : 'text-gray-400'}`}>
          {step < 3 ? `Step ${step + 1} of 3` : 'Step 4 of 4'}
        </p>
      </div>
    </div>
  );
}
