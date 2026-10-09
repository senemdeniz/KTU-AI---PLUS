import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { TwinChart, SkillBars } from '../components/TwinChart';
import { Button, Chip, Pill, Segmented, Stat } from '../components/ui';
import { C, RISK, s, skillLabel, TYPE_TR } from '../theme';
import type { SessionView, Task } from '../types';

type Tab = 'today' | 'twin' | 'plan' | 'demo';

export function Panel({ view, setView, onReset }: { view: SessionView; setView: (v: SessionView) => void; onReset: () => void }) {
  const [tab, setTab] = useState<Tab>('today');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const twin = view.twin!;
  const goal = view.goal;
  const today = view.today!;
  const todays = view.roadmap!.tasks.filter((t) => t.day === today);
  const sid = view.session_id;

  const run = async (key: string, fn: () => Promise<SessionView>) => {
    setBusy(key); setError(null);
    try { setView(await fn()); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  };

  const closeDay = () =>
    run('day', async () => {
      const v = await api.closeDay(sid, todays.filter((t) => checked[t.id]).map((t) => t.id));
      setChecked({});
      return v;
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Başlık */}
        <View style={[s.row, { justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.eyebrow}>{view.profile.name} ve ikizi</Text>
            <Text style={s.h2}>{goal.selected}</Text>
          </View>
          <Pressable onPress={onReset} accessibilityRole="button" hitSlop={10}>
            <Text style={{ color: C.blue, fontWeight: '600', fontSize: 14 }}>Baştan</Text>
          </Pressable>
        </View>

        <View style={s.row}>
          <Stat label="Gün" value={`${twin.day}/${goal.duration_days}`} />
          <Stat label="Seri" value={`${twin.streak} gün`} />
          <Stat label="Fark" value={twin.divergence.toFixed(2)} />
        </View>

        {/* İki ikiz */}
        <View style={s.card}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={s.h3}>İki ikiz</Text>
            <Pill risk={twin.risk} />
          </View>
          <TwinChart data={view.history!} />
        </View>

        {/* Koç */}
        {view.coach && (
          <View style={[s.card, { backgroundColor: RISK[view.coach.mode].bg, borderColor: RISK[view.coach.mode].bg, borderLeftWidth: 4, borderLeftColor: RISK[view.coach.mode].fg }]}>
            <Text style={[s.eyebrow, { color: RISK[view.coach.mode].fg }]}>İstikrar koçu</Text>
            <Text style={s.body}>{view.coach.message}</Text>
            <Text style={s.muted}>Şimdi yap: {view.coach.action.title} ({view.coach.action.minutes} dk)</Text>
          </View>
        )}

        {/* Ajanın yeniden planlama önerisi */}
        {twin.risk === 'at_risk' && !view.finished && (
          <View style={[s.card, { borderColor: C.red }]}>
            <Text style={s.h3}>Ajan planın sana uymadığını tespit etti</Text>
            <Text style={s.muted}>{view.coach?.ask_user ?? 'Son günlerde seni en çok ne zorladı?'}</Text>
            <TextInput
              style={s.input}
              value={reason}
              onChangeText={setReason}
              placeholder="ör. akşamları 25 dakika ayıramıyorum"
              placeholderTextColor={C.faint}
            />
            <Button title="Planı yeniden kur" onPress={() => run('replan', () => api.replan(sid, reason))} loading={busy === 'replan'} />
          </View>
        )}
        {view.replan && (
          <View style={[s.card, { backgroundColor: C.greenSoft, borderColor: C.greenSoft }]}>
            <Text style={[s.eyebrow, { color: C.green }]}>Plan güncellendi · {view.replan.interventions.join(', ')}</Text>
            <Text style={s.body}>{view.replan.explanation}</Text>
          </View>
        )}
        {view.finished && (
          <View style={[s.card, { backgroundColor: C.navy }]}>
            <Text style={[s.h3, { color: '#f1efe9' }]}>Hedef süresi tamamlandı</Text>
            <Text style={{ color: '#c3cbe0' }}>Başarı ölçütün: {goal.success_metric}</Text>
          </View>
        )}

        {error && <Text style={{ color: C.red }}>{error}</Text>}

        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'today', label: 'Bugün' },
            { key: 'twin', label: 'İkizin' },
            { key: 'plan', label: 'Plan' },
            { key: 'demo', label: 'İleri sar' },
          ]}
        />

        {tab === 'today' && (
          <View style={{ gap: 10 }}>
            {view.finished ? (
              <Text style={s.muted}>Tüm günler tamamlandı.</Text>
            ) : todays.length === 0 ? (
              <Text style={s.muted}>Bugün için görev yok, dinlen.</Text>
            ) : (
              <>
                <Text style={s.h3}>{today}. gün görevleri</Text>
                {todays.map((t) => (
                  <TaskRow key={t.id} t={t} on={!!checked[t.id]} toggle={() => setChecked({ ...checked, [t.id]: !checked[t.id] })} />
                ))}
                {todays.some((t) => t.type === 'teach') && (
                  <Text style={s.muted}>Bu bir öğretme görevi: "İkizin" sekmesinde Öğret modunu seç.</Text>
                )}
              </>
            )}
            {!view.finished && <Button title="Günü kapat" onPress={closeDay} loading={busy === 'day'} />}
          </View>
        )}

        {tab === 'twin' && <TwinTalk view={view} setView={setView} />}

        {tab === 'plan' && (
          <View style={{ gap: 12 }}>
            <View style={s.card}>
              <Text style={s.h3}>Beceri bazında</Text>
              <SkillBars real={twin.real} ideal={twin.ideal} target={goal.target_skills} />
            </View>
            {view.roadmap!.weeks.map((w) => (
              <View key={w.week} style={s.card}>
                <Text style={s.eyebrow}>{w.week}. hafta · {w.theme}</Text>
                <Text style={s.muted}>Kilometre taşı: {w.milestone}</Text>
                {view.roadmap!.tasks
                  .filter((t) => Math.ceil(t.day / 7) === w.week)
                  .map((t) => (
                    <View key={t.id} style={[s.row, { alignItems: 'flex-start' }]}>
                      <Text style={{ width: 22, color: t.done ? C.green : t.day <= twin.day ? C.red : C.faint, fontWeight: '700' }}>
                        {t.done ? '✓' : t.day <= twin.day ? '✗' : '·'}
                      </Text>
                      <Text style={[s.muted, { flex: 1, color: t.day > twin.day ? C.muted : C.ink }]}>
                        {t.day}. gün · {t.title}
                      </Text>
                    </View>
                  ))}
              </View>
            ))}
          </View>
        )}

        {tab === 'demo' && <FastForward sid={sid} disabled={!!view.finished} run={run} busy={busy === 'ff'} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TaskRow({ t, on, toggle }: { t: Task; on: boolean; toggle: () => void }) {
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      style={[s.card, s.row, { alignItems: 'flex-start', gap: 12 }, on && { borderColor: C.blue, backgroundColor: C.blueSoft }]}
    >
      <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: on ? C.blue : C.ideal, backgroundColor: on ? C.blue : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        {on && <Text style={{ color: C.white, fontWeight: '800', fontSize: 14 }}>✓</Text>}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.body}>{t.title}</Text>
        <Text style={s.muted}>
          {TYPE_TR[t.type]} · {t.minutes} dk · {skillLabel(t.skill)} · zorluk {t.difficulty}
        </Text>
      </View>
    </Pressable>
  );
}

function TwinTalk({ view, setView }: { view: SessionView; setView: (v: SessionView) => void }) {
  const [mode, setMode] = useState<'chat' | 'teach'>('chat');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chat = (view.chat ?? []).slice(-8);

  const send = async () => {
    if (!msg.trim()) return;
    setBusy(true); setError(null);
    try { setView(await api.talk(view.session_id, msg, mode)); setMsg(''); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={s.row}>
        <Chip label="Sohbet" active={mode === 'chat'} onPress={() => setMode('chat')} />
        <Chip label="Öğret" active={mode === 'teach'} onPress={() => setMode('teach')} />
      </View>
      <Text style={s.muted}>
        {mode === 'teach'
          ? 'Bugün öğrendiğini ikizine anlat. Soru sorar ve anlatımını puanlar.'
          : 'İkizin seninle aynı seviyede; yalnızca birlikte bitirdiğiniz görevleri bilir.'}
      </Text>
      {chat.map((m, i) =>
        m.role === 'user' ? (
          <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: C.blue, borderRadius: 16, borderBottomRightRadius: 4, padding: 12 }}>
            <Text style={{ color: C.white, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
          </View>
        ) : (
          <View key={i} style={{ alignSelf: 'flex-start', maxWidth: '90%', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, gap: 6 }}>
            <Text style={[s.eyebrow, { fontSize: 11 }]}>İkizin</Text>
            <Text style={s.body}>{m.text}</Text>
            {m.questions?.map((q) => <Text key={q} style={s.body}>• {q}</Text>)}
            {m.score ? (
              <Text style={[s.muted, { color: C.ink }]}>
                <Text style={{ fontWeight: '700' }}>Anlatım puanı {m.score}/5.</Text> {m.score_reason ?? ''}
              </Text>
            ) : null}
          </View>
        ),
      )}
      <TextInput
        style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
        value={msg}
        onChangeText={setMsg}
        multiline
        placeholder={mode === 'teach' ? 'ör. pandas\'ta filtreleme bir koşul maskesiyle yapılır…' : 'İkizine bir şey yaz'}
        placeholderTextColor={C.faint}
      />
      {error && <Text style={{ color: C.red }}>{error}</Text>}
      <Button title="Gönder" onPress={send} loading={busy} disabled={!msg.trim()} />
    </View>
  );
}

function FastForward({ sid, disabled, run, busy }: { sid: string; disabled: boolean; busy: boolean; run: (k: string, fn: () => Promise<SessionView>) => void }) {
  const [days, setDays] = useState(7);
  const [cons, setCons] = useState(0.4);
  return (
    <View style={[s.card, { gap: 14 }]}>
      <Text style={s.muted}>Jüriye istikrarın etkisini göstermek için zamanı ileri sar.</Text>
      <View>
        <Text style={s.label}>Kaç gün?</Text>
        <View style={[s.row, { flexWrap: 'wrap' }]}>
          {[3, 7, 14].map((d) => <Chip key={d} label={`${d} gün`} active={days === d} onPress={() => setDays(d)} />)}
        </View>
      </View>
      <View>
        <Text style={s.label}>Görevleri tamamlama olasılığı</Text>
        <View style={[s.row, { flexWrap: 'wrap' }]}>
          {[0.2, 0.4, 0.7, 0.95].map((c) => <Chip key={c} label={`%${Math.round(c * 100)}`} active={cons === c} onPress={() => setCons(c)} />)}
        </View>
      </View>
      <Button title="İleri sar" onPress={() => run('ff', () => api.fastForward(sid, days, cons))} loading={busy} disabled={disabled} />
    </View>
  );
}
