import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useOturum } from '../oturum';
import { Hata, Spark } from '../ui';
import { Avatar, Balon, Yaziyor, ajanBilgi } from '../ajanlar';
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
      <View style={{ gap: 12 }}>
        {olaylar.length === 0 && <Text style={s.muted}>Ekip toplanıyor…</Text>}
        {olaylar.map((o, i) => (
          <Balon key={o.id} yeni={i === olaylar.length - 1}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Avatar ad={o.ajan} boyut={34} />
              <View style={{ flex: 1, backgroundColor: C.card2, borderRadius: 16, borderTopLeftRadius: 4, padding: 12, gap: 3, borderLeftWidth: 3, borderLeftColor: ajanBilgi(o.ajan).renk }}>
                <Text style={{ color: ajanBilgi(o.ajan).renk, fontSize: 12, fontWeight: '800' }}>{o.ajan}</Text>
                <Text style={s.body}>{o.mesaj}</Text>
              </View>
            </View>
          </Balon>))}
        {olaylar.length > 0 && <Yaziyor ad={olaylar[olaylar.length - 1].ajan} />}
      </View>
      <View style={s.row}><Spark size={14} /><Text style={s.small}>Birkaç saniye sürer.</Text></View>
    </ScrollView>
  );
}
