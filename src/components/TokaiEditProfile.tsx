import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, GraduationCap, Star, Save, AlertCircle, Loader } from 'lucide-react';
import { Language, AppSettings, UserProfile } from '../App';
import { allItems } from '../data';
import { fetchAvailableCourses, updateProfile } from '../lib/api';
import type { CourseItem } from '../lib/types';

interface EditProfileProps {
  lang: Language;
  settings: AppSettings;
  userProfile?: UserProfile;
  onSave: (profile: UserProfile) => void;
}

const MAX_CREDITS = 20;

const TokaiEditProfile = React.memo(function TokaiEditProfile({ lang, settings, userProfile, onSave }: EditProfileProps) {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(userProfile?.selectedCourseIds ?? []);
  const [cumulativeGpa, setCumulativeGpa] = useState(userProfile?.cumulativeGpa?.toString() ?? '');
  const [lastSemGpa, setLastSemGpa] = useState(userProfile?.lastSemGpa?.toString() ?? '');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  const isDark = settings.isDarkMode;
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';

  // Fetch all courses from Lambda; merge with local data for localized strings
  useEffect(() => {
    let cancelled = false;
    fetchAvailableCourses()
      .then(data => {
        if (cancelled || !data?.length) return;
        const merged = data.map((apiCourse: any) => {
          const courseCode = apiCourse.courseId ?? apiCourse.code ?? apiCourse.id;
          const local = (allItems as CourseItem[]).find(item =>
            item.code === courseCode || item.id === courseCode
          );
          const enTitle: string = apiCourse.courseName ?? apiCourse.title ?? courseCode ?? '';
          return {
            ...(local ?? {}),
            ...apiCourse,
            id: courseCode,
            code: courseCode,
            credits: apiCourse.credits ?? local?.credits,
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
        if (!cancelled) setCourses(merged);
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = (allItems as CourseItem[])
            .filter(item => item.type === 'Classes')
            .map(item => ({ ...item, id: item.code ?? item.id }));
          setCourses(fallback as CourseItem[]);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const selectedCredits = useMemo(() =>
    selectedCourseIds.reduce((acc, id) => {
      const c = courses.find(c => c.id === id || c.code === id);
      return acc + (c?.credits || 0);
    }, 0), [selectedCourseIds, courses]);

  const creditsLeft = MAX_CREDITS - selectedCredits;

  const toggleCourse = useCallback((id: string) => {
    const c = courses.find(c => c.id === id || c.code === id);
    if (!c) return;
    if (selectedCourseIds.includes(id)) {
      setSelectedCourseIds(p => p.filter(x => x !== id));
    } else {
      if (selectedCredits + (c.credits ?? 0) > MAX_CREDITS) return;
      setSelectedCourseIds(p => [...p, id]);
    }
    setSaved(false);
    setSaveError(null);
  }, [selectedCourseIds, selectedCredits, courses]);

  const handleSave = useCallback(async () => {
    if (!userProfile || isSaving) return;

    const gpaRe = /^([0-3](\.\d{0,2})?|4(\.0{0,2})?)$/;
    if (!gpaRe.test(cumulativeGpa) || !gpaRe.test(lastSemGpa)) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsSaving(true);
    setSaveError(null);

    try {
      // selectedCourseIds are already course codes (e.g. "TTK085")
      await updateProfile(
        {
          selectedCourseIds,
          cumulativeGpa: parseFloat(cumulativeGpa),
          lastSemGpa: parseFloat(lastSemGpa),
        },
        abortRef.current.signal,
      );

      onSave({
        ...userProfile,
        selectedCourseIds,
        cumulativeGpa: parseFloat(cumulativeGpa),
        lastSemGpa: parseFloat(lastSemGpa),
      });

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        navigate('/');
      }, 1200);

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Failed to save — please try again';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  }, [userProfile, isSaving, cumulativeGpa, lastSemGpa, selectedCourseIds, onSave, navigate]);

  const t = {
    en: {
      title: 'Edit Profile',
      courses: 'Selected Courses',
      coursesSub: `Select up to ${MAX_CREDITS} credits`,
      creditsUsed: (u: number, max: number) => `${u} / ${max} credits`,
      gpa: 'GPA Scores',
      cumGpa: 'Cumulative GPA',
      semGpa: 'Last Semester GPA',
      gpaPlaceholder: '0.00 – 4.00',
      save: 'Save Changes',
      saving: 'Saving…',
      saved: 'Saved!',
      back: 'Back',
    },
    jp: {
      title: 'プロフィール編集',
      courses: '履修科目',
      coursesSub: `最大${MAX_CREDITS}単位まで`,
      creditsUsed: (u: number, max: number) => `${u} / ${max} 単位`,
      gpa: 'GPA 成績',
      cumGpa: '累積 GPA',
      semGpa: '前学期 GPA',
      gpaPlaceholder: '0.00 – 4.00',
      save: '変更を保存',
      saving: '保存中…',
      saved: '保存しました！',
      back: '戻る',
    },
  };
  const tx = t[lang];

  const inputCls = `w-full rounded-2xl px-4 py-4 font-medium outline-none focus:ring-2 focus:ring-brand-yellow transition-all text-base ${
    isDark ? 'bg-gray-800 text-white placeholder-gray-600 border-gray-700' : 'bg-gray-100 text-brand-black placeholder-gray-400'
  } ${isDark ? 'border' : ''}`;
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';

  return (
    <div className="h-full relative flex flex-col">
      {/* Header */}
      <header
        style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
        className="flex items-center gap-4 p-4 sm:p-6 shrink-0 max-w-3xl w-full mx-auto"
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className={`w-10 h-10 rounded-full border ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'} flex items-center justify-center transition-colors active:scale-95`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight">{tx.title}</h1>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto overflow-x-hidden">
        <div className="space-y-6 max-w-3xl w-full mx-auto pb-32">

          {/* ── GPA SECTION ── */}
          <section className="space-y-3">
            <h3 className={`font-bold text-xs uppercase tracking-widest px-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{tx.gpa}</h3>
            <div className={`${cardBg} rounded-[28px] p-5 space-y-4 shadow-sm ${isDark ? 'border border-gray-700' : ''}`}>
              <div className="space-y-2">
                <label className={`text-xs font-bold ml-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{tx.cumGpa}</label>
                <div className="relative">
                  <GraduationCap className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                  <input
                    type="number" step="0.01" min="0" max="4" placeholder={tx.gpaPlaceholder}
                    value={cumulativeGpa}
                    onChange={e => { setCumulativeGpa(e.target.value); setSaved(false); setSaveError(null); }}
                    className={`${inputCls} pl-12`}
                  />
                </div>
                {cumulativeGpa && !isNaN(parseFloat(cumulativeGpa)) && (
                  <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                    <motion.div
                      animate={{ width: `${Math.min((parseFloat(cumulativeGpa) / 4) * 100, 100)}%` }}
                      className="h-full rounded-full bg-brand-yellow"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-bold ml-1 ${textMuted}`}>{tx.semGpa}</label>
                <div className="relative">
                  <Star className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                  <input
                    type="number" step="0.01" min="0" max="4" placeholder={tx.gpaPlaceholder}
                    value={lastSemGpa}
                    onChange={e => { setLastSemGpa(e.target.value); setSaved(false); setSaveError(null); }}
                    className={`${inputCls} pl-12`}
                  />
                </div>
                {lastSemGpa && !isNaN(parseFloat(lastSemGpa)) && (
                  <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                    <motion.div
                      animate={{ width: `${Math.min((parseFloat(lastSemGpa) / 4) * 100, 100)}%` }}
                      className="h-full rounded-full bg-brand-pink"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── COURSES SECTION ── */}
          <section className="space-y-3">
            <h3 className={`font-bold text-xs uppercase tracking-widest px-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{tx.courses}</h3>

            {/* Credits bar */}
            <div className={`${cardBg} rounded-2xl p-4 flex items-center justify-between shadow-sm ${isDark ? 'border border-gray-700' : ''}`}>
              <div className="flex-1 mr-4">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className={textMuted}>Credits</span>
                  <span className={selectedCredits > MAX_CREDITS ? 'text-red-500' : (isDark ? 'text-white' : 'text-brand-black')}>
                    {tx.creditsUsed(selectedCredits, MAX_CREDITS)}
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                  <motion.div
                    animate={{ width: `${Math.min((selectedCredits / MAX_CREDITS) * 100, 100)}%` }}
                    transition={{ duration: 0.4 }}
                    className={`h-full rounded-full ${selectedCredits > MAX_CREDITS ? 'bg-red-500' : 'bg-brand-yellow'}`}
                  />
                </div>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                selectedCredits > MAX_CREDITS
                  ? 'bg-red-100 text-red-600'
                  : creditsLeft === 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-brand-yellow text-brand-black'
              }`}>
                {creditsLeft}
              </div>
            </div>

            {/* Course list */}
            <div className="space-y-2">
              {courses.map(course => {
                const isSelected = selectedCourseIds.includes(course.id) || selectedCourseIds.includes(course.code ?? '');
                const wouldExceed = !isSelected && selectedCredits + (course.credits ?? 0) > MAX_CREDITS;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => toggleCourse(course.id)}
                    disabled={wouldExceed}
                    aria-label={`${course.title?.[lang] ?? course.id}. ${course.credits} credits.`}
                    aria-pressed={isSelected}
                    className={`w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] border-2 ${
                      isSelected
                        ? `border-brand-black ${course.color ?? 'bg-brand-yellow'} shadow-md`
                        : wouldExceed
                          ? (isDark ? 'border-transparent bg-gray-800/50 opacity-40 cursor-not-allowed' : 'border-transparent bg-gray-100 opacity-40 cursor-not-allowed')
                          : (isDark ? 'border-transparent bg-gray-800 hover:border-gray-700' : 'border-transparent bg-white hover:border-gray-200 shadow-sm')
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? 'bg-brand-black border-brand-black' : (isDark ? 'border-gray-600' : 'border-gray-300')
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm leading-tight truncate ${
                        isSelected ? 'text-brand-black' : (isDark ? 'text-white' : 'text-brand-black')
                      }`}>
                        {course.title?.[lang] ?? course.id}
                      </div>
                      <div className={`text-xs mt-0.5 ${isSelected ? 'text-brand-black/70' : textMuted}`}>
                        {course.code}
                      </div>
                    </div>
                    <div className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      isSelected
                        ? 'bg-brand-black text-white'
                        : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                    }`}>
                      {course.credits ?? '—'}cr
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

        </div>
      </div>

      {/* Floating Save Button */}
      <div
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 pointer-events-none"
      >
        <div className="max-w-3xl mx-auto pointer-events-auto space-y-3">
          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm font-medium text-red-500 leading-snug">{saveError}</p>
            </motion.div>
          )}
          <motion.button
            onClick={handleSave}
            whileTap={{ scale: isSaving ? 1 : 0.97 }}
            disabled={isSaving || saved}
            className={`w-full rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg disabled:cursor-not-allowed ${
              saved
                ? 'bg-green-500 text-white shadow-green-500/30'
                : isSaving
                  ? 'bg-gray-400 text-white shadow-none'
                  : 'bg-brand-black text-white hover:bg-gray-800 shadow-black/20'
            }`}
          >
            {saved
              ? <><Check className="w-5 h-5" />{tx.saved}</>
              : isSaving
                ? <><Loader className="w-5 h-5 animate-spin" />{tx.saving}</>
                : <><Save className="w-5 h-5" />{tx.save}</>
            }
          </motion.button>
        </div>
      </div>
    </div>
  );
});

export default TokaiEditProfile;
