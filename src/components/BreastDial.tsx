import { useRef } from 'react';
import { GestureResponderEvent, Platform, Pressable, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline } from 'react-native-svg';
import { RINGS, SECTORS, Pt } from '../detection/detector';
import { guidePath } from '../detection/geometry';
import type { Method } from '../exam/steps';
import { wedge } from '../exam/ExamOverlay';
import type { Mark } from '../storage/log';
import { colors } from '../theme';

type Props = {
  size: number;
  /** coverage cells to fill (RINGS x SECTORS) */
  cells?: boolean[];
  /** clinical location marks */
  marks?: Mark[];
  /** draw the examination path; `u` = how much of it is already travelled */
  method?: Method;
  u?: number;
  /** interactive body map: tap a zone (clinical clock hour 1..12, ring 0..2) */
  onPick?: (hour: number, ring: number) => void;
  ticks?: boolean;
  strokeOpacity?: number;
};

const C: Pt = [50, 50];
const R = 40;
const polar = (r: number, a: number): Pt => [C[0] + r * Math.sin(a), C[1] - r * Math.cos(a)];
const pt = (p: Pt) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;

/**
 * The view is a mirror (her right breast on the right), while clinical clock positions are given
 * as seen by an examiner facing her, hence the sign flip.
 */
export const hourToAngle = (hour: number) => (-(hour % 12) / 12) * Math.PI * 2;
const angleToHour = (a: number) => {
  const h = Math.round((-a / (Math.PI * 2)) * 12) % 12;
  return h <= 0 ? h + 12 : h;
};

export function BreastDial({ size, cells, marks, method, u = 1, onPick, ticks = true, strokeOpacity = 0.9 }: Props) {
  const sector = (Math.PI * 2) / SECTORS;
  const path = method ? guidePath(method).map((p): Pt => [C[0] + p[0] * R * 0.95, C[1] + p[1] * R * 0.95]) : null;
  const upto = path ? Math.max(1, Math.round(u * (path.length - 1))) : 0;
  const host = useRef<View>(null);

  // Hit-test in dial units. On web the phone mockup may be CSS-scaled, so measure the element itself.
  const onPress = (e: GestureResponderEvent) => {
    if (!onPick) return;
    let x = e.nativeEvent.locationX / size;
    let y = e.nativeEvent.locationY / size;
    const el = host.current as unknown as HTMLElement | null;
    if (Platform.OS === 'web' && el?.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      const ne = e.nativeEvent as unknown as { clientX?: number; clientY?: number; pageX: number; pageY: number };
      x = ((ne.clientX ?? ne.pageX) - r.left) / r.width;
      y = ((ne.clientY ?? ne.pageY) - r.top) / r.height;
    }
    const dx = x * 100 - C[0];
    const dy = y * 100 - C[1];
    const d = Math.hypot(dx, dy);
    if (d > R + 6) return;
    let a = Math.atan2(dx, -dy);
    if (a < 0) a += Math.PI * 2;
    const step = (Math.PI * 2) / 12;
    onPick(angleToHour(Math.round(a / step) * step), Math.min(RINGS - 1, Math.floor((d / R) * RINGS)));
  };

  const dial = (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={R} fill="#fff" fillOpacity={0.06} />
      {cells?.map((on, i) =>
        on ? (
          <Path
            key={i}
            d={wedge(C, (Math.floor(i / SECTORS) * R) / RINGS, ((Math.floor(i / SECTORS) + 1) * R) / RINGS, (i % SECTORS) * sector + 0.03, ((i % SECTORS) + 1) * sector - 0.03)}
            fill={colors.rose}
            fillOpacity={0.6}
          />
        ) : null,
      )}
      <Circle cx={50} cy={50} r={R} fill="none" stroke="#fff" strokeOpacity={strokeOpacity} strokeWidth={1} />
      {[1, 2].map((k) => (
        <Circle key={k} cx={50} cy={50} r={(R * k) / RINGS} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={0.6} strokeDasharray="1.2 2.4" />
      ))}
      {ticks &&
        Array.from({ length: 12 }).map((_, k) => {
          const a = (k / 12) * Math.PI * 2;
          const [p, q] = [polar(R + 3, a), polar(R + (k % 3 ? 5.5 : 7.5), a)];
          return <Line key={k} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#fff" strokeOpacity={k % 3 ? 0.45 : 0.85} strokeWidth={k % 3 ? 0.7 : 1} strokeLinecap="round" />;
        })}
      {path && (
        <G>
          <Polyline points={path.map(pt).join(' ')} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.9} strokeDasharray="0.1 2.6" strokeLinecap="round" />
          <Polyline points={path.slice(0, upto + 1).map(pt).join(' ')} fill="none" stroke={colors.rose} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={path[upto][0]} cy={path[upto][1]} r={3.2} fill="#fff" />
        </G>
      )}
      <Circle cx={50} cy={50} r={3.4} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={0.8} />
      <Circle cx={50} cy={50} r={1.1} fill="#fff" />
      {marks?.map((m, i) => {
        const p = polar(((m.ring + 0.5) * R) / RINGS, hourToAngle(m.hour));
        return (
          <G key={i}>
            <Circle cx={p[0]} cy={p[1]} r={6.5} fill={colors.rose} fillOpacity={0.3} />
            <Circle cx={p[0]} cy={p[1]} r={3.4} fill={colors.rose} stroke="#fff" strokeWidth={1.1} />
          </G>
        );
      })}
    </Svg>
  );

  if (!onPick) return dial;
  return (
    <Pressable ref={host} onPress={onPress} accessibilityRole="adjustable" accessibilityLabel="Mapa piersi: dotknij, aby zaznaczyć miejsce">
      {dial}
    </Pressable>
  );
}
