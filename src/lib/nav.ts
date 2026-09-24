import { Home, Calendar, ClipboardList, GraduationCap, UserCheck, Megaphone, FileText, Settings, BookOpenText, ListPlus, FolderOpen } from 'lucide-react';

/** One navigation list for the desktop sidebar and the mobile drawer. */
export const NAV_ITEMS = [
  { path: '/', icon: Home, labelEn: 'Home', labelJp: 'ホーム', descEn: 'Dashboard', descJp: 'ダッシュボード' },
  { path: '/schedule', icon: Calendar, labelEn: 'Schedule', labelJp: 'スケジュール', descEn: 'Weekly & monthly', descJp: '週別・月別' },
  { path: '/class', icon: ClipboardList, labelEn: 'Classes', labelJp: '授業', descEn: 'Registered courses', descJp: '履修中の科目' },
  { path: '/syllabus', icon: BookOpenText, labelEn: 'Syllabus', labelJp: 'シラバス', descEn: 'Search every course', descJp: '全科目を検索' },
  { path: '/registration', icon: ListPlus, labelEn: 'Registration', labelJp: '履修登録', descEn: 'Add or drop courses', descJp: '科目の登録・削除' },
  { path: '/grades', icon: GraduationCap, labelEn: 'Grades', labelJp: '成績', descEn: 'GPA, credits, graduation', descJp: 'GPA・単位・卒業判定' },
  { path: '/attendance', icon: UserCheck, labelEn: 'Attendance', labelJp: '出席', descEn: 'Per-class record', descJp: '授業ごとの出欠' },
  { path: '/bulletins', icon: Megaphone, labelEn: 'Bulletins', labelJp: '掲示', descEn: 'University notices', descJp: '大学からのお知らせ' },
  { path: '/cabinet', icon: FolderOpen, labelEn: 'Cabinet', labelJp: 'キャビネット', descEn: 'Documents from the university', descJp: '大学からの資料' },
  { path: '/tasks', icon: FileText, labelEn: 'Reports & Exams', labelJp: 'レポート・試験', descEn: 'Deadlines and exam times', descJp: '提出期限・試験日程' },
  { path: '/settings', icon: Settings, labelEn: 'Settings', labelJp: '設定', descEn: 'Preferences & session', descJp: '設定・セッション' },
];
