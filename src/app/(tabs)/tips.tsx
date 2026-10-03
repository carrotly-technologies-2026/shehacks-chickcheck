import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BreastDial } from '../../components/BreastDial';
import { LineArt, TECHNIQUES } from '../../components/LineArt';
import { Screen } from '../../components/Screen';
import { SymptomIcon } from '../../components/SymptomIcon';
import { METHODS } from '../../exam/steps';
import { FINDINGS } from '../../storage/log';
import { GUTTER, colors, type } from '../../theme';

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={type.overline}>{n}</Text>
      <Text style={[type.display, { fontSize: 24, lineHeight: 32 }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function Tips() {
  return (
    <Screen tabBar title="Porady">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Section n="01" title="Raz w miesiącu">
          <View style={styles.split}>
            <Text style={[type.body, { flex: 1 }]}>
              Najlepiej 7–10 dni po rozpoczęciu miesiączki, gdy piersi są najmniej tkliwe. Po menopauzie wybierz stały dzień miesiąca.
            </Text>
            <LineArt name="side" width={120} />
          </View>
        </Section>

        <Section n="02" title="Na co zwracać uwagę">
          <View style={styles.grid}>
            {FINDINGS.map((f) => (
              <View key={f.id} style={styles.gridItem}>
                <SymptomIcon id={f.id} size={44} />
                <Text style={[type.caption, styles.center]}>{f.label}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section n="03" title="Jak badać dotykiem">
          <Text style={type.body}>Opuszkami trzech środkowych palców, płasko, z trzema poziomami nacisku: lekkim, średnim i głębokim. Wybierz jeden wzór i trzymaj się go co miesiąc.</Text>
          <View style={styles.gallery}>
            {TECHNIQUES.map((x) => (
              <View key={x.name} style={styles.technique}>
                <LineArt name={x.name} width={136} />
                <Text style={[type.caption, styles.center]}>{x.caption}</Text>
              </View>
            ))}
          </View>
          <View style={styles.methods}>
            {METHODS.map((m) => (
              <View key={m.id} style={styles.gridItem}>
                <BreastDial size={72} method={m.id} ticks={false} />
                <Text style={type.caption}>{m.label}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section n="04" title="Kiedy do lekarza">
          <Text style={type.body}>
            Gdy zauważysz zmianę, która nie znika po kolejnej miesiączce, wydzielinę z brodawki, wciągnięcie skóry lub brodawki albo guzek. Większość zmian okazuje się łagodna, ale ocenić je musi lekarz.
          </Text>
          <Text style={type.body}>Kobiety w wieku 45–74 lata mogą co dwa lata wykonać bezpłatną mammografię w ramach programu profilaktyki NFZ.</Text>
        </Section>

        <Text style={[type.caption, styles.center, { color: colors.w64 }]}>
          ChickCheck wspiera regularne samobadanie. Nie stawia diagnozy i nie zastępuje badań lekarskich.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: GUTTER, paddingTop: 22, paddingBottom: 32, gap: 40 },
  section: { gap: 12 },
  split: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18, marginTop: 6 },
  gridItem: { width: '33.33%', alignItems: 'center', gap: 6 },
  methods: { flexDirection: 'row', marginTop: 6 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18, marginTop: 6 },
  technique: { width: '48%', alignItems: 'center', gap: 6 },
  center: { textAlign: 'center' },
});
