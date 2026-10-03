import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BreastDial } from '../components/BreastDial';
import { Icon } from '../components/Icon';
import { PillButton } from '../components/PillButton';
import { Screen } from '../components/Screen';
import { SymptomIcon } from '../components/SymptomIcon';
import { coveredShare } from '../detection/geometry';
import { examResults } from '../exam/results';
import { FINDINGS, Finding, Mark, addEntry, describeMark } from '../storage/log';
import { GUTTER, colors, fonts, type } from '../theme';

const PAIN = ['Brak', 'Lekki', 'Średni', 'Silny'];

export default function LogNew() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [pain, setPain] = useState(0);
  const [note, setNote] = useState('');

  const toggle = (f: Finding) => setFindings((v) => (v.includes(f) ? v.filter((x) => x !== f) : [...v, f]));
  const pick = (side: 'left' | 'right') => (hour: number, ring: number) =>
    setMarks((v) => {
      const same = v.findIndex((m) => m.side === side && m.hour === hour && m.ring === ring);
      return same >= 0 ? v.filter((_, i) => i !== same) : [...v, { side, hour, ring }];
    });

  const save = async () => {
    const r = from === 'exam' ? examResults.get() : null;
    await addEntry({
      source: from === 'exam' ? 'exam' : 'manual',
      findings, marks, pain, note: note.trim(),
      coverage: r ? { left: coveredShare(r.cells.left), right: coveredShare(r.cells.right) } : undefined,
    });
    router.replace('/log');
  };

  return (
    <Screen
      title="Nowy wpis"
      left={<Pressable onPress={() => router.back()} hitSlop={12}><Icon name="chevron-left" size={22} /></Pressable>}
      footer={<PillButton label="Zapisz" icon="check" onPress={save} />}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={type.overline}>Gdzie</Text>
          <View style={styles.map}>
            {(['left', 'right'] as const).map((side) => (
              <View key={side} style={styles.mapSide}>
                <BreastDial size={138} marks={marks.filter((m) => m.side === side)} onPick={pick(side)} />
                <Text style={type.caption}>{side === 'right' ? 'Prawa' : 'Lewa'}</Text>
              </View>
            ))}
          </View>
          <Text style={[type.caption, styles.center]}>Widok jak w lustrze. Dotknij miejsca, aby je zaznaczyć.</Text>
          {marks.map((m, i) => (
            <View key={i} style={styles.markRow}>
              <View style={styles.markDot} />
              <Text style={[type.caption, { color: colors.white, flex: 1 }]}>{describeMark(m)}</Text>
              <Pressable hitSlop={10} onPress={() => setMarks((v) => v.filter((_, j) => j !== i))}><Icon name="close" size={16} color={colors.w64} /></Pressable>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={type.overline}>Co zauważyłaś</Text>
          <View style={styles.symptoms}>
            {FINDINGS.map((f) => {
              const on = findings.includes(f.id);
              return (
                <Pressable key={f.id} onPress={() => toggle(f.id)} style={styles.symptom} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                  <View style={[styles.symptomIcon, on && styles.symptomOn]}>
                    <SymptomIcon id={f.id} size={40} color={on ? colors.ink : colors.white} accent={colors.roseDeep} />
                  </View>
                  <Text style={[styles.symptomLabel, on && { color: colors.white, fontFamily: fonts.medium }]} numberOfLines={2}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={type.overline}>Ból</Text>
          <View style={styles.pain}>
            {PAIN.map((p, i) => <PillButton key={p} size="s" label={p} icon={null} selected={pain === i} onPress={() => setPain(i)} />)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={type.overline}>Notatka</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Np. tkliwość przed miesiączką, od kiedy, czy się zmienia…"
            placeholderTextColor={colors.w40}
            style={styles.input}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 28, gap: 30 },
  section: { gap: 14 },
  map: { flexDirection: 'row', justifyContent: 'space-around' },
  mapSide: { alignItems: 'center', gap: 4 },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  markDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.rose, borderWidth: 1, borderColor: colors.white },
  symptoms: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  symptom: { width: '33.33%', alignItems: 'center', gap: 6 },
  symptomIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.w24 },
  symptomOn: { backgroundColor: colors.white, borderColor: colors.white },
  symptomLabel: { ...type.caption, color: colors.w80, textAlign: 'center', paddingHorizontal: 4 },
  pain: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  input: {
    ...type.body, minHeight: 64, textAlignVertical: 'top', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.w64, outlineStyle: 'none',
  } as object,
  center: { textAlign: 'center' },
});
