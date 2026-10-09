import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { C, s } from './theme';

export function Spark({ size = 16, color = C.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2 C13 9 15 11 22 12 C15 13 13 15 12 22 C11 15 9 13 2 12 C9 11 11 9 12 2 Z" fill={color} />
    </Svg>
  );
}

export function Btn({ children, onPress, kind = 'gold', disabled, style }: {
  children: React.ReactNode; onPress?: () => void; kind?: 'gold' | 'ghost' | 'soft'; disabled?: boolean; style?: ViewStyle;
}) {
  const bg = kind === 'gold' ? C.gold : kind === 'soft' ? C.card2 : 'transparent';
  const fg = kind === 'gold' ? C.bg : C.text;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={[{ height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, flexShrink: 0,
        backgroundColor: bg, opacity: disabled ? 0.45 : 1, borderWidth: kind === 'ghost' ? 1 : 0, borderColor: C.line2 }, style]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{children}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: on ? C.text : 'transparent',
        borderWidth: on ? 0 : 1, borderColor: C.line2 }}>
      <Text style={{ color: on ? C.bg : C.muted, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Etiket({ ajan }: { ajan: string }) {
  return <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700' }}>{ajan}</Text>;
}

export function Hata({ metin }: { metin: string | null }) {
  if (!metin) return null;
  return (
    <View style={[s.card2, { backgroundColor: C.dangerBg }]}>
      <Text style={{ color: C.danger, fontSize: 13, lineHeight: 18 }}>{metin}</Text>
    </View>
  );
}

export type Sekme = 'gokyuzu' | 'bugun' | 'ekip' | 'ikizin';
const SEKMELER: { k: Sekme; ad: string }[] = [
  { k: 'gokyuzu', ad: 'Gökyüzü' }, { k: 'bugun', ad: 'Bugün' }, { k: 'ekip', ad: 'Ekip' }, { k: 'ikizin', ad: 'İkizin' },
];
export function Nav({ aktif, onSec }: { aktif: Sekme; onSec: (k: Sekme) => void }) {
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.nav, paddingTop: 10, paddingBottom: 18 }}>
      {SEKMELER.map((t) => (
        <Pressable key={t.k} onPress={() => onSec(t.k)} accessibilityRole="tab" accessibilityState={{ selected: aktif === t.k }}
          style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Spark size={20} color={aktif === t.k ? C.gold : C.faint} />
          <Text style={{ color: aktif === t.k ? C.gold : C.dim, fontSize: 11, fontWeight: aktif === t.k ? '700' : '600' }}>{t.ad}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Takımyıldız: ilk n yıldız yanık (sen), sonraki fark kadarı halkalı (ikiz), kalanı sönük. */
export function Takimyildiz({ sen, ikiz, toplam, w = 310 }: { sen: number; ikiz: number; toplam: number; w?: number }) {
  const h = 200;
  const n = Math.max(toplam, 1);
  const nok = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    return { x: 12 + t * (w - 24), y: h - 24 - t * (h - 70) + Math.sin(i * 1.7) * 18 };
  });
  const yol = (a: number, b: number) => nok.slice(a, b).map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return (
    <Svg width={w} height={h} accessibilityLabel={`Takımyıldız: ${sen} yıldız yanık, ikizin ${Math.max(ikiz - sen, 0)} yıldız önde`}>
      {sen > 1 && <Path d={yol(0, sen)} stroke={C.gold} strokeWidth={1.6} fill="none" />}
      {ikiz > sen && <Path d={yol(Math.max(sen - 1, 0), ikiz)} stroke={C.blue} strokeWidth={1.4} strokeDasharray="5 5" fill="none" />}
      {ikiz < n && <Path d={yol(Math.max(ikiz - 1, 0), n)} stroke={C.line2} strokeWidth={1.2} fill="none" />}
      {nok.map((p, i) =>
        i < sen ? <Circle key={i} cx={p.x} cy={p.y} r={i === sen - 1 ? 6 : 4.5} fill={C.gold} />
        : i < ikiz ? <Circle key={i} cx={p.x} cy={p.y} r={5} fill="none" stroke={C.blue} strokeWidth={1.8} />
        : <Circle key={i} cx={p.x} cy={p.y} r={3} fill={C.line2} />)}
    </Svg>
  );
}

/** Sen vs İkiz yıldız eğrisi. */
export function Egri({ sen, ikiz, w = 310, h = 130 }: { sen: number[]; ikiz: number[]; w?: number; h?: number }) {
  const max = Math.max(...ikiz, 1);
  const n = Math.max(ikiz.length - 1, 1);
  const nk = (a: number[]) => a.map((v, i) => `${i ? 'L' : 'M'}${(i / n) * (w - 8) + 4} ${h - 8 - (v / max) * (h - 16)}`).join(' ');
  return (
    <Svg width={w} height={h}>
      <Line x1={4} y1={h - 8} x2={w - 4} y2={h - 8} stroke={C.line2} />
      <Path d={nk(ikiz)} stroke={C.blue} strokeWidth={2} strokeDasharray="5 5" fill="none" />
      <Path d={nk(sen)} stroke={C.gold} strokeWidth={2.4} fill="none" />
    </Svg>
  );
}
