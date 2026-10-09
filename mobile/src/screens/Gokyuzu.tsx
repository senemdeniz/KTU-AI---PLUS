import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useOturum } from '../oturum';
import { Chip, Etiket, Hata, Takimyildiz } from '../ui';
import { C, s } from '../theme';

export function Gokyuzu({ gorevVer, ekipAc }: { gorevVer: () => void; ekipAc: () => void }) {
  const { view, hata } = useOturum();
  const [alan, setAlan] = useState(0);
  const [harita, setHarita] = useState(false);
  if (!view) return null;
  const a = view.alanlar[Math.min(alan, view.alanlar.length - 1)];
  const ik = a.ilerleme;
  const tw = a.ikiz;
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={s.muted}>Merhaba, {view.ad}</Text>
          <Text style={s.h1}>{view.gun}. gün <Text style={{ color: C.faint }}>/ {view.sure}</Text></Text>
        </View>
        <Pressable onPress={gorevVer} accessibilityRole="button"
          style={{ height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: C.gold, justifyContent: 'center' }}>
          <Text style={{ color: C.bg, fontWeight: '700', fontSize: 14 }}>✦ Görev ver</Text>
        </Pressable>
      </View>
      <Hata metin={hata} />
      <View style={s.row}>
        {view.alanlar.map((x, i) => <Chip key={x.alan} label={`${x.etiket} · ${x.konu.split('·')[0].trim()}`} on={i === alan} onPress={() => setAlan(i)} />)}
      </View>
      {ik && (<>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.h2}>{a.konu.split('·').pop()?.trim()} Takımyıldızı</Text>
            <Text style={s.small}>{ik.sen_yildiz} / {ik.toplam_yildiz} yıldız</Text>
          </View>
          <View style={{ alignItems: 'center' }}><Takimyildiz sen={ik.sen_yildiz} rota={ik.rota_yildiz} toplam={ik.toplam_yildiz} /></View>
          <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
            <Text style={{ color: C.gold, fontSize: 12 }}>● Senin yaktıkların</Text>
            <Text style={{ color: C.soft, fontSize: 12 }}>◌ Rota: planı aksatmasaydın</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[[`%${ik.parlaklik}`, 'Parlaklık', false], [`${ik.seri} gün`, 'Seri', false], [`${ik.fark} yıldız`, 'Rotanın gerisinde', ik.fark > 0]].map(([v, l, d], i) => (
            <View key={i} style={[s.card2, { flex: 1, backgroundColor: d ? C.dangerBg : C.card2 }]}>
              <Text style={{ color: d ? C.danger : C.text, fontSize: 18, fontWeight: '700' }}>{v}</Text>
              <Text style={s.small}>{l as string}</Text>
            </View>))}
        </View>
      </>)}
      {tw && (
        <View style={s.card2}>
          <Text style={{ color: C.blue, fontWeight: '700' }}>İkizin: %{tw.bilgi_yuzde}</Text>
          <Text style={s.body}>{tw.ogretilen ? `${tw.kavram_sayisi} kavramdan ${tw.ogretilen} tanesini ona öğrettin.` : 'Henüz hiçbir şey bilmiyor; ona sen öğreteceksin.'}</Text>
        </View>)}
      {!ik && <Text style={s.muted}>Bu alanın gökyüzü hazırlanıyor…</Text>}
      {a.harita && (
        <View style={s.card}>
          <Pressable onPress={() => setHarita(!harita)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.h2}>Yol haritan</Text><Text style={{ color: C.gold, fontWeight: '700' }}>{harita ? 'Gizle' : 'Göster'}</Text>
          </Pressable>
          <Text style={s.muted}>{a.hedef?.secilen}</Text>
          {harita && a.harita.map((x) => (
            <View key={x.id} style={{ flexDirection: 'row', gap: 10, opacity: x.day > ik!.gun + 1 ? 0.6 : 1 }}>
              <Text style={{ color: x.done ? C.gold : C.dim, width: 44, fontSize: 12, fontWeight: '700' }}>{x.done ? '★' : '☆'} {x.day}. gün</Text>
              <Text style={[s.body, { flex: 1, fontSize: 13 }]}>{x.title}</Text>
            </View>))}
        </View>)}
      {view.koc && (
        <View style={[s.card2, { padding: 16 }]}>
          <Etiket ajan="Rehber" />
          <Text style={s.body}>{view.koc.message}</Text>
          {view.koc.ask_user && <Text style={s.muted}>{view.koc.ask_user}</Text>}
          <Pressable onPress={ekipAc}><Text style={{ color: C.gold, fontWeight: '700', fontSize: 14 }}>Ekibin ne yaptığını gör →</Text></Pressable>
        </View>
      )}
      {view.oneriler.length > 0 && (
        <Pressable onPress={ekipAc} style={[s.card2, { backgroundColor: C.warnBg }]}>
          <Text style={{ color: C.gold, fontWeight: '700' }}>Onayını bekleyen {view.oneriler.length} öneri var →</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
