import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { useOturum } from '../oturum';
import { Btn, Chip, Egri, Hata } from '../ui';
import { C, s } from '../theme';

export function Ikizin({ ogretAc }: { ogretAc: (a: 'akademik' | 'hobi') => void }) {
  const { view, sid, calistir, bitir, mesgul, hata } = useOturum();
  const [alan, setAlan] = useState(0);
  const [gun, setGun] = useState(3);
  const [oran, setOran] = useState(25);
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
        <Text style={s.h2}>Canlı demo kontrolü</Text>
        <Text style={s.muted}>İlerlemeyi sen belirle; ekip anında tepki verir. Kaç gün geçsin, o günlerde planın ne kadarını yapmış olasın?</Text>
        <Text style={s.small}>Geçen gün</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{[1, 2, 3, 5, 7].map((g) => <Chip key={g} label={`${g} gün`} on={gun === g} onPress={() => setGun(g)} />)}</View>
        <Text style={s.small}>Planın ne kadarını yaptın?</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{[0, 25, 50, 75, 100].map((o) => <Chip key={o} label={`%${o}`} on={oran === o} onPress={() => setOran(o)} />)}</View>
        <Btn disabled={mesgul || view.durum !== 'hazir'} onPress={() => { calistir(() => api.atla(sid, gun, oran / 100)); }}>{gun} gün ilerlet (%{oran} yaptım)</Btn>
        <Text style={s.small}>Günü tek tek yönetmek için Bugün sekmesinde görevleri işaretleyip "Günü bitir"e bas.</Text>
      </View>
      <Btn kind="ghost" onPress={async () => { await calistir(() => api.oturumSil(sid)); bitir(); }}>Verilerimi sil ve çık</Btn>
      <Text style={s.small}>Tüm verilerin sunucudan silinir. Model: {view.demo ? 'demo modu' : view.model}</Text>
    </ScrollView>
  );
}
