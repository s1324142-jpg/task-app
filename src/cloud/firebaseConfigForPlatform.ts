import { bundledAndroidFirebaseConfig } from './firebaseConfig';

export const firebaseConfigForPlatform = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_ANDROID_API_KEY ?? bundledAndroidFirebaseConfig.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? bundledAndroidFirebaseConfig.authDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? bundledAndroidFirebaseConfig.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? bundledAndroidFirebaseConfig.storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? bundledAndroidFirebaseConfig.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID ?? bundledAndroidFirebaseConfig.appId,
  measurementId: bundledAndroidFirebaseConfig.measurementId,
};
