import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BreastDial } from '../../components/BreastDial';
import { Icon } from '../../components/Icon';
import { PillButton } from '../../components/PillButton';
import { Screen } from '../../components/Screen';
import {
  DAYS_SHORT, LogEntry, MONTHS_NOM, findingLabel, formatDate, sameDay, setCadence, useCadence, useLog,
} from '../../storage/log';
import { GUTTER, colors, fonts, type } from '../../theme';

function Calendar({ log }: { log: LogEntry[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(y, m, i + 1))];
  const on = (d: Date) => log.filter((e) => sameDay(new Date(e.date), d));

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.calHead}>
        <Pressable hitSlop={10} onPress={() => setCursor(new Date(y, m - 1, 1))}><Icon name="chevron-left" size={20} /></Pressable>
        <Text style={type.title}>{MONTHS_NOM[m]} {y}</Text>
        <Pressable hitSlop={10} onPress={() => setCursor(new Date(y, m + 1, 1))}><Icon name="chevron-right" size={20} /></Pressable>
      </View>
      <View style={styles.grid}>
        {DAYS_SHORT.map((d) => <Text key={d} style={[styles.cell, styles.dow]}>{d}</Text>)}
        {cells.map((d, i) => {
          if (!d) return <View key={`x${i}`} style={styles.cell} />;
          const es = on(d);
          const exam = es.some((e) => e.source === 'exam');
          const flag = es.some((e) => e.findings.length > 0);
          const isToday = sameDay(d, today);
          return (
            <View key={i} style={styles.cell}>
              <View style={[styles.day, exam && styles.dayExam, isToday && styles.dayToday]}>
                <Text style={[styles.dayNum, exam && { color: colors.ink, fontFamily: fonts.semibold }, d > today && { color: colors.w40 }]}>{d.getDate()}</Text>
              </View>
              <View style={[styles.mark, es.length && !exam ? { backgroundColor: flag ? colors.amber : colors.blush } : null]} />
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        {[
          { c: colors.white, l: 'Samobadanie' },
          { c: colors.blush, l: 'Wpis' },
          { c: colors.amber, l: 'Do obserwacji' },
        ].map((x) => (
          <View key={x.l} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: x.c }]} />
            <Text style={type.caption}>{x.l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Entry({ e }: { e: LogEntry }) {
  const d = new Date(e.date);
  const meta = e.source === 'exam' && e.coverage
    ? `Pokrycie: prawa ${Math.round(e.coverage.right * 100)}% · lewa ${Math.round(e.coverage.left * 100)}%`
    : e.findings.length ? e.findings.map(findingLabel).join(' · ') : 'Bez objawów';
  return (
    <View style={styles.entry}>
      <View style={styles.date}>
        <Text style={styles.dateNum}>{d.getDate()}</Text>
        <Text style={type.caption}>{formatDate(e.date).split(' ')[1].slice(0, 3)}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.entryTitle}>
          <Text style={type.title}>{e.source === 'exam' ? 'Samobadanie' : 'Wpis'}</Text>
          {e.findings.length > 0 && <View style={[styles.legendDot, { backgroundColor: colors.amber }]} />}
        </View>
        <Text style={[type.caption, { color: colors.w80 }]}>{meta}</Text>
        {e.note ? <Text style={[type.body, { fontSize: 13, lineHeight: 19, color: colors.w80 }]}>{e.note}</Text> : null}
      </View>
      {e.marks.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {(['left', 'right'] as const).map((s) => (
            <BreastDial key={s} size={40} ticks={false} marks={e.marks.filter((m) => m.side === s)} strokeOpacity={0.8} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function Log() {
  const router = useRouter();
  const log = useLog();
  const cadence = useCadence();

  return (
    <Screen tabBar title="Dziennik">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Calendar log={log} />

        <View style={styles.remind}>
          <Icon name="bell" size={18} color={colors.w80} />
          <Text style={[type.body, { flex: 1 }]}>Przypomnienie o wpisie</Text>
          <PillButton size="s" label="Codziennie" icon={null} selected={cadence === 'daily'} onPress={() => setCadence('daily')} />
          <PillButton size="s" label="Co tydzień" icon={null} selected={cadence === 'weekly'} onPress={() => setCadence('weekly')} />
        </View>

        <PillButton label="Dodaj wpis" icon={null} leadingIcon="plus" onPress={() => router.push('/log-new')} />

        <Text style={[type.overline, { marginTop: 8 }]}>Historia</Text>
        <View>
          {log.map((e) => <Entry key={e.id} e={e} />)}
        </View>
        <Text style={[type.caption, styles.center]}>Dziennik jest zapisany tylko na tym telefonie.</Text>
      </ScrollView>
    </Screen>
  );
}

const CELL = `${100 / 7}%` as const;
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: GUTTER - 9, paddingTop: 20, paddingBottom: 28, gap: 22 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL, alignItems: 'center', paddingVertical: 2 },
  dow: { ...type.caption, textAlign: 'center', paddingBottom: 6 },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayExam: { backgroundColor: colors.white },
  dayToday: { borderWidth: 1, borderColor: colors.white },
  dayNum: { fontFamily: fonts.regular, fontSize: 13, color: colors.white },
  mark: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  remind: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.w40,
  },
  entry: {
    flexDirection: 'row', gap: 14, paddingVertical: 16, paddingHorizontal: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.w40,
  },
  date: { width: 36, alignItems: 'center' },
  dateNum: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 28, color: colors.white },
  entryTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
});
