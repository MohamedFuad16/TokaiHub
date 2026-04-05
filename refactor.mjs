import fs from 'fs';
import path from 'path';

const SRC_DIR = '/Users/mfuad16/Documents/TokaiHub/src/components';

function replaceInFile(filename, replacements) {
  const filepath = path.join(SRC_DIR, filename);
  if (!fs.existsSync(filepath)) return;
  
  let content = fs.readFileSync(filepath, 'utf8');
  for (const { from, to } of replacements) {
    content = content.replace(from, to);
  }
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`Refactored ${filename}`);
}

// 1. SharedMenu.tsx
replaceInFile('SharedMenu.tsx', [
  { from: /import \{ Screen, Language, AppSettings \} from '\.\.\/App';/, to: "import { Language, AppSettings } from '../App';\nimport { useNavigate } from 'react-router-dom';" },
  { from: /onNavigate: \(s: Screen, params\?: any\) => void;\n/, to: "" },
  { from: /export default function SharedMenu\(\{ isOpen, onClose, onNavigate, lang, setLang, settings \}: SharedMenuProps\) \{/, to: "export default function SharedMenu({ isOpen, onClose, lang, setLang, settings }: SharedMenuProps) {\n  const navigate = useNavigate();" },
  { from: /onNavigate\('home'\)/g, to: "navigate('/')" },
  { from: /onNavigate\('schedule'\)/g, to: "navigate('/schedule')" },
  { from: /onNavigate\('settings'\)/g, to: "navigate('/settings')" },
]);

// 2. TokaiHome.tsx
replaceInFile('TokaiHome.tsx', [
  { from: /import \{ ScreenProps \} from '\.\.\/App';/, to: "import { ScreenProps } from '../App';\nimport { useNavigate } from 'react-router-dom';" },
  { from: /export default function TokaiHome\(\{ onNavigate, lang, setLang, settings, userProfile \}: ScreenProps\) \{/, to: "export default function TokaiHome({ lang, setLang, settings, userProfile }: ScreenProps) {\n  const navigate = useNavigate();" },
  { from: /onNavigate\(item.action as any, \{ id: item.id \}\)/g, to: "navigate(`/${item.action}/${item.id}`)" },
  { from: /onNavigate\('assignments'\)/g, to: "navigate('/assignments')" },
  { from: /onNavigate\('course'\)/g, to: "navigate(`/course/${cls.id}`)" },
  { from: /onNavigate\('course', \{ id: cls.id \}\)/g, to: "navigate(`/course/${cls.id}`)" },
  { from: /onNavigate=\{onNavigate\}/g, to: "" },
]);

// 3. TokaiSchedule.tsx
replaceInFile('TokaiSchedule.tsx', [
  { from: /import \{ ScreenProps \} from '\.\.\/App';/, to: "import { ScreenProps } from '../App';\nimport { useNavigate } from 'react-router-dom';" },
  { from: /export default function TokaiSchedule\(\{ onNavigate, lang, setLang, settings, userProfile \}: ScreenProps\) \{/, to: "export default function TokaiSchedule({ lang, setLang, settings, userProfile }: ScreenProps) {\n  const navigate = useNavigate();" },
  { from: /onNavigate\('course', \{ id: item.id \}\)/g, to: "navigate(`/course/${item.id}`)" },
  { from: /onNavigate\('course', \{ id: cls.id \}\)/g, to: "navigate(`/course/${cls.id}`)" },
  { from: /onNavigate=\{onNavigate\}/g, to: "" },
]);

// 4. TokaiSettings.tsx
replaceInFile('TokaiSettings.tsx', [
  { from: /import \{ ScreenProps \} from '\.\.\/App';/, to: "import { ScreenProps } from '../App';\nimport { useNavigate } from 'react-router-dom';" },
  { from: /goBack: \(\) => void;\n  onNavigate: \(s: any\) => void;\n/, to: "" },
  { from: /export default function TokaiSettings\(\{ goBack, onNavigate, lang, settings, setSettings, userProfile, onSignOut, onDevSkipChange \}: SettingsProps\) \{/, to: "export default function TokaiSettings({ lang, settings, setSettings, userProfile, onSignOut, onDevSkipChange }: SettingsProps) {\n  const navigate = useNavigate();\n  const goBack = () => navigate(-1);" },
  { from: /onNavigate\('editProfile' as any\)/g, to: "navigate('/editProfile')" },
]);

// 5. TokaiCourse.tsx
replaceInFile('TokaiCourse.tsx', [
  { from: /import \{ ScreenProps \} from '\.\.\/App';/, to: "import { ScreenProps } from '../App';\nimport { useNavigate, useParams } from 'react-router-dom';" },
  { from: /export default function TokaiCourse\(\{ onNavigate, goBack, lang, settings, params \}: ScreenProps\) \{/, to: "export default function TokaiCourse({ lang, settings }: ScreenProps) {\n  const navigate = useNavigate();\n  const goBack = () => navigate(-1);\n  const { id } = useParams();\n  const params = { id };" },
]);

// 6. TokaiEditProfile.tsx
replaceInFile('TokaiEditProfile.tsx', [
  { from: /import \{ ScreenProps, UserProfile \} from '\.\.\/App';/, to: "import { ScreenProps, UserProfile } from '../App';\nimport { useNavigate } from 'react-router-dom';" },
  { from: /export default function TokaiEditProfile\(\{ goBack, lang, settings, userProfile, onSave \}: any\) \{/, to: "export default function TokaiEditProfile({ lang, settings, userProfile, onSave }: any) {\n  const navigate = useNavigate();\n  const goBack = () => navigate(-1);" }
]);

console.log("Refactoring complete.");
