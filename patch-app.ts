import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(
  'setAdminAuth({ email, pass });',
  'setAdminAuth({ email: email || currentUser.email, pass: "" });'
);
fs.writeFileSync('src/App.tsx', content);
