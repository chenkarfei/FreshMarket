import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAy-TbZvqqtXmEqOwAV04akWrj_AhVZtGs",
  authDomain: "freshmarket-9c447.firebaseapp.com",
  projectId: "freshmarket-9c447",
  storageBucket: "freshmarket-9c447.firebasestorage.app",
  messagingSenderId: "88990311075",
  appId: "1:88990311075:web:2723fc5d84332175ee1516",
  measurementId: "G-S5KM1MT0WT"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Helper for creating users without logging out the current admin
export const createSecondaryAuth = () => {
  const secondaryApp = getApps().find(a => a.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
  return getAuth(secondaryApp);
};
