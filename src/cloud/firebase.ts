import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { bundledGoogleWebClientId } from './firebaseConfig';
import { firebaseConfigForPlatform as firebaseConfig } from './firebaseConfigForPlatform';

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
export const firebaseApp: FirebaseApp | null = firebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
export const cloudDb: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? bundledGoogleWebClientId;
