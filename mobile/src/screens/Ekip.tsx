import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { useOturum } from '../oturum';
import { Btn, Chip, Etiket, Hata } from '../ui';
import { C, s } from '../theme';

const RENK: Record<string, string> = { decision: C.gold, handoff: C.blue, done: C.ok, guard: C.danger, error: C.danger };

export function Ekip({ gorevVer }: { gorevVer: () => void }) {
  const { view, olaylar, sid, calistir, mesgul, hata } = useOturum();
  const [sek, setSek] = useState<'akis' | 'uye'>('akis');
  if (!view || !sid) return null;
  const sirali = [...olaylar].reverse().slice(0, 80);
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={s.h1}>Ekip</Text>
        <Btn kind="soft" onPress={gorevVer} style={{ height: 40 }}>Görev ver</Btn>
      </View>
      <View style={s.row}><Chip label="Akış" on={sek === 'akis'} onPress={() => setSek('akis')} /><Chip label="Ekip üyeleri" on={sek === 'uye'} onPress={() => setSek('uye')} /></View>
      <Hata metin={hata} />
      {sek === 'akis' && (<>
        {view.oneriler.map((p) => (
          <View key={p.id} style={[s.card, { borderColor: C.gold }]}>
            <Etiket ajan={`${p.kaynak} · onay bekliyor`} />
            <Text style={s.h2}>{p.baslik}</Text>
            <Text style={s.body}>{p.ozet}</Text>
            {p.degisiklikler.map((d, i) => (
              <Text key={i} style={s.muted}>{d.etiket}: {d.once} → <Text style={{ color: C.gold }}>{d.sonra}</Text></Text>))}
            <View style={s.row}>
              <Btn onPress={() => calistir(() => api.onayla(sid, p.id))} disabled={mesgul} style={{ flex: 1 }}>Onayla</Btn>
              <Btn kind="ghost" onPress={() => calistir(() => api.reddet(sid, p.id))} disabled={mesgul} style={{ flex: 1 }}>Reddet</Btn>
            </View>
          </View>))}
        {view.gorevler.slice().reverse().map((g) => (
          <View key={g.id} style={s.card2}>
            <Text style={s.small}>Verdiğin görev</Text>
            <Text style={s.body}>{g.metin}</Text>
            {g.atamalar.map((a, i) => <Text key={i} style={s.muted}>{a.durum === 'bitti' ? '✓' : '…'} {a.ajan}: {a.is}</Text>)}
            {g.sonuc?.mini_sinav && <View style={{ gap: 4, marginTop: 4 }}>
              <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700' }}>Mini sınav</Text>
              {g.sonuc.mini_sinav.map((q: string, i: number) => <Text key={i} style={s.body}>{i + 1}. {q}</Text>)}</View>}
            {g.sonuc?.kaynak && <Text style={s.muted}>{Array.isArray(g.sonuc.kaynak) ? g.sonuc.kaynak.join(' · ') : String(g.sonuc.kaynak)}</Text>}
          </View>))}
        <View style={s.card}>
          {sirali.length === 0 && <Text style={s.muted}>Henüz olay yok.</Text>}
          {sirali.map((o) => (
            <View key={o.id} style={{ gap: 2, borderLeftWidth: 2, borderLeftColor: RENK[o.tur] ?? C.line2, paddingLeft: 10 }}>
              <Etiket ajan={o.ajan} /><Text style={s.body}>{o.mesaj}</Text>
            </View>))}
        </View>
      </>)}
      {sek === 'uye' && view.ajanlar.map((a) => (
        <View key={a.ad} style={s.card2}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[s.body, { fontWeight: '700' }]}>{a.ad}</Text>
            <Text style={s.small}>{a.tur === 'kod' ? 'kod' : a.tur === 'llm' ? 'yapay zekâ' : 'yapay zekâ + kod'}</Text>
          </View>
          <Text style={s.muted}>{a.rol}</Text>
          <Text style={{ color: C.blue, fontSize: 12 }}>Yetki: {a.yetki}</Text>
          {a.son && <Text style={s.small}>Son: {a.son.mesaj}</Text>}
        </View>))}
    </ScrollView>
  );
}
