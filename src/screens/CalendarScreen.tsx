import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { dayKey, monthDays } from '../domain/dates';
import { RootNavigation } from '../navigation/types';
import { AssignmentCard, Button, Empty, PageTitle } from '../ui/components';
import { useTheme } from '../themes/ThemeContext';

export function CalendarScreen() {
  const { theme, styles: s } = useTheme(); const colors = theme.colors;
  const { data, now } = useApp(); const nav = useNavigation<RootNavigation>();
  const [month, setMonth] = useState(new Date()); const [selected, setSelected] = useState(dayKey(now));
  const assignments = (data?.assignments ?? []).filter(a => dayKey(a.deadline) === selected).sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
  const counts = new Map<string, number>();
  const itemsByDay = new Map<string, typeof assignments>();
  for (const a of data?.assignments ?? []) counts.set(dayKey(a.deadline), (counts.get(dayKey(a.deadline)) ?? 0) + 1);
  for (const a of data?.assignments ?? []) { const key = dayKey(a.deadline); itemsByDay.set(key, [...(itemsByDay.get(key) ?? []), a]); }
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <PageTitle title="カレンダー" subtitle="締切のある日を、ひと目で。" onAdd={() => nav.navigate('Editor')} />
    <View style={[s.card, { padding: 12 }]}>
      <View style={s.spread}>
        <Pressable accessibilityRole="button" accessibilityLabel="前の月" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={{ padding: 12 }}><Feather name="chevron-left" size={22} color={colors.green} /></Pressable>
        <Text style={s.heading}>{month.getFullYear()}年 {month.getMonth() + 1}月</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="次の月" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={{ padding: 12 }}><Feather name="chevron-right" size={22} color={colors.green} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>{[...(theme.id === 'sparklePink' ? '月火水木金土日' : '日月火水木金土')].map(day => <Text key={day} style={[s.muted, { width: '14.2857%', textAlign: 'center' }]}>{day}</Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{monthDays(month, theme.id === 'sparklePink').map(date => {
        const key = dayKey(date); const count = counts.get(key) ?? 0; const active = selected === key; const dayItems = itemsByDay.get(key) ?? [];
        return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${date.getMonth() + 1}月${date.getDate()}日 締切${count}件`} onPress={() => setSelected(key)}
          style={{ width: '14.2857%', minHeight: theme.id === 'sparklePink' ? 68 : 56, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12, backgroundColor: active ? colors.green : key === dayKey(now) ? colors.pale : 'transparent' }}>
          <Text style={{ fontSize: 15, fontWeight: active ? '700' : '400', color: active ? 'white' : date.getMonth() === month.getMonth() ? colors.ink : '#AAB4AE' }}>{date.getDate()}</Text>
          {theme.id === 'sparklePink' && dayItems[0] ? <><Text numberOfLines={1} style={{ maxWidth: '94%', fontSize: 8, color: active ? 'white' : colors.green }}>{dayItems[0].courseName}</Text>{count > 1 && <Text style={{ fontSize: 8, color: active ? 'white' : colors.muted }}>+{count - 1}</Text>}</> : <Text style={{ fontSize: 10, color: active ? '#FFFFFF' : colors.green, minHeight: 13 }}>{count ? `${count}件` : ''}</Text>}
        </Pressable>;
      })}</View>
      <Button title="今日に戻る" secondary onPress={() => { setMonth(now); setSelected(dayKey(now)); }} />
    </View>
    <Text style={s.heading}>{Number(selected.slice(5, 7))}月{Number(selected.slice(8))}日の締切 · {assignments.length}件</Text>
    {assignments.length ? assignments.map(a => <AssignmentCard key={a.id} assignment={a} now={now} onPress={() => nav.navigate('Detail', { id: a.id })} />) : <Empty title="この日の締切はありません" message="件数のある日をタップして、課題を確認できます。" />}
  </ScrollView>;
}
