import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { cloudAuth } from './authInstance';
import { firebaseConfigured, googleWebClientId } from './firebase';
import { signInWithGoogle, signOutGoogle } from './googleAuth';

type AuthContextValue = {
  configured: boolean; user: User | null; initializing: boolean; busy: boolean; error: string | null;
  signIn: () => Promise<void>; signOut: () => Promise<void>; clearError: () => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = firebaseConfigured && Boolean(cloudAuth) && (Platform.OS === 'web' || Boolean(googleWebClientId));
  useEffect(() => {
    if (!cloudAuth) { setInitializing(false); return; }
    return onAuthStateChanged(cloudAuth, next => { setUser(next); setInitializing(false); }, () => { setError('Googleログイン状態を確認できませんでした。'); setInitializing(false); });
  }, []);
  const signIn = useCallback(async () => {
    setBusy(true); setError(null);
    try { await signInWithGoogle(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Googleログインに失敗しました。'); throw cause; }
    finally { setBusy(false); }
  }, []);
  const signOut = useCallback(async () => {
    if (!cloudAuth) return;
    setBusy(true); setError(null);
    try { await signOutGoogle(); await firebaseSignOut(cloudAuth); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'ログアウトに失敗しました。'); throw cause; }
    finally { setBusy(false); }
  }, []);
  const value = useMemo(() => ({ configured, user, initializing, busy, error, signIn, signOut, clearError: () => setError(null) }), [configured, user, initializing, busy, error, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}
