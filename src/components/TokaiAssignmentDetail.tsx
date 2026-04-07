import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, UploadCloud } from 'lucide-react';
import { ScreenProps } from '../App';
import type { LocalizedString } from '../lib/types';
import mascotIdle from '../assets/mascots/mascot_1_2.png';

interface AssignmentDetail {
  title: LocalizedString;
  course: LocalizedString;
  daysLeft: number;
  color: string;
  desc: LocalizedString;
}

const deadlines: Record<string, AssignmentDetail> = {
  '1': { title: { en: 'VR Project Draft', jp: 'VRプロジェクト草案' }, course: { en: 'CG & Virtual Reality', jp: 'CGとバーチャルリアリティ' }, daysLeft: 2, color: 'bg-brand-yellow', desc: { en: 'Submit a 2-page PDF outlining your VR interaction models.', jp: 'VRインタラクションモデルの概要をまとめた2ページのPDFを提出してください。' } },
  '2': { title: { en: 'Cloud Architecture Essay', jp: 'クラウドアーキテクチャレポート' }, course: { en: 'Cloud Computing', jp: 'クラウドコンピューティング' }, daysLeft: 5, color: 'bg-brand-pink', desc: { en: 'Write a comparative essay between AWS and GCP serverless runtimes.', jp: 'AWSとGCPのサーバーレスランタイムを比較するレポートを作成してください。' } },
  '3': { title: { en: 'Mobile App Outline', jp: 'モバイルアプリの概要' }, course: { en: 'Mobile App Dev', jp: 'モバイルアプリケーション開発' }, daysLeft: 0, color: 'bg-brand-green', desc: { en: 'Wireframes and Figma link submission.', jp: 'ワイヤーフレームとFigmaのリンクを提出。' } },
};

const TokaiAssignmentDetail = React.memo(function TokaiAssignmentDetail({ lang, settings }: ScreenProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isDark = settings.isDarkMode;
  
  const assignment = id ? deadlines[id] : null;

  if (!assignment) {
    return (
      <div className={`h-full flex flex-col items-center justify-center gap-4 p-8 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <img src={mascotIdle} alt="Not found" className="w-24 h-24 object-contain drop-shadow-md opacity-80" />
        <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-brand-black'}`}>
          {lang === 'en' ? 'Assignment not found' : '課題が見つかりません'}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 rounded-2xl bg-brand-black text-white font-bold text-sm hover:bg-gray-800 transition-colors"
        >
          {lang === 'en' ? 'Go Back' : '戻る'}
        </button>
      </div>
    );
  }

  const bgClass = isDark ? 'bg-gray-900 text-white' : 'bg-white text-brand-black';

  return (
    <div className={`h-full flex flex-col ${bgClass}`}>
      <header className="flex items-center gap-4 p-4 sm:p-6 pt-8 shrink-0">
        <button onClick={() => navigate(-1)} className={`w-10 h-10 rounded-full border ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'} flex items-center justify-center transition-colors`}>
          <ChevronLeft className="w-5 h-5"/>
        </button>
        <h1 className="text-xl font-bold tracking-tight truncate">{assignment.title[lang]}</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24">
        <div className={`p-6 rounded-[32px] ${assignment.color} text-brand-black`}>
          <div className="w-12 h-12 bg-white/40 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold opacity-80">{assignment.course[lang]}</div>
          <h2 className="text-3xl font-bold leading-tight mt-1">{assignment.title[lang]}</h2>
          <div className="inline-block px-3 py-1 bg-white/40 rounded-lg text-sm font-bold mt-4">
            {lang === 'en' ? `Due in ${assignment.daysLeft} days` : `残り${assignment.daysLeft}日`}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-2">{lang === 'en' ? 'Instructions' : '説明'}</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>{assignment.desc[lang]}</p>
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 p-4 border-t ${isDark ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-white/80'} backdrop-blur-xl lg:max-w-md xl:max-w-lg lg:left-[18rem] xl:left-[20rem]`}>
        <button className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ${isDark ? 'bg-white text-brand-black' : 'bg-brand-black text-white'} hover:scale-[1.02] transition-transform`}>
          <UploadCloud className="w-5 h-5" />
          {lang === 'en' ? 'Submit File' : 'ファイルを提出'}
        </button>
      </div>
    </div>
  );
});

export default TokaiAssignmentDetail;
