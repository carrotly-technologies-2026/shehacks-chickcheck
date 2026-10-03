import { useId, useMemo } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Mask, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Keypoints, Pt } from '../detection/detector';
import { BREAST_L, BREAST_R, FIG_H, FIG_W, figureKeypoints, poseHands } from '../detection/geometry';
import type { PoseName } from '../exam/steps';
import { colors } from '../theme';

type Props = {
  pose?: PoseName;
  /** explicit body pose in figure space; wins over `pose` (used by the animated demo) */
  kp?: Keypoints;
  size: number;
  /** fill = illustration, ghost = translucent silhouette used as the camera framing guide */
  variant?: 'fill' | 'ghost';
  /** fade the torso out towards the hips */
  fade?: boolean;
  /** blush disc behind the body, as in the moodboard line art */
  halo?: boolean;
};

// ------------------------------------------------------------------ path helpers
const f = (p: Pt) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;

/** Catmull-Rom spline through the points, as cubic Béziers. */
function spline(pts: Pt[], closed = false): string {
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += ` C${f([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${f([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${f(p2)}`;
  }
  return closed ? `${d} Z` : d;
}

function chaikin(pts: Pt[]): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function resample(pts: Pt[], n: number): Pt[] {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    let d = (k / (n - 1)) * total;
    let i = 0;
    while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    const t = seg[i] ? Math.min(1, d / seg[i]) : 0;
    out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
  }
  return out;
}

// ------------------------------------------------------------------ arm
type Arm = { fill: string; outer: string; inner: string; wrist: Pt; angle: number };

/** Organic arm outline around the shoulder → elbow → wrist chain: deltoid, slim elbow, forearm swell, narrow wrist. */
function arm(S: Pt, E: Pt, W: Pt): Arm {
  const N = 26;
  const c = resample(chaikin(chaikin([S, E, W])), N);
  const lu = Math.hypot(E[0] - S[0], E[1] - S[1]);
  const lf = Math.hypot(W[0] - E[0], W[1] - E[1]);
  const ue = lu / (lu + lf);
  const width = (u: number) => {
    if (u <= ue) { const t = u / ue; return 12.4 + 7.8 * Math.pow(1 - t, 1.7); }
    const t = (u - ue) / (1 - ue);
    return 12.4 + 1.8 * Math.sin(Math.min(1, t * 1.6) * Math.PI) - 5 * t;
  };
  const A: Pt[] = [];
  const B: Pt[] = [];
  c.forEach((p, i) => {
    const q = c[Math.min(N - 1, i + 1)];
    const o = c[Math.max(0, i - 1)];
    const dx = q[0] - o[0];
    const dy = q[1] - o[1];
    const l = Math.hypot(dx, dy) || 1;
    const w = width(i / (N - 1)) / 2;
    A.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
    B.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
  });
  // round caps
  const cap = (centre: Pt, from: Pt, to: Pt): Pt[] => {
    const a0 = Math.atan2(from[1] - centre[1], from[0] - centre[0]);
    let a1 = Math.atan2(to[1] - centre[1], to[0] - centre[0]);
    if (a1 > a0) a1 -= Math.PI * 2;
    const r = Math.hypot(from[0] - centre[0], from[1] - centre[1]);
    return [1, 2, 3].map((k) => { const a = a0 + ((a1 - a0) * k) / 4; return [centre[0] + Math.cos(a) * r, centre[1] + Math.sin(a) * r] as Pt; });
  };
  const outline = [...A, ...cap(c[N - 1], A[N - 1], B[N - 1]), ...B.slice().reverse(), ...cap(c[0], B[0], A[0])];
  // the side farther from the body midline is the outer contour
  const mid = Math.floor(N * 0.55);
  const outerIsA = Math.abs(A[mid][0] - 100) > Math.abs(B[mid][0] - 100);
  const [outer, inner] = outerIsA ? [A, B] : [B, A];
  const dir = [W[0] - c[N - 3][0], W[1] - c[N - 3][1]];
  return {
    fill: spline(outline, true),
    outer: spline(outer.slice(2)),
    inner: spline(inner.slice(Math.round(N * 0.32))),
    wrist: c[N - 1],
    angle: (Math.atan2(dir[1], dir[0]) * 180) / Math.PI,
  };
}

// Hand in local space: wrist at origin, fingers along +x, thumb towards -y.
const HAND = 'M0,-3.9 C3,-4.7 7,-5.3 10.6,-5.3 C14.2,-5.3 18.2,-4.4 20.7,-2.7 C22.5,-1.4 22.5,0.7 20.9,1.7 C18.1,3.3 14.1,4.3 10.1,4.7 C6.6,5.1 3,4.8 0,3.9 Z';
const THUMB = 'M2.4,-3.6 C5,-6.9 8.6,-8.7 11.1,-8.3 C12.7,-8 12.5,-6.7 10.9,-5.7 C8.7,-4.3 6.3,-3.4 4.6,-2.4 Z';
const FINGERS = 'M11.4,-2.3 L19.8,-1.7 M11.4,0.3 L20,0.3 M10.9,2.7 L18.4,2.2';

// ------------------------------------------------------------------ body
const HEAD = 'M100,17 C110,17 116.5,24.5 116.5,35 C116.5,43 114.5,49.5 110.5,54 C107.5,57.5 104,59.5 100,59.5 C96,59.5 92.5,57.5 89.5,54 C85.5,49.5 83.5,43 83.5,35 C83.5,24.5 90,17 100,17 Z';
const HAIR_BACK = 'M81.5,40 C78.5,21 88.5,10.5 100,10.5 C111.5,10.5 121.5,21 118.5,40 C117.8,46 116,50 113.5,52.5 L86.5,52.5 C84,50 82.2,46 81.5,40 Z';
const BUN = 'M91.5,10.5 C91.5,2.5 108.5,2.5 108.5,10.5 C108.5,15.5 104.5,17.5 100,17.5 C95.5,17.5 91.5,15.5 91.5,10.5 Z';
const FRINGE = 'M83.4,37 C82.6,22.5 90,15.3 100,15.3 C110,15.3 117.3,22 116.6,35.5 C114.6,29.6 110,26.2 104,25.4 C96.8,24.4 88.8,28.4 83.4,37 Z';
const NECK = 'M93.6,51 C94.1,57.5 93.6,63.5 91,69.5 L109,69.5 C106.4,63.5 105.9,57.5 106.4,51 Z';
const TORSO =
  'M91,69 C86,74 75,76.5 66,79 C59,81 55.5,87 56.5,95 C57.5,101 59.5,105 60.5,110 ' +
  'C61.5,118 59.8,127 61,136 C62.5,147 67.5,155 71,163 C73.5,170 73.5,178 71.5,188 C70,196 68.5,205 68,214 ' +
  'L132,214 C131.5,205 130,196 128.5,188 C126.5,178 126.5,170 129,163 C132.5,155 137.5,147 139,136 ' +
  'C140.2,127 138.5,118 139.5,110 C140.5,105 142.5,101 143.5,95 C144.5,87 141,81 134,79 C125,76.5 114,74 109,69 Z';
// open contours: no stroke across the neck base or along the bottom cut
const TORSO_EDGES = (() => {
  const [left, rest] = TORSO.split(' L132,214 ');
  return `${left} M132,214 ${rest.replace(/ Z$/, '')}`;
})();
const WAIST_SHADE_L = 'M61,136 C62.5,147 67.5,155 71,163 C73.5,170 73.5,178 71.5,188 L79,188 C80,176 78.5,165 74.5,155 C70.5,147 66.5,141 64,134 Z';
const WAIST_SHADE_R = 'M139,136 C137.5,147 132.5,155 129,163 C126.5,170 126.5,178 128.5,188 L121,188 C120,176 121.5,165 125.5,155 C129.5,147 133.5,141 136,134 Z';

function breast(c: Pt, s: 1 | -1) {
  const x = (dx: number) => c[0] + dx * s;
  const P = (dx: number, dy: number): Pt => [x(dx), c[1] + dy];
  return {
    fill: `M${f(P(1, -19))} C${f(P(-9, -17))} ${f(P(-18, -9))} ${f(P(-19, 1))} C${f(P(-19.5, 11))} ${f(P(-11, 18.5))} ${f(P(-1, 18.5))} C${f(P(9, 18.5))} ${f(P(16, 12))} ${f(P(17, 3))} C${f(P(17.5, -6))} ${f(P(12, -16))} ${f(P(1, -19))} Z`,
    line: `M${f(P(-18.6, 4))} C${f(P(-18, 12.5))} ${f(P(-11, 18.5))} ${f(P(-1, 18.5))} C${f(P(9, 18.5))} ${f(P(16, 12))} ${f(P(17, 3))}`,
    areola: P(1.5, 6.5),
  };
}

const INK = '#B07A65';
const SHADE = '#C9927C';

export function Figure({ pose = 'down', kp, size, variant = 'fill', fade = true, halo = false }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const body = kp ?? figureKeypoints(poseHands(pose));
  const arms = useMemo(() => {
    const L = arm(body.ls, body.le, body.lw);
    const R = arm(body.rs, body.re, body.rw);
    return [
      { ...L, flip: 1, behind: body.lw[1] < 62 },
      { ...R, flip: -1, behind: body.rw[1] < 62 },
    ];
  }, [body]);
  const h = (size * FIG_H) / FIG_W;
  const handT = (a: (typeof arms)[number]) => `translate(${f(a.wrist)}) rotate(${a.angle.toFixed(1)}) scale(1.18 ${(1.18 * a.flip).toFixed(2)})`;

  if (variant === 'ghost') {
    const shapes = [
      ...[TORSO, NECK, HEAD, HAIR_BACK, BUN].map((d) => <Path key={d.slice(0, 12)} d={d} />),
      ...arms.flatMap((a, i) => [
        <Path key={`a${i}`} d={a.fill} />,
        <Path key={`h${i}`} d={HAND} transform={handT(a)} />,
        <Path key={`t${i}`} d={THUMB} transform={handT(a)} />,
      ]),
    ];
    return (
      <Svg width={size} height={h} viewBox={`0 0 ${FIG_W} ${FIG_H}`} style={{ overflow: 'visible' }}>
        <Defs>
          <Mask id={`o${id}`} x="-20" y="-20" width="240" height="300" maskUnits="userSpaceOnUse">
            <G fill="#fff" stroke="#fff" strokeWidth={3.4} strokeLinejoin="round">{shapes}</G>
            <G fill="#000">{shapes}</G>
          </Mask>
          <Mask id={`f${id}`} x="-20" y="-20" width="240" height="300" maskUnits="userSpaceOnUse">
            <G fill="#fff">{shapes}</G>
          </Mask>
          <LinearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.7" stopColor="#fff" stopOpacity={1} />
            <Stop offset="0.86" stopColor="#fff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={-20} y={-20} width={240} height={300} fill={`url(#g${id})`} fillOpacity={0.14} mask={`url(#f${id})`} />
        <Rect x={-20} y={-20} width={240} height={300} fill={`url(#g${id})`} mask={`url(#o${id})`} />
      </Svg>
    );
  }

  const BL = breast(BREAST_L.c, 1);
  const BR = breast(BREAST_R.c, -1);
  const skin = `url(#s${id})`;

  const armLayer = (a: (typeof arms)[number], i: number) => (
    <G key={i}>
      <Path d={a.fill} fill={skin} />
      <Path d={a.fill} fill={`url(#al${id})`} />
      <Path d={a.outer} fill="none" stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
      <Path d={a.inner} fill="none" stroke={INK} strokeWidth={1.1} strokeLinecap="round" strokeOpacity={0.85} />
      <G transform={handT(a)}>
        <Path d={HAND} fill={skin} stroke={INK} strokeWidth={1} strokeLinejoin="round" />
        <Path d={FINGERS} fill="none" stroke={INK} strokeWidth={0.6} strokeOpacity={0.45} strokeLinecap="round" />
        <Path d={THUMB} fill={skin} stroke={INK} strokeWidth={1} strokeLinejoin="round" />
      </G>
    </G>
  );

  return (
    <Svg width={size} height={h} viewBox={`0 0 ${FIG_W} ${FIG_H}`} style={{ overflow: 'visible' }}>
      <Defs>
        <LinearGradient id={`s${id}`} x1="60" y1="20" x2="140" y2="220" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#F8E6DA" />
          <Stop offset="1" stopColor="#EAC6B2" />
        </LinearGradient>
        <RadialGradient id={`al${id}`} cx="100" cy="95" r="120" gradientUnits="userSpaceOnUse">
          <Stop offset="0.35" stopColor="#fff" stopOpacity={0} />
          <Stop offset="1" stopColor={SHADE} stopOpacity={0.35} />
        </RadialGradient>
        <RadialGradient id={`lt${id}`} cx="96" cy="110" r="70" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`b${id}`} cx="0.45" cy="0.3" r="0.75">
          <Stop offset="0" stopColor="#FFF4EE" stopOpacity={0.55} />
          <Stop offset="0.55" stopColor="#F2D6C6" stopOpacity={0} />
          <Stop offset="1" stopColor={SHADE} stopOpacity={0.45} />
        </RadialGradient>
        <LinearGradient id={`h${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6E4535" />
          <Stop offset="1" stopColor="#3D241A" />
        </LinearGradient>
        <LinearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.72" stopColor="#fff" stopOpacity={1} />
          <Stop offset="0.86" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
        <Mask id={`m${id}`} x="-20" y="-20" width="240" height="300" maskUnits="userSpaceOnUse">
          <Rect x={-20} y={-20} width={240} height={300} fill={fade ? `url(#g${id})` : '#fff'} />
        </Mask>
      </Defs>

      {halo && <Circle cx={118} cy={120} r={74} fill={colors.blush} fillOpacity={0.32} />}

      <G mask={`url(#m${id})`}>
        <Path d={HAIR_BACK} fill={`url(#h${id})`} />
        <Path d={BUN} fill={`url(#h${id})`} />

        {/* torso */}
        <Path d={NECK} fill={skin} />
        <Path d="M93.6,51 C94.1,57.5 93.6,63.5 91,69.5 M106.4,51 C105.9,57.5 106.4,63.5 109,69.5" fill="none" stroke={INK} strokeWidth={1.1} />
        <Path d={TORSO} fill={skin} />
        <Path d={TORSO_EDGES} fill="none" stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
        <Path d={TORSO} fill={`url(#lt${id})`} />
        <Path d={WAIST_SHADE_L} fill={SHADE} fillOpacity={0.16} />
        <Path d={WAIST_SHADE_R} fill={SHADE} fillOpacity={0.16} />
        <Path d="M93.6,53 C96.5,58.5 103.5,58.5 106.4,53 L106.4,57.5 C103,62.5 97,62.5 93.6,57.5 Z" fill={SHADE} fillOpacity={0.3} />
        <G fill="none" stroke={INK} strokeLinecap="round" strokeWidth={0.9} strokeOpacity={0.55}>
          <Path d="M77,84 C84,86.5 91,86 97,82.5" />
          <Path d="M123,84 C116,86.5 109,86 103,82.5" />
          <Path d="M100,190 C99,192.5 99,195 100.2,197" />
          <Path d="M100,118 C99.5,123 99.5,128 100,132" strokeOpacity={0.25} />
        </G>
        {[BL, BR].map((b, i) => (
          <G key={i}>
            <Path d={b.fill} fill={`url(#b${id})`} />
            <Path d={b.line} fill="none" stroke={INK} strokeWidth={1} strokeOpacity={0.75} strokeLinecap="round" />
            <Circle cx={b.areola[0]} cy={b.areola[1]} r={3.5} fill="#D7A08B" fillOpacity={0.5} />
            <Circle cx={b.areola[0]} cy={b.areola[1]} r={1.2} fill="#C4836E" fillOpacity={0.55} />
          </G>
        ))}

        {/* hands raised behind the head go under it */}
        {arms.filter((a) => a.behind).map(armLayer)}

        {/* head */}
        <Path d={HEAD} fill={skin} stroke={INK} strokeWidth={1.1} />
        <G fill="none" stroke="#6B4334" strokeLinecap="round">
          <Path d="M90.2,39.2 C91.8,40.9 94.6,40.9 96.2,39.2" strokeWidth={0.95} />
          <Path d="M103.8,39.2 C105.4,40.9 108.2,40.9 109.8,39.2" strokeWidth={0.95} />
          <Path d="M100.4,42.2 C99.6,45 99.7,46.6 101,47.2" strokeWidth={0.7} strokeOpacity={0.45} />
        </G>
        <Path d="M97.2,51.2 C99,52.3 101,52.3 102.8,51.2" fill="none" stroke={colors.roseDeep} strokeWidth={1.1} strokeLinecap="round" />
        <Circle cx={91.6} cy={46} r={3} fill={colors.rose} fillOpacity={0.22} />
        <Circle cx={108.4} cy={46} r={3} fill={colors.rose} fillOpacity={0.22} />
        <Path d={FRINGE} fill={`url(#h${id})`} />
        <G fill="none" stroke="#9A6A55" strokeLinecap="round" strokeWidth={0.7} strokeOpacity={0.6}>
          <Path d="M97,16.5 C92.5,18 88.5,22 86.3,28.5" />
          <Path d="M104,16.6 C109.5,18.2 113.5,22.5 115.2,29" />
          <Path d="M96,4.8 C99,3.6 103,4 105.6,6" />
        </G>

        {arms.filter((a) => !a.behind).map(armLayer)}
      </G>
    </Svg>
  );
}
