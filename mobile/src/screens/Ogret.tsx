import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useOturum } from '../oturum';
import { Btn, Etiket, Hata } from '../ui';
import { C, s } from '../theme';
import { dinle, sesVar } from '../ses';
import type { SinavMadde } from '../types';

const ROMEN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const SONUC: Record<SinavMadde['result'], { ad: string; renk: string; bg: string }> = {
  dogru: { ad: 'Doğru', renk: C.ok, bg: C.okBg }, eksik: { ad: 'Eksik', renk: C.gold, bg: C.warnBg },
  yanlis: { ad: 'Yanlış', renk: C.danger, bg: C.dangerBg }, anlatilmadi: { ad: 'Anlatılmadı', renk: C.dim, bg: C.card2 },
};

export function Ogret({ alan, geri }: { alan: 'akademik' | 'hobi'; geri: () => void }) {
  const { view, sid, calistir, mesgul, hata } = useOturum();
  const [metin, setMetin] = useState('');
  const [uyari, setUyari] = useState<string | null>(null);
  const [sinav, setSinav] = useState(false);
  const [dinliyor, setDinliyor] = useState(false);
  const [gecici, setGecici] = useState('');
  const durdur = React.useRef<null | (() => void)>(null);
  const sesBaslat = () => {
    setUyari(null);
    setDinliyor(true);
    durdur.current = dinle(
      (kesin, g) => { if (kesin) setMetin((m) => (m ? m + ' ' : '') + kesin.trim()); setGecici(g); },
      (h) => { setDinliyor(false); setGecici(''); if (h) setUyari(h); });
  };
  const sesDurdur = () => { durdur.current?.(); setDinliyor(false); setGecici(''); };
  if (!view || !sid) return null;
  const og = view.ogret;
  const cumleler = og.alan === alan ? og.cumleler : [];
  const konu = og.alan === alan ? og.konu : view.alanlar.find((x) => x.alan === alan)?.konu.split('·').pop()?.trim() ?? '';
  const son = og.alan === alan ? og.son : null;

  const ekle = async () => {
    const r = await calistir(() => api.ogretEkle(sid, metin, alan));
    if (!r) return;
    if (r.ok) { setMetin(''); setUyari(r.uyarilar?.length ? r.uyarilar.map((u: any) => u.mesaj).join(' ') : null); }
    else setUyari((r.engel === 'konu_disi' ? 'Konu Bekçisi: ' : '') + r.mesaj);
  };
  const sinava = async () => {
    const r = await calistir(() => api.sinav(sid));
    if (r?.ok) setSinav(true); else if (r) setUyari(r.mesaj);
  };

  if (sinav && son) return <Sinav son={son} geri={() => setSinav(false)} />;
  return (
    <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Pressable onPress={geri}><Text style={{ color: C.gold, fontWeight: '700' }}>← Geri</Text></Pressable>
      <Text style={s.h1}>İkizine öğret</Text>
      <Text style={s.muted}>Konu: {konu}. İkizin yalnızca burada yazdıklarını bilir.</Text>
      <View style={[s.card2, { backgroundColor: C.warnBg }]}>
        <Text style={{ color: C.gold, fontSize: 12, lineHeight: 17 }}>
          Kişisel bilgi (ad, telefon, e-posta, kimlik no, IBAN…) yazma. Yazdıkların yalnızca bu sınav için kullanılır ve istediğin an silinebilir. İkizin bir yapay zekâ karakteridir.
        </Text>
      </View>
      <Hata metin={hata} />
      {cumleler.length > 0 && (
        <View style={s.card}>
          {cumleler.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={{ color: C.gold, fontWeight: '700', width: 36 }}>{ROMEN[i] ?? i + 1}.</Text>
              <Text style={[s.body, { flex: 1 }]}>{c}</Text>
            </View>))}
          <Pressable onPress={() => calistir(() => api.ogretSil(sid))}><Text style={{ color: C.danger, fontWeight: '700', fontSize: 13 }}>Hepsini sil</Text></Pressable>
        </View>)}
      {uyari && <View style={[s.card2, { backgroundColor: C.dangerBg }]}><Text style={{ color: C.danger, fontSize: 13, lineHeight: 18 }}>{uyari}</Text></View>}
      <TextInput style={[s.input, { minHeight: 110, textAlignVertical: 'top' }]} multiline value={metin} onChangeText={setMetin} maxLength={1500}
        placeholder="Konuyu bir arkadaşına anlatır gibi yaz…" placeholderTextColor={C.faint} />
      {sesVar() ? (
        <Btn kind={dinliyor ? 'gold' : 'ghost'} onPress={dinliyor ? sesDurdur : sesBaslat}>{dinliyor ? '■ Dinliyorum… durdurmak için dokun' : '🎙️ Sesle anlat'}</Btn>
      ) : <Text style={s.small}>Sesli anlatım şimdilik web sürümünde (Chrome/Safari) çalışır.</Text>}
      {!!gecici && <Text style={[s.muted, { fontStyle: 'italic' }]}>{gecici}</Text>}
      {dinliyor && <Text style={s.small}>Konuş, bitince durdur; yazıya dökülen metni düzenleyip ekleyebilirsin. Tarayıcının ses tanıma servisi sesini işleyebilir; kişisel bilgi söyleme.</Text>}
      <Btn kind="soft" onPress={ekle} disabled={mesgul || !metin.trim()}>Cümleleri ekle</Btn>
      <Btn onPress={sinava} disabled={mesgul || cumleler.length === 0}>{mesgul ? 'İkiz sınavda…' : 'İkizini sınava sok'}</Btn>
    </ScrollView>
  );
}

function Sinav({ son, geri }: { son: NonNullable<ReturnType<typeof useOturum>['view']>['ogret']['son']; geri: () => void }) {
  const { olaylar } = useOturum();
  if (!son) return null;
  const ek = olaylar.slice(-8);
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Pressable onPress={geri}><Text style={{ color: C.gold, fontWeight: '700' }}>← Anlatıma dön</Text></Pressable>
      <Text style={s.h1}>İkiz sınavda</Text>
      <Text style={s.muted}>{son.score} / {son.total} · yıldız {son.star === 'halkali' ? 'halkalı yandı' : son.star === 'parlak' ? 'parlak ama halkasız' : 'henüz sönük'}</Text>
      {son.items.map((m, i) => {
        const r = SONUC[m.result];
        return (
          <View key={i} style={s.card}>
            <Text style={s.small}>Soru {i + 1}</Text>
            <Text style={[s.body, { fontWeight: '700' }]}>{m.question}</Text>
            <Text style={s.small}>İkiz (yapay zekâ) yanıtı</Text>
            <Text style={s.body}>{m.twin_answer}</Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: r.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: r.renk, fontWeight: '700', fontSize: 12 }}>{r.ad}</Text></View>
            {m.hint && <View><Etiket ajan="Hakem" /><Text style={s.muted}>{m.hint}</Text></View>}
          </View>);
      })}
      <View style={s.card}>
        {ek.map((o) => <Text key={o.id} style={s.small}><Text style={{ color: C.gold }}>{o.ajan}: </Text>{o.mesaj}</Text>)}
      </View>
      <Btn onPress={geri}>Yeniden anlat</Btn>
    </ScrollView>
  );
}
