import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { useOturum } from '../oturum';
import { Btn, Hata } from '../ui';
import { C, s } from '../theme';

const TIP: Record<string, string> = { learn: 'Öğren', practice: 'Uygula', reflect: 'Düşün', teach: 'Anlat' };

export function Bugun({ ogretAc }: { ogretAc: (alan: 'akademik' | 'hobi') => void }) {
  const { view, sid, calistir, mesgul, hata } = useOturum();
  if (!view || !sid) return null;
  const bitti = view.bugun.filter((t) => t.done).length;
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.h1}>Bugün</Text>
      <Text style={s.muted}>{bitti} / {view.bugun.length} yıldız yandı</Text>
      <Hata metin={hata} />
      {view.bugun.map((t) => (
        <Pressable key={t.id} accessibilityRole="checkbox" accessibilityState={{ checked: t.done }}
          onPress={() => t.type === 'teach' ? ogretAc(t.alan) : calistir(() => api.tamamla(sid, t.id, !t.done))}
          style={[s.card, { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, opacity: t.done ? 0.65 : 1 }]}>
          <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: t.done ? C.gold : C.line2,
            backgroundColor: t.done ? C.gold : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {t.done && <Text style={{ color: C.bg, fontWeight: '800' }}>✓</Text>}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[s.body, { fontWeight: '600', textDecorationLine: t.done ? 'line-through' : 'none' }]}>{t.title}</Text>
            <Text style={s.small}>{t.alan === 'akademik' ? 'Akademik' : 'Hobiler'} · {TIP[t.type]} · {t.minutes} dk{t.type === 'teach' ? ' · ikizine anlat →' : ''}</Text>
          </View>
        </Pressable>
      ))}
      {view.bugun.length === 0 && <Text style={s.muted}>Bugün için görev yok.</Text>}
      {view.son_tarihler.length > 0 && (<>
        <Text style={s.h2}>Yaklaşanlar</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {view.son_tarihler.map((d, i) => (
            <View key={i} style={{ borderRadius: 18, borderWidth: 1, borderColor: C.line2, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: C.soft, fontSize: 13 }}>{d.baslik} · {d.kalan_gun >= 0 ? `${d.kalan_gun} gün` : 'geçti'}</Text>
            </View>))}
        </View>
      </>)}
      <Btn onPress={() => calistir(() => api.gunuKapat(sid))} disabled={mesgul || view.durum !== 'hazir'}>Günü bitir</Btn>
      <Text style={s.small}>Günü bitirince Gözcü ikizinle karşılaştırır; gerekirse ekip planı ayarlar.</Text>
    </ScrollView>
  );
}
