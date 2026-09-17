import fs from 'fs';
let content = fs.readFileSync('src/components/HomeScreen.tsx', 'utf-8');
content = content.replace(
  'onClick={() => { if (currentUser.isAdmin && onOpenAdmin) { onOpenAdmin(currentUser.email, ""); } else { alert("Acesso Negado. Você não é um administrador."); } }}',
  'onClick={() => setShowAdminModal(true)}'
);
content = content.replace(
  'onClick={() => {}} className="hidden" ',
  'onClick={() => setShowPasswordModal(true)}'
);
fs.writeFileSync('src/components/HomeScreen.tsx', content);
