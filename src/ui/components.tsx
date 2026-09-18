import { Alert } from './alerts';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Assignment, statusLabels } from '../domain/models';
import { DAY, HOUR, deadlineLabel, relativeDeadline } from '../domain/dates';
import { useTheme } from '../themes/ThemeContext';

export const reportError = () => Alert.alert('操作を完了できませんでした', '保存内容を確認し、端末の空き容量を確保して再試行してください。');
export function Button({ title, onPress, secondary, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  const { styles: s } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    onPressIn={() => Animated.timing(scale, { toValue: 0.97, duration: 120, useNativeDriver: true }).start()}
    onPressOut={() => Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }).start()}
    style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed ? 0.82 : 1 })}>
    <Animated.View style={[s.button, secondary && s.secondary, { transform: [{ scale }] }]}><Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text></Animated.View>
  </Pressable>;
}
export function Chips<T extends string | number>({ options, value, onChange }: { options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const { styles: s } = useTheme();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
    {options.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: item.value === value }}
      onPress={() => onChange(item.value)} style={[s.chip, item.value === value && s.chipActive]}>
      <Text style={[s.chipText, item.value === value && { color: 'white' }]}>{item.label}</Text>
    </Pressable>)}
  </ScrollView>;
}
export function Empty({ title = '課題はありません', message = '新しい課題を登録すると、ここに表示されます。', onAdd }: { title?: string; message?: string; onAdd?: () => void }) {
  const { theme, styles: s } = useTheme(); const colors = theme.colors;
  return <View style={[s.card, { alignItems: 'center', paddingVertical: 32, gap: 14 }]}>
    <View style={{ backgroundColor: colors.pale, borderRadius: 24, padding: 15 }}><Feather name="check-circle" color={colors.green} size={28} /></View>
    <Text style={s.heading}>{title}</Text><Text style={[s.muted, { textAlign: 'center' }]}>{message}</Text>
    {onAdd && <Button title="最初の課題を登録" onPress={onAdd} />}
  </View>;
}
export function AssignmentCard({ assignment: a, courseName = a.courseName, now, onPress, reason }: { assignment: Assignment; courseName?: string; now: Date; onPress: () => void; reason?: string }) {
  const { theme, styles: s } = useTheme(); const colors = theme.colors;
  const entrance = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => { Animated.timing(entrance, { toValue: 1, duration: 360, useNativeDriver: true }).start(); }, [entrance]);
  const diff = new Date(a.deadline).getTime() - now.getTime();
  const color = a.status === 'submitted' ? colors.muted : diff <= 24 * HOUR ? colors.red : diff <= 3 * DAY ? colors.amber : diff <= 7 * DAY ? colors.blue : colors.green;
  return <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale }] }}><Pressable accessibilityRole="button" accessibilityLabel={`${courseName} ${a.title} ${deadlineLabel(a.deadline)} ${statusLabels[a.status]}`} onPress={onPress}
    onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
    style={[s.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
    <View style={s.spread}>{theme.id === 'sparklePink' ? <View style={[s.chip, { minHeight: 28, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: colors.pale }]}><Text style={[s.muted, { color: colors.green }]}>{courseName}</Text></View> : <Text style={[s.muted, { flex: 1 }]}>{courseName}</Text>}<Feather name="chevron-right" size={18} color={colors.muted} /></View>
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
  const { theme, styles: s } = useTheme();
  return <View style={s.spread}><View style={{ flex: 1, gap: 5 }}><Text style={s.title}>{title}</Text>{subtitle && <Text style={s.muted}>{subtitle}</Text>}</View>
    {theme.decoration === 'sparkle' && <Text accessibilityElementsHidden style={{ color: theme.colors.green, fontSize: 18 }}>♡ ✦</Text>}
    {onAdd && <Pressable accessibilityRole="button" accessibilityLabel="課題を追加" onPress={onAdd} style={[s.button, { width: 48, paddingHorizontal: 0 }]}><Feather name="plus" size={23} color="white" /></Pressable>}
  </View>;
}

export function Badge({ label, color }: { label: string; color?: string }) {
  const { theme, styles: s } = useTheme();
  return <View style={[s.chip, { minHeight: 28, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: theme.colors.pale, borderColor: color ?? theme.colors.border }]}><Text style={[s.muted, { color: color ?? theme.colors.green, fontWeight: '700' }]}>{label}</Text></View>;
}

export function FloatingActionButton({ onPress }: { onPress: () => void }) {
  const { theme, styles: s } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel="課題を追加" onPress={onPress} style={[s.button, { position: 'absolute', right: 20, bottom: 22, width: 58, height: 58, borderRadius: 29, paddingHorizontal: 0, shadowColor: theme.shadow.color, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }]}><Feather name="plus" size={26} color="white" /></Pressable>;
}

export function MascotImage({ size = 58 }: { size?: number }) {
  const { theme } = useTheme();
  if (theme.mascotImage) return <Image source={theme.mascotImage} resizeMode="contain" style={{ width: size, height: size }} />;
  return <View accessibilityLabel="マスコット画像プレースホルダー" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.pale, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: size * 0.38 }}>{theme.decoration === 'sparkle' ? '♡' : '✓'}</Text></View>;
}

export function ThemeBackground({ children }: React.PropsWithChildren) {
  const { theme } = useTheme();
  const gradient = theme.backgroundGradient ?? [theme.colors.background, theme.colors.background] as const;
  return <LinearGradient colors={[...gradient]} style={{ flex: 1 }}>
    {theme.backgroundImage && <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}><Image source={theme.backgroundImage} resizeMode="cover" style={{ width: '100%', height: '100%' }} /></View>}
    {theme.decoration === 'sparkle' && <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 72, right: -55, width: 170, height: 170, borderRadius: 90, backgroundColor: '#FFFFFF55' }} />
      <Text style={{ position: 'absolute', top: 48, left: 22, color: '#FFFFFFAA', fontSize: 24 }}>✦</Text>
      <Text style={{ position: 'absolute', top: 150, right: 26, color: '#F45A9B55', fontSize: 24 }}>♡</Text>
    </View>}
    {children}
  </LinearGradient>;
}
