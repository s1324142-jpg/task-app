import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { AppData, AssignmentInput, emptyData } from '../domain/models';
import { upsertAssignment } from '../domain/assignments';
import { Repository } from '../data/repository';
import { AppController } from '../services/controller';
import { syncNotifications } from '../services/notifications';
import { useAuth } from '../cloud/AuthContext';
import { mergeInitialData, readCloudState, readLastCloudUserId, saveLastCloudUserId, watchCloudState, writeCloudState } from '../cloud/cloudRepository';
import { useTheme } from '../themes/ThemeContext';

export type CloudSyncState = 'disabled' | 'signed_out' | 'connecting' | 'syncing' | 'synced' | 'error';

type Context = {
  data: AppData | null; error: string | null; warning: string | null; now: Date;
  save: (input: AssignmentInput, id?: string) => Promise<string>;
  change: (change: (data: AppData) => AppData) => Promise<void>;
  retry: () => Promise<void>; refresh: () => Promise<void>;
  cloudSyncState: CloudSyncState; cloudError: string | null; lastCloudSyncAt: string | null;
  retryCloudSync: () => void;
};
const AppContext = createContext<Context | null>(null);
export function AppProvider({ children }: React.PropsWithChildren) {
  const auth = useAuth();
  const { selectedThemeId, applyTheme } = useTheme();
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>(auth.configured ? 'signed_out' : 'disabled');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<string | null>(null);
  const [cloudRetry, setCloudRetry] = useState(0);
  const dataRef = useRef<AppData | null>(null);
  const clientId = useRef(Crypto.randomUUID()).current;
  const syncGeneration = useRef(0);
  const [controller] = useState(() => new AppController(new Repository(AsyncStorage), syncNotifications, next => { dataRef.current = next; setData(next); }, setWarning));
  const pushCloud = useCallback((next: AppData) => {
    if (!auth.user) return;
    setCloudSyncState('syncing'); setCloudError(null);
    void writeCloudState(auth.user.uid, { data: next, clientId, themeId: selectedThemeId })
      .then(() => { setCloudSyncState('synced'); setLastCloudSyncAt(new Date().toISOString()); })
      .catch(() => { setCloudSyncState('error'); setCloudError('端末には保存しましたが、クラウドへ同期できませんでした。通信状態を確認してください。'); });
  }, [auth.user, clientId, selectedThemeId]);
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
  const ready = data !== null;
  useEffect(() => {
    const generation = ++syncGeneration.current;
    if (!auth.configured) { setCloudSyncState('disabled'); return; }
    if (!auth.user) { setCloudSyncState('signed_out'); setCloudError(null); return; }
    if (!ready || !dataRef.current) return;
    let unsubscribe: (() => void) | undefined;
    setCloudSyncState('connecting'); setCloudError(null);
    void (async () => {
      try {
        const uid = auth.user!.uid;
        const [remote, lastCloudUserId] = await Promise.all([readCloudState(uid), readLastCloudUserId()]);
        if (generation !== syncGeneration.current || !dataRef.current) return;
        // 所有者未設定の既存端末データだけを初回移行する。同一ユーザーの再接続では
        // クラウドを正として削除も反映し、別アカウントのキャッシュは決して送らない。
        const merged = lastCloudUserId === null
          ? (remote ? mergeInitialData(dataRef.current, remote.data) : dataRef.current)
          : lastCloudUserId === uid ? (remote?.data ?? dataRef.current) : (remote?.data ?? emptyData());
        if (remote?.themeId) await applyTheme(remote.themeId);
        await controller.replace(merged);
        await writeCloudState(uid, { data: merged, clientId, themeId: remote?.themeId ?? selectedThemeId });
        await saveLastCloudUserId(uid);
        if (generation !== syncGeneration.current) return;
        setCloudSyncState('synced'); setLastCloudSyncAt(new Date().toISOString());
        unsubscribe = watchCloudState(uid, envelope => {
          if (generation !== syncGeneration.current || envelope.clientId === clientId) return;
          void controller.replace(envelope.data).then(() => {
            if (envelope.themeId) void applyTheme(envelope.themeId);
            setCloudSyncState('synced'); setLastCloudSyncAt(new Date().toISOString()); setCloudError(null);
          }).catch(() => { setCloudSyncState('error'); setCloudError('クラウドデータを端末へ保存できませんでした。'); });
        }, message => { setCloudSyncState('error'); setCloudError(message); });
      } catch {
        if (generation === syncGeneration.current) { setCloudSyncState('error'); setCloudError('クラウド同期を開始できませんでした。Firebase設定と通信状態を確認してください。'); }
      }
    })();
    return () => { unsubscribe?.(); };
  }, [auth.configured, auth.user?.uid, ready, controller, clientId, applyTheme, cloudRetry]);
  useEffect(() => {
    if (cloudSyncState === 'synced' && dataRef.current) pushCloud(dataRef.current);
  }, [selectedThemeId]);
  return <AppContext.Provider value={{ data, error, warning, now, retry,
    cloudSyncState, cloudError, lastCloudSyncAt,
    retryCloudSync: () => setCloudRetry(value => value + 1),
    refresh: () => controller.refresh(), change: async fn => { const next = await controller.mutate(fn); pushCloud(next); },
    save: async (input, existingId) => {
      const id = existingId ?? Crypto.randomUUID();
      const next = await controller.mutate(state => upsertAssignment(state, input, id, new Date().toISOString(), Crypto.randomUUID()));
      pushCloud(next);
      return id;
    },
  }}>{children}</AppContext.Provider>;
}
export function useApp(): Context {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppProvider is missing');
  return context;
}
