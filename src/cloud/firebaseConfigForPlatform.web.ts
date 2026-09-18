import { bundledFirebaseConfig } from './firebaseConfig';

export const firebaseConfigForPlatform = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? bundledFirebaseConfig.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? bundledFirebaseConfig.authDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? bundledFirebaseConfig.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? bundledFirebaseConfig.storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? bundledFirebaseConfig.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? bundledFirebaseConfig.appId,
  measurementId: bundledFirebaseConfig.measurementId,
};
