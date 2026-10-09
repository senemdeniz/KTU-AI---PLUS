import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useOturum } from '../oturum';
import { Btn, Chip, Hata, Spark } from '../ui';
import { C, s } from '../theme';

const GUNLER = [15, 30, 45, 60];
const ZAMANLAR: [string, 'sabah' | 'ogle' | 'aksam'][] = [['Sabah', 'sabah'], ['Öğlen', 'ogle'], ['Akşam', 'aksam']];

export function Onboarding() {
  const { baslat } = useOturum();
  const [adim, setAdim] = useState(0);
  const [ad, setAd] = useState('Elif');
  const [akOn, setAkOn] = useState(true);
  const [hbOn, setHbOn] = useState(true);
  const [ak, setAk] = useState('Kalkülüs I · Türev');
  const [hb, setHb] = useState('Gitar');
  const [dk, setDk] = useState(30);
  const [zaman, setZaman] = useState<'sabah' | 'ogle' | 'aksam'>('aksam');
  const [tarihOn, setTarihOn] = useState(false);
  const [tarih, setTarih] = useState('');
  const [hizli, setHizli] = useState('');
  const [hizliAlan, setHizliAlan] = useState<'akademik' | 'hobi'>('akademik');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const bitir = async () => {
    setYukleniyor(true); setHata(null);
    try {
      const sonTarihler = tarihOn && /^\d{4}-\d{2}-\d{2}$/.test(tarih) ? [{ baslik: 'Vize', tarih }] : [];
      const r = await api.ac({ ad, akademik: akOn ? ak.trim() : null, hobi: hbOn ? hb.trim() : null, dakika: dk, zaman, son_tarihler: sonTarihler });
      baslat(r.session_id);
    } catch (e: any) { setHata(e.message); setYukleniyor(false); }
  };

  const hizliBaslat = async () => {
    setYukleniyor(true); setHata(null);
    try {
      const r = await api.ac({ ad, akademik: hizliAlan === 'akademik' ? hizli.trim() : null, hobi: hizliAlan === 'hobi' ? hizli.trim() : null,
        dakika: 30, zaman: 'aksam', son_tarihler: [] });
      baslat(r.session_id);
    } catch (e: any) { setHata(e.message); setYukleniyor(false); }
  };

  return (
    <ScrollView contentContainerStyle={[s.pad, { paddingTop: 40 }]} keyboardShouldPersistTaps="handled">
      <View style={s.row}><Spark size={22} /><Text style={{ color: C.gold, fontWeight: '800', fontSize: 18 }}>İkiz</Text></View>

      {adim === 0 && (<>
        <Text style={s.h1}>Ne öğrenmek istiyorsun?</Text>
        <Text style={s.muted}>Bir konu yaz; ekip dakikalar içinde sana 21 günlük yol haritası çıkarsın. İkizin bir yapay zekâ karakteridir.</Text>
        <TextInput style={s.input} value={ad} onChangeText={setAd} placeholder="Adın" placeholderTextColor={C.faint} maxLength={40} />
        <TextInput style={s.input} value={hizli} onChangeText={setHizli} placeholder="Örn. Kalkülüs I · Türev, Gitar, İspanyolca…"
          placeholderTextColor={C.faint} maxLength={80} />
        <View style={s.row}><Chip label="Akademik" on={hizliAlan === 'akademik'} onPress={() => setHizliAlan('akademik')} />
          <Chip label="Hobi" on={hizliAlan === 'hobi'} onPress={() => setHizliAlan('hobi')} /></View>
        <Hata metin={hata} />
        <Btn onPress={hizliBaslat} disabled={!ad.trim() || !hizli.trim() || yukleniyor}>{yukleniyor ? 'Ekip çağrılıyor…' : 'Ekibi çağır'}</Btn>
        <Btn kind="ghost" onPress={() => setAdim(1)}>İki alan ve daha fazla ayar</Btn>
      </>)}

      {adim === 1 && (<>
        <Text style={s.small}>1 / 2</Text>
        <Text style={s.h1}>Neye çalışacaksın?</Text>
        <View style={s.card}>
          <View style={s.row}><Chip label="Akademik" on={akOn} onPress={() => (hbOn || !akOn) && setAkOn(!akOn)} /></View>
          {akOn && <TextInput style={s.input} value={ak} onChangeText={setAk} placeholder="Ders · konu" placeholderTextColor={C.faint} maxLength={80} />}
          {akOn && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {['Vize', 'Final', 'Ödev/proje', 'Tez'].map((x) => <Chip key={x} label={x} />)}</View>}
        </View>
        <View style={s.card}>
          <View style={s.row}><Chip label="Hobiler" on={hbOn} onPress={() => (akOn || !hbOn) && setHbOn(!hbOn)} /></View>
          {hbOn && <TextInput style={s.input} value={hb} onChangeText={setHb} placeholder="Örn. Gitar" placeholderTextColor={C.faint} maxLength={80} />}
        </View>
        <Btn onPress={() => setAdim(2)} disabled={(akOn && !ak.trim()) || (hbOn && !hb.trim())}>Devam</Btn>
      </>)}

      {adim === 2 && (<>
        <Text style={s.small}>2 / 2</Text>
        <Text style={s.h1}>Günde ne kadar?</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {GUNLER.map((g) => <Chip key={g} label={`${g} dk`} on={dk === g} onPress={() => setDk(g)} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {ZAMANLAR.map(([l, k]) => <Chip key={k} label={l} on={zaman === k} onPress={() => setZaman(k)} />)}
        </View>
        {akOn && <View style={s.card}>
          <Chip label="Yaklaşan sınav / teslim ekle" on={tarihOn} onPress={() => setTarihOn(!tarihOn)} />
          {tarihOn && <TextInput style={s.input} value={tarih} onChangeText={setTarih} placeholder="YYYY-AA-GG (örn. 2026-10-16)" placeholderTextColor={C.faint} maxLength={10} />}
        </View>}
        <Hata metin={hata} />
        <Btn onPress={bitir} disabled={yukleniyor}>{yukleniyor ? 'Ekip çağrılıyor…' : 'Ekibi çağır'}</Btn>
        <Btn kind="ghost" onPress={() => setAdim(1)}>Geri</Btn>
      </>)}
    </ScrollView>
  );
}
