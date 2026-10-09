import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { C, RISK } from '../theme';
import type { Risk } from '../types';

export function Button({
  title,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg = { primary: C.blue, secondary: C.sand, ghost: 'transparent', danger: C.red }[kind];
  const fg = kind === 'primary' || kind === 'danger' ? C.white : kind === 'ghost' ? C.blue : C.ink;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [b.btn, { backgroundColor: bg, opacity: off ? 0.55 : pressed ? 0.85 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[b.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Pill({ risk }: { risk: Risk }) {
  const r = RISK[risk];
  return (
    <View style={[b.pill, { backgroundColor: r.bg }]}>
      <Text style={[b.pillText, { color: r.fg }]}>{r.label}</Text>
    </View>
  );
}

export function Progress({ value, color = C.blue }: { value: number; color?: string }) {
  return (
    <View style={b.track}>
      <View style={[b.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[b.chip, active && { backgroundColor: C.navy, borderColor: C.navy }]}
    >
      <Text style={[b.chipText, active && { color: C.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <View style={b.seg}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[b.segItem, on && b.segOn]}
          >
            <Text numberOfLines={1} style={[b.segText, on && { color: C.ink, fontWeight: '700' }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={b.stat}>
      <Text style={b.statValue}>{value}</Text>
      <Text style={b.statLabel}>{label}</Text>
    </View>
  );
}

const b = StyleSheet.create({
  btn: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnText: { fontSize: 16, fontWeight: '700' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '700' },
  track: { height: 8, borderRadius: 4, backgroundColor: C.sand, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.white },
  chipText: { fontSize: 14, fontWeight: '600', color: C.ink },
  seg: { flexDirection: 'row', backgroundColor: C.sand, borderRadius: 12, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: C.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 13, color: C.muted, fontWeight: '600' },
  stat: { flex: 1, backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingVertical: 10, paddingHorizontal: 12 },
  statValue: { fontSize: 20, fontWeight: '700', color: C.ink },
  statLabel: { fontSize: 12, color: C.muted, marginTop: 2 },
});
