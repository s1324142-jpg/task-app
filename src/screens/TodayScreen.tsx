import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../state/AppContext';
import { todayAssignments, priorityReason } from '../domain/priority';
import { RootNavigation } from '../navigation/types';
import { AssignmentCard, Empty, PageTitle } from '../ui/components';
import { styles as s } from '../ui/theme';

export function TodayScreen() {
  const { data, now } = useApp(); const nav = useNavigation<RootNavigation>();
  const assignments = todayAssignments(data?.assignments ?? [], now);
  const minutes = assignments.reduce((total, a) => total + (a.status === 'completed' ? 0 : a.estimatedMinutes ?? 0), 0);
  return <FlatList style={s.screen} contentContainerStyle={s.content} data={assignments} keyExtractor={a => a.id}
    ListHeaderComponent={<View style={{ gap: 18 }}><PageTitle title="今日やる" subtitle="焦らず、ひとつずつ。" onAdd={() => nav.navigate('Editor')} /><View style={s.card}><Text style={s.heading}>{assignments.length}件の課題 · 推定 {minutes}分</Text><Text style={s.muted}>締切・作業時間・重要度からおすすめしています。詳細画面から、自分で今日やる課題も選べます。完了した課題は、提出まで確認しましょう。</Text></View></View>}
    ListEmptyComponent={<Empty title="今日のおすすめ課題はありません" message="課題を登録するか、詳細から今日やるに追加しましょう。" />}
    renderItem={({ item }) => <AssignmentCard assignment={item} now={now} reason={priorityReason(item, now)} onPress={() => nav.navigate('Detail', { id: item.id })} />} />;
}
