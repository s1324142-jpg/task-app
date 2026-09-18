import React, { useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import WebView, { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';
import { Alert } from '../ui/alerts';
import { RootStackParams } from '../navigation/types';
import { LoginPageObservation, MANABA_RELOGIN_REQUIRED, ManabaAuthError } from '../manaba/ManabaAuthService';
import { manabaAuth } from '../manaba/manabaNative';
import { EXTRACT_MANABA_ASSIGNMENTS, ManabaSyncMessage, parseManabaSyncMessage, toExternalAssignments } from '../manaba/manabaSync';
import { mergeExternalAssignments } from '../providers/merge';
import { useApp } from '../state/AppContext';
import { Button } from '../ui/components';
import { useTheme } from '../themes/ThemeContext';

type Props = NativeStackScreenProps<RootStackParams, 'ManabaLogin'>;
const INSPECT_PAGE = `(() => {
  const title = String(document.title || '').slice(0, 200);
  const hasPasswordField = Boolean(document.querySelector('input[type="password"]'));
  const looksLikeLoginPage = hasPasswordField || (Boolean(document.querySelector('form')) && /ログイン|sign[ -]?in|login/i.test(title + ' ' + window.location.pathname));
  const result = {
    kind: 'manaba-inspection',
    url: window.location.href,
    title,
    hasPasswordField: looksLikeLoginPage
  };
  window.ReactNativeWebView.postMessage(JSON.stringify(result));
})(); true;`;

function parseMessage(event: WebViewMessageEvent): unknown {
  try { return JSON.parse(event.nativeEvent.data) as unknown; } catch { return null; }
}

function parseObservation(value: unknown, eventUrl: string): LoginPageObservation | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  return row.kind === 'manaba-inspection' && typeof eventUrl === 'string' && typeof row.title === 'string' && typeof row.hasPasswordField === 'boolean'
    ? { url: eventUrl, title: row.title, hasPasswordField: row.hasPasswordField } : null;
}

export function ManabaLoginScreen({ route, navigation }: Props) {
  const { theme, styles: s } = useTheme(); const colors = theme.colors;
  const { change } = useApp();
  const webView = useRef<WebViewType>(null);
  const syncPending = useRef(false);
  const autoSyncAttempted = useRef(false);
  const [observation, setObservation] = useState<LoginPageObservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configuredUrl = route.params.baseUrl;

  const inspect = () => webView.current?.injectJavaScript(INSPECT_PAGE);
  const onMessage = (event: WebViewMessageEvent) => {
    const value = parseMessage(event);
    const next = parseObservation(value, event.nativeEvent.url);
    if (!next) {
      const message = parseManabaSyncMessage(value);
      if (!message || !syncPending.current) return;
      syncPending.current = false;
      void finishSync(message);
      return;
    }
    setObservation(next);
    setError(null);
    let atConfiguredOrigin = false;
    try {
      const currentOrigin = new URL(next.url).origin;
      atConfiguredOrigin = currentOrigin === (route.params.authenticatedOrigin ?? new URL(configuredUrl).origin);
    } catch { /* malformed page URL */ }
    if ((route.params.mode === 'sessionCheck' || route.params.mode === 'sync') && next.hasPasswordField) {
      syncPending.current = false;
      setBusy(false);
      void manabaAuth.markExpired().then(() => setError(MANABA_RELOGIN_REQUIRED)).catch(() => setError('ログイン状態を更新できませんでした。'));
      return;
    }
    if (route.params.mode === 'sync' && route.params.autoStart && atConfiguredOrigin && !autoSyncAttempted.current) {
      autoSyncAttempted.current = true;
      void synchronize(next);
    }
  };
  const finishSync = async (message: ManabaSyncMessage) => {
    try {
      if (message.status === 'auth_required') {
        await manabaAuth.markExpired();
        setError(MANABA_RELOGIN_REQUIRED);
        return;
      }
      if (message.status === 'error') { setError(message.message); return; }
      const converted = toExternalAssignments(message);
      let mergeSkipped = 0;
      await change(state => {
        const result = mergeExternalAssignments(state, converted.records, Crypto.randomUUID, new Date().toISOString());
        mergeSkipped = result.skipped;
        return result.data;
      });
      await manabaAuth.markSynchronized();
      const skipped = converted.skipped + mergeSkipped;
      Alert.alert('同期が完了しました', `${converted.records.length - mergeSkipped}件の課題を保存しました。${skipped ? `\n解析できなかった項目: ${skipped}件` : ''}`);
      navigation.goBack();
    } catch { setError('課題を保存できませんでした。端末の空き容量を確認して再試行してください。'); }
    finally { setBusy(false); }
  };
  const complete = async (allowOriginChange = false) => {
    if (!observation) return;
    setBusy(true);
    try {
      await manabaAuth.completeLogin(observation, allowOriginChange);
      if (route.params.mode === 'login') {
        Alert.alert('manabaへログインしました', 'ホームの「manaba課題を同期」ボタンから課題を取得できます。');
        navigation.goBack();
        return;
      }
      if (route.params.mode === 'sessionCheck') Alert.alert('セッションを確認しました', 'ログイン状態は有効です。設定画面から課題を同期できます。');
      navigation.goBack();
    } catch (cause) {
      if (cause instanceof ManabaAuthError && cause.code === 'origin_changed') {
        let host = '別のホスト';
        try { host = new URL(observation.url).host; } catch { /* use fallback */ }
        Alert.alert('表示中のサイトを確認', `${cause.message}\n\n「${host}」が大学のmanabaで、ログイン後の画面であることを確認してください。`, [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'このサイトで連携', onPress: () => { void complete(true); } },
        ]);
      } else setError(cause instanceof ManabaAuthError ? cause.message : '認証状態を保存できませんでした。');
    } finally { setBusy(false); }
  };
  const synchronize = async (observed = observation) => {
    if (!observed) return;
    setBusy(true); setError(null);
    try {
      await manabaAuth.completeLogin(observed);
      syncPending.current = true;
      webView.current?.injectJavaScript(EXTRACT_MANABA_ASSIGNMENTS);
    } catch (cause) {
      setBusy(false);
      if (cause instanceof ManabaAuthError && (cause.code === 'authentication_failed' || cause.code === 'session_expired')) {
        await manabaAuth.markExpired().catch(() => undefined);
        setError(MANABA_RELOGIN_REQUIRED);
      } else setError(cause instanceof ManabaAuthError ? cause.message : 'manabaの同期を開始できませんでした。');
    }
  };
  const allowNavigation = ({ url }: WebViewNavigation) => {
    try { return new URL(url).protocol === 'https:'; } catch { return url === 'about:blank'; }
  };

  return <View style={s.screen}>
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={s.muted}>{route.params.mode === 'sync' ? '提出物一覧から授業名・課題名・締切・提出状態を端末内で読み取ります。' : '大学の画面で認証してください。入力内容やCookieをQUEUEが読み取ることはありません。'}</Text>
      {observation?.title ? <Text numberOfLines={1} style={s.text}>{observation.title}</Text> : null}
      {error && <Text accessibilityRole="alert" style={[s.muted, { color: colors.red }]}>{error}</Text>}
      <View style={s.row}>
        <View style={{ flex: 1 }}><Button secondary title="再読み込み" onPress={() => webView.current?.reload()} disabled={busy} /></View>
        <View style={{ flex: 1 }}><Button title={route.params.mode === 'sync' ? (busy ? '同期中…' : '課題を同期') : route.params.mode === 'sessionCheck' ? 'セッションを確認' : 'ログインを完了'} onPress={() => { route.params.mode === 'sync' ? void synchronize() : void complete(); }} disabled={busy || loading || !observation} /></View>
      </View>
    </View>
    <WebView ref={webView} source={{ uri: configuredUrl }} style={{ flex: 1 }}
      originWhitelist={['https://*']} sharedCookiesEnabled thirdPartyCookiesEnabled cacheEnabled
      javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={allowNavigation}
      onLoadStart={() => { setLoading(true); setError(null); }}
      onLoadEnd={() => { setLoading(false); inspect(); }}
      onMessage={onMessage}
      onError={() => { syncPending.current = false; setBusy(false); setError('ネットワークエラーが発生しました。接続を確認して再試行してください。'); }}
      onHttpError={event => { syncPending.current = false; setBusy(false); setError(event.nativeEvent.statusCode === 503 ? 'manabaがメンテナンス中の可能性があります。' : `manabaへの接続に失敗しました（HTTP ${event.nativeEvent.statusCode}）。`); }} />
    {loading && <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.green} /></View>}
  </View>;
}
