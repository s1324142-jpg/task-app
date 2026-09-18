import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { firebaseApp } from './firebase';

let auth: Auth | null = null;
if (firebaseApp) {
  try { auth = initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) }); }
  catch { auth = getAuth(firebaseApp); }
}
export const cloudAuth = auth;
