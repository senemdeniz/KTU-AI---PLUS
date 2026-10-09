import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { C } from '../theme';

type Point = { day: number; real: number; ideal: number };

/** İki ikizin ortalama seviyesi: düz mavi = Gerçek Sen, kesikli gri = İstikrarlı Sen. */
export function TwinChart({ data, height = 190 }: { data: Point[]; height?: number }) {
  const [w, setW] = useState(0);
  const padL = 34, padR = 14, padT = 12, padB = 26;

  const values = data.flatMap((d) => [d.real, d.ideal]);
  let lo = Math.min(...values), hi = Math.max(...values);
  if (hi - lo < 0.2) { const m = (hi + lo) / 2; lo = m - 0.1; hi = m + 0.1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const maxDay = Math.max(1, ...data.map((d) => d.day));

  const x = (day: number) => padL + (day / maxDay) * (w - padL - padR);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (height - padT - padB);
  const path = (k: 'real' | 'ideal') => data.map((d, i) => `${i ? 'L' : 'M'}${x(d.day).toFixed(1)} ${y(d[k]).toFixed(1)}`).join(' ');

  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
  const dayTicks = Array.from(new Set([0, Math.round(maxDay / 2), maxDay]));
  const last = data[data.length - 1];

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`Gün ${last.day}: Gerçek Sen ${last.real.toFixed(2)}, İstikrarlı Sen ${last.ideal.toFixed(2)}`}
    >
      {w > 0 && (
        <Svg width={w} height={height}>
          {ticks.map((t) => (
            <React.Fragment key={t}>
              <Line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke={C.line} strokeWidth={1} />
              <SvgText x={padL - 6} y={y(t) + 4} fontSize={10} fill={C.faint} textAnchor="end">{t.toFixed(1)}</SvgText>
            </React.Fragment>
          ))}
          {dayTicks.map((d) => (
            <SvgText key={d} x={x(d)} y={height - 8} fontSize={10} fill={C.faint} textAnchor="middle">{`${d}. gün`}</SvgText>
          ))}
          <Path d={path('ideal')} stroke={C.ideal} strokeWidth={3} strokeDasharray="7 6" fill="none" strokeLinecap="round" />
          <Path d={path('real')} stroke={C.blue} strokeWidth={3.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={x(last.day)} cy={y(last.ideal)} r={4.5} fill={C.ideal} />
          <Circle cx={x(last.day)} cy={y(last.real)} r={5.5} fill={C.blue} />
        </Svg>
      )}
      <View style={st.legend}>
        <View style={st.item}><View style={[st.swatch, { backgroundColor: C.blue }]} /><Text style={st.text}>Gerçek Sen</Text></View>
        <View style={st.item}><View style={[st.swatch, st.dashed]} /><Text style={st.text}>İstikrarlı Sen</Text></View>
      </View>
    </View>
  );
}

/** Beceri bazında yan yana çubuklar. */
export function SkillBars({ real, ideal, target }: { real: Record<string, number>; ideal: Record<string, number>; target: Record<string, number> }) {
  return (
    <View style={{ gap: 12 }}>
      {Object.keys(target).map((k) => {
        const max = Math.max(target[k], ideal[k] ?? 0, 0.1);
        return (
          <View key={k} style={{ gap: 5 }}>
            <View style={st.barHead}>
              <Text style={st.barName}>{k.replace(/_/g, ' ')}</Text>
              <Text style={st.barVal}>{(real[k] ?? 0).toFixed(2)} / {target[k].toFixed(1)}</Text>
            </View>
            <View style={st.track}>
              <View style={[st.bar, { width: `${((ideal[k] ?? 0) / max) * 100}%`, backgroundColor: C.ideal, opacity: 0.45 }]} />
              <View style={[st.bar, { width: `${((real[k] ?? 0) / max) * 100}%`, backgroundColor: C.blue }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, marginTop: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 18, height: 4, borderRadius: 2 },
  dashed: { backgroundColor: 'transparent', borderTopWidth: 3, borderColor: C.ideal, borderStyle: 'dashed', height: 0 },
  text: { fontSize: 12, color: C.muted, fontWeight: '600' },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  barName: { fontSize: 14, fontWeight: '600', color: C.ink, textTransform: 'capitalize' },
  barVal: { fontSize: 13, color: C.muted, fontVariant: ['tabular-nums'] },
  track: { height: 12, borderRadius: 6, backgroundColor: C.sand, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6 },
});
