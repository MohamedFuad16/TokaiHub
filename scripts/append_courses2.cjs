const fs = require('fs');

const coursesToAdd = [
  { code: 'TTK080', en: 'Information Retrieval and Interface', jp: '情報検索とインタフェース', dow: 3, per: [1], time: '09:00 - 10:40', cred: 2 },
  { code: 'TTK040', en: 'Telecommunication Network Engineering', jp: '情報通信ネットワーク工学', dow: 3, per: [2], time: '10:55 - 12:35', cred: 3 },
  { code: 'TTK075', en: 'Introduction to Language Processing', jp: '言語処理入門', dow: 3, per: [3], time: '13:25 - 15:05', cred: 2 },
  { code: 'TTK025', en: 'Global Business English', jp: 'グローバルビジネス英語', dow: 3, per: [4], time: '15:20 - 17:00', cred: 2 },
  { code: 'TTK045', en: 'Artificial Intelligence and Intellectual Control', jp: '人工知能と知的制御', dow: 4, per: [3], time: '13:25 - 15:05', cred: 2 },
  { code: 'TTK055', en: 'Data Analysis', jp: 'データ解析', dow: 4, per: [4], time: '15:20 - 17:00', cred: 2 },
  { code: 'TTK100', en: 'Smart Society and Human Behavior', jp: 'スマート社会と人間行動', dow: 5, per: [1], time: '09:00 - 10:40', cred: 2 },
  { code: 'TTK046', en: 'Machine Learning', jp: '機械学習', dow: 5, per: [2], time: '10:55 - 12:35', cred: 3 },
  { code: 'TTK044', en: 'Machine Learning Fundamentals', jp: '機械学習の基礎', dow: 5, per: [2], time: '10:55 - 12:35', cred: 3 },
  { code: 'TTK020', en: 'Business Research', jp: 'ビジネスリサーチ', dow: 5, per: [3], time: '13:25 - 15:05', cred: 1 },
  { code: 'TTK095', en: 'Quality, Reliability and Safety', jp: '品質・信頼性と安全性', dow: 5, per: [4], time: '15:20 - 17:00', cred: 2 },
  { code: 'TTM010', en: 'Glocal PBL', jp: 'グローカルPBL', dow: 1, per: [5], time: '17:15 - 18:55', cred: 2 },
  { code: 'TTK050', en: 'Natural Language Processing', jp: '自然言語処理', dow: 2, per: [4], time: '15:20 - 17:00', cred: 2 }
];

let data = fs.readFileSync('src/data.ts', 'utf8');

const additionalBlocks = coursesToAdd.map(c => `
  {
    id: 'auto-${c.code.toLowerCase()}',
    type: 'Classes',
    title: { en: '${c.en}', jp: '${c.jp}' },
    teacher: { en: 'TBD', jp: '未定' },
    location: { en: 'TBD', jp: '未定' },
    dayOfWeek: ${c.dow},
    periods: [${c.per.join(', ')}],
    time: '${c.time}',
    color: 'bg-brand-pink',
    action: 'course',
    code: '${c.code}',
    credits: ${c.cred},
    overview: { en: 'Course overview available in syllabus.', jp: 'シラバスを参照してください。' }
  }`).join(',');

data = data.replace('    }\n  }\n];', '    }\n  },' + additionalBlocks + '\n];');
fs.writeFileSync('src/data.ts', data);
