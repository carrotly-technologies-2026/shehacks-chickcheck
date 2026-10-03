import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BreastDial } from '../components/BreastDial';
import { FadeIn } from '../components/FadeIn';
import { Icon } from '../components/Icon';
import { PillButton } from '../components/PillButton';
import { Screen } from '../components/Screen';
import { CELLS } from '../detection/detector';
import { coveredShare } from '../detection/geometry';
import { examResults } from '../exam/results';
import { STEPS } from '../exam/steps';
import { addEntry } from '../storage/log';
import { colors, fonts, type } from '../theme';

// Opened directly (e.g. for screenshots) there is no exam in memory: show a typical result.
const DEMO_CELLS = (miss: number[]) => Array.from({ length: CELLS }, (_, i) => !miss.includes(i));

export default function Result() {
  const router = useRouter();
  const r = examResults.get();
  const live = !!r?.endedAt;
  const cells = live ? r!.cells : { left: DEMO_CELLS([20]), right: DEMO_CELLS([17, 22]) };
  const minutes = r?.endedAt ? Math.max(1, Math.round((r.endedAt - r.startedAt) / 60000)) : 6;
  const steps = live ? r!.done.length : STEPS.length;
  const cov = { left: coveredShare(cells.left), right: coveredShare(cells.right) };

  const save = async (concern: boolean) => {
    if (concern) {
      router.push({ pathname: '/log-new', params: { from: 'exam' } });
      return;
    }
    await addEntry({ source: 'exam', findings: [], marks: [], pain: 0, note: 'Samobadanie z asystentem. Bez niepokojących zmian.', coverage: cov });
    router.replace('/home');
  };

  return (
    <Screen
      title="Podsumowanie"
      footer={
        <>
          <FadeIn delay={300} style={{ gap: 8 }}>
            <Text style={[type.title, styles.center]}>Czy zauważyłaś coś niepokojącego?</Text>
            <Text style={[type.body, styles.center, { color: colors.w80 }]}>
              Zapisz wynik w dzienniku. Jeśli coś Cię zaniepokoiło, zaznacz gdzie: łatwiej będzie to pokazać lekarzowi.
            </Text>
          </FadeIn>
          <FadeIn delay={450} style={styles.actions}>
            <PillButton label="Tak, opiszę" icon={null} leadingIcon="note" onPress={() => save(true)} />
            <PillButton label="Nie" icon="check" onPress={() => save(false)} />
          </FadeIn>
        </>
      }
    >
      <View style={styles.stage}>
        <FadeIn style={styles.hero}>
          <View style={styles.tick}><Icon name="check" size={26} color={colors.ink} stroke={2.2} /></View>
          <Text style={[type.display, styles.center]}>Badanie zakończone</Text>
          <Text style={type.caption}>{steps}/{STEPS.length} kroków · {minutes} min · {r?.source === 'model' ? 'inferencja na urządzeniu' : 'tryb demo'}</Text>
        </FadeIn>
        <FadeIn delay={150} style={styles.dials}>
          {(['left', 'right'] as const).map((side) => (
            <View key={side} style={styles.dial}>
              <BreastDial size={132} cells={cells[side]} />
              <Text style={styles.pct}>{Math.round(cov[side] * 100)}%</Text>
              <Text style={type.caption}>{side === 'right' ? 'Prawa pierś' : 'Lewa pierś'}</Text>
            </View>
          ))}
        </FadeIn>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, justifyContent: 'center', gap: 36, paddingTop: 12 },
  hero: { alignItems: 'center', gap: 6 },
  tick: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  dials: { flexDirection: 'row', justifyContent: 'center', gap: 28 },
  dial: { alignItems: 'center', gap: 2 },
  pct: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, color: colors.white, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12 },
  center: { textAlign: 'center' },
});
