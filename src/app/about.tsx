import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { Icon } from '../components/Icon';
import { LineArt } from '../components/LineArt';
import { useTime } from '../lib/useTime';
import { Circle } from 'react-native-svg';
import { PillButton } from '../components/PillButton';
import { Screen } from '../components/Screen';
import { colors, type } from '../theme';

/** The moodboard drawing with the touch target the camera will show, pulsing over the breast. */
function AboutArt() {
  const t = useTime();
  const ph = (t % 1.8) / 1.8;
  return (
    <LineArt name="raise-palpate" width={290}>
      <Circle cx={208} cy={214} r={30 + ph * 22} fill="none" stroke={colors.blush} strokeWidth={2} strokeOpacity={(1 - ph) * 0.9} />
      <Circle cx={208} cy={214} r={30} fill="none" stroke="#fff" strokeWidth={1.6} strokeDasharray="3 5" />
      <Circle cx={208} cy={214} r={4} fill="#fff" />
    </LineArt>
  );
}

/** Figma "iPhone 16 - 2": copy and button verbatim apart from the model naming; above it, the technique being guided. */
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
        <AboutArt />
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
