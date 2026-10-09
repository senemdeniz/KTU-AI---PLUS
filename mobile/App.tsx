import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { Onboarding } from './src/screens/Onboarding';
import { GoalScreen } from './src/screens/GoalScreen';
import { Panel } from './src/screens/Panel';
import { C, s } from './src/theme';
import type { SessionView } from './src/types';

export default function App() {
  const [view, setView] = useState<SessionView | null>(null);
  const reset = () => setView(null);

  let screen: React.ReactNode;
  if (!view) screen = <Onboarding onDone={setView} />;
  else if (!view.started) screen = <GoalScreen view={view} onStart={setView} onBack={reset} />;
  else screen = <Panel view={view} setView={setView} onReset={reset} />;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        {view?.mock && (
          <View style={{ backgroundColor: C.sand, paddingVertical: 4, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: C.muted, fontWeight: '600' }}>Demo modu · ajan hazır cevaplarla çalışıyor</Text>
          </View>
        )}
        {screen}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
