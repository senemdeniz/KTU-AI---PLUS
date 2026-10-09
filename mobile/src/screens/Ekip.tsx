import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { useOturum } from '../oturum';
import { Btn, Chip, Hata } from '../ui';
import { Avatar, Balon, Yaziyor, ajanBilgi } from '../ajanlar';
import { C, s } from '../theme';

const TUR: Record<string, string> = { decision: 'KARAR', handoff: 'DEVİR', done: 'TAMAM', guard: 'KORUMA', error: 'HATA', start: 'BAŞLADI', info: '' };

export function Ekip({ gorevVer }: { gorevVer: () => void }) {
  const { view, olaylar, sid, calistir, mesgul, hata } = useOturum();
  const [sek, setSek] = useState<'akis' | 'uye'>('akis');
  if (!view || !sid) return null;
  const son = olaylar[olaylar.length - 1];
  const calisiyor = view.durum !== 'hazir';
  const aktif = son && Date.now() / 1000 - son.t < 8 ? son.ajan : calisiyor ? son?.ajan : null;
  const sirali = [...olaylar].reverse().slice(0, 60);
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={s.h1}>Ekip</Text>
        <Btn kind="soft" onPress={gorevVer} style={{ height: 40 }}>✦ Görev ver</Btn>
      </View>
      <View style={[s.card, { paddingVertical: 14 }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
          {view.ajanlar.map((a) => (
            <View key={a.ad} style={{ alignItems: 'center', width: 62, gap: 4 }}>
              <Avatar ad={a.ad} aktif={aktif === a.ad} />
              <Text numberOfLines={1} style={{ color: aktif === a.ad ? ajanBilgi(a.ad).renk : C.dim, fontSize: 10, fontWeight: '700' }}>{a.ad}</Text>
            </View>))}
        </View>
        <Text style={[s.small, { textAlign: 'center' }]}>{calisiyor ? `${aktif ?? 'Ekip'} çalışıyor…` : 'Ekip hazır, seni bekliyor'}</Text>
      </View>
      <View style={s.row}><Chip label="Akış" on={sek === 'akis'} onPress={() => setSek('akis')} /><Chip label="Ekip üyeleri" on={sek === 'uye'} onPress={() => setSek('uye')} /></View>
      <Hata metin={hata} />
      {sek === 'akis' && (<>
        {view.oneriler.map((p) => (
          <View key={p.id} style={[s.card, { borderColor: C.gold }]}>
            <View style={s.row}><Avatar ad={p.kaynak} boyut={30} /><Text style={{ color: C.gold, fontWeight: '700', fontSize: 12 }}>{p.kaynak} · senin onayını bekliyor</Text></View>
            <Text style={s.h2}>{p.baslik}</Text>
            <Text style={s.body}>{p.ozet}</Text>
            {p.degisiklikler.map((d, i) => <Text key={i} style={s.muted}>{d.etiket}: {d.once} → <Text style={{ color: C.gold }}>{d.sonra}</Text></Text>)}
            <View style={s.row}>
              <Btn onPress={() => calistir(() => api.onayla(sid, p.id))} disabled={mesgul} style={{ flex: 1 }}>Onayla</Btn>
              <Btn kind="ghost" onPress={() => calistir(() => api.reddet(sid, p.id))} disabled={mesgul} style={{ flex: 1 }}>Reddet</Btn>
            </View>
          </View>))}
        {view.gorevler.slice().reverse().map((g) => (
          <View key={g.id} style={s.card2}>
            <Text style={s.small}>Verdiğin görev</Text>
            <Text style={s.body}>{g.metin}</Text>
            {g.atamalar.map((a, i) => <View key={i} style={s.row}><Avatar ad={a.ajan} boyut={24} /><Text style={[s.muted, { flex: 1 }]}>{a.durum === 'bitti' ? '✓' : '…'} {a.is}</Text></View>)}
            {g.sonuc?.mini_sinav && <View style={{ gap: 4, marginTop: 4 }}>
              <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700' }}>Mini sınav</Text>
              {g.sonuc.mini_sinav.map((q: string, i: number) => <Text key={i} style={s.body}>{i + 1}. {q}</Text>)}</View>}
            {g.sonuc?.kaynak && <Text style={s.muted}>{Array.isArray(g.sonuc.kaynak) ? g.sonuc.kaynak.join(' · ') : String(g.sonuc.kaynak)}</Text>}
          </View>))}
        <View style={{ gap: 12 }}>
          {calisiyor && son && <Yaziyor ad={son.ajan} />}
          {sirali.length === 0 && <Text style={s.muted}>Henüz olay yok.</Text>}
          {sirali.map((o, i) => {
            const b = ajanBilgi(o.ajan);
            const damga = TUR[o.tur];
            return (
              <Balon key={o.id} yeni={i === 0}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Avatar ad={o.ajan} boyut={34} />
                  <View style={{ flex: 1, backgroundColor: o.tur === 'guard' || o.tur === 'error' ? C.dangerBg : C.card2, borderRadius: 16,
                    borderTopLeftRadius: 4, padding: 12, gap: 4, borderLeftWidth: 3, borderLeftColor: b.renk }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: b.renk, fontSize: 12, fontWeight: '800' }}>{o.ajan}</Text>
                      {!!damga && <Text style={{ color: o.tur === 'handoff' ? C.blue : C.dim, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>{o.tur === 'handoff' ? '→ ' : ''}{damga}</Text>}
                    </View>
                    <Text style={s.body}>{o.mesaj}</Text>
                  </View>
                </View>
              </Balon>);
          })}
        </View>
      </>)}
      {sek === 'uye' && view.ajanlar.map((a) => (
        <View key={a.ad} style={[s.card2, { flexDirection: 'row', gap: 12 }]}>
          <Avatar ad={a.ad} boyut={44} />
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[s.body, { fontWeight: '700' }]}>{a.ad}</Text>
              <Text style={s.small}>{a.tur === 'kod' ? 'kod' : a.tur === 'llm' ? 'yapay zekâ' : 'yapay zekâ + kod'}</Text>
            </View>
            <Text style={s.muted}>{a.rol}</Text>
            <Text style={{ color: C.blue, fontSize: 12 }}>Yetki: {a.yetki}</Text>
            {a.son && <Text style={s.small}>Son: {a.son.mesaj}</Text>}
          </View>
        </View>))}
    </ScrollView>
  );
}
