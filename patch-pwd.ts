import fs from 'fs';
let content = fs.readFileSync('src/components/HomeScreen.tsx', 'utf-8');
content = content.replace(
  'onClick={() => setShowPasswordModal(true)}',
  'onClick={() => {}} className="hidden" '
);
fs.writeFileSync('src/components/HomeScreen.tsx', content);
