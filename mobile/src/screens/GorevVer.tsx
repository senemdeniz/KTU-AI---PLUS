import React, { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useOturum } from '../oturum';
import { Btn, Hata } from '../ui';
import { C, s } from '../theme';

const ORNEK = ['Gelecek hafta vizem var, planı ona göre ayarla', 'Mini sınav hazırla', 'Bu hafta yoğunum'];

export function GorevVer({ acik, kapat }: { acik: boolean; kapat: () => void }) {
  const { sid, calistir, mesgul } = useOturum();
  const [metin, setMetin] = useState('');
  const [mesaj, setMesaj] = useState<string | null>(null);
  const gonder = async () => {
    if (!sid) return;
    const r = await calistir(() => api.gorevVer(sid, metin));
    if (!r) return;
    if (r.ok) { setMetin(''); setMesaj(null); kapat(); } else setMesaj(r.mesaj);
  };
  return (
    <Modal visible={acik} transparent animationType="slide" onRequestClose={kapat}>
      <Pressable style={{ flex: 1, backgroundColor: '#000a' }} onPress={kapat} />
      <View style={{ backgroundColor: C.card, padding: 20, paddingBottom: 32, gap: 12, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
        <Text style={s.h2}>Ekibe görev ver</Text>
        <Text style={s.muted}>Gözlemevi işi doğru ajanlara dağıtır. Ödevini yapmaz; anlamana yardım eder.</Text>
        <TextInput style={[s.input, { minHeight: 72 }]} multiline value={metin} onChangeText={setMetin} maxLength={300}
          placeholder="Ne istiyorsun?" placeholderTextColor={C.faint} />
        {ORNEK.map((o) => <Pressable key={o} onPress={() => setMetin(o)}><Text style={{ color: C.blue, fontSize: 13 }}>• {o}</Text></Pressable>)}
        <Hata metin={mesaj} />
        <Btn onPress={gonder} disabled={mesgul || !metin.trim()}>Gönder</Btn>
      </View>
    </Modal>
  );
}
