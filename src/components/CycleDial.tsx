import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';
import { EXAM_EVERY_DAYS, LogEntry, daysBetween, dniLabel } from '../storage/log';
import { colors, type } from '../theme';

type Props = { size: number; entries: LogEntry[]; today?: Date };

/**
 * One self-exam cycle as a dial: a tick per day since the last exam, the due date at 12 o'clock,
 * notes from the journal as blush dots, today as the bright knob.
 */
export function CycleDial({ size, entries, today = new Date() }: Props) {
  const last = entries.find((e) => e.source === 'exam');
  const N = EXAM_EVERY_DAYS;
  const elapsed = last ? Math.min(N, Math.max(0, daysBetween(new Date(last.date), today))) : N;
  const left = N - elapsed;
  const c = size / 2;
  const R = c - 18;
  const at = (i: number, r: number) => {
    const a = (i / N) * Math.PI * 2;
    return [c + r * Math.sin(a), c - r * Math.cos(a)] as const;
  };
  const notes = last
    ? entries.filter((e) => e.source === 'manual').map((e) => daysBetween(new Date(last.date), new Date(e.date))).filter((d) => d > 0 && d < N)
    : [];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={R - 26} fill={colors.w08} />
        {Array.from({ length: N }).map((_, i) => {
          const past = i < elapsed;
          const [x1, y1] = at(i, R - 9);
          const [x2, y2] = at(i, R + 9);
          return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeOpacity={past ? 0.95 : 0.25} strokeWidth={past ? 2.4 : 1.6} strokeLinecap="round" />;
        })}
        {notes.map((d) => {
          const [x, y] = at(d, R + 17);
          return <Circle key={d} cx={x} cy={y} r={3} fill={colors.blush} />;
        })}
        <G>
          {(() => {
            const [x, y] = at(0, R);
            return <Circle cx={x} cy={y} r={7} fill={colors.rose} stroke="#fff" strokeWidth={2} />;
          })()}
          {elapsed > 0 && elapsed < N && (() => {
            const [x, y] = at(elapsed, R);
            return (
              <>
                <Circle cx={x} cy={y} r={14} fill="#fff" fillOpacity={0.18} />
                <Circle cx={x} cy={y} r={7.5} fill="#fff" />
              </>
            );
          })()}
        </G>
      </Svg>
      {left > 0 ? (
        <>
          <Text style={type.numeral}>{left}</Text>
          <Text style={[type.body, { marginTop: -6 }]}>{dniLabel(left)} do badania</Text>
        </>
      ) : (
        <>
          <Text style={[type.display, { fontSize: 36 }]}>Dziś</Text>
          <Text style={type.body}>czas na samobadanie</Text>
        </>
      )}
    </View>
  );
}
