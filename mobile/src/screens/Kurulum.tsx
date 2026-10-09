import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useOturum } from '../oturum';
import { Etiket, Hata, Spark } from '../ui';
import { C, s } from '../theme';

const ADIMLAR = ['Astronom', 'Kutup Yıldızı', 'Haritacı', 'Gözcü', 'Rehber'];

export function Kurulum() {
  const { olaylar, hata } = useOturum();
  const gorulen = new Set(olaylar.map((o) => o.ajan));
  return (
    <ScrollView contentContainerStyle={[s.pad, { paddingTop: 40 }]}>
      <Text style={s.h1}>Ekip gökyüzünü kuruyor</Text>
      <Text style={s.muted}>Her ajan kendi işini yapar; yaptıkları aşağıda canlı akar.</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {ADIMLAR.map((a) => <View key={a} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: gorulen.has(a) ? C.gold : C.line2 }} />)}
      </View>
      <Hata metin={hata} />
      <View style={s.card}>
        {olaylar.length === 0 && <Text style={s.muted}>Ekip toplanıyor…</Text>}
        {olaylar.map((o) => (
          <View key={o.id} style={{ gap: 2 }}><Etiket ajan={o.ajan} /><Text style={s.body}>{o.mesaj}</Text></View>
        ))}
      </View>
      <View style={s.row}><Spark size={14} /><Text style={s.small}>Birkaç saniye sürer.</Text></View>
    </ScrollView>
  );
}
