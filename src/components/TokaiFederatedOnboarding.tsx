import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Check, GraduationCap, Star, Building2, Waves, Loader2 } from 'lucide-react';
import { updateUserAttributes } from 'aws-amplify/auth';
import { Language, AppSettings, UserProfile } from '../App';
import { enrollCourses, fetchAvailableCourses, updateProfile } from '../lib/api';
import { allItems } from '../data';
import type { CourseItem } from '../lib/types';
import TokaiSplash from './TokaiSplash';
import mascotVerify from '../assets/mascots/mascot_1_1.png';

interface FederatedOnboardingProps {
  onComplete: (profile: Partial<UserProfile>) => void;
  lang: Language;
  setLang: (l: Language) => void;
  settings: AppSettings;
}

const CAMPUSES = [
  { id: 'shinagawa', labelEn: 'Shinagawa Campus', labelJp: '品川キャンパス', icon: Building2 },
  { id: 'shonan', labelEn: 'Shonan Campus', labelJp: '湘南キャンパス', icon: Waves },
];

const STEP_COLORS = ['bg-brand-yellow', 'bg-brand-pink', 'bg-brand-green'];

export default function TokaiFederatedOnboarding({ onComplete, lang, setLang, settings }: FederatedOnboardingProps) {
  // 0=Details (ID/Campus), 1=GPA, 2=Courses
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState('');

  // Step 0
  const [studentId, setStudentId] = useState('');
  const [campus, setCampus] = useState('');

  // Step 1
  const [cumulativeGpa, setCumulativeGpa] = useState('');
  const [lastSemGpa, setLastSemGpa] = useState('');

  // Step 2
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<CourseItem[]>([]);

  const [showSplash, setShowSplash] = useState(false);
  const [completedProfile, setCompletedProfile] = useState<Partial<UserProfile> | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isDark = settings.isDarkMode;
  const cumGpaNum = parseFloat(cumulativeGpa);
  const maxCredits = !isNaN(cumGpaNum) && cumGpaNum > 3.8 ? 24 : 20;
  const studentIdValid = studentId.length === 8 && studentId.toUpperCase().startsWith('4C');

  useEffect(() => {
    if (availableCourses.length > 0) return;
    let cancelled = false;
    fetchAvailableCourses()
      .then(data => {
        if (cancelled || !data?.length) return;
        const merged = data.map((apiCourse: any) => {
          const rawId = apiCourse.courseId?.S ?? apiCourse.courseId ?? apiCourse.code ?? apiCourse.id;
          const courseCode = typeof rawId === 'object' ? rawId?.S ?? '' : String(rawId || '');

          const local = (allItems as CourseItem[]).find(item =>
            item.code === courseCode || item.id === courseCode
          );
          
          const rawName = apiCourse.courseName?.S ?? apiCourse.courseName ?? apiCourse.title ?? courseCode ?? '';
          const enTitle = typeof rawName === 'object' ? rawName?.en ?? rawName?.S ?? String(rawName) : String(rawName);

          const rawCredits = apiCourse.credits?.N ?? apiCourse.credits ?? local?.credits;
          const creds = typeof rawCredits === 'string' ? parseInt(rawCredits, 10) : Number(rawCredits);

          return {
            ...(local ?? {}),
            ...apiCourse,
            id: courseCode,
            code: courseCode,
            credits: isNaN(creds) ? local?.credits : creds,
            title: local
              ? { en: enTitle, jp: local.title.jp }
              : { en: enTitle, jp: enTitle },
            location: local?.location,
            color: local?.color,
            time: local?.time,
            dayOfWeek: local?.dayOfWeek,
            periods: local?.periods,
          } as CourseItem;
        });
        if (!cancelled) setAvailableCourses(merged);
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = (allItems as CourseItem[])
            .filter(item => item.type === 'Classes')
            .map(item => ({ ...item, id: item.code ?? item.id }));
          setAvailableCourses(fallback as CourseItem[]);
        }
      });
    return () => { cancelled = true; };
  }, [availableCourses.length]);

  const selectedCredits = selectedCourseIds.reduce((acc, id) => {
    const c = availableCourses.find(c => c.id === id);
    return acc + (c?.credits || 0);
  }, 0);
  const creditsLeft = maxCredits - selectedCredits;

  const t = {
    en: {
      stepLabels: ['Details', 'GPA', 'Courses'],
      welcomeTitle: 'Nearly there!',
      welcomeSub: 'We just need a few details to complete your profile.',
      idLbl: 'Student ID',
      idPh: '4C + 6 chars — e.g. 4CJE1108',
      campusLbl: 'Your Campus',
      courseTitle: 'Pick your courses',
      courseSub: (max: number) => `Select up to ${max} credits`,
      creditsUsed: (u: number, max: number) => `${u} / ${max} credits`,
      tooMany: (max: number) => `You've exceeded ${max} credits`,
      gpaTitle: 'Previous scores',
      gpaSub: 'Used to personalise your dashboard',
      cumGpaLbl: 'Cumulative GPA',
      semGpaLbl: 'Last Semester GPA',
      gpaPlaceholder: '0.00 – 4.30',
      next: 'Continue',
      back: 'Back',
      finish: 'Complete Setup',
      errId: 'Must be exactly 8 characters starting with 4C',
      errCampus: 'Please select a campus',
      errCourses: 'Select at least 1 course',
      errGpa: 'Enter a value between 0.00 and 4.30',
    },
    jp: {
      stepLabels: ['詳細情報', 'GPA', '授業'],
      welcomeTitle: 'あと少しです！',
      welcomeSub: 'プロフィールを完成させるためにいくつかの情報が必要です。',
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
      next: '次へ',
      back: '戻る',
      finish: '設定完了',
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
      if (!studentIdValid) e.id = tx.errId;
      if (!campus) e.campus = tx.errCampus;
    }
    if (step === 1) {
      const cumVal = parseFloat(cumulativeGpa);
      const semVal = parseFloat(lastSemGpa);
      if (isNaN(cumVal) || cumVal < 0 || cumVal > 4.3) e.cumGpa = tx.errGpa;
      if (isNaN(semVal) || semVal < 0 || semVal > 4.3) e.semGpa = tx.errGpa;
    }
    if (step === 2) {
      if (selectedCourseIds.length === 0) e.courses = tx.errCourses;
      if (selectedCredits > maxCredits) e.courses = tx.tooMany(maxCredits);
    }
    return e;
  };

  const handleNext = async () => {
    const e = validateStep();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setBackendError('');

    if (step < 2) {
      setStep(s => s + 1);
    } else {
      setIsSubmitting(true);
      try {
        // 1. Update AWS Cognito attributes for this user
        await updateUserAttributes({
          userAttributes: {
            'custom:studentId': studentId.toUpperCase(),
          }
        });

        // 2. Enroll courses
        try {
          await enrollCourses(selectedCourseIds);
        } catch (enrollErr) {
          console.error('federated onboarding course enroll failed:', enrollErr);
        }

        // 3. Update profile GPA
        try {
          await updateProfile({
            cumulativeGpa: parseFloat(cumulativeGpa),
            lastSemGpa: parseFloat(lastSemGpa)
          });
        } catch (profileErr) {
          console.error('federated onboarding profile update failed:', profileErr);
        }

        setCompletedProfile({
          studentId: studentId.toUpperCase(),
          campus,
          selectedCourseIds,
          cumulativeGpa: parseFloat(cumulativeGpa),
          lastSemGpa: parseFloat(lastSemGpa),
        });
        setShowSplash(true);

      } catch (err: unknown) {
        setBackendError(err instanceof Error ? err.message : 'Error completing setup.');
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

  const inputCls = `w-full rounded-2xl px-4 py-4 font-medium outline-none focus:ring-2 focus:ring-brand-yellow transition-all text-base ${isDark ? 'bg-gray-800 text-white placeholder-gray-600' : 'bg-white text-brand-black placeholder-gray-400 shadow-sm'}`;
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';

  if (showSplash && completedProfile) {
    return (
      <TokaiSplash
        lang={lang}
        isDark={isDark}
        onDone={() => onComplete(completedProfile as UserProfile)}
      />
    );
  }

  if (isSubmitting) {
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
              {lang === 'en' ? 'Finalizing your account…' : 'アカウントを確定中…'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] w-full flex flex-col items-center justify-start transition-colors duration-500 overflow-y-auto relative ${isDark ? 'bg-gray-950' : 'bg-[#EBF2D9]'}`}>
      <div className="absolute top-6 right-6 flex gap-1.5 z-10">
        {(['en', 'jp'] as Language[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${lang === l ? (isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white') : (isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white/70 text-gray-500 hover:bg-white shadow-sm')}`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="w-full max-w-lg px-4 sm:px-6 py-8 sm:py-12 mt-10">
        
        {step > 0 && (
          <button
            onClick={() => { setBackendError(''); setStep(s => s - 1); }}
            aria-label="Go back"
            className={`flex items-center gap-2 text-sm font-bold mb-8 transition-opacity hover:opacity-70 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
          >
            <ChevronLeft className="w-4 h-4" /> {tx.back}
          </button>
        )}

        <div className="flex gap-2 mb-8 items-center">
          {tx.stepLabels.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${i <= step ? `${STEP_COLORS[i]} text-brand-black shadow-lg` : (isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-400')}`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-bold hidden md:block ${i <= step ? (isDark ? 'text-white' : 'text-brand-black') : (isDark ? 'text-gray-600' : 'text-gray-400')}`}>
                  {label}
                </span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 rounded-full ${i < step ? 'bg-brand-black' : (isDark ? 'bg-gray-800' : 'bg-gray-300')}`} />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
            
            {/* ── STEP 0: DETAILS ── */}
            {step === 0 && (
              <div>
                <div className="mb-6">
                  <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-brand-black'}`}>
                    {tx.welcomeTitle}
                  </h2>
                  <p className={`text-sm font-medium mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{tx.welcomeSub}</p>
                </div>
                <div className={`${cardBg} rounded-[28px] p-5 space-y-4 shadow-sm`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.idLbl}</label>
                      <span className={`text-xs font-bold tabular-nums ${studentId.length === 8 ? 'text-green-500' : (isDark ? 'text-gray-600' : 'text-gray-400')}`}>
                        {studentId.length}/8
                      </span>
                    </div>
                    <div className="relative">
                      <input type="text" placeholder={tx.idPh} value={studentId} maxLength={8}
                        onChange={e => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
                          setStudentId(val); setErrors(p => ({ ...p, id: '' }));
                        }} className={inputCls} />
                      {studentIdValid && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Check className="w-4 h-4 text-green-500" /></div>}
                    </div>
                    {errors.id && <p className="text-red-500 text-xs font-bold px-1">{errors.id}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.campusLbl}</label>
                    <div className="grid grid-cols-2 gap-3">
                      {CAMPUSES.map(c => {
                        const Icon = c.icon;
                        return (
                          <button key={c.id} type="button" onClick={() => { setCampus(c.id); setErrors(p => ({ ...p, campus: '' })); }}
                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2.5 transition-all duration-200 active:scale-95 ${campus === c.id ? 'border-brand-black bg-brand-yellow text-brand-black shadow-lg shadow-yellow-400/20' : (isDark ? 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:text-gray-700')}`}
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
                  <div className="space-y-2">
                    <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.cumGpaLbl}</label>
                    <div className="relative">
                      <GraduationCap className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                      <input type="number" step="0.01" min="0" max="4.3" placeholder={tx.gpaPlaceholder} value={cumulativeGpa} onChange={e => { setCumulativeGpa(e.target.value); setErrors(p => ({ ...p, cumGpa: '' })); }} className={`${inputCls} pl-12`} />
                    </div>
                    {errors.cumGpa && <p className="text-red-500 text-xs font-bold px-1">{errors.cumGpa}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.semGpaLbl}</label>
                    <div className="relative">
                      <Star className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                      <input type="number" step="0.01" min="0" max="4.3" placeholder={tx.gpaPlaceholder} value={lastSemGpa} onChange={e => { setLastSemGpa(e.target.value); setErrors(p => ({ ...p, semGpa: '' })); }} className={`${inputCls} pl-12`} />
                    </div>
                    {errors.semGpa && <p className="text-red-500 text-xs font-bold px-1">{errors.semGpa}</p>}
                  </div>
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
                <div className={`${cardBg} rounded-2xl p-4 mb-4 flex items-center justify-between shadow-sm`}>
                  <div className="flex-1 mr-4">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{lang === 'en' ? 'Credits' : '単位'}</span>
                      <span className={selectedCredits > maxCredits ? 'text-red-500' : (isDark ? 'text-white' : 'text-brand-black')}>{tx.creditsUsed(selectedCredits, maxCredits)}</span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                      <motion.div animate={{ width: `${Math.min((selectedCredits / maxCredits) * 100, 100)}%` }} transition={{ duration: 0.4 }} className={`h-full rounded-full ${selectedCredits > maxCredits ? 'bg-red-500' : 'bg-brand-yellow'}`} />
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${selectedCredits > maxCredits ? 'bg-red-100 text-red-600' : creditsLeft === 0 ? 'bg-green-100 text-green-700' : 'bg-brand-yellow text-brand-black'}`}>
                    {creditsLeft}
                  </div>
                </div>
                {errors.courses && <p className="text-red-500 text-xs font-bold px-1 mb-3">{errors.courses}</p>}
                <div className="space-y-3 pb-8">
                  {availableCourses.map(course => {
                    const isSelected = selectedCourseIds.includes(course.id);
                    const wouldExceed = !isSelected && selectedCredits + (course.credits ?? 0) > maxCredits;
                    return (
                      <button key={course.id} type="button" onClick={() => toggleCourse(course.id)} disabled={wouldExceed} className={`w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] border-2 ${isSelected ? `border-brand-black ${course.color ?? 'bg-brand-yellow'} shadow-md` : wouldExceed ? (isDark ? 'border-transparent bg-gray-800/50 opacity-40 cursor-not-allowed' : 'border-transparent bg-gray-100 opacity-40 cursor-not-allowed') : (isDark ? 'border-transparent bg-gray-800 hover:border-gray-700' : 'border-transparent bg-white hover:border-gray-200 shadow-sm')}`}>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-brand-black border-brand-black' : (isDark ? 'border-gray-600' : 'border-gray-300')}`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-sm leading-tight truncate ${isSelected ? 'text-brand-black' : (isDark ? 'text-white' : 'text-brand-black')}`}>
                            {course.title?.[lang]}
                          </div>
                          <div className={`text-xs mt-0.5 ${isSelected ? 'text-brand-black/70' : (isDark ? 'text-gray-500' : 'text-gray-500')}`}>
                            {course.code}
                          </div>
                        </div>
                        <div className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${isSelected ? 'bg-brand-black text-white' : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')}`}>
                          {course.credits ?? '—'}cr
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {backendError && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-xs font-bold px-1 mt-4 text-center">
              {backendError}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button onClick={handleNext} disabled={isSubmitting} whileTap={!isSubmitting ? { scale: 0.97 } : {}} className={`w-full mt-6 bg-brand-black text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-black/20 ${isSubmitting ? 'opacity-80 cursor-wait' : 'hover:bg-gray-800'}`}>
          {step < 2 ? tx.next : tx.finish}
          {!isSubmitting && (step < 2 ? <ChevronRight className="w-4 h-4" /> : <Check className="w-4 h-4" />)}
        </motion.button>
        <p className={`text-center mt-4 text-xs ${isDark ? 'text-gray-700' : 'text-gray-400'}`}>
          {`Step ${step + 1} of 3`}
        </p>
      </div>
    </div>
  );
}
