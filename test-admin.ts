import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

const app = initializeApp({
  projectId: firebaseConfig.projectId
});

const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  await db.collection('test').doc('ping').set({ ok: true, time: new Date().toISOString() });
  const doc = await db.collection('test').doc('ping').get();
  console.log('Firebase Admin Success:', doc.data());
}

test().catch(console.error);
