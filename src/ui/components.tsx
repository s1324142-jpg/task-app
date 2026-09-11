import { Alert } from './alerts';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Assignment, statusLabels } from '../domain/models';
import { DAY, HOUR, deadlineLabel, relativeDeadline } from '../domain/dates';
import { colors, styles as s } from './theme';

export const reportError = () => Alert.alert('操作を完了できませんでした', '保存内容を確認し、端末の空き容量を確保して再試行してください。');
export function Button({ title, onPress, secondary, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.button, secondary && s.secondary, { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>
    <Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text>
  </Pressable>;
}
export function Chips<T extends string | number>({ options, value, onChange }: { options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
    {options.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: item.value === value }}
      onPress={() => onChange(item.value)} style={[s.chip, item.value === value && s.chipActive]}>
      <Text style={[s.chipText, item.value === value && { color: 'white' }]}>{item.label}</Text>
    </Pressable>)}
  </ScrollView>;
}
export function Empty({ title = '課題はありません', message = '新しい課題を登録すると、ここに表示されます。', onAdd }: { title?: string; message?: string; onAdd?: () => void }) {
  return <View style={[s.card, { alignItems: 'center', paddingVertical: 32, gap: 14 }]}>
    <View style={{ backgroundColor: colors.pale, borderRadius: 24, padding: 15 }}><Feather name="check-circle" color={colors.green} size={28} /></View>
    <Text style={s.heading}>{title}</Text><Text style={[s.muted, { textAlign: 'center' }]}>{message}</Text>
    {onAdd && <Button title="最初の課題を登録" onPress={onAdd} />}
  </View>;
}
export function AssignmentCard({ assignment: a, now, onPress, reason }: { assignment: Assignment; now: Date; onPress: () => void; reason?: string }) {
  const entrance = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => { Animated.timing(entrance, { toValue: 1, duration: 360, useNativeDriver: true }).start(); }, [entrance]);
  const diff = new Date(a.deadline).getTime() - now.getTime();
  const color = a.status === 'submitted' ? colors.muted : diff <= 24 * HOUR ? colors.red : diff <= 3 * DAY ? colors.amber : diff <= 7 * DAY ? colors.blue : colors.green;
  return <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale }] }}><Pressable accessibilityRole="button" accessibilityLabel={`${a.courseName} ${a.title} ${deadlineLabel(a.deadline)} ${statusLabels[a.status]}`} onPress={onPress}
    onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
    style={[s.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
    <View style={s.spread}><Text style={[s.muted, { flex: 1 }]}>{a.courseName}</Text><Feather name="chevron-right" size={18} color={colors.muted} /></View>
    <Text style={[s.heading, { lineHeight: 26 }]}>{a.title}</Text>
    <Text style={[s.text, { color, fontSize: 13 }]}>{deadlineLabel(a.deadline)}まで</Text>
    <View style={[s.spread, { flexWrap: 'wrap' }]}>
      <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{a.status === 'submitted' ? '提出済み' : relativeDeadline(a.deadline, now)}</Text>
      <Text style={s.muted}>{a.estimatedMinutes ? `${a.estimatedMinutes}分 · ` : ''}{statusLabels[a.status]}</Text>
    </View>
    {reason && <><View style={s.divider} /><Text style={[s.muted, { color: colors.green }]}>{reason}</Text></>}
  </Pressable></Animated.View>;
}
export function PageTitle({ title, subtitle, onAdd }: { title: string; subtitle?: string; onAdd?: () => void }) {
  return <View style={s.spread}><View style={{ flex: 1, gap: 5 }}><Text style={s.title}>{title}</Text>{subtitle && <Text style={s.muted}>{subtitle}</Text>}</View>
    {onAdd && <Pressable accessibilityRole="button" accessibilityLabel="課題を追加" onPress={onAdd} style={[s.button, { width: 48, paddingHorizontal: 0 }]}><Feather name="plus" size={23} color="white" /></Pressable>}
  </View>;
}
