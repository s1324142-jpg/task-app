import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { dayDifference, isThisWeek } from '../domain/dates';
import { todayAssignments, priorityReason } from '../domain/priority';
import { RootNavigation } from '../navigation/types';
import { AssignmentCard, Empty, PageTitle } from '../ui/components';
import { colors, styles as s } from '../ui/theme';

export function HomeScreen() {
  const { data, now, warning } = useApp();
  const nav = useNavigation<RootNavigation>();
  if (!data) return null;
  const open = data.assignments.filter(a => a.status !== 'submitted');
  const today = todayAssignments(open, now);
  const dueToday = open.filter(a => dayDifference(a.deadline, now) === 0);
  const overdue = open.filter(a => new Date(a.deadline) < now);
  const date = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${'日月火水木金土'[now.getDay()]}）`;
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <PageTitle title="suke" subtitle={date} onAdd={() => nav.navigate('Editor')} />
    <View style={{ backgroundColor: colors.green, borderRadius: 24, padding: 24, gap: 18 }}>
      <View style={s.spread}><Text style={{ color: '#CEE3D7', fontSize: 12, letterSpacing: 2 }}>YOUR STUDY, AT A GLANCE</Text><Feather name="sun" size={22} color="#D5E6B4" /></View>
      <Text style={{ color: 'white', fontSize: 25, lineHeight: 37, fontWeight: '700' }}>{now.getHours() < 11 ? 'おはようございます。' : now.getHours() < 18 ? 'こんにちは。' : 'おつかれさまです。'}{'\n'}今日の一歩を、ここから。</Text>
      <Text style={{ color: '#DFEEE6', fontSize: 14, lineHeight: 23 }}>{today.length ? `今日は${today.length}件の課題に取り組みましょう。` : '今日のおすすめ課題はありません。'}{dueToday.length ? `\n今日締切の課題が${dueToday.length}件あります。` : ''}</Text>
    </View>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {[['未提出', open.length], ['今週締切', open.filter(a => isThisWeek(a.deadline, now)).length], ['今日締切', dueToday.length]].map(([label, count]) => <View key={label} style={[s.card, { flex: 1, padding: 12, alignItems: 'center' }]}><Text style={{ fontSize: 28, fontWeight: '700', color: colors.green }}>{count}</Text><Text style={s.muted}>{label}</Text></View>)}
    </View>
    {!!overdue.length && <Text accessibilityRole="alert" style={[s.text, { color: colors.red }]}>締切超過 {overdue.length}件 · 提出状況を確認してください</Text>}
    {warning && <Text accessibilityRole="alert" style={[s.muted, { color: colors.amber }]}>{warning}</Text>}
    <View style={s.spread}><Text style={s.heading}>今日やる</Text><Text style={s.muted}>優先度の高い順 · {today.length}件</Text></View>
    {today.length ? today.slice(0, 3).map(a => <AssignmentCard key={a.id} assignment={a} now={now} reason={priorityReason(a, now)} onPress={() => nav.navigate('Detail', { id: a.id })} />) : <Empty title={data.assignments.length ? '今日は余裕のある一日' : '課題を、ひとつに。'} message={data.assignments.length ? '課題の詳細から「今日やる」に追加できます。' : 'まずは授業名と締切を登録しましょう。\n締切も今日やることも、ここで確認できます。'} onAdd={data.assignments.length ? undefined : () => nav.navigate('Editor')} />}
    <Text style={s.heading}>これからの締切</Text>
    <View style={s.card}>{['今日締切', '明日締切', '3日以内', '7日以内', 'それ以降'].map((label, index) => {
      const count = open.filter(a => {
        const d = dayDifference(a.deadline, now);
        return index === 0 ? d === 0 : index === 1 ? d === 1 : index === 2 ? d >= 2 && d <= 3 : index === 3 ? d >= 4 && d <= 7 : d > 7;
      }).length;
      return <View key={label} style={s.spread}><Text style={s.text}>{label}</Text><Text style={[s.text, { fontWeight: '700' }]}>{count} 件</Text></View>;
    })}</View>
  </ScrollView>;
}
