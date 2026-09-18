import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, UserCredential, signInWithCredential } from 'firebase/auth';
import { cloudAuth } from './authInstance';
import { googleWebClientId } from './firebase';

export async function signInWithGoogle(): Promise<UserCredential> {
  if (!cloudAuth || !googleWebClientId) throw new Error('FirebaseまたはGoogle OAuthが設定されていません。');
  GoogleSignin.configure({ webClientId: googleWebClientId });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success' || !response.data.idToken) throw new Error('Googleログインがキャンセルされました。');
  return signInWithCredential(cloudAuth, GoogleAuthProvider.credential(response.data.idToken));
}

export async function signOutGoogle(): Promise<void> {
  await GoogleSignin.signOut().catch(() => null);
}
