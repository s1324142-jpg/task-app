import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../state/AppContext';
import { todoAssignments, priorityReason } from '../domain/priority';
import { RootNavigation } from '../navigation/types';
import { AssignmentCard, Empty, PageTitle } from '../ui/components';
import { useTheme } from '../themes/ThemeContext';

export function TodayScreen() {
  const { styles: s } = useTheme();
  const { data, now } = useApp(); const nav = useNavigation<RootNavigation>();
  const { shouldDoToday, flexible } = todoAssignments(data?.assignments ?? [], now);
  const minutes = shouldDoToday.reduce((total, a) => total + (a.status === 'completed' ? 0 : a.estimatedMinutes ?? 0), 0);
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <PageTitle title="TODO" subtitle="今日の優先順位を、わかりやすく。" onAdd={() => nav.navigate('Editor')} />
    <View style={s.card}><Text style={s.heading}>今日やるべきこと {shouldDoToday.length}件 · 推定 {minutes}分</Text><Text style={s.muted}>自分で指定した課題と、提出期限が明日までの未提出課題が入ります。日付が変わると自動で分類されます。</Text></View>
    <View style={s.spread}><Text style={s.heading}>今日やるべきこと</Text><Text style={s.muted}>{shouldDoToday.length}件</Text></View>
    {shouldDoToday.length ? shouldDoToday.map(item => <AssignmentCard key={item.id} assignment={item} now={now} reason={priorityReason(item, now)} onPress={() => nav.navigate('Detail', { id: item.id })} />)
      : <Empty title="今日やるべき課題はありません" message="余裕がある課題を先に進めることもできます。" />}
    <View style={s.spread}><Text style={s.heading}>余裕があるもの</Text><Text style={s.muted}>{flexible.length}件</Text></View>
    {flexible.length ? flexible.map(item => <AssignmentCard key={item.id} assignment={item} now={now} reason={priorityReason(item, now)} onPress={() => nav.navigate('Detail', { id: item.id })} />)
      : <Text style={s.muted}>提出期限が明後日以降の未提出課題はありません。</Text>}
  </ScrollView>;
}
