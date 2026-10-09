import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { OturumSaglayici, useOturum } from './src/oturum';
import { Nav, Sekme } from './src/ui';
import { Onboarding } from './src/screens/Onboarding';
import { Kurulum } from './src/screens/Kurulum';
import { Gokyuzu } from './src/screens/Gokyuzu';
import { Bugun } from './src/screens/Bugun';
import { Ekip } from './src/screens/Ekip';
import { Ikizin } from './src/screens/Ikizin';
import { Ogret } from './src/screens/Ogret';
import { GorevVer } from './src/screens/GorevVer';
import { C, s } from './src/theme';

function Uygulama() {
  const { view, sid } = useOturum();
  const [sekme, setSekme] = useState<Sekme>('gokyuzu');
  const [ogret, setOgret] = useState<'akademik' | 'hobi' | null>(null);
  const [sheet, setSheet] = useState(false);

  let ic: React.ReactNode;
  let nav = false;
  if (!sid) ic = <Onboarding />;
  else if (!view || (view.durum === 'kuruluyor' && view.alanlar.some((a) => !a.hazir))) ic = <Kurulum />;
  else if (ogret) ic = <Ogret alan={ogret} geri={() => setOgret(null)} />;
  else {
    nav = true;
    ic = sekme === 'gokyuzu' ? <Gokyuzu gorevVer={() => setSheet(true)} ekipAc={() => setSekme('ekip')} />
      : sekme === 'bugun' ? <Bugun ogretAc={setOgret} />
      : sekme === 'ekip' ? <Ekip gorevVer={() => setSheet(true)} />
      : <Ikizin ogretAc={setOgret} />;
  }
  return (
    <View style={s.screen}>
      {view?.demo && (
        <View style={{ backgroundColor: C.card2, paddingVertical: 3, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: C.muted, fontWeight: '600' }}>Demo modu · ajanlar hazır içerikle çalışıyor</Text>
        </View>)}
      <View style={{ flex: 1 }}>{ic}</View>
      {nav && <Nav aktif={sekme} onSec={setSekme} />}
      <GorevVer acik={sheet} kapat={() => setSheet(false)} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <OturumSaglayici><Uygulama /></OturumSaglayici>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
