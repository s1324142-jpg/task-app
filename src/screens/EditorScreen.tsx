import { Alert } from '../ui/alerts';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '../ui/DateTimePicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../state/AppContext';
import { RootStackParams } from '../navigation/types';
import { Assignment, assignmentSchema, statuses, statusLabels } from '../domain/models';
import { deadlineLabel } from '../domain/dates';
import { Button, Chips, Empty, reportError } from '../ui/components';
import { colors, styles as s } from '../ui/theme';

export function EditorScreen({ route, navigation }: NativeStackScreenProps<RootStackParams, 'Editor'>) {
  const { data, save } = useApp(); const id = route.params?.id;
  const existing = data?.assignments.find(a => a.id === id);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [courseName, setCourseName] = useState(existing?.courseName ?? '');
  const [deadline, setDeadline] = useState(() => {
    if (existing) return new Date(existing.deadline);
    const date = new Date(); date.setHours(23, 59, 0, 0); return date;
  });
  const [status, setStatus] = useState<Assignment['status']>(existing?.status ?? 'not_started');
  const [importance, setImportance] = useState<Assignment['importance']>(existing?.importance ?? 3);
  const [estimated, setEstimated] = useState(existing?.estimatedMinutes?.toString() ?? '');
  const [url, setUrl] = useState(existing?.sourceUrl ?? '');
  const [memo, setMemo] = useState(existing?.memo ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [doToday, setDoToday] = useState(existing?.doToday ?? false);
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  if (id && !existing) return <View style={s.content}><Empty title="課題が見つかりません" /></View>;
  const onDate = (_event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === 'android') setPicker(null);
    if (value) { value.setSeconds(0, 0); setDeadline(value); }
  };
  const persist = async () => {
    setBusy(true);
    try {
      const savedId = await save({ title: title.trim(), courseName: courseName.trim(), deadline: deadline.toISOString(),
        status, importance, estimatedMinutes: estimated.trim() ? Number(estimated) : undefined,
        doToday, sourceUrl: url.trim() || undefined, memo: memo.trim() || undefined, description: description.trim() || undefined,
      }, id);
      if (id) navigation.goBack(); else navigation.replace('Detail', { id: savedId });
    } catch { reportError(); } finally { setBusy(false); }
  };
  const submit = () => {
    if (busy) return;
    if (!title.trim() || !courseName.trim()) { setError('課題名と授業名を入力してください。'); return; }
    if (estimated.trim() && (!/^\d+$/.test(estimated.trim()) || Number(estimated) < 1 || Number(estimated) > 100000)) { setError('推定作業時間は1〜100000の整数（分）で入力してください。'); return; }
    if (url.trim() && !assignmentSchema.shape.sourceUrl.safeParse(url.trim()).success) { setError('課題URLはhttp://またはhttps://で始まるURLを入力してください。'); return; }
    setError(null);
    if (deadline < new Date() && status !== 'submitted') Alert.alert('締切が過去の日付です', 'この締切日時で保存しますか？', [{ text: '戻る', style: 'cancel' }, { text: '保存', onPress: () => { void persist(); } }]);
    else void persist();
  };
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.muted}>必須項目を入力して、締切を管理しましょう。</Text>
      <View><Text style={s.label}>課題名 *</Text><TextInput accessibilityLabel="課題名" value={title} onChangeText={setTitle} style={s.input} placeholder="例：レポート第3回" placeholderTextColor={colors.muted} maxLength={200} /></View>
      <View><Text style={s.label}>授業名 *</Text><TextInput accessibilityLabel="授業名" value={courseName} onChangeText={setCourseName} style={s.input} placeholder="例：情報ネットワーク論" placeholderTextColor={colors.muted} maxLength={120} /></View>
      {!!data?.courses.length && <Chips value={courseName} onChange={setCourseName} options={data.courses.map(c => ({ value: c.name, label: c.name }))} />}
      <View style={{ gap: 10 }}><Text style={s.label}>締切日時 *</Text><Text style={s.text}>{deadlineLabel(deadline.toISOString())}</Text><View style={s.row}><View style={{ flex: 1 }}><Button secondary title="日付を選ぶ" onPress={() => setPicker('date')} /></View><View style={{ flex: 1 }}><Button secondary title="時刻を選ぶ" onPress={() => setPicker('time')} /></View></View></View>
      {picker && <View><DateTimePicker value={deadline} mode={picker} is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDate} />{Platform.OS === 'ios' && <Button title="日時を決定" onPress={() => setPicker(null)} />}</View>}
      <View><Text style={s.label}>進捗・提出状況</Text><Chips value={status} onChange={setStatus} options={statuses.map(value => ({ value, label: statusLabels[value] }))} /></View>
      <View><Text style={s.label}>推定作業時間（分）</Text><TextInput accessibilityLabel="推定作業時間（分）" value={estimated} onChangeText={setEstimated} style={s.input} placeholder="例：90" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={6} /></View>
      <View><Text style={s.label}>重要度 · 1が低く、5が高い</Text><Chips value={importance} onChange={setImportance} options={([1, 2, 3, 4, 5] as const).map(value => ({ value, label: `★ ${value}` }))} /></View>
      <View style={s.spread}><Text style={s.label}>今日やるに追加</Text><Switch accessibilityLabel="今日やるに追加" value={doToday} onValueChange={setDoToday} trackColor={{ true: colors.green }} /></View>
      <View><Text style={s.label}>manaba 課題URL</Text><TextInput accessibilityLabel="manaba課題URL" value={url} onChangeText={setUrl} style={s.input} placeholder="https://…" placeholderTextColor={colors.muted} keyboardType="url" autoCapitalize="none" autoCorrect={false} /></View>
      <View><Text style={s.label}>課題説明</Text><TextInput accessibilityLabel="課題説明" value={description} onChangeText={setDescription} style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]} multiline maxLength={10000} /></View>
      <View><Text style={s.label}>メモ</Text><TextInput accessibilityLabel="メモ" value={memo} onChangeText={setMemo} style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]} multiline placeholder="取り組む内容や、忘れたくないこと" placeholderTextColor={colors.muted} maxLength={10000} /></View>
      {error && <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text>}
      <Button disabled={busy} title={busy ? '保存中…' : '課題を保存'} onPress={submit} />
    </ScrollView>
  </KeyboardAvoidingView>;
}
