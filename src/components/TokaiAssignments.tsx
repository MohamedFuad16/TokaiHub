import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { ScreenProps } from '../App';
import mascotIdle from '../assets/mascots/mascot_1_2.png';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

const deadlines = [
  { id: '1', title: { en: 'VR Project Draft', jp: 'VRプロジェクト草案' }, course: { en: 'CG & Virtual Reality', jp: 'CGとバーチャルリアリティ' }, daysLeft: 2, color: 'bg-brand-yellow', status: 'pending' },
  { id: '2', title: { en: 'Cloud Architecture Essay', jp: 'クラウドアーキテクチャレポート' }, course: { en: 'Cloud Computing', jp: 'クラウドコンピューティング' }, daysLeft: 5, color: 'bg-brand-pink', status: 'pending' },
  { id: '3', title: { en: 'Mobile App Outline', jp: 'モバイルアプリの概要' }, course: { en: 'Mobile App Dev', jp: 'モバイルアプリケーション開発' }, daysLeft: 0, color: 'bg-brand-green', status: 'submitted' },
];

const TokaiAssignments = React.memo(function TokaiAssignments({ lang, settings }: ScreenProps) {
  const navigate = useNavigate();
  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-900 text-white' : 'bg-white text-brand-black';

  return (
    <div className={`h-full flex flex-col ${bgClass}`}>
      <header className={`flex items-center gap-4 p-4 sm:p-6 pt-8 shrink-0 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
        <button onClick={() => navigate(-1)} aria-label={lang === 'en' ? 'Go back' : '戻る'} className={`w-10 h-10 rounded-full border ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'} flex items-center justify-center transition-colors`}>
          <ChevronLeft className="w-5 h-5"/>
        </button>
        <h1 className="text-2xl font-bold tracking-tight">{lang === 'en' ? 'Assignments' : '課題'}</h1>
      </header>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 space-y-4">
        {deadlines.length === 0 ? (
          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className={`w-24 h-24 rounded-full overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
              <img 
                src={mascotIdle} 
                alt="No assignments" 
                className="w-full h-full object-contain opacity-80 mix-blend-multiply" 
              />
            </div>
            <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {lang === 'en' ? 'No assignments yet' : 'まだ課題はありません'}
            </p>
          </motion.div>
        ) : deadlines.map(item => (
          <motion.div
            key={item.id}
            variants={itemVariants}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/assignments/${item.id}`)}
            className={`p-5 rounded-[32px] cursor-pointer hover:scale-[1.02] transition-transform ${item.status === 'submitted' ? (isDark ? 'bg-gray-800 opacity-60' : 'bg-gray-50 opacity-70') : item.color} ${item.status === 'submitted' && isDark ? 'text-gray-300' : 'text-brand-black'}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-3 items-center">
                <div className={`w-10 h-10 ${item.status === 'submitted' ? 'bg-green-500' : 'bg-white/40'} rounded-full flex items-center justify-center`}>
                  {item.status === 'submitted' ? <CheckCircle2 className="w-5 h-5 text-white" /> : <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <div className={`text-xs font-bold ${item.status === 'submitted' ? 'text-gray-500' : 'opacity-80'}`}>{item.course[lang]}</div>
                  <h3 className="font-bold text-lg leading-tight">{item.title[lang]}</h3>
                </div>
              </div>
            </div>
            {item.status !== 'submitted' && (
              <div className="inline-flex items-center gap-2 mt-4 bg-white/30 px-3 py-1.5 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-bold">{item.daysLeft} {lang === 'en' ? 'days left' : '日後'}</span>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

    </div>
  );
});

export default TokaiAssignments;
