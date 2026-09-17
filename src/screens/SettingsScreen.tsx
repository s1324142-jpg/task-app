import { Alert } from '../ui/alerts';
import React, { useCallback, useState } from 'react';
import { Linking, Platform, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useApp } from '../state/AppContext';
import { reminderKeys, reminderLabels } from '../domain/models';
import { requestNotificationPermission } from '../services/notifications';
import { Button, PageTitle, reportError } from '../ui/components';
import { colors, styles as s } from '../ui/theme';
import { RootNavigation } from '../navigation/types';
import { ManabaAuthError, ManabaSession } from '../manaba/ManabaAuthService';
import { manabaAuth } from '../manaba/manabaNative';
import { OTSUMA_MANABA_URL } from '../manaba/otsumaSync';

export function SettingsScreen() {
  const { data, change, warning, refresh } = useApp(); const [busy, setBusy] = useState(false);
  const navigation = useNavigation<RootNavigation>();
  const [manabaUrl, setManabaUrl] = useState(OTSUMA_MANABA_URL);
  const [manabaSession, setManabaSession] = useState<ManabaSession | null>(null);
  const [manabaError, setManabaError] = useState<string | null>(null);
  const loadManaba = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const session = await manabaAuth.getSession();
      setManabaSession(session); setManabaUrl(session?.baseUrl ?? OTSUMA_MANABA_URL); setManabaError(null);
    } catch { setManabaError('manaba連携情報を読み込めませんでした。'); }
  }, []);
  useFocusEffect(useCallback(() => { void loadManaba(); }, [loadManaba]));
  if (!data) return null;
  const enable = async () => {
    setBusy(true);
    try {
      const allowed = await requestNotificationPermission(); await refresh();
      Alert.alert(allowed ? '通知を許可しました' : '通知が許可されていません', allowed ? '登録済み課題の締切通知を更新しました。予約結果はこの画面で確認できます。' : '端末の設定で、このアプリの通知を許可してください。');
    } catch { Alert.alert('通知を設定できませんでした', '端末の設定を確認して再試行してください。'); }
    finally { setBusy(false); }
  };
  const openManabaLogin = async (mode: 'login' | 'sessionCheck' | 'sync') => {
    if (Platform.OS === 'web') {
      setManabaError('Webプレビューではmanaba認証セッションを共有できません。Android / iOSの開発ビルドまたはAPKでログインしてください。');
      return;
    }
    setBusy(true); setManabaError(null);
    try {
      const baseUrl = mode === 'login' ? await manabaAuth.configure(manabaUrl) : manabaSession?.baseUrl;
      if (!baseUrl) throw new ManabaAuthError('not_configured', '先にmanaba URLを入力してください。');
      await loadManaba();
      navigation.navigate('ManabaLogin', { baseUrl, authenticatedOrigin: manabaSession?.authenticatedOrigin, mode });
    } catch (cause) {
      setManabaError(cause instanceof ManabaAuthError ? cause.message : 'manaba連携を開始できませんでした。');
    } finally { setBusy(false); }
  };
  const performLogout = async (deleteAssignments: boolean) => {
    setBusy(true); setManabaError(null);
    try {
      await manabaAuth.logout();
      if (deleteAssignments) await change(state => ({
        ...state,
        assignments: state.assignments.filter(assignment => assignment.provider !== 'manaba'),
        courses: state.courses.filter(course => course.provider !== 'manaba' || state.assignments.some(assignment => assignment.provider === 'manual' && assignment.courseId === course.id)),
      }));
      setManabaSession(null); setManabaUrl(OTSUMA_MANABA_URL);
    } catch { setManabaError('manabaのCookieまたは連携情報を削除できませんでした。再試行してください。'); }
    finally { setBusy(false); }
  };
  const confirmLogout = () => Alert.alert('manaba連携を解除しますか？', 'manabaのCookieとセッション情報を削除します。取得済みのmanaba課題を残すか選んでください。', [
    { text: 'キャンセル', style: 'cancel' },
    { text: '課題を残す', onPress: () => { void performLogout(false); } },
    { text: '課題も削除', style: 'destructive', onPress: () => { void performLogout(true); } },
  ]);
  const connectionLabel = manabaSession?.status === 'connected' ? 'manaba連携済み' : manabaSession ? '再ログインが必要' : '未連携';
  const formatDate = (value?: string) => value ? new Date(value).toLocaleString('ja-JP') : '未同期';
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <PageTitle title="設定" subtitle="自分のペースに、合わせよう。" />
    <View style={s.card}><Text style={s.heading}>締切通知</Text><Text style={s.muted}>日単位の通知は端末の現地時間で朝9時。締切が朝9時以前の場合、当日は0時にお知らせします。3時間前の通知は締切から計算します。</Text>
      {reminderKeys.map(key => <View key={key} style={s.spread}><Text style={s.text}>{reminderLabels[key]}</Text><Switch accessibilityLabel={`${reminderLabels[key]}の通知`} value={data.settings[key]} disabled={busy} trackColor={{ true: colors.green }} onValueChange={value => {
        setBusy(true); void change(state => ({ ...state, settings: { ...state.settings, [key]: value } })).catch(reportError).finally(() => setBusy(false));
      }} /></View>)}
      <Text style={s.muted}>提出済みの課題には通知しません。過ぎた通知時刻の分は予約しません。</Text>
    </View>
    {warning && <Text accessibilityRole="alert" style={[s.text, { color: colors.amber }]}>{warning}</Text>}
    <Button disabled={busy || Platform.OS === 'web'} title="通知を許可する" onPress={() => { void enable(); }} />
    <Button disabled={busy} secondary title="通知を再設定" onPress={() => { setBusy(true); void refresh().finally(() => setBusy(false)); }} />
    <Button disabled={Platform.OS === 'web'} secondary title="端末のアプリ設定を開く" onPress={() => { void Linking.openSettings().catch(() => Alert.alert('設定を開けませんでした')); }} />
    <View style={s.card}><Text style={s.heading}>授業</Text>{data.courses.length ? data.courses.map(c => <View key={c.id} style={s.spread}><Text style={[s.text, { flex: 1 }]}>{c.name}</Text><Text style={s.muted}>{data.assignments.filter(a => a.courseId === c.id).length}件</Text></View>) : <Text style={s.muted}>課題登録時に授業が追加されます。</Text>}</View>
    <View style={s.card}>
      <Text style={s.heading}>manaba連携</Text>
      <View style={s.spread}><Text style={s.text}>接続状態</Text><Text style={[s.text, { color: manabaSession?.status === 'connected' ? colors.green : colors.amber }]}>{connectionLabel}</Text></View>
      <Text style={s.label}>manaba URL</Text>
      <TextInput accessibilityLabel="manaba URL" autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://..." value={manabaUrl} onChangeText={setManabaUrl} editable={!busy} selectTextOnFocus style={s.input} />
      <Text style={s.muted}>大妻女子大学の公式manaba URLです。IDやパスワードは入力・保存しません。</Text>
      {manabaError && <Text accessibilityRole="alert" style={[s.muted, { color: colors.red }]}>{manabaError}</Text>}
      <Button disabled={busy || !manabaUrl.trim()} title={manabaSession?.status === 'connected' ? 'manabaに再ログイン' : 'manabaにログイン'} onPress={() => { void openManabaLogin('login'); }} />
      <Button disabled={busy || Platform.OS === 'web' || !manabaSession} secondary title="ログイン状態を確認" onPress={() => {
        if (manabaSession?.status !== 'connected') { setManabaError('manabaのログイン期限が切れました。再ログインしてください。'); return; }
        void openManabaLogin('sessionCheck');
      }} />
      <Button disabled={busy || Platform.OS === 'web' || manabaSession?.status !== 'connected'} secondary title="課題を同期" onPress={() => { void openManabaLogin('sync'); }} />
      <Button disabled={busy || Platform.OS === 'web' || !manabaSession} secondary title="ログアウト / 連携解除" onPress={confirmLogout} />
      <Text style={s.muted}>最終同期: {formatDate(manabaSession?.lastSyncAt)}</Text>
      <Text style={s.muted}>{Platform.OS === 'web' ? 'manaba連携はAndroid / iOSアプリで利用できます。' : '同期は大妻女子大学manabaの提出物一覧を端末内で解析します。CookieやページのHTMLはアプリの保存領域へコピーしません。'}</Text>
    </View>
    <View style={s.card}><Text style={s.heading}>保存について</Text><Text style={s.muted}>課題はこの端末に保存され、オフラインでも確認・編集できます。アプリの削除やデータ消去で失われます。通知は端末の権限・省電力設定によって遅れる場合があります。</Text></View>
    <Text style={[s.muted, { textAlign: 'center' }]}>suke · Version 0.1.0{'\n'}毎日の学びに、少しのゆとりを。</Text>
  </ScrollView>;
}
