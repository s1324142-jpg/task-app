import { Alert } from '../ui/alerts';
import React, { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../state/AppContext';
import { RootStackParams } from '../navigation/types';
import { Status, statuses, statusLabels } from '../domain/models';
import { dayDifference, deadlineLabel, relativeDeadline } from '../domain/dates';
import { Button, Chips, Empty, reportError } from '../ui/components';
import { colors, styles as s } from '../ui/theme';

export function DetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParams, 'Detail'>) {
  const { data, change, now } = useApp(); const [busy, setBusy] = useState(false);
  const a = data?.assignments.find(item => item.id === route.params.id);
  if (!a) return <View style={s.content}><Empty title="課題が見つかりません" message="削除された課題の可能性があります。" /></View>;
  const automaticallyDue = a.status !== 'submitted' && dayDifference(a.deadline, now) <= 1;
  const update = async (patch: { status?: Status; doToday?: boolean }) => {
    if (busy) return; setBusy(true);
    try { await change(state => ({ ...state, assignments: state.assignments.map(item => item.id === a.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) })); }
    catch { reportError(); } finally { setBusy(false); }
  };
  const remove = () => Alert.alert('課題を削除しますか？', `「${a.title}」と今後の通知予約を削除します。この操作は取り消せません。`, [
    { text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: () => {
      setBusy(true);
      void change(state => ({ ...state, assignments: state.assignments.filter(item => item.id !== a.id) }))
        .then(() => navigation.goBack()).catch(() => { setBusy(false); reportError(); });
    } },
  ]);
  const openSource = async () => {
    if (!a.sourceUrl) return;
    try {
      const url = new URL(a.sourceUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL');
      await Linking.openURL(url.toString());
    } catch { Alert.alert('ページを開けませんでした', '課題URLと端末のブラウザ設定を確認してください。'); }
  };
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <Text style={[s.muted, { color: colors.green }]}>{a.courseName}</Text><Text style={s.title}>{a.title}</Text>
    <View style={s.card}><Text style={s.muted}>締切日時</Text><Text style={s.heading}>{deadlineLabel(a.deadline)}</Text><Text style={[s.text, { color: a.status === 'submitted' ? colors.green : colors.red }]}>{a.status === 'submitted' ? '提出済み' : relativeDeadline(a.deadline, now)}</Text></View>
    <View style={{ gap: 10 }}><Text style={s.heading}>進捗・提出状況</Text><View pointerEvents={busy ? 'none' : 'auto'}><Chips value={a.status} options={statuses.map(value => ({ value, label: statusLabels[value] }))} onChange={status => { void update({ status }); }} /></View>
      <Text style={s.muted}>「完了」は作業が終わった状態です。manabaに提出したら「提出済み」にしてください。</Text></View>
    <Button disabled={busy} title={a.status === 'submitted' ? '未提出に戻す' : '提出済みにする'} onPress={() => { void update({ status: a.status === 'submitted' ? 'not_started' : 'submitted' }); }} />
    <Button disabled={busy || a.status === 'submitted' || automaticallyDue} secondary title={automaticallyDue ? '期限が近いため今日やるべきことに自動追加' : a.doToday ? '今日やるべきことから外す' : '今日やるべきことに追加'} onPress={() => { void update({ doToday: !a.doToday }); }} />
    <View style={s.card}><View style={s.spread}><Text style={s.muted}>推定作業時間</Text><Text style={s.text}>{a.estimatedMinutes ? `${a.estimatedMinutes}分` : '未設定'}</Text></View><View style={s.spread}><Text style={s.muted}>重要度</Text><Text style={[s.text, { color: colors.green }]}>{'★'.repeat(a.importance)}{'☆'.repeat(5 - a.importance)}</Text></View></View>
    {a.description ? <View style={s.card}><Text style={s.heading}>課題説明</Text><Text selectable style={s.text}>{a.description}</Text></View> : null}
    {a.memo ? <View style={s.card}><Text style={s.heading}>メモ</Text><Text selectable style={s.text}>{a.memo}</Text></View> : null}
    {a.sourceUrl ? <View style={s.card}><Text selectable style={s.muted}>{a.sourceUrl}</Text><Button secondary title="manabaで開く ↗" onPress={() => { void openSource(); }} /></View> : <Text style={s.muted}>課題URLを登録すると、ここからmanabaを開けます。</Text>}
    <Button disabled={busy} secondary title="課題を編集" onPress={() => navigation.navigate('Editor', { id: a.id })} />
    <Button disabled={busy} secondary title="課題を削除" onPress={remove} />
  </ScrollView>;
}
