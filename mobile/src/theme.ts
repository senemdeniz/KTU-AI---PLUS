import { Platform, StyleSheet } from 'react-native';
import type { Risk, TaskType } from './types';

export const C = {
  paper: '#fbfaf7',
  sand: '#f1efe9',
  line: '#e2ded5',
  ink: '#1b1f2a',
  muted: '#5d6472',
  faint: '#8a929c',
  blue: '#3b5bdb',
  blueSoft: '#e8edff',
  navy: '#14213d',
  ideal: '#9aa3ad',
  green: '#1d6b3f',
  greenSoft: '#e3f4ea',
  amber: '#8a5a0b',
  amberSoft: '#fdf1dc',
  red: '#9b2c22',
  redSoft: '#fbe3e1',
  white: '#ffffff',
};

export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

export const RISK: Record<Risk, { label: string; fg: string; bg: string }> = {
  momentum: { label: 'Momentum', fg: C.green, bg: C.greenSoft },
  steady: { label: 'Dengeli', fg: C.blue, bg: C.blueSoft },
  slipping: { label: 'Kayıyor', fg: C.amber, bg: C.amberSoft },
  at_risk: { label: 'Risk altında', fg: C.red, bg: C.redSoft },
};

export const TYPE_TR: Record<TaskType, string> = {
  learn: 'Öğren',
  practice: 'Uygula',
  teach: 'İkizine öğret',
  reflect: 'Değerlendir',
};

export const skillLabel = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toLocaleUpperCase('tr'));

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  scroll: { padding: 20, paddingBottom: 48, gap: 16 },
  eyebrow: { fontSize: 12, letterSpacing: 1.6, fontWeight: '700', color: C.blue, textTransform: 'uppercase' },
  h1: { fontFamily: serif, fontSize: 34, fontWeight: '600', color: C.ink, lineHeight: 40 },
  h2: { fontFamily: serif, fontSize: 24, fontWeight: '600', color: C.ink, lineHeight: 30 },
  h3: { fontSize: 17, fontWeight: '700', color: C.ink },
  body: { fontSize: 16, color: C.ink, lineHeight: 23 },
  muted: { fontSize: 14, color: C.muted, lineHeight: 20 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.line, gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 6 },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.ink,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
