import type AsyncStorage from '@react-native-async-storage/async-storage';
import type { Persistence } from 'firebase/auth';

// Firebaseの実行時React Native exportには存在するが、汎用TypeScript export条件には
// 含まれないため、Expo/Metroが選択するAPIを型へ補足する。
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
}
