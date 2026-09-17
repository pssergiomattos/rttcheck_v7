import fs from 'fs';
let content = fs.readFileSync('src/components/ChecklistScreen.tsx', 'utf-8');
content = content.replace("import { saveInspectionReport } from '../firebase';\n", '');
// find usage of saveInspectionReport and remove it
content = content.replace(/await saveInspectionReport\([\s\S]*?\);/g, '');
fs.writeFileSync('src/components/ChecklistScreen.tsx', content);
