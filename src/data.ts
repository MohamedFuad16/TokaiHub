import { BookOpen } from 'lucide-react';

export const allItems = [
  { 
    id: 'mon-1-2', 
    type: 'Classes', 
    title: { en: 'CG & Virtual Reality', jp: 'CGとバーチャルリアリティ' }, 
    teacher: { en: 'Kyoko Hasegawa', jp: '長谷川 恭子' }, 
    location: { en: 'Shinagawa 1B303', jp: '品川キャンパス 1B303 コンピュータ室' },
    dayOfWeek: 1, // Monday
    periods: [1, 2],
    time: '09:00 - 12:10', 
    color: 'bg-brand-pink', 
    image: 'https://picsum.photos/seed/vr/400/300', 
    icon: BookOpen, 
    action: 'course',
    code: 'TTK085',
    credits: 3,
    evaluation: { en: 'Attendance/Lab 40% + Report 60%', jp: '出席・実験取組 40% / 課題成果物・レポート 60% (期限厳守、遅延不可)' },
    evaluationBreakdown: [
      { label: { en: 'Attendance/Lab', jp: '出席・実験' }, percentage: 40, color: 'bg-brand-yellow' },
      { label: { en: 'Report', jp: 'レポート' }, percentage: 60, color: 'bg-brand-pink' }
    ],
    overview: { en: 'Learn 3D CG (modeling, coordinate transformation, rendering) using OpenGL, and create original VR works using a game engine.', jp: 'OpenGLによる3次元CG（モデリング・座標変換・レンダリング）の基礎を習得し、ゲームエンジンを用いたVR開発でオリジナル作品を制作する。PC演習中心。フィードバックはTeams経由。' }
  },
  { 
    id: 'tue-1', 
    type: 'Classes', 
    title: { en: 'Technical English', jp: '技術英語' }, 
    teacher: { en: 'Sora Yamamoto', jp: '山本 宙' }, 
    location: { en: 'Shinagawa 4102', jp: '品川キャンパス 4102' },
    dayOfWeek: 2, // Tuesday
    periods: [1],
    time: '09:00 - 10:30', 
    color: 'bg-brand-green', 
    image: 'https://picsum.photos/seed/english/400/300', 
    icon: BookOpen, 
    action: 'course',
    code: 'TTK000',
    credits: 2,
    evaluation: { en: 'Assignments & Rubric Evaluation', jp: '課題・ルーブリック評価' },
    evaluationBreakdown: [
      { label: { en: 'Assignments', jp: '課題' }, percentage: 100, color: 'bg-brand-green' }
    ],
    overview: { en: 'Reading technical documents, English presentations, engineering/IT specialized English expressions, and practical writing.', jp: '技術文書の読解・英語プレゼンテーション・工学/IT専門英語表現・ライティングの実践。シラバスPDF持参。' }
  },
  { 
    id: 'tue-2', 
    type: 'Classes', 
    title: { en: 'Software Design Modeling', jp: 'ソフトウェア設計モデリング' }, 
    teacher: { en: 'Harumi Watanabe', jp: '渡辺 晴美' }, 
    location: { en: 'Shinagawa 4202', jp: '品川キャンパス 4202' },
    dayOfWeek: 2,
    periods: [2],
    time: '10:40 - 12:10', 
    color: 'bg-brand-yellow', 
    image: 'https://picsum.photos/seed/software/400/300', 
    icon: BookOpen, 
    action: 'course',
    code: 'TTK031',
    credits: 2,
    evaluation: { en: 'Teams Assignments 20% + Midterm 20% + Final 20% + Group Minutes 20% + Presentation 20%', jp: 'Teams課題(第1-8回) 20% / 中間レポート 20% / 期末レポート 20% / グループワーク議事録 20% / グループ発表 20%' },
    evaluationBreakdown: [
      { label: { en: 'Assignments', jp: '課題' }, percentage: 20, color: 'bg-brand-yellow' },
      { label: { en: 'Midterm', jp: '中間レポート' }, percentage: 20, color: 'bg-brand-pink' },
      { label: { en: 'Final', jp: '期末レポート' }, percentage: 20, color: 'bg-brand-green' },
      { label: { en: 'Minutes', jp: '議事録' }, percentage: 20, color: 'bg-blue-400' },
      { label: { en: 'Presentation', jp: '発表' }, percentage: 20, color: 'bg-orange-400' }
    ],
    overview: { en: 'Software design and modeling using UML. PBL group exercises based on QCD principles.', jp: 'UMLを用いたソフトウェア設計・モデリング。QCD原則に基づくPBLグループ演習（テーマ選定→モデリング→発表）。企業での実務経験をもとに指導。Teamsコード: atu6xe6' }
  },
  { 
    id: 'tue-3', 
    type: 'Classes', 
    title: { en: 'Cloud Computing', jp: 'クラウドコンピューティング' }, 
    teacher: { en: 'Junichi Murayama', jp: '村山 純一' }, 
    location: { en: 'Shinagawa 4105', jp: '品川キャンパス 4105' },
    dayOfWeek: 2,
    periods: [3],
    time: '13:00 - 14:30', 
    color: 'bg-blue-200', 
    image: 'https://picsum.photos/seed/cloud/400/300', 
    icon: BookOpen, 
    action: 'course',
    code: 'TTK060',
    credits: 2,
    evaluation: { en: 'Quizzes (Cumulative). S:90-100% / A:80-89% / B:70-79% / C:60-69%', jp: '毎回小テスト（累積点のみ）。S:90-100% / A:80-89% / B:70-79% / C:60-69%。出席率66%以下は評価対象外。開始20分超過の遅刻は欠席扱い。' },
    evaluationBreakdown: [
      { label: { en: 'Quizzes', jp: '小テスト' }, percentage: 100, color: 'bg-blue-400' }
    ],
    overview: { en: 'Virtualization technology, IaaS/PaaS/SaaS, client-server communication technology.', jp: '仮想化技術・IaaS/PaaS/SaaS・クライアントサーバ型通信技術。毎回ノートPC持参必須。参考書: 西村泰洋「図解まるわかり クラウドの仕組み」(翔泳社)' }
  },
  { 
    id: 'thu-1-2', 
    type: 'Classes', 
    title: { en: 'Human Interface', jp: 'ヒューマンインタフェース' }, 
    teacher: { en: 'Hironori Nakatani / Yoshio Kakizaki', jp: '中谷 裕教 / 柿崎 淑郎' }, 
    location: { en: 'Shinagawa 1B202', jp: '品川キャンパス 1B202 通信ネットワーク特殊実験室' },
    dayOfWeek: 4, // Thursday
    periods: [1, 2],
    time: '09:00 - 12:10', 
    color: 'bg-orange-200', 
    image: 'https://picsum.photos/seed/interface/400/300', 
    icon: BookOpen, 
    action: 'course',
    code: 'TTK035',
    credits: 3,
    evaluation: { en: 'Written Exam + Report', jp: '筆記試験 + レポート。出席率2/3未満は評価対象外' },
    evaluationBreakdown: [
      { label: { en: 'Exam', jp: '筆記試験' }, percentage: 50, color: 'bg-orange-400' },
      { label: { en: 'Report', jp: 'レポート' }, percentage: 50, color: 'bg-brand-pink' }
    ],
    overview: { en: 'Measurement and analysis of human cognitive functions and behavioral characteristics, HCI and cybersecurity, information design.', jp: '人の認知機能・行動特性の計測と分析、HCIとサイバーセキュリティ、情報デザイン。講義＋演習形式。アクティブラーニング科目。' }
  },
  { 
    id: 'thu-3-4', 
    type: 'Classes', 
    title: { en: 'Mobile App Dev', jp: 'モバイルアプリケーション開発' }, 
    teacher: { en: 'Mikako Sato', jp: '佐藤 未来子' }, 
    location: { en: 'Shinagawa 1B202', jp: '品川キャンパス 1B202 通信ネットワーク特殊実験室' },
    dayOfWeek: 4,
    periods: [3, 4],
    time: '13:00 - 16:10', 
    color: 'bg-brand-pink', 
    image: 'https://picsum.photos/seed/mobile/400/300', 
    icon: BookOpen, 
    action: 'course',
    code: 'TTK090',
    credits: 3,
    evaluation: { en: 'Assignments, Development Artifacts, Presentation', jp: '課題・開発成果物・発表' },
    evaluationBreakdown: [
      { label: { en: 'Assignments', jp: '課題' }, percentage: 30, color: 'bg-brand-yellow' },
      { label: { en: 'Artifacts', jp: '開発成果物' }, percentage: 40, color: 'bg-brand-pink' },
      { label: { en: 'Presentation', jp: '発表' }, percentage: 30, color: 'bg-brand-green' }
    ],
    overview: { en: 'App development environment setup, UI/UX design, API integration, device function utilization, testing and deployment.', jp: 'アプリ開発環境構築、UI/UXデザイン、API連携、デバイス機能活用、テスト・デプロイまで実践。詳細シラバスはTIPSで確認。' }
  },
  { 
    id: 'fri-1', 
    type: 'Classes', 
    title: { en: 'Project Practicum 1', jp: 'プロジェクト実習１' }, 
    teacher: { en: 'Yoshihisa Takayama', jp: '高山 佳久' }, 
    location: { en: 'Shinagawa 1B202', jp: '品川キャンパス 1B202 通信ネットワーク特殊実験室' },
    dayOfWeek: 5, // Friday
    periods: [1],
    time: '09:00 - 10:30', 
    color: 'bg-brand-green', 
    image: 'https://picsum.photos/seed/project/400/300', 
    icon: BookOpen, 
    action: 'course',
    code: 'TTK010',
    credits: 2,
    evaluation: { en: 'Assignments & Rubric Evaluation', jp: '課題・ルーブリック評価' },
    evaluationBreakdown: [
      { label: { en: 'Assignments', jp: '課題' }, percentage: 100, color: 'bg-brand-green' }
    ],
    overview: { en: 'Group exercises practicing project management, team building, requirements definition, system design, and presentation.', jp: 'プロジェクト管理・チームビルディング・要件定義からシステム設計・発表までを実践するグループ演習。' }
  },
  { 
    id: 'fri-3', 
    type: 'Classes', 
    title: { en: 'Platform Architecture', jp: 'プラットフォームアーキテクチャ' }, 
    teacher: { en: 'Satoshi Yamazaki', jp: '山崎 悟史' }, 
    location: { en: 'Shinagawa 4101', jp: '品川キャンパス 4101' },
    dayOfWeek: 5,
    periods: [3],
    time: '13:00 - 14:30', 
    color: 'bg-brand-yellow', 
    image: 'https://picsum.photos/seed/platform/400/300', 
    icon: BookOpen, 
    action: 'course',
    code: 'TTK065',
    credits: 2,
    evaluation: { en: 'Confirmation Questions (Every Time) 50% + Assignments 50%', jp: '確認問題（毎回）50% / 課題提出 50%。5回以上欠席で評価対象外' },
    evaluationBreakdown: [
      { label: { en: 'Questions', jp: '確認問題' }, percentage: 50, color: 'bg-brand-yellow' },
      { label: { en: 'Assignments', jp: '課題提出' }, percentage: 50, color: 'bg-brand-pink' }
    ],
    overview: { en: 'Basic concepts of platforms, IoT architecture, communication networks, and security technologies.', jp: 'プラットフォームの基本概念とIoTアーキテクチャ、通信ネットワーク・セキュリティ技術。事前にスライドPDF配布、印刷または持参必須。連絡はメール優先。' }
  },
];

export const getClassesForDate = (
  date: Date,
  selectedCourseIds: string[],
  items: typeof allItems = allItems,
) => {
  // Guard: nothing to show when no courses are selected
  if (!selectedCourseIds?.length) return [];

  // Classes start from April 8th, 2026
  const startDate = new Date(2026, 3, 8); // Month is 0-indexed, so 3 is April
  const endDate = new Date(2026, 9, 31); // October 31st

  // Zero out time for accurate comparison
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (d < startDate || d > endDate) {
    return [];
  }

  const dayOfWeek = date.getDay();
  // Always filter by selectedCourseIds — single source of truth
  return items.filter(
    item => item.dayOfWeek === dayOfWeek && selectedCourseIds.includes(item.id)
  );
};
