import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ManabaAuthService, ManabaCookieStore, ManabaSessionStorage } from './ManabaAuthService';

const KEY = 'suke.manaba.session.v1';
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const storage: ManabaSessionStorage = {
  read: () => SecureStore.getItemAsync(KEY, OPTIONS),
  write: value => SecureStore.setItemAsync(KEY, value, OPTIONS),
  remove: () => SecureStore.deleteItemAsync(KEY, OPTIONS),
};

const cookies: ManabaCookieStore = {
  clearAll: async () => {
    const CookieManager = (await import('@preeternal/react-native-cookie-manager')).default;
    if (Platform.OS === 'ios') await CookieManager.clearAllStores();
    else await CookieManager.clearAll();
  },
  persist: async () => {
    if (Platform.OS === 'android') {
      try {
        const CookieManager = (await import('@preeternal/react-native-cookie-manager')).default;
        await CookieManager.flush();
      } catch {
        // Expo GoにはCookie管理ネイティブモジュールがない。WebView自身の永続Cookieストアを継続利用する。
      }
    }
  },
};

export const manabaAuth = new ManabaAuthService(storage, cookies);
