import { Alert } from '../ui/alerts';
import React, { useCallback, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useApp } from '../state/AppContext';
import { reminderKeys, reminderLabels } from '../domain/models';
import { requestNotificationPermission } from '../services/notifications';
import { Button, MascotImage, PageTitle, reportError } from '../ui/components';
import { useTheme } from '../themes/ThemeContext';
import { RootNavigation } from '../navigation/types';
import { MANABA_RELOGIN_REQUIRED, ManabaAuthError, ManabaSession } from '../manaba/ManabaAuthService';
import { manabaAuth } from '../manaba/manabaNative';
import { useAuth } from '../cloud/AuthContext';

export function SettingsScreen() {
  const { theme, styles: s } = useTheme(); const colors = theme.colors;
  const auth = useAuth();
  const { data, change, warning, refresh, cloudSyncState, cloudError, lastCloudSyncAt, retryCloudSync } = useApp(); const [busy, setBusy] = useState(false);
  const navigation = useNavigation<RootNavigation>();
  const [manabaUrl, setManabaUrl] = useState('');
  const [manabaSession, setManabaSession] = useState<ManabaSession | null>(null);
  const [manabaError, setManabaError] = useState<string | null>(null);
  const loadManaba = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const session = await manabaAuth.getSession();
      setManabaSession(session); setManabaUrl(session?.baseUrl ?? ''); setManabaError(null);
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
      setManabaSession(null); setManabaUrl('');
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
    {theme.id === 'sparklePink' && <View style={[s.card, { flexDirection: 'row', alignItems: 'center' }]}><MascotImage size={64} /><View style={{ flex: 1, gap: 4 }}><Text style={s.heading}>QUEUEユーザーさん♡</Text><Text style={s.muted}>かわいく、楽しく、今日も一歩ずつ。</Text></View></View>}
    <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Theme')} style={s.card}>
      <View style={s.spread}><View style={[s.row, { flex: 1 }]}><View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale }}><Feather name="image" size={20} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={s.heading}>テーマ・壁紙</Text><Text style={s.muted}>使用中：{theme.name}</Text></View></View><Feather name="chevron-right" size={21} color={colors.muted} /></View>
    </Pressable>
    <View style={s.card}>
      <View style={s.spread}><View style={[s.row, { flex: 1 }]}>{auth.user?.photoURL ? <Image source={{ uri: auth.user.photoURL }} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }}><Feather name="cloud" size={22} color={colors.green} /></View>}<View style={{ flex: 1 }}><Text style={s.heading}>Googleデータ共有</Text><Text numberOfLines={1} style={s.muted}>{auth.user?.email ?? 'AndroidとWebで課題を共有'}</Text></View></View>{auth.user && <Text style={{ color: cloudSyncState === 'synced' ? colors.green : cloudSyncState === 'error' ? colors.red : colors.amber, fontWeight: '700' }}>{cloudSyncState === 'synced' ? '同期済み' : cloudSyncState === 'error' ? '要確認' : '同期中'}</Text>}</View>
      {!auth.configured && <Text style={s.muted}>{Platform.OS === 'web' ? 'Firebase設定が未登録です。' : 'Firebaseは設定済みです。Android用Googleログインを有効にするにはGoogle Web Client IDとAPK署名鍵のSHA-1登録が必要です。'}</Text>}
      {auth.configured && !auth.user && <><Text style={s.muted}>同じGoogleアカウントでログインすると、この端末の課題を残したままクラウドへ統合します。</Text><Button disabled={auth.busy || auth.initializing} title={auth.busy ? 'ログイン中…' : 'Googleでログイン'} onPress={() => { void auth.signIn().catch(() => undefined); }} /></>}
      {auth.user && <><Text style={s.muted}>課題・授業・進捗・設定・テーマを共有します。manabaのCookieと通知予約は端末外へ送りません。</Text>{lastCloudSyncAt && <Text style={s.muted}>最終同期: {new Date(lastCloudSyncAt).toLocaleString('ja-JP')}</Text>}{cloudSyncState === 'error' && <Button secondary title="同期を再試行" onPress={retryCloudSync} />}<Button disabled={auth.busy} secondary title="Googleからログアウト" onPress={() => { void auth.signOut().catch(() => undefined); }} /></>}
      {(auth.error || cloudError) && <Text accessibilityRole="alert" style={[s.muted, { color: colors.red }]}>{auth.error ?? cloudError}</Text>}
    </View>
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
      <Text style={s.muted}>大学から案内されたmanabaのURLを入力してください。IDやパスワードは入力・保存しません。</Text>
      {manabaError && <Text accessibilityRole="alert" style={[s.muted, { color: colors.red }]}>{manabaError}</Text>}
      <Button disabled={busy || !manabaUrl.trim()} title={manabaSession?.status === 'connected' ? 'manabaに再ログイン' : 'manabaにログイン'} onPress={() => { void openManabaLogin('login'); }} />
      <Button disabled={busy || Platform.OS === 'web' || !manabaSession} secondary title="ログイン状態を確認" onPress={() => {
        if (manabaSession?.status !== 'connected') { setManabaError(MANABA_RELOGIN_REQUIRED); return; }
        void openManabaLogin('sessionCheck');
      }} />
      <Button disabled={busy || Platform.OS === 'web' || manabaSession?.status !== 'connected'} secondary title="課題を同期" onPress={() => {
        if (!manabaSession) return;
        navigation.navigate('ManabaLogin', { baseUrl: manabaSession.baseUrl, authenticatedOrigin: manabaSession.authenticatedOrigin, mode: 'sync', autoStart: true });
      }} />
      <Button disabled={busy || Platform.OS === 'web' || !manabaSession} secondary title="ログアウト / 連携解除" onPress={confirmLogout} />
      <Text style={s.muted}>最終同期: {formatDate(manabaSession?.lastSyncAt)}</Text>
      <Text style={s.muted}>{Platform.OS === 'web' ? 'manaba連携はAndroid / iOSアプリで利用できます。' : '同期はmanabaの提出物一覧を端末内で解析します。CookieやページのHTMLはアプリの保存領域へコピーしません。'}</Text>
    </View>
    <View style={s.card}><Text style={s.heading}>保存について</Text><Text style={s.muted}>課題はこの端末に保存され、オフラインでも確認・編集できます。アプリの削除やデータ消去で失われます。通知は端末の権限・省電力設定によって遅れる場合があります。</Text></View>
    <Text style={[s.muted, { textAlign: 'center' }]}>QUEUE · Version 0.1.0{'\n'}毎日の学びに、少しのゆとりを。</Text>
  </ScrollView>;
}
