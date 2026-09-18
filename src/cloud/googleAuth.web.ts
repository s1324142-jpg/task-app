import { GoogleAuthProvider, UserCredential, signInWithPopup } from 'firebase/auth';
import { cloudAuth } from './authInstance';

export async function signInWithGoogle(): Promise<UserCredential> {
  if (!cloudAuth) throw new Error('Firebaseが設定されていません。');
  return signInWithPopup(cloudAuth, new GoogleAuthProvider());
}
export async function signOutGoogle(): Promise<void> {}
