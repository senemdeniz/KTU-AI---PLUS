import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api, getBaseUrl, setBaseUrl } from '../api';
import { Button, Chip } from '../components/ui';
import { C, s } from '../theme';
import type { SessionView } from '../types';

const DEMO = {
  name: 'Elif',
  cv: 'Bilgisayar mühendisliği 3. sınıf öğrencisi. Yaz stajında Python ile Excel raporlarını otomatikleştiren betikler yazdı. Temel SQL biliyor, veri bilimine ilgi duyuyor.',
  hobbies: 'satranç, fotoğrafçılık',
  goals: 'veri bilimine geçmek\nİngilizce teknik sunum yapabilmek',
  minutes: 30,
};

export function Onboarding({ onDone }: { onDone: (v: SessionView) => void }) {
  const [name, setName] = useState('');
  const [cv, setCv] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [goals, setGoals] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [server, setServer] = useState(getBaseUrl());
  const [showServer, setShowServer] = useState(false);
  const [busy, setBusy] = useState<'pdf' | 'go' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fillDemo = () => {
    setName(DEMO.name); setCv(DEMO.cv); setHobbies(DEMO.hobbies); setGoals(DEMO.goals); setMinutes(DEMO.minutes);
  };

  const pickPdf = async () => {
    setError(null);
    const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    setBusy('pdf');
    try {
      setBaseUrl(server);
      const { text } = await api.parseCv(r.assets[0]);
      setCv(text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    setError(null);
    if (!cv.trim() && !goals.trim()) return setError('En azından CV\'ni ya da hedeflerini yazmalısın.');
    setBusy('go');
    try {
      setBaseUrl(server);
      const v = await api.createSession({
        name: name.trim() || 'Kullanıcı',
        cv_text: cv,
        hobbies: hobbies.split(',').map((h) => h.trim()).filter(Boolean),
        goals: goals.split('\n').map((g) => g.trim()).filter(Boolean),
        daily_minutes: minutes,
      });
      onDone(v);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text style={s.eyebrow}>İkiz</Text>
          <Text style={s.h1}>Seni tanıyalım</Text>
          <Text style={s.muted}>
            CV'ni, hobilerini ve hedeflerini ver. Ajan sana en uygun gelişim hedefini seçsin ve seninle birlikte büyüyecek bir ikiz oluştursun.
          </Text>
        </View>

        <Button title="Demo profiliyle doldur" kind="secondary" onPress={fillDemo} />

        <View>
          <Text style={s.label}>Adın</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="ör. Elif" placeholderTextColor={C.faint} />
        </View>

        <View>
          <Text style={s.label}>CV'n</Text>
          <TextInput
            style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
            value={cv}
            onChangeText={setCv}
            multiline
            placeholder="CV metnini yapıştır ya da PDF yükle"
            placeholderTextColor={C.faint}
          />
          <Button title="PDF olarak yükle" kind="ghost" onPress={pickPdf} loading={busy === 'pdf'} style={{ alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 0 }} />
        </View>

        <View>
          <Text style={s.label}>Hobilerin (virgülle ayır)</Text>
          <TextInput style={s.input} value={hobbies} onChangeText={setHobbies} placeholder="satranç, fotoğrafçılık" placeholderTextColor={C.faint} />
        </View>

        <View>
          <Text style={s.label}>Geliştirmek istediğin konular (her satıra bir tane)</Text>
          <TextInput
            style={[s.input, { minHeight: 84, textAlignVertical: 'top' }]}
            value={goals}
            onChangeText={setGoals}
            multiline
            placeholder={'veri bilimine geçmek\nİngilizce sunum yapabilmek'}
            placeholderTextColor={C.faint}
          />
        </View>

        <View>
          <Text style={s.label}>Günde ayırabileceğin süre</Text>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            {[15, 30, 45, 60, 90].map((m) => (
              <Chip key={m} label={`${m} dk`} active={minutes === m} onPress={() => setMinutes(m)} />
            ))}
          </View>
        </View>

        <Text style={[s.muted, { fontSize: 12 }]}>Verilerin yalnızca bu oturumda tutulur ve hedef seçimi dışında kullanılmaz.</Text>

        {error && <Text style={{ color: C.red, fontSize: 14 }}>{error}</Text>}

        <Button title="İkizimi oluştur" onPress={submit} loading={busy === 'go'} />

        <View style={{ gap: 8 }}>
          <Button title={showServer ? 'Sunucu ayarını gizle' : 'Sunucu ayarı'} kind="ghost" onPress={() => setShowServer(!showServer)} style={{ minHeight: 36 }} />
          {showServer && (
            <TextInput style={s.input} value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
