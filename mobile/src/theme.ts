import { StyleSheet } from 'react-native';

export const C = {
  bg: '#0b1026', card: '#10162f', card2: '#141b3a', line: '#1f2850', line2: '#2a3363', nav: '#0e1430',
  gold: '#f5d78e', blue: '#8ea2ff', text: '#eef0fa', soft: '#b8bfe6', muted: '#a9b0d6', dim: '#8f97c4', faint: '#5b6699',
  danger: '#ffb3a7', dangerBg: '#2b1a25', ok: '#9be0b4', okBg: '#12281f', warnBg: '#2b2410',
};
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 14 },
  h1: { color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2: { color: C.text, fontSize: 18, fontWeight: '700' },
  body: { color: C.text, fontSize: 14, lineHeight: 20 },
  muted: { color: C.muted, fontSize: 13, lineHeight: 18 },
  small: { color: C.muted, fontSize: 12 },
  card: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 24, padding: 16, gap: 10 },
  card2: { backgroundColor: C.card2, borderRadius: 18, padding: 14, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { backgroundColor: C.card2, borderColor: C.line2, borderWidth: 1, borderRadius: 16, color: C.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
});
