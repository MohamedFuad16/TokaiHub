import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, MapPin, GraduationCap, Star, Save } from 'lucide-react';
import { Language, AppSettings, UserProfile, Screen } from '../App';
import { allItems } from '../data';

interface EditProfileProps {
  goBack: () => void;
  lang: Language;
  settings: AppSettings;
  userProfile?: UserProfile;
  onSave: (profile: UserProfile) => void;
}

const MAX_CREDITS = 20;
const courses = allItems.filter(i => i.type === 'Classes');

export default function TokaiEditProfile({ goBack, lang, settings, userProfile, onSave }: EditProfileProps) {
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(userProfile?.selectedCourseIds ?? []);
  const [cumulativeGpa, setCumulativeGpa] = useState(userProfile?.cumulativeGpa?.toString() ?? '');
  const [lastSemGpa, setLastSemGpa] = useState(userProfile?.lastSemGpa?.toString() ?? '');
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  const isDark = settings.isDarkMode;
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  const selectedCredits = useMemo(() =>
    selectedCourseIds.reduce((acc, id) => {
      const c = courses.find(c => c.id === id);
      return acc + (c?.credits || 0);
    }, 0), [selectedCourseIds]);

  const creditsLeft = MAX_CREDITS - selectedCredits;

  const toggleCourse = (id: string) => {
    const c = courses.find(c => c.id === id)!;
    if (selectedCourseIds.includes(id)) {
      setSelectedCourseIds(p => p.filter(x => x !== id));
    } else {
      if (selectedCredits + c.credits > MAX_CREDITS) return;
      setSelectedCourseIds(p => [...p, id]);
    }
    setSaved(false);
  };

  const handleSave = () => {
    if (!userProfile) return;
    const gpaRe = /^([0-3](\.\d{0,2})?|4(\.0{0,2})?)$/;
    const cumValid = gpaRe.test(cumulativeGpa);
    const semValid = gpaRe.test(lastSemGpa);
    if (!cumValid || !semValid) return;

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
  };

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
      saved: '保存しました！',
      back: '戻る',
    },
  };
  const tx = t[lang];

  const inputCls = `w-full rounded-2xl px-4 py-4 font-medium outline-none focus:ring-2 focus:ring-brand-yellow transition-all text-sm ${
    isDark ? 'bg-gray-800 text-white placeholder-gray-600' : 'bg-gray-100 text-brand-black placeholder-gray-400'
  }`;
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';

  return (
    <div className="h-full relative flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 sm:p-6 pt-8 sm:pt-12 lg:pt-8 shrink-0 max-w-3xl w-full mx-auto">
        <button
          onClick={() => navigate(-1)}
          className={`w-10 h-10 rounded-full border ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'} flex items-center justify-center transition-colors active:scale-95`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight">{tx.title}</h1>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto overflow-x-hidden">
        <div className="space-y-6 max-w-3xl w-full mx-auto pb-32">

          {/* ── GPA SECTION ── */}
          <div className="space-y-3">
            <h3 className={`font-bold text-xs uppercase tracking-widest px-1 ${textMuted}`}>{tx.gpa}</h3>
            <div className={`${cardBg} rounded-[28px] p-5 space-y-4 shadow-sm ${isDark ? 'border border-gray-700' : ''}`}>
              {/* Cumulative GPA */}
              <div className="space-y-2">
                <label className={`text-xs font-bold ml-1 ${textMuted}`}>{tx.cumGpa}</label>
                <div className="relative">
                  <GraduationCap className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                  <input
                    type="number" step="0.01" min="0" max="4" placeholder={tx.gpaPlaceholder}
                    value={cumulativeGpa}
                    onChange={e => { setCumulativeGpa(e.target.value); setSaved(false); }}
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

              {/* Last Semester GPA */}
              <div className="space-y-2">
                <label className={`text-xs font-bold ml-1 ${textMuted}`}>{tx.semGpa}</label>
                <div className="relative">
                  <Star className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                  <input
                    type="number" step="0.01" min="0" max="4" placeholder={tx.gpaPlaceholder}
                    value={lastSemGpa}
                    onChange={e => { setLastSemGpa(e.target.value); setSaved(false); }}
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
          </div>

          {/* ── COURSES SECTION ── */}
          <div className="space-y-3">
            <h3 className={`font-bold text-xs uppercase tracking-widest px-1 ${textMuted}`}>{tx.courses}</h3>

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
                const isSelected = selectedCourseIds.includes(course.id);
                const wouldExceed = !isSelected && selectedCredits + course.credits > MAX_CREDITS;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => toggleCourse(course.id)}
                    disabled={wouldExceed}
                    className={`w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] border-2 ${
                      isSelected
                        ? `border-brand-black ${course.color} shadow-md`
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
                        {course.title[lang]}
                      </div>
                      <div className={`text-xs mt-0.5 flex items-center gap-2 ${
                        isSelected ? 'text-brand-black/70' : textMuted
                      }`}>
                        <span>{course.code}</span>
                        <span>·</span>
                        <span className="truncate">{course.teacher[lang]}</span>
                      </div>
                    </div>
                    <div className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      isSelected
                        ? 'bg-brand-black text-white'
                        : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                    }`}>
                      {course.credits}cr
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Floating Save Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-900 dark:via-gray-900/95 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <motion.button
            onClick={handleSave}
            whileTap={{ scale: 0.97 }}
            className={`w-full rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
              saved
                ? 'bg-green-500 text-white shadow-green-500/30'
                : 'bg-brand-black text-white hover:bg-gray-800 shadow-black/20'
            }`}
          >
            {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saved ? tx.saved : tx.save}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
