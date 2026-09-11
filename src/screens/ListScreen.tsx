import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../state/AppContext';
import { dayDifference, isThisWeek } from '../domain/dates';
import { RootNavigation } from '../navigation/types';
import { AssignmentCard, Chips, Empty, PageTitle } from '../ui/components';
import { styles as s } from '../ui/theme';

export function ListScreen() {
  const { data, now } = useApp(); const nav = useNavigation<RootNavigation>();
  const [filter, setFilter] = useState('all'); const [sort, setSort] = useState('asc');
  const assignments = (data?.assignments ?? []).filter(a => filter === 'open' ? a.status !== 'submitted' : filter === 'submitted' ? a.status === 'submitted' : filter === 'today' ? dayDifference(a.deadline, now) === 0 : filter === 'week' ? isThisWeek(a.deadline, now) : true)
    .sort((a, b) => (sort === 'desc' ? Date.parse(b.deadline) - Date.parse(a.deadline) : sort === 'course' ? a.courseName.localeCompare(b.courseName, 'ja') : sort === 'importance' ? b.importance - a.importance : Date.parse(a.deadline) - Date.parse(b.deadline)) || Date.parse(a.deadline) - Date.parse(b.deadline));
  return <FlatList style={s.screen} contentContainerStyle={s.content} data={assignments} keyExtractor={a => a.id}
    ListHeaderComponent={<View style={{ gap: 16 }}><PageTitle title="課題一覧" subtitle="すべての授業を、見渡そう。" onAdd={() => nav.navigate('Editor')} />
      <Chips value={filter} onChange={setFilter} options={[{ value: 'all', label: 'すべて' }, { value: 'open', label: '未提出' }, { value: 'submitted', label: '提出済み' }, { value: 'today', label: '今日締切' }, { value: 'week', label: '今週締切' }]} />
      <Text style={s.muted}>並び替え</Text><Chips value={sort} onChange={setSort} options={[{ value: 'asc', label: '締切が近い順' }, { value: 'desc', label: '締切が遠い順' }, { value: 'course', label: '授業別' }, { value: 'importance', label: '重要度順' }]} /><Text style={s.muted}>{assignments.length}件 · 今週は月曜〜日曜</Text>
    </View>}
    ListEmptyComponent={<Empty title="該当する課題はありません" />}
    renderItem={({ item }) => <AssignmentCard assignment={item} now={now} onPress={() => nav.navigate('Detail', { id: item.id })} />} />;
}
