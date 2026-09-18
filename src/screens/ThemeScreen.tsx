import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParams } from '../navigation/types';
import { Button, MascotImage } from '../ui/components';
import { themes, ThemeId } from '../themes';
import { useTheme } from '../themes/ThemeContext';
import { Alert } from '../ui/alerts';

export function ThemeScreen({ navigation }: NativeStackScreenProps<RootStackParams, 'Theme'>) {
  const { theme, styles: s, selectedThemeId, previewTheme, clearPreview, applyTheme } = useTheme();
  const [candidate, setCandidate] = useState<ThemeId>(selectedThemeId);
  const [saving, setSaving] = useState(false);
  useEffect(() => () => clearPreview(), [clearPreview]);
  const choose = (id: ThemeId) => { setCandidate(id); previewTheme(id); };
  const apply = async () => {
    setSaving(true);
    try { await applyTheme(candidate); navigation.goBack(); }
    catch { Alert.alert('テーマを保存できませんでした', '端末の空き容量を確認して、もう一度お試しください。'); }
    finally { setSaving(false); }
  };
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <View style={{ gap: 6 }}><Text style={s.title}>テーマ・壁紙</Text><Text style={s.muted}>カードをタップすると、その場でプレビューできます。</Text></View>
    {themes.map(item => {
      const active = candidate === item.id; const inUse = selectedThemeId === item.id;
      return <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => choose(item.id)}
        style={[s.card, { padding: 0, overflow: 'hidden', borderWidth: active ? 2 : 1, borderColor: active ? theme.colors.green : theme.colors.border }]}>
        <View style={{ height: 150, padding: 18, justifyContent: 'space-between', backgroundColor: item.preview.colors[0] }}>
          <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '48%', backgroundColor: item.preview.colors[2], opacity: 0.72, borderBottomLeftRadius: 80 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: item.preview.colors[1], fontWeight: '800', letterSpacing: 1 }}>{item.id === 'default' ? 'DEFAULT' : 'SPARKLE PINK'}</Text><Text style={{ color: item.preview.colors[1], fontSize: 19 }}>{item.preview.decorations}</Text></View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 1, backgroundColor: '#FFFFFFEE', borderRadius: 18, padding: 14, gap: 7 }}><View style={{ height: 7, width: '56%', borderRadius: 4, backgroundColor: item.preview.colors[1] }} /><View style={{ height: 6, width: '82%', borderRadius: 4, backgroundColor: item.preview.colors[2] }} /><View style={{ height: 6, width: '68%', borderRadius: 4, backgroundColor: item.preview.colors[2] }} /></View>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: item.preview.colors[1], alignItems: 'center', justifyContent: 'center' }}><Feather name="plus" size={20} color="white" /></View>
          </View>
        </View>
        <View style={{ padding: 18, gap: 7 }}><View style={s.spread}><Text style={s.heading}>{item.name}</Text>{inUse && <Text style={{ color: theme.colors.green, fontWeight: '700' }}>✓ 使用中</Text>}</View><Text style={s.muted}>{item.description}</Text></View>
      </Pressable>;
    })}
    {theme.decoration === 'sparkle' && <View style={[s.card, { flexDirection: 'row', alignItems: 'center' }]}><MascotImage /><View style={{ flex: 1, gap: 4 }}><Text style={s.heading}>今日も一緒にがんばろう♡</Text><Text style={s.muted}>マスコット画像は後からテーマ素材として差し替えられます。</Text></View></View>}
    <Button disabled={saving} title={saving ? '保存中…' : 'このテーマを使用'} onPress={() => { void apply(); }} />
  </ScrollView>;
}
