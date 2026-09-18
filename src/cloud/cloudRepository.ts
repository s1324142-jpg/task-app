import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, stateSchema } from '../domain/models';
import { ThemeId, isThemeId } from '../themes';
import { cloudDb } from './firebase';

const LAST_CLOUD_USER_KEY = 'suke:cloud:last-user:v1';

export type CloudEnvelope = { data: AppData; clientId: string; themeId?: ThemeId };
const refFor = (uid: string) => {
  if (!cloudDb) throw new Error('Firestoreが設定されていません。');
  return doc(cloudDb, 'users', uid, 'app', 'state');
};
const parseEnvelope = (value: unknown): CloudEnvelope | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>; const parsed = stateSchema.safeParse(raw.data);
  if (!parsed.success || typeof raw.clientId !== 'string') return null;
  return { data: parsed.data, clientId: raw.clientId, themeId: isThemeId(raw.themeId) ? raw.themeId : undefined };
};

export async function readCloudState(uid: string): Promise<CloudEnvelope | null> {
  const snapshot = await getDoc(refFor(uid));
  return snapshot.exists() ? parseEnvelope(snapshot.data()) : null;
}
export async function writeCloudState(uid: string, envelope: CloudEnvelope): Promise<void> {
  await setDoc(refFor(uid), { version: 1, ...envelope, updatedAt: serverTimestamp() });
}
export function watchCloudState(uid: string, receive: (value: CloudEnvelope) => void, fail: (message: string) => void) {
  return onSnapshot(refFor(uid), snapshot => { const value = snapshot.exists() ? parseEnvelope(snapshot.data()) : null; if (value) receive(value); }, () => fail('クラウドの更新を受信できませんでした。'));
}
export const readLastCloudUserId = () => AsyncStorage.getItem(LAST_CLOUD_USER_KEY);
export const saveLastCloudUserId = (uid: string) => AsyncStorage.setItem(LAST_CLOUD_USER_KEY, uid);

export function mergeInitialData(local: AppData, remote: AppData): AppData {
  const assignments = new Map(remote.assignments.map(item => [item.id, item]));
  for (const item of local.assignments) {
    const current = assignments.get(item.id);
    if (!current || Date.parse(item.updatedAt) > Date.parse(current.updatedAt)) assignments.set(item.id, item);
  }
  const courses = new Map(remote.courses.map(item => [item.id, item]));
  for (const item of local.courses) if (!courses.has(item.id)) courses.set(item.id, item);
  const result = stateSchema.safeParse({ ...remote, assignments: [...assignments.values()], courses: [...courses.values()] });
  return result.success ? result.data : local;
}
