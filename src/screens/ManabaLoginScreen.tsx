import React, { useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import WebView, { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';
import { Alert } from '../ui/alerts';
import { RootStackParams } from '../navigation/types';
import { LoginPageObservation, ManabaAuthError } from '../manaba/ManabaAuthService';
import { manabaAuth } from '../manaba/manabaNative';
import { Button } from '../ui/components';
import { colors, styles as s } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParams, 'ManabaLogin'>;
const INSPECT_PAGE = `(() => {
  const result = {
    url: window.location.href,
    title: String(document.title || '').slice(0, 200),
    hasPasswordField: Boolean(document.querySelector('input[type="password"]'))
  };
  window.ReactNativeWebView.postMessage(JSON.stringify(result));
})(); true;`;

function parseObservation(event: WebViewMessageEvent): LoginPageObservation | null {
  try {
    const value: unknown = JSON.parse(event.nativeEvent.data);
    if (!value || typeof value !== 'object') return null;
    const row = value as Record<string, unknown>;
    return typeof event.nativeEvent.url === 'string' && typeof row.title === 'string' && typeof row.hasPasswordField === 'boolean'
      ? { url: event.nativeEvent.url, title: row.title, hasPasswordField: row.hasPasswordField } : null;
  } catch { return null; }
}

export function ManabaLoginScreen({ route, navigation }: Props) {
  const webView = useRef<WebViewType>(null);
  const [observation, setObservation] = useState<LoginPageObservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configuredUrl = route.params.baseUrl;

  const inspect = () => webView.current?.injectJavaScript(INSPECT_PAGE);
  const onMessage = (event: WebViewMessageEvent) => {
    const next = parseObservation(event);
    if (!next) return;
    setObservation(next);
    setError(null);
    let atConfiguredOrigin = false;
    try {
      const currentOrigin = new URL(next.url).origin;
      atConfiguredOrigin = currentOrigin === (route.params.authenticatedOrigin ?? new URL(configuredUrl).origin);
    } catch { /* malformed page URL */ }
    if (route.params.mode === 'sessionCheck' && atConfiguredOrigin && next.hasPasswordField) {
      void manabaAuth.markExpired().then(() => setError('manabaのログイン期限が切れました。再ログインしてください。')).catch(() => setError('ログイン状態を更新できませんでした。'));
    }
  };
  const complete = async (allowOriginChange = false) => {
    if (!observation) return;
    setBusy(true);
    try {
      await manabaAuth.completeLogin(observation, allowOriginChange);
      if (route.params.mode === 'sessionCheck') Alert.alert('セッションを確認しました', 'ログイン状態は有効です。課題HTML解析は実際のページ構造を確認後に有効になります。');
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
  const allowNavigation = ({ url }: WebViewNavigation) => {
    try { return new URL(url).protocol === 'https:'; } catch { return url === 'about:blank'; }
  };

  return <View style={s.screen}>
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={s.muted}>大学の画面で認証してください。入力内容やCookieをsukeが読み取ることはありません。</Text>
      {observation?.title ? <Text numberOfLines={1} style={s.text}>{observation.title}</Text> : null}
      {error && <Text accessibilityRole="alert" style={[s.muted, { color: colors.red }]}>{error}</Text>}
      <View style={s.row}>
        <View style={{ flex: 1 }}><Button secondary title="再読み込み" onPress={() => webView.current?.reload()} disabled={busy} /></View>
        <View style={{ flex: 1 }}><Button title={route.params.mode === 'sessionCheck' ? 'セッションを確認' : 'ログイン完了'} onPress={() => { void complete(); }} disabled={busy || loading || !observation} /></View>
      </View>
    </View>
    <WebView ref={webView} source={{ uri: configuredUrl }} style={{ flex: 1 }}
      originWhitelist={['https://*']} sharedCookiesEnabled thirdPartyCookiesEnabled cacheEnabled
      javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={allowNavigation}
      onLoadStart={() => { setLoading(true); setError(null); }}
      onLoadEnd={() => { setLoading(false); inspect(); }}
      onMessage={onMessage}
      onError={() => setError('ネットワークエラーが発生しました。接続を確認して再試行してください。')}
      onHttpError={event => setError(event.nativeEvent.statusCode === 503 ? 'manabaがメンテナンス中の可能性があります。' : `manabaへの接続に失敗しました（HTTP ${event.nativeEvent.statusCode}）。`)} />
    {loading && <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.green} /></View>}
  </View>;
}
