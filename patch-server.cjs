const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

const imports = `import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

let db: any = null;
let auth: any = null;
try {
  if (fs.existsSync('./firebase-applet-config.json')) {
    const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    signInAnonymously(auth).catch(err => console.error('Firebase Auth:', err));
  }
} catch (e) {
  console.error('Firebase init error', e);
}

// Sincronização inicial do Firestore para o local
async function syncFromFirestore() {
  if (!db) return;
  try {
    const usersSnap = await getDoc(doc(db, 'system', 'users'));
    if (usersSnap.exists()) {
      fs.writeFileSync(USERS_PATH, JSON.stringify(usersSnap.data(), null, 2), 'utf-8');
    }
    const adminsSnap = await getDoc(doc(db, 'system', 'admins'));
    if (adminsSnap.exists()) {
      fs.writeFileSync(ADMINS_PATH, JSON.stringify(adminsSnap.data().list || [], null, 2), 'utf-8');
    }
    const emailSnap = await getDoc(doc(db, 'system', 'email_exceptions'));
    if (emailSnap.exists()) {
      fs.writeFileSync(EMAIL_EXCEPTIONS_PATH, JSON.stringify(emailSnap.data().list || [], null, 2), 'utf-8');
    }
    const logsSnap = await getDoc(doc(db, 'system', 'logs'));
    if (logsSnap.exists()) {
      fs.writeFileSync(JSON_LOG_PATH, JSON.stringify(logsSnap.data().list || [], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Erro ao sincronizar do Firestore:', err);
  }
}

function syncToFirestore(col: string, data: any) {
  if (!db) return;
  setDoc(doc(db, 'system', col), data).catch(err => console.error('Erro ao salvar no Firestore:', err));
}
`;

content = content.replace("import { createServer as createViteServer } from 'vite';", "import { createServer as createViteServer } from 'vite';\n" + imports);

// Patch save functions
content = content.replace(
  "fs.writeFileSync(EMAIL_EXCEPTIONS_PATH, JSON.stringify(unique, null, 2), 'utf-8');",
  "fs.writeFileSync(EMAIL_EXCEPTIONS_PATH, JSON.stringify(unique, null, 2), 'utf-8');\n    syncToFirestore('email_exceptions', { list: unique });"
);

content = content.replace(
  "fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');",
  "fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');\n    syncToFirestore('users', users);"
);

content = content.replace(
  "fs.writeFileSync(JSON_LOG_PATH, JSON.stringify(logs, null, 2), 'utf-8');",
  "fs.writeFileSync(JSON_LOG_PATH, JSON.stringify(logs, null, 2), 'utf-8');\n    syncToFirestore('logs', { list: logs.slice(0, 1000) });" // limite de 1000 logs no firestore
);

content = content.replace(
  "fs.writeFileSync(ADMINS_PATH, JSON.stringify(unique, null, 2), 'utf-8');",
  "fs.writeFileSync(ADMINS_PATH, JSON.stringify(unique, null, 2), 'utf-8');\n    syncToFirestore('admins', { list: unique });"
);

// Call syncFromFirestore before startServer
content = content.replace(
  "startServer();",
  "syncFromFirestore().then(() => startServer());"
);

fs.writeFileSync('server.ts', content);
console.log('Patch complete.');
