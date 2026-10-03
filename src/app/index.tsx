import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { Hero3D } from '../components/Hero3D';
import { PillButton } from '../components/PillButton';
import { Screen } from '../components/Screen';
import { type } from '../theme';

/** Figma "iPhone 16 - 1". The empty upper area of the frame hosts the 3D awareness ribbon. */
export default function Welcome() {
  const router = useRouter();
  return (
    <Screen
      footer={
        <>
          <FadeIn delay={250} style={styles.texts}>
            <Text style={[type.display, styles.center]}>ChickCheck</Text>
            <Text style={[type.title, styles.center]}>Twoje zdrowie w Twoich rękach</Text>
          </FadeIn>
          <FadeIn delay={450}>
            <PillButton label="Zacznij" onPress={() => router.push('/about')} />
          </FadeIn>
        </>
      }
    >
      <View style={styles.hero}>
        <Hero3D size={360} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 24 },
  texts: { width: 282, gap: 16 },
  center: { textAlign: 'center' },
});
