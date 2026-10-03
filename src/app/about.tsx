import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { Icon } from '../components/Icon';
import { LiveDemo } from '../components/LiveDemo';
import { PillButton } from '../components/PillButton';
import { Screen } from '../components/Screen';
import { colors, type } from '../theme';

/** Figma "iPhone 16 - 2": copy and button verbatim; the upper area shows the assistant at work. */
export default function About() {
  const router = useRouter();
  return (
    <Screen
      footer={
        <>
          <FadeIn delay={200}>
            <Text style={[type.body, styles.center]}>
              Korzystając z aplikacji ChickCheck możesz przeprowadzić samobadanie piersi korzystając z kamery wbudowanej w telefonie. Model rozpoznawania pozy i śledzenia dłoni poprowadzi Cię przez badanie.{'\n'}
              Model działa lokalnie na Twoim urządzeniu i żadne nagrania z aplikacji nie są wysyłane poza Twoje urządzenie.
            </Text>
          </FadeIn>
          <FadeIn delay={400}>
            <PillButton label="Zacznij" onPress={() => router.push('/prepare')} />
          </FadeIn>
        </>
      }
    >
      <View style={styles.stage}>
        <LiveDemo size={250} />
        <View style={styles.badge}>
          <Icon name="lock" size={14} color={colors.w80} />
          <Text style={type.caption}>Analiza na urządzeniu · 0 B wysłanych</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 36 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { textAlign: 'center' },
});
