import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../components/FadeIn';
import { Figure } from '../components/Figure';
import { Icon, IconName } from '../components/Icon';
import { PillButton } from '../components/PillButton';
import { Screen } from '../components/Screen';
import { colors, type } from '../theme';

const CHIPS: { icon: IconName; label: string }[] = [
  { icon: 'sun', label: 'Jasne światło' },
  { icon: 'distance', label: 'ok. 1–1,5 m' },
  { icon: 'camera-off', label: 'Bez nagrywania' },
];

/** Figma "iPhone 16 - 3": title, numbered list and "Dalej" verbatim. Above: the framing the camera expects. */
export default function Prepare() {
  const router = useRouter();
  return (
    <Screen
      title="Przygotowanie do badania"
      footer={
        <>
          <FadeIn delay={200} style={{ gap: 2 }}>
            <Text style={[type.body, styles.center]}>1. Ustaw telefon tak, aby dobrze widzieć górną część ciała.</Text>
            <Text style={[type.body, styles.center]}>2. Badanie najlepiej przeprowadzać bez ubrań, aby zapobiec błędom i pomyłkom</Text>
          </FadeIn>
          <FadeIn delay={400}>
            <PillButton label="Dalej" onPress={() => router.push('/method')} />
          </FadeIn>
        </>
      }
    >
      <View style={styles.stage}>
        <View style={styles.frame}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => <View key={c} style={[styles.corner, styles[c]]} />)}
          <Figure pose="down" size={210} variant="ghost" />
        </View>
        <View style={styles.chips}>
          {CHIPS.map((c) => (
            <View key={c.label} style={styles.chip}>
              <Icon name={c.icon} size={16} color={colors.w80} />
              <Text style={type.caption}>{c.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const C = 28;
const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, paddingTop: 12 },
  frame: { width: 244, height: 300, alignItems: 'center', justifyContent: 'center', paddingTop: 22 },
  corner: { position: 'absolute', width: C, height: C, borderColor: colors.white },
  tl: { top: 0, left: 0, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 16 },
  tr: { top: 0, right: 0, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 16 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderBottomLeftRadius: 16 },
  br: { bottom: 0, right: 0, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 16 },
  chips: { flexDirection: 'row', gap: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { textAlign: 'center' },
});
