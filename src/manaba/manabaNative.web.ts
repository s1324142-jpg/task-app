import { ManabaAuthService } from './ManabaAuthService';

const unavailable = async (): Promise<never> => { throw new Error('manaba連携はAndroid / iOSアプリで利用できます。'); };
export const manabaAuth = new ManabaAuthService(
  { read: async () => null, write: unavailable, remove: async () => undefined },
  { clearAll: async () => undefined, persist: async () => undefined },
);
