import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { AppData, AssignmentInput } from '../domain/models';
import { upsertAssignment } from '../domain/assignments';
import { Repository } from '../data/repository';
import { AppController } from '../services/controller';
import { syncNotifications } from '../services/notifications';

type Context = {
  data: AppData | null; error: string | null; warning: string | null; now: Date;
  save: (input: AssignmentInput, id?: string) => Promise<string>;
  change: (change: (data: AppData) => AppData) => Promise<void>;
  retry: () => Promise<void>; refresh: () => Promise<void>;
};
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: React.PropsWithChildren) {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [controller] = useState(() => new AppController(new Repository(AsyncStorage), syncNotifications, setData, setWarning));
  const retry = async () => {
    setError(null);
    try { await controller.load(); } catch { setError('保存データを読み込めませんでした。既存データは上書きしていません。端末の空き容量を確認して再試行してください。'); }
  };
  useEffect(() => {
    void retry();
    const timer = setInterval(() => setNow(new Date()), 30000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { setNow(new Date()); void controller.refresh(); }
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [controller]);
  return <AppContext.Provider value={{ data, error, warning, now, retry,
    refresh: () => controller.refresh(), change: fn => controller.mutate(fn),
    save: async (input, existingId) => {
      const id = existingId ?? Crypto.randomUUID();
      await controller.mutate(state => upsertAssignment(state, input, id, new Date().toISOString(), Crypto.randomUUID()));
      return id;
    },
  }}>{children}</AppContext.Provider>;
}
export function useApp(): Context {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppProvider is missing');
  return context;
}
