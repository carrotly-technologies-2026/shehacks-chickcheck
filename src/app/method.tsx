import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BreastDial } from '../components/BreastDial';
import { FadeIn } from '../components/FadeIn';
import { PillButton } from '../components/PillButton';
import { Screen } from '../components/Screen';
import { METHODS, Method } from '../exam/steps';
import { useTime } from '../lib/useTime';
import { colors, fonts, type } from '../theme';

/** Not in Figma: choice of palpation pattern (all three are clinically accepted), in the same frame structure. */
export default function MethodScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>('spiral');
  const t = useTime();
  const chosen = METHODS.find((m) => m.id === method)!;

  return (
    <Screen
      title="Metoda badania"
      footer={
        <>
          <FadeIn delay={150}>
            <Text style={[type.body, styles.center]}>
              {chosen.hint}{'\n'}Asystent narysuje tę ścieżkę na Twojej piersi i zaznaczy zbadane obszary.
            </Text>
          </FadeIn>
          <FadeIn delay={300}>
            <PillButton label="Rozpocznij" onPress={() => router.push({ pathname: '/exam', params: { method } })} />
          </FadeIn>
        </>
      }
    >
      <View style={styles.stage}>
        <View style={styles.big}>
          <BreastDial size={230} method={method} u={(t % 6) / 6} />
        </View>
        <View style={styles.row}>
          {METHODS.map((m) => {
            const on = m.id === method;
            return (
              <Pressable key={m.id} onPress={() => setMethod(m.id)} style={styles.opt} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                <View style={[styles.optDial, on && styles.optOn]}>
                  <BreastDial size={68} method={m.id} ticks={false} strokeOpacity={on ? 1 : 0.6} />
                </View>
                <Text style={[styles.optLabel, on && { color: colors.white, fontFamily: fonts.medium }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingTop: 8 },
  big: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 22 },
  opt: { alignItems: 'center', gap: 8 },
  optDial: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  optOn: { borderColor: colors.white, backgroundColor: colors.w08 },
  optLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.w64 },
  center: { textAlign: 'center' },
});
