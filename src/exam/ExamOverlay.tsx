import { useRef } from 'react';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polyline, Rect, Stop } from 'react-native-svg';
import { DetectionEvent, KeyName, Pt, RINGS, SECTORS, Target } from '../detection/detector';
import { guidePath } from '../detection/geometry';
import { colors } from '../theme';
import type { Method } from './steps';

/** Maps detector space (video px or figure units) to screen px. */
export type Projector = { p: (pt: Pt) => Pt; s: number };

type Props = {
  ev: DetectionEvent;
  proj: Projector;
  method: Method;
  width: number;
  height: number;
  /** seconds, drives pulses */
  t: number;
  /** seconds since the body was first recognised in this step (for the scan sweep) */
  sinceDetect: number | null;
};

const BONES: [KeyName, KeyName][] = [
  ['ls', 'rs'], ['ls', 'le'], ['le', 'lw'], ['rs', 're'], ['re', 'rw'], ['ls', 'lh'], ['rs', 'rh'], ['lh', 'rh'],
];
const JOINTS: KeyName[] = ['ls', 'rs', 'le', 're', 'lw', 'rw', 'lh', 'rh'];
const HAND_BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const TIPS = [8, 12, 16];

const polar = (c: Pt, r: number, a: number): Pt => [c[0] + r * Math.sin(a), c[1] - r * Math.cos(a)];
const f = (p: Pt) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

/** Annular sector between radii r0..r1 and clock angles a0..a1 (radians from 12 o'clock, clockwise). */
export function wedge(c: Pt, r0: number, r1: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const o0 = polar(c, r1, a0);
  const o1 = polar(c, r1, a1);
  if (r0 <= 0.01) return `M${f(c)} L${f(o0)} A${r1},${r1} 0 ${large} 1 ${f(o1)} Z`;
  const i1 = polar(c, r0, a1);
  const i0 = polar(c, r0, a0);
  return `M${f(o0)} A${r1},${r1} 0 ${large} 1 ${f(o1)} L${f(i1)} A${r0},${r0} 0 ${large} 0 ${f(i0)} Z`;
}

function BreastTarget({ c, r, cells, method, t }: { c: Pt; r: number; cells?: boolean[]; method: Method; t: number }) {
  const step = (Math.PI * 2) / SECTORS;
  const phase = (t % 1.8) / 1.8;
  const sweep = (t * 1.6) % (Math.PI * 2);
  const path = guidePath(method).map((p) => f([c[0] + p[0] * r * 0.95, c[1] + p[1] * r * 0.95])).join(' ');
  return (
    <G>
      {/* halo pulse */}
      <Circle cx={c[0]} cy={c[1]} r={r * (1 + phase * 0.5)} fill="none" stroke={colors.blush} strokeWidth={1.5} strokeOpacity={(1 - phase) * 0.7} />
      <Circle cx={c[0]} cy={c[1]} r={r} fill={colors.blush} fillOpacity={0.08} />
      {/* covered cells */}
      {cells?.map((on, i) =>
        on ? (
          <Path
            key={i}
            d={wedge(c, (Math.floor(i / SECTORS) * r) / RINGS, ((Math.floor(i / SECTORS) + 1) * r) / RINGS, (i % SECTORS) * step + 0.02, ((i % SECTORS) + 1) * step - 0.02)}
            fill={colors.rose}
            fillOpacity={0.42}
          />
        ) : null,
      )}
      {/* ring grid */}
      <Circle cx={c[0]} cy={c[1]} r={r} fill="none" stroke="#fff" strokeWidth={1.6} strokeOpacity={0.95} />
      {[1, 2].map((k) => (
        <Circle key={k} cx={c[0]} cy={c[1]} r={(r * k) / RINGS} fill="none" stroke="#fff" strokeWidth={0.8} strokeOpacity={0.35} strokeDasharray="2 4" />
      ))}
      {/* clock ticks: the notation clinicians use to describe a location */}
      {Array.from({ length: 12 }).map((_, k) => {
        const a = (k / 12) * Math.PI * 2;
        const major = k % 3 === 0;
        return <Line key={k} x1={polar(c, r * 1.1, a)[0]} y1={polar(c, r * 1.1, a)[1]} x2={polar(c, r * (major ? 1.24 : 1.18), a)[0]} y2={polar(c, r * (major ? 1.24 : 1.18), a)[1]} stroke="#fff" strokeWidth={major ? 1.6 : 1} strokeOpacity={major ? 0.9 : 0.55} strokeLinecap="round" />;
      })}
      {/* rotating scan arc */}
      <Path d={`M${f(polar(c, r, sweep))} A${r},${r} 0 0 1 ${f(polar(c, r, sweep + 0.7))}`} fill="none" stroke={colors.rose} strokeWidth={3} strokeLinecap="round" />
      {/* method path */}
      <Polyline points={path} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.3} strokeDasharray="0.1 5" strokeLinecap="round" />
      <Circle cx={c[0]} cy={c[1]} r={2.6} fill="#fff" />
    </G>
  );
}

function SpotTarget({ c, r, t }: { c: Pt; r: number; t: number }) {
  const phase = (t % 1.6) / 1.6;
  return (
    <G>
      <Circle cx={c[0]} cy={c[1]} r={r * (1 + phase * 0.8)} fill="none" stroke={colors.blush} strokeWidth={1.5} strokeOpacity={(1 - phase) * 0.8} />
      <Circle cx={c[0]} cy={c[1]} r={r} fill={colors.blush} fillOpacity={0.16} stroke="#fff" strokeWidth={1.4} strokeDasharray="3 4" />
      <Circle cx={c[0]} cy={c[1]} r={3} fill="#fff" />
    </G>
  );
}

export function ExamOverlay({ ev, proj, method, width, height, t, sinceDetect }: Props) {
  const trail = useRef<Pt[]>([]);
  const kp = ev.keypoints;
  const seen = (k: KeyName) => !ev.seen || !!ev.seen[k];

  const hand = ev.hand ? proj.p(ev.hand) : null;
  if (hand) {
    const last = trail.current[trail.current.length - 1];
    if (!last || Math.hypot(last[0] - hand[0], last[1] - hand[1]) > 1.5) trail.current = [...trail.current.slice(-28), hand];
  } else if (trail.current.length) {
    trail.current = [];
  }

  // scan sweep across the body right after recognition
  let sweep: { y: number; h: number; o: number } | null = null;
  if (kp && sinceDetect !== null && sinceDetect < 1.3) {
    const y0 = proj.p(kp.nose)[1] - 30;
    const y1 = Math.max(proj.p(kp.lh)[1], proj.p(kp.rh)[1]);
    const u = sinceDetect / 1.3;
    sweep = { y: y0 + (y1 - y0) * u, h: 90, o: Math.sin(u * Math.PI) };
  }

  const targets: Target[] = ev.targets ?? [];

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Defs>
        <LinearGradient id="sweep" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity={0} />
          <Stop offset="0.85" stopColor={colors.blush} stopOpacity={0.35} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0.9} />
        </LinearGradient>
      </Defs>

      {sweep && <Rect x={0} y={sweep.y - sweep.h} width={width} height={sweep.h} fill="url(#sweep)" opacity={sweep.o} />}

      {kp && (
        <G>
          {BONES.filter(([a, b]) => seen(a) && seen(b)).map(([a, b]) => {
            const [p, q] = [proj.p(kp[a]), proj.p(kp[b])];
            return <Line key={a + b} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#fff" strokeWidth={1.4} strokeOpacity={0.65} strokeLinecap="round" />;
          })}
          {seen('nose') && (
            <Line
              x1={proj.p(kp.nose)[0]} y1={proj.p(kp.nose)[1] + 14}
              x2={(proj.p(kp.ls)[0] + proj.p(kp.rs)[0]) / 2} y2={(proj.p(kp.ls)[1] + proj.p(kp.rs)[1]) / 2}
              stroke="#fff" strokeWidth={1.4} strokeOpacity={0.4} strokeDasharray="2 4" strokeLinecap="round"
            />
          )}
          {JOINTS.filter(seen).map((k) => {
            const p = proj.p(kp[k]);
            return (
              <G key={k}>
                <Circle cx={p[0]} cy={p[1]} r={7.5} fill="none" stroke="#fff" strokeOpacity={0.3} />
                <Circle cx={p[0]} cy={p[1]} r={3.2} fill="#fff" />
              </G>
            );
          })}
        </G>
      )}

      {targets.map((tg, i) => {
        const c = proj.p(tg.c);
        const r = tg.r * proj.s;
        return tg.kind === 'breast'
          ? <BreastTarget key={i} c={c} r={r} cells={ev.cells} method={method} t={t} />
          : <SpotTarget key={i} c={c} r={r} t={t + i * 0.4} />;
      })}

      {ev.handPts && (
        <G>
          {HAND_BONES.map(([a, b]) => {
            const [p, q] = [proj.p(ev.handPts![a]), proj.p(ev.handPts![b])];
            return <Line key={`${a}-${b}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#fff" strokeOpacity={0.55} strokeWidth={1.1} strokeLinecap="round" />;
          })}
          {ev.handPts.map((pt, i) => {
            const p = proj.p(pt);
            const tip = TIPS.includes(i);
            return <Circle key={i} cx={p[0]} cy={p[1]} r={tip ? 3.6 : 1.6} fill={tip ? colors.blush : '#fff'} fillOpacity={tip ? 1 : 0.8} />;
          })}
        </G>
      )}
      {trail.current.length > 1 && (
        <Polyline points={trail.current.map(f).join(' ')} fill="none" stroke={colors.rose} strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {hand && (
        <G>
          <Circle cx={hand[0]} cy={hand[1]} r={15} fill={colors.rose} fillOpacity={0.25} />
          <Circle cx={hand[0]} cy={hand[1]} r={9} fill="none" stroke="#fff" strokeWidth={2} />
          <Circle cx={hand[0]} cy={hand[1]} r={3} fill="#fff" />
        </G>
      )}
    </Svg>
  );
}
