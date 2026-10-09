import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { Button, Progress } from '../components/ui';
import { C, s, skillLabel } from '../theme';
import type { SessionView } from '../types';

export function GoalScreen({ view, onStart, onBack }: { view: SessionView; onStart: (v: SessionView) => void; onBack: () => void }) {
  const g = view.goal;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sorted = [...g.candidates].sort((a, b) => b.fit_score - a.fit_score);

  const start = async () => {
    setBusy(true); setError(null);
    try { onStart(await api.start(view.session_id)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <View style={{ gap: 8, marginTop: 8 }}>
        <Text style={s.eyebrow}>Ajanın kararı</Text>
        <Text style={s.h1}>Senin için seçtiği hedef</Text>
        <Text style={s.muted}>Üç aday hedefi tarttı ve birini seçti.</Text>
      </View>

      {sorted.map((c) => {
        const chosen = c.title === g.selected;
        return (
          <View key={c.title} style={[s.card, chosen && { borderColor: C.blue, borderWidth: 2 }]}>
            <Text style={[s.eyebrow, { color: chosen ? C.blue : C.faint }]}>{chosen ? '✓ Seçildi' : 'Aday'}</Text>
            <Text style={s.h3}>{c.title}</Text>
            <View style={{ gap: 4 }}>
              <Progress value={c.fit_score / 100} color={chosen ? C.blue : C.ideal} />
              <Text style={s.muted}>Uygunluk {c.fit_score}/100 · {c.reason}</Text>
            </View>
          </View>
        );
      })}

      <View style={[s.card, { backgroundColor: C.navy, borderColor: C.navy }]}>
        <Text style={[s.eyebrow, { color: '#9fb3ff' }]}>Neden bu hedef, neden şimdi?</Text>
        <Text style={[s.body, { color: '#f1efe9' }]}>{g.rationale}</Text>
        <View style={[s.row, { marginTop: 4, alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#c3cbe0', fontSize: 12 }}>Süre</Text>
            <Text style={{ color: '#f1efe9', fontSize: 20, fontWeight: '700' }}>{g.duration_days} gün</Text>
          </View>
          <View style={{ flex: 2 }}>
            <Text style={{ color: '#c3cbe0', fontSize: 12 }}>Başarı ölçütü</Text>
            <Text style={{ color: '#f1efe9', fontSize: 14, lineHeight: 20 }}>{g.success_metric}</Text>
          </View>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Hedef sonunda</Text>
        {Object.entries(g.target_skills).map(([k, v]) => (
          <View key={k} style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={s.body}>{skillLabel(k)}</Text>
            <Text style={[s.muted, { fontVariant: ['tabular-nums'] }]}>
              {(view.profile.skills[k] ?? 0).toFixed(1)} → <Text style={{ color: C.blue, fontWeight: '700' }}>{v.toFixed(1)}</Text>
            </Text>
          </View>
        ))}
      </View>

      {error && <Text style={{ color: C.red }}>{error}</Text>}
      <Button title="Bu hedefle başla" onPress={start} loading={busy} />
      <Button title="Geri dön" kind="ghost" onPress={onBack} />
    </ScrollView>
  );
}
