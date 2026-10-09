import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

export const AJAN: Record<string, { g: string; renk: string }> = {
  'Gözlemevi': { g: '🔭', renk: '#f5d78e' }, 'Astronom': { g: '🌙', renk: '#b7c4ff' }, 'Kutup Yıldızı': { g: '⭐', renk: '#ffe9a8' },
  'Haritacı': { g: '🧭', renk: '#8fe3c4' }, 'Gözcü': { g: '👁️', renk: '#ffb3a7' }, 'Yörüngeci': { g: '🛰️', renk: '#9bd0ff' },
  'Rehber': { g: '💡', renk: '#f5d78e' }, 'Konu Bekçisi': { g: '🛡️', renk: '#ff9fb8' }, 'Kaşif': { g: '🔍', renk: '#d6b8ff' },
  'İkiz': { g: '👯', renk: '#8ea2ff' }, 'Hakem': { g: '⚖️', renk: '#9be0b4' },
};
export const ajanBilgi = (ad: string) => AJAN[ad] ?? { g: '✦', renk: '#f5d78e' };

export function Avatar({ ad, boyut = 40, aktif }: { ad: string; boyut?: number; aktif?: boolean }) {
  const { g, renk } = ajanBilgi(ad);
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!aktif) { p.setValue(0); return; }
    const a = Animated.loop(Animated.sequence([
      Animated.timing(p, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(p, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false })]));
    a.start(); return () => a.stop();
  }, [aktif]);
  const halka = p.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });
  return (
    <Animated.View style={{ width: boyut, height: boyut, borderRadius: boyut / 2, backgroundColor: '#141b3a', alignItems: 'center',
      justifyContent: 'center', borderWidth: 2, borderColor: aktif ? renk : '#1f2850', shadowColor: renk, shadowOpacity: aktif ? 0.9 : 0,
      shadowRadius: halka as any, elevation: aktif ? 6 : 0 }}>
      <Text style={{ fontSize: boyut * 0.46 }}>{g}</Text>
    </Animated.View>
  );
}

/** "… yazıyor" noktaları */
export function Yaziyor({ ad }: { ad: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1200, useNativeDriver: false })); a.start(); return () => a.stop();
  }, []);
  const op = (i: number) => v.interpolate({ inputRange: [0, i / 3, (i + 1) / 3, 1], outputRange: [0.25, 0.25, 1, 0.25], extrapolate: 'clamp' });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Avatar ad={ad} boyut={32} aktif />
      <View style={{ flexDirection: 'row', gap: 4, backgroundColor: '#141b3a', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
        {[0, 1, 2].map((i) => <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ajanBilgi(ad).renk, opacity: op(i) }} />)}
      </View>
    </View>
  );
}

export function Balon({ yeni, children }: { yeni?: boolean; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(yeni ? 0 : 1)).current;
  useEffect(() => { if (yeni) Animated.timing(v, { toValue: 1, duration: 350, useNativeDriver: false }).start(); }, []);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{children}</Animated.View>;
}
