import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(
  'setAdminAuth({ email: email || currentUser.email, pass: "" });',
  'setAdminAuth({ email, pass });'
);
fs.writeFileSync('src/App.tsx', content);
