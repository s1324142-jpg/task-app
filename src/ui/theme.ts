import { StyleSheet } from 'react-native';
import { AppTheme } from '../themes/types';

export const createThemeStyles = (theme: AppTheme) => {
  const colors = theme.colors;
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.decoration === 'sparkle' ? 'transparent' : colors.background },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 20, paddingBottom: 32, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  heading: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  text: { color: colors.ink, fontSize: 15, lineHeight: 23 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  card: { backgroundColor: colors.card, borderRadius: theme.radius.card, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12, shadowColor: theme.shadow.color, shadowOpacity: theme.shadow.opacity, shadowRadius: theme.shadow.radius, shadowOffset: { width: 0, height: 5 }, elevation: theme.shadow.elevation },
  divider: { height: 1, backgroundColor: colors.border },
  button: { minHeight: 48, borderRadius: theme.radius.button, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green },
  buttonText: { fontSize: 15, fontWeight: '700', color: 'white' },
  secondary: { backgroundColor: colors.pale },
  secondaryText: { color: colors.green },
  chip: { paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center', borderRadius: theme.radius.chip, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  label: { color: colors.ink, fontWeight: '600', fontSize: 14, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, borderRadius: theme.radius.input, paddingHorizontal: 14, paddingVertical: 12, color: colors.ink, fontSize: 16 },
});
};
