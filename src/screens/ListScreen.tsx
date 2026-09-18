import React, { useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../state/AppContext';
import { dayDifference, isThisWeek } from '../domain/dates';
import { RootNavigation } from '../navigation/types';
import { AssignmentCard, Chips, Empty, FloatingActionButton, PageTitle } from '../ui/components';
import { useTheme } from '../themes/ThemeContext';

export function ListScreen() {
  const { theme, styles: s } = useTheme(); const colors = theme.colors;
  const { data, now } = useApp(); const nav = useNavigation<RootNavigation>();
  const [filter, setFilter] = useState('all'); const [sort, setSort] = useState('asc'); const [search, setSearch] = useState('');
  const assignments = (data?.assignments ?? []).filter(a => filter === 'open' ? a.status !== 'submitted' : filter === 'progress' ? ['not_started', 'in_progress', 'completed'].includes(a.status) : filter === 'submitted' ? a.status === 'submitted' : filter === 'today' ? dayDifference(a.deadline, now) === 0 : filter === 'week' ? isThisWeek(a.deadline, now) : true)
    .filter(a => !search.trim() || `${a.title} ${a.courseName}`.toLocaleLowerCase('ja').includes(search.trim().toLocaleLowerCase('ja')))
    .sort((a, b) => (sort === 'desc' ? Date.parse(b.deadline) - Date.parse(a.deadline) : sort === 'course' ? a.courseName.localeCompare(b.courseName, 'ja') : sort === 'importance' ? b.importance - a.importance : Date.parse(a.deadline) - Date.parse(b.deadline)) || Date.parse(a.deadline) - Date.parse(b.deadline));
  const list = <FlatList style={s.screen} contentContainerStyle={[s.content, theme.id === 'sparklePink' && { paddingBottom: 100 }]} data={assignments} keyExtractor={a => a.id}
    ListHeaderComponent={<View style={{ gap: 16 }}><PageTitle title={theme.id === 'sparklePink' ? '課題' : '課題一覧'} subtitle="すべての授業を、見渡そう。" onAdd={theme.id === 'sparklePink' ? undefined : () => nav.navigate('Editor')} />
      <Chips value={filter} onChange={setFilter} options={theme.id === 'sparklePink' ? [{ value: 'all', label: 'すべて' }, { value: 'progress', label: '進行中' }, { value: 'submitted', label: '完了' }] : [{ value: 'all', label: 'すべて' }, { value: 'open', label: '未提出' }, { value: 'submitted', label: '提出済み' }, { value: 'today', label: '今日締切' }, { value: 'week', label: '今週締切' }]} />
      {theme.id === 'sparklePink' && <TextInput accessibilityLabel="課題を検索" value={search} onChangeText={setSearch} style={s.input} placeholder="課題を検索…" placeholderTextColor={colors.muted} />}
      <Text style={s.muted}>並び替え</Text><Chips value={sort} onChange={setSort} options={[{ value: 'asc', label: '締切が近い順' }, { value: 'desc', label: '締切が遠い順' }, { value: 'course', label: '授業別' }, { value: 'importance', label: '重要度順' }]} /><Text style={s.muted}>{assignments.length}件 · 今週は月曜〜日曜</Text>
    </View>}
    ListEmptyComponent={<Empty title="該当する課題はありません" />}
    renderItem={({ item }) => <AssignmentCard assignment={item} now={now} onPress={() => nav.navigate('Detail', { id: item.id })} />} />;
  return theme.id === 'sparklePink' ? <View style={s.screen}>{list}<FloatingActionButton onPress={() => nav.navigate('Editor')} /></View> : list;
}
