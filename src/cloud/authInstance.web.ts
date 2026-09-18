import { Auth, browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { firebaseApp } from './firebase';

export const cloudAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
if (cloudAuth) void setPersistence(cloudAuth, browserLocalPersistence).catch(() => undefined);
