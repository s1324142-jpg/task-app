import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { dayDifference, dayKey, isThisWeek, monthDays } from '../domain/dates';
import { todayAssignments, priorityReason } from '../domain/priority';
import { RootNavigation } from '../navigation/types';
import { AssignmentCard, Button, Empty, PageTitle } from '../ui/components';
import { useTheme } from '../themes/ThemeContext';
import { MANABA_RELOGIN_REQUIRED, ManabaSession } from '../manaba/ManabaAuthService';
import { manabaAuth } from '../manaba/manabaNative';

export function HomeScreen() {
  const { theme, styles: s } = useTheme(); const colors = theme.colors;
  const { data, now, warning } = useApp();
  const nav = useNavigation<RootNavigation>();
  const [manabaSession, setManabaSession] = useState<ManabaSession | null>(null);
  const [manabaBusy, setManabaBusy] = useState(false);
  const [manabaError, setManabaError] = useState<string | null>(null);
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => { const loop = Animated.loop(Animated.sequence([Animated.timing(float, { toValue: 1, duration: 1800, useNativeDriver: true }), Animated.timing(float, { toValue: 0, duration: 1800, useNativeDriver: true })])); loop.start(); return () => loop.stop(); }, [float]);
  const loadManabaSession = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try { setManabaSession(await manabaAuth.getSession()); setManabaError(null); }
    catch { setManabaError('manabaの連携状態を読み込めませんでした。'); }
  }, []);
  useFocusEffect(useCallback(() => { void loadManabaSession(); }, [loadManabaSession]));
  if (!data) return null;
  const open = data.assignments.filter(a => a.status !== 'submitted');
  const today = todayAssignments(open, now);
  const dueToday = open.filter(a => dayDifference(a.deadline, now) === 0);
  const overdue = open.filter(a => new Date(a.deadline) < now);
  const date = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${'日月火水木金土'[now.getDay()]}）`;
  const calendarDays = monthDays(now);
  const byDay = new Map<string, typeof open>();
  for (const assignment of open) {
    const key = dayKey(assignment.deadline);
    byDay.set(key, [...(byDay.get(key) ?? []), assignment].sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline)));
  }
  const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('ja-JP', { hour: 'numeric', minute: '2-digit' });
  const formatSyncDate = (value?: string) => value ? new Date(value).toLocaleString('ja-JP') : '未同期';
  const openManaba = async () => {
    if (Platform.OS === 'web') { setManabaError('manaba同期はAndroid / iOSアプリで利用できます。'); return; }
    setManabaBusy(true); setManabaError(null);
    try {
      const session = await manabaAuth.getSession();
      if (!session) {
        setManabaError('設定で大学指定のmanaba URLを入力してください。');
        nav.navigate('Main', { screen: 'Settings' });
      } else if (session.status === 'expired') {
        setManabaError(MANABA_RELOGIN_REQUIRED);
        nav.navigate('ManabaLogin', { baseUrl: session.baseUrl, authenticatedOrigin: session.authenticatedOrigin, mode: 'login' });
      } else {
        nav.navigate('ManabaLogin', { baseUrl: session.baseUrl, authenticatedOrigin: session.authenticatedOrigin, mode: 'sync', autoStart: true });
      }
    } catch { setManabaError('manaba同期を開始できませんでした。'); }
    finally { setManabaBusy(false); }
  };
  const manabaCard = <View style={s.card}>
    <View style={s.spread}><View style={{ flex: 1, gap: 3 }}><Text style={s.heading}>manaba課題</Text><Text style={s.muted}>最終同期: {formatSyncDate(manabaSession?.lastSyncAt)}</Text></View><Feather name="refresh-cw" size={21} color={colors.green} /></View>
    {manabaSession?.status === 'expired' && <Text accessibilityRole="alert" style={[s.text, { color: colors.amber }]}>{MANABA_RELOGIN_REQUIRED}</Text>}
    {manabaError && <Text accessibilityRole="alert" style={[s.muted, { color: colors.red }]}>{manabaError}</Text>}
    <Text style={s.muted}>取得に失敗しても、前回取得した課題は端末とFirestoreに残ります。</Text>
    <Button disabled={manabaBusy || Platform.OS === 'web'} title={manabaBusy ? '確認中…' : manabaSession?.status === 'connected' ? 'manaba課題を同期' : manabaSession ? 'manabaへ再ログイン' : 'manaba URLを設定'} onPress={() => { void openManaba(); }} />
  </View>;
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <PageTitle title="QUEUE" subtitle={date} onAdd={() => nav.navigate('Editor')} />
    <View style={{ backgroundColor: colors.green, borderRadius: 28, padding: 24, gap: 18, overflow: 'hidden' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', right: -18, top: -22, width: 110, height: 110, borderRadius: 60, backgroundColor: '#79A995', opacity: 0.35, transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }] }} />
      <View style={s.spread}><Text style={{ color: '#CEE3D7', fontSize: 12, letterSpacing: 2 }}>YOUR STUDY, AT A GLANCE</Text><Animated.View style={{ transform: [{ rotate: float.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] }) }] }}><Feather name="sun" size={22} color="#D5E6B4" /></Animated.View></View>
      <Text style={{ color: 'white', fontSize: 25, lineHeight: 37, fontWeight: '700' }}>{now.getHours() < 11 ? 'おはようございます。' : now.getHours() < 18 ? 'こんにちは。' : 'おつかれさまです。'}{'\n'}今日の一歩を、ここから。</Text>
      <Text style={{ color: '#DFEEE6', fontSize: 14, lineHeight: 23 }}>{today.length ? `今日は${today.length}件の課題に取り組みましょう。` : '今日のおすすめ課題はありません。'}{dueToday.length ? `\n今日締切の課題が${dueToday.length}件あります。` : ''}</Text>
    </View>
    {manabaCard}
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {[['未提出', open.length], ['今週締切', open.filter(a => isThisWeek(a.deadline, now)).length], ['今日締切', dueToday.length]].map(([label, count]) => <View key={label} style={[s.card, { flex: 1, padding: 12, alignItems: 'center' }]}><Text style={{ fontSize: 28, fontWeight: '700', color: colors.green }}>{count}</Text><Text style={s.muted}>{label}</Text></View>)}
    </View>
    {!!overdue.length && <Text accessibilityRole="alert" style={[s.text, { color: colors.red }]}>締切超過 {overdue.length}件 · 提出状況を確認してください</Text>}
    {warning && <Text accessibilityRole="alert" style={[s.muted, { color: colors.amber }]}>{warning}</Text>}
    <View style={s.card}>
      <View style={s.spread}><Text style={s.heading}>{now.getMonth() + 1}月の締切</Text><Text style={s.muted}>授業名 · 時刻</Text></View>
      <View style={{ flexDirection: 'row' }}>{[...'日月火水木金土'].map(day => <Text key={day} style={[s.muted, { width: '14.2857%', textAlign: 'center' }]}>{day}</Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{calendarDays.map(day => {
        const key = dayKey(day); const items = byDay.get(key) ?? []; const isCurrentMonth = day.getMonth() === now.getMonth();
        return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${day.getMonth() + 1}月${day.getDate()}日 ${items.length}件`}
          style={{ width: '14.2857%', minHeight: 68, padding: 3, borderRadius: 8, backgroundColor: key === dayKey(now) ? colors.pale : 'transparent', opacity: isCurrentMonth ? 1 : 0.45 }}>
          <Text style={{ fontSize: 13, color: colors.ink, textAlign: 'center', fontWeight: key === dayKey(now) ? '700' : '400' }}>{day.getDate()}</Text>
          {items.slice(0, 2).map(item => <Text key={item.id} numberOfLines={1} style={{ color: colors.green, fontSize: 9, lineHeight: 13 }}>{item.courseName} {timeLabel(item.deadline)}</Text>)}
          {items.length > 2 && <Text style={{ color: colors.muted, fontSize: 9 }}>+{items.length - 2}件</Text>}
        </Pressable>;
      })}</View>
    </View>
    <View style={s.spread}><Text style={s.heading}>今日やるべきこと</Text><Text style={s.muted}>優先度の高い順 · {today.length}件</Text></View>
    {today.length ? today.slice(0, 3).map(a => <AssignmentCard key={a.id} assignment={a} now={now} reason={priorityReason(a, now)} onPress={() => nav.navigate('Detail', { id: a.id })} />) : <Empty title={data.assignments.length ? '今日は余裕のある一日' : '課題を、ひとつに。'} message={data.assignments.length ? 'TODOで余裕がある課題も確認できます。' : 'まずは授業名と締切を登録しましょう。\nTODOと締切をここで確認できます。'} onAdd={data.assignments.length ? undefined : () => nav.navigate('Editor')} />}
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
