import { StyleSheet } from 'react-native';

export const colors = {
  background: '#F5F6F2', paper: '#FFFFFF', ink: '#20352F', muted: '#738079',
  green: '#286B57', pale: '#E7F0EA', border: '#E1E7E0', red: '#BA493B',
  amber: '#926119', blue: '#496D94',
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  heading: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  text: { color: colors.ink, fontSize: 15, lineHeight: 23 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  card: { backgroundColor: colors.paper, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12 },
  divider: { height: 1, backgroundColor: colors.border },
  button: { minHeight: 48, borderRadius: 13, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green },
  buttonText: { fontSize: 15, fontWeight: '700', color: 'white' },
  secondary: { backgroundColor: colors.pale },
  secondaryText: { color: colors.green },
  chip: { paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  label: { color: colors.ink, fontWeight: '600', fontSize: 14, marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.ink, fontSize: 16 },
});
