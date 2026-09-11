import { Alert } from '../ui/alerts';
import React, { useState } from 'react';
import { Linking, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { reminderKeys, reminderLabels } from '../domain/models';
import { requestNotificationPermission } from '../services/notifications';
import { Button, PageTitle, reportError } from '../ui/components';
import { colors, styles as s } from '../ui/theme';

export function SettingsScreen() {
  const { data, change, warning, refresh } = useApp(); const [busy, setBusy] = useState(false);
  if (!data) return null;
  const enable = async () => {
    setBusy(true);
    try {
      const allowed = await requestNotificationPermission(); await refresh();
      Alert.alert(allowed ? '通知を許可しました' : '通知が許可されていません', allowed ? '登録済み課題の締切通知を更新しました。予約結果はこの画面で確認できます。' : '端末の設定で、このアプリの通知を許可してください。');
    } catch { Alert.alert('通知を設定できませんでした', '端末の設定を確認して再試行してください。'); }
    finally { setBusy(false); }
  };
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
    <View style={s.card}><Text style={s.heading}>manaba連携</Text><Text style={s.text}>手動登録で利用できます</Text><Text style={s.muted}>自動同期は今後対応予定です。課題URLを保存すると、端末のブラウザからmanabaを開けます。</Text></View>
    <View style={s.card}><Text style={s.heading}>保存について</Text><Text style={s.muted}>課題はこの端末に保存され、オフラインでも確認・編集できます。アプリの削除やデータ消去で失われます。通知は端末の権限・省電力設定によって遅れる場合があります。</Text></View>
    <Text style={[s.muted, { textAlign: 'center' }]}>suke · Version 0.1.0{'\n'}毎日の学びに、少しのゆとりを。</Text>
  </ScrollView>;
}
