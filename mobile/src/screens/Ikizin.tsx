import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { useOturum } from '../oturum';
import { Btn, Chip, Egri, Hata } from '../ui';
import { C, s } from '../theme';

export function Ikizin({ ogretAc }: { ogretAc: (a: 'akademik' | 'hobi') => void }) {
  const { view, sid, calistir, bitir, mesgul, hata } = useOturum();
  const [alan, setAlan] = useState(0);
  if (!view || !sid) return null;
  const a = view.alanlar[Math.min(alan, view.alanlar.length - 1)];
  const ik = a.ikiz;
  const kotu = ik && (ik.risk === 'at_risk' || ik.risk === 'slipping');
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.h1}>İkizin</Text>
      <Text style={s.muted}>Gerçek sen ile istikrarlı sen. İkizin bir yapay zekâ karakteridir.</Text>
      <View style={s.row}>{view.alanlar.map((x, i) => <Chip key={x.alan} label={x.etiket} on={i === alan} onPress={() => setAlan(i)} />)}</View>
      <Hata metin={hata} />
      {ik && (<>
        <View style={s.card}>
          <Egri sen={ik.egri.sen} ikiz={ik.egri.ikiz} />
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Text style={{ color: C.gold, fontSize: 12 }}>— Sen</Text><Text style={{ color: C.blue, fontSize: 12 }}>- - İstikrarlı sen</Text>
          </View>
        </View>
        <View style={[s.card2, { backgroundColor: kotu ? C.dangerBg : C.card2 }]}>
          <Text style={{ color: kotu ? C.danger : C.gold, fontWeight: '700' }}>Durum: {ik.risk_tr}</Text>
          <Text style={s.body}>İkizin {ik.fark > 0 ? `${ik.fark} yıldız önde` : 'seninle aynı tempoda'}. Seri: {ik.seri} gün.</Text>
        </View>
      </>)}
      <View style={s.card}>
        <Text style={s.h2}>İkizine öğret</Text>
        <Text style={s.muted}>Bir konuyu kendi cümlelerinle anlat; ikizin yalnızca senin anlattıklarını bilir ve sınava girer.</Text>
        <Btn onPress={() => ogretAc(a.alan)}>İkizine öğret</Btn>
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Demo</Text>
        <Text style={s.muted}>Jüri için günleri hızlandır: ekibin devreye girmesini izle.</Text>
        <View style={s.row}>
          <Btn kind="soft" style={{ flex: 1 }} disabled={mesgul} onPress={() => calistir(() => api.atla(sid, 5, 0.9))}>5 gün iyi</Btn>
          <Btn kind="soft" style={{ flex: 1 }} disabled={mesgul} onPress={() => calistir(() => api.atla(sid, 5, 0.15))}>5 gün kopuk</Btn>
        </View>
      </View>
      <Btn kind="ghost" onPress={async () => { await calistir(() => api.oturumSil(sid)); bitir(); }}>Verilerimi sil ve çık</Btn>
      <Text style={s.small}>Tüm verilerin sunucudan silinir. Model: {view.demo ? 'demo modu' : view.model}</Text>
    </ScrollView>
  );
}
