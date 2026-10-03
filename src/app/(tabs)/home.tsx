import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CycleDial } from '../../components/CycleDial';
import { FadeIn } from '../../components/FadeIn';
import { Icon } from '../../components/Icon';
import { PillButton } from '../../components/PillButton';
import { Screen } from '../../components/Screen';
import { EXAM_EVERY_DAYS, findingLabel, formatDate, formatLong, useLog } from '../../storage/log';
import { GUTTER, colors, type } from '../../theme';

const DAY = 86_400_000;

export default function Home() {
  const router = useRouter();
  const log = useLog();
  const last = log.find((e) => e.source === 'exam');
  const latest = log[0];
  const due = last ? new Date(+new Date(last.date) + EXAM_EVERY_DAYS * DAY) : new Date();

  return (
    <Screen
      tabBar
      title="ChickCheck"
      footer={
        <FadeIn delay={300}>
          <PillButton label="Rozpocznij badanie" onPress={() => router.push('/prepare')} />
        </FadeIn>
      }
    >
      <View style={styles.body}>
        <FadeIn style={styles.center}>
          <Text style={type.overline}>{formatLong(new Date())}</Text>
        </FadeIn>
        <FadeIn delay={100} style={styles.center}>
          <CycleDial size={264} entries={log} />
          <Text style={[type.caption, { marginTop: 6 }]}>Następne samobadanie: {formatDate(due)}</Text>
        </FadeIn>

        <FadeIn delay={200} style={styles.list}>
          {latest && (
            <Pressable onPress={() => router.push('/log')} style={styles.row}>
              <Icon name={latest.source === 'exam' ? 'check' : 'note'} size={20} color={colors.w80} />
              <View style={{ flex: 1 }}>
                <Text style={type.title}>{latest.source === 'exam' ? 'Ostatnie badanie' : 'Ostatni wpis'}</Text>
                <Text style={type.caption} numberOfLines={1}>
                  {formatDate(latest.date)} · {latest.findings.length ? latest.findings.map(findingLabel).join(', ') : latest.note}
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.w64} />
            </Pressable>
          )}
          <View style={styles.row}>
            <Icon name="shield" size={20} color={colors.w80} />
            <View style={{ flex: 1 }}>
              <Text style={type.title}>Prywatnie</Text>
              <Text style={type.caption}>Inferencja modeli na tym telefonie. Obraz nie jest nigdzie wysyłany.</Text>
            </View>
          </View>
        </FadeIn>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: 14, justifyContent: 'space-between' },
  center: { alignItems: 'center' },
  list: { paddingHorizontal: GUTTER - 9 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 9,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.w40,
  },
});
