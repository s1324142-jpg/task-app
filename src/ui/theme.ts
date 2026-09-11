import { StyleSheet } from 'react-native';

export const colors = {
  background: '#FFF8F3', paper: '#FFFFFF', ink: '#293B37', muted: '#7F8883',
  green: '#3A806D', pale: '#E6F4EC', border: '#F0E5DF', red: '#C86459',
  amber: '#B07A38', blue: '#668BB2', pink: '#F7D9D5', lavender: '#E9E2F6',
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
  card: { backgroundColor: colors.paper, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12, shadowColor: '#BFA99B', shadowOpacity: 0.09, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
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
