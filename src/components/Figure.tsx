import { useId, useMemo } from 'react';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Mask, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
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
type Arm = { fill: string; wrist: Pt; angle: number };

/** Organic arm silhouette around the shoulder → elbow → wrist chain: deltoid, slim elbow, forearm swell, narrow wrist. */
function arm(S: Pt, E: Pt, W: Pt): Arm {
  const N = 26;
  const d0 = Math.hypot(E[0] - S[0], E[1] - S[1]) || 1;
  const root: Pt = [S[0] + ((E[0] - S[0]) / d0) * 4, S[1] + ((E[1] - S[1]) / d0) * 4];
  const c = resample(chaikin(chaikin([root, E, W])), N);
  const lu = Math.hypot(E[0] - S[0], E[1] - S[1]);
  const lf = Math.hypot(W[0] - E[0], W[1] - E[1]);
  const ue = lu / (lu + lf);
  const width = (u: number) => {
    if (u <= ue) { const t = u / ue; return 12 + 6 * Math.pow(1 - t, 1.6); }
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
  const dir = [W[0] - c[N - 3][0], W[1] - c[N - 3][1]];
  return {
    fill: spline(outline, true),
    wrist: c[N - 1],
    angle: (Math.atan2(dir[1], dir[0]) * 180) / Math.PI,
  };
}

// Hand in local space: wrist at origin, fingers along +x, thumb towards -y.
const HAND = 'M0,-3.9 C3,-4.7 7,-5.3 10.6,-5.3 C14.2,-5.3 18.2,-4.4 20.7,-2.7 C22.5,-1.4 22.5,0.7 20.9,1.7 C18.1,3.3 14.1,4.3 10.1,4.7 C6.6,5.1 3,4.8 0,3.9 Z';
const THUMB = 'M2.4,-3.6 C5,-6.9 8.6,-8.7 11.1,-8.3 C12.7,-8 12.5,-6.7 10.9,-5.7 C8.7,-4.3 6.3,-3.4 4.6,-2.4 Z';

// ------------------------------------------------------------------ body
const HEAD = 'M100,17 C110,17 116.5,24.5 116.5,35 C116.5,43 114.5,49.5 110.5,54 C107.5,57.5 104,59.5 100,59.5 C96,59.5 92.5,57.5 89.5,54 C85.5,49.5 83.5,43 83.5,35 C83.5,24.5 90,17 100,17 Z';
const HAIR_BACK = 'M81.5,40 C78.5,21 88.5,10.5 100,10.5 C111.5,10.5 121.5,21 118.5,40 C117.8,46 116,50 113.5,52.5 L86.5,52.5 C84,50 82.2,46 81.5,40 Z';
const BUN = 'M91.5,10.5 C91.5,2.5 108.5,2.5 108.5,10.5 C108.5,15.5 104.5,17.5 100,17.5 C95.5,17.5 91.5,15.5 91.5,10.5 Z';
const FRINGE = 'M83.4,37 C82.6,22.5 90,15.3 100,15.3 C110,15.3 117.3,22 116.6,35.5 C114.6,29.6 110,26.2 104,25.4 C96.8,24.4 88.8,28.4 83.4,37 Z';
const NECK = 'M94.4,44 C94.6,54 94,62.5 91,69.5 L109,69.5 C106,62.5 105.4,54 105.6,44 Z';
const TORSO =
  'M91,69 C86,74 75,76.5 66,79 C59,81 55.5,87 56.5,95 C57.5,101 59.5,105 60.5,110 ' +
  'C61.5,118 59.8,127 61,136 C62.5,147 67.5,155 71,163 C73.5,170 73.5,178 71.5,188 C70,196 68.5,205 68,214 ' +
  'L132,214 C131.5,205 130,196 128.5,188 C126.5,178 126.5,170 129,163 C132.5,155 137.5,147 139,136 ' +
  'C140.2,127 138.5,118 139.5,110 C140.5,105 142.5,101 143.5,95 C144.5,87 141,81 134,79 C125,76.5 114,74 109,69 Z';
const WAIST_SHADE_L = 'M61,136 C62.5,147 67.5,155 71,163 C73.5,170 73.5,178 71.5,188 L79,188 C80,176 78.5,165 74.5,155 C70.5,147 66.5,141 64,134 Z';
const WAIST_SHADE_R = 'M139,136 C137.5,147 132.5,155 129,163 C126.5,170 126.5,178 128.5,188 L121,188 C120,176 121.5,165 125.5,155 C129.5,147 133.5,141 136,134 Z';

function breast(c: Pt, s: 1 | -1) {
  const x = (dx: number) => c[0] + dx * s;
  const P = (dx: number, dy: number): Pt => [x(dx), c[1] + dy];
  return {
    fill: `M${f(P(1, -19))} C${f(P(-9, -17))} ${f(P(-18, -9))} ${f(P(-19, 1))} C${f(P(-19.5, 11))} ${f(P(-11, 18.5))} ${f(P(-1, 18.5))} C${f(P(9, 18.5))} ${f(P(16, 12))} ${f(P(17, 3))} C${f(P(17.5, -6))} ${f(P(12, -16))} ${f(P(1, -19))} Z`,
    // shadow crescent under the breast
    crease: `M${f(P(-18.6, 3))} C${f(P(-18, 12.5))} ${f(P(-11, 18.6))} ${f(P(-1, 18.6))} C${f(P(9, 18.6))} ${f(P(16, 12))} ${f(P(17, 2))} C${f(P(14.5, 8.5))} ${f(P(9, 14))} ${f(P(-1, 14.2))} C${f(P(-10, 14.2))} ${f(P(-16, 9.5))} ${f(P(-18.6, 3))} Z`,
  };
}

const TONE = {
  light: '#F6DDCE',
  base: '#EBC3AD',
  edge: '#DBAA92',
  face: '#EECBB6',
  arm: '#EFC9B4',
  armHi: '#F6DACB',
  shadow: '#C98F76',
  cast: '#B97C64',
};
/** a slightly smaller head reads as more graceful */
const HEAD_T = 'translate(100 55) scale(0.86) translate(-100 -60)';

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
      ...[TORSO, NECK].map((d) => <Path key={d.slice(0, 12)} d={d} />),
      ...[HEAD, HAIR_BACK, BUN].map((d) => <Path key={d.slice(0, 12)} d={d} transform={HEAD_T} />),
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

  // Flat editorial rendering: no outlines, form comes from tone only.
  const armLayer = (a: (typeof arms)[number], i: number) => (
    <G key={i}>
      {/* soft cast shadow on the body, clipped to the torso */}
      <G clipPath={`url(#c${id})`} opacity={0.32}>
        <Path d={a.fill} fill={TONE.cast} transform="translate(2.4 3.2)" />
        <Path d={HAND} fill={TONE.cast} transform={`translate(2.4 3.2) ${handT(a)}`} />
      </G>
      <Path d={a.fill} fill={`url(#s${id})`} />
      <G transform={handT(a)} fill={`url(#s${id})`}>
        <Path d={HAND} />
        <Path d={THUMB} />
      </G>
    </G>
  );

  return (
    <Svg width={size} height={h} viewBox={`0 0 ${FIG_W} ${FIG_H}`} style={{ overflow: 'visible' }}>
      <Defs>
        <RadialGradient id={`s${id}`} cx="98" cy="118" r="84" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={TONE.light} />
          <Stop offset="0.7" stopColor={TONE.base} />
          <Stop offset="1" stopColor={TONE.edge} />
        </RadialGradient>
        <LinearGradient id={`a${id}`} x1="40" y1="40" x2="160" y2="200" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={TONE.armHi} />
          <Stop offset="1" stopColor={TONE.arm} />
        </LinearGradient>
        <RadialGradient id={`hl${id}`} cx="0.42" cy="0.42" r="0.45">
          <Stop offset="0" stopColor={TONE.light} stopOpacity={0.7} />
          <Stop offset="1" stopColor={TONE.light} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`h${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5C3A2C" />
          <Stop offset="1" stopColor="#38221A" />
        </LinearGradient>
        <ClipPath id={`c${id}`}>
          <Path d={TORSO} />
        </ClipPath>
        <LinearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.72" stopColor="#fff" stopOpacity={1} />
          <Stop offset="0.86" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
        <Mask id={`m${id}`} x="-20" y="-20" width="240" height="300" maskUnits="userSpaceOnUse">
          <Rect x={-20} y={-20} width={240} height={300} fill={fade ? `url(#g${id})` : '#fff'} />
        </Mask>
      </Defs>

      {halo && <Circle cx={116} cy={118} r={76} fill={colors.blush} fillOpacity={0.3} />}

      <G mask={`url(#m${id})`}>
        <G transform={HEAD_T}>
          <Path d={HAIR_BACK} fill={`url(#h${id})`} />
          <Path d={BUN} fill={`url(#h${id})`} />
        </G>

        {/* neck + torso */}
        <Path d={NECK} fill={TONE.base} />
        <Path d="M94.4,46 C97,52 103,52 105.6,46 L105.6,52 C103,56.5 97,56.5 94.4,52 Z" fill={TONE.shadow} fillOpacity={0.4} />
        <Path d={TORSO} fill={`url(#s${id})`} />
        <Path d={WAIST_SHADE_L} fill={TONE.shadow} fillOpacity={0.16} />
        <Path d={WAIST_SHADE_R} fill={TONE.shadow} fillOpacity={0.16} />
        <G fill="none" stroke={TONE.light} strokeLinecap="round" strokeWidth={1.6} strokeOpacity={0.8}>
          <Path d="M78,84.5 C85,86.8 91,86.2 96.5,83.2" />
          <Path d="M122,84.5 C115,86.8 109,86.2 103.5,83.2" />
        </G>
        <Path d="M100,117 C99.4,123 99.4,129 100,134" fill="none" stroke={TONE.shadow} strokeWidth={1.6} strokeOpacity={0.35} strokeLinecap="round" />
        <Path d="M100,190 C99.2,192.6 99.2,195 100.1,197" fill="none" stroke={TONE.shadow} strokeWidth={1.5} strokeOpacity={0.6} strokeLinecap="round" />
        {[BL, BR].map((b, i) => (
          <G key={i}>
            <Path d={b.crease} fill={TONE.shadow} fillOpacity={0.6} />
          </G>
        ))}

        {/* hands raised behind the head go under it */}
        {arms.filter((a) => a.behind).map(armLayer)}

        <G transform={HEAD_T}>
          <Path d="M83.2,40.5 C81.4,40.3 80.9,43.8 82.6,46.2 C83.3,47.1 84.2,47 84.6,46 Z" fill={TONE.shadow} />
          <Path d={HEAD} fill={TONE.face} />
          <Path d={FRINGE} fill={`url(#h${id})`} />
          <G fill="none" stroke="#7B4F3D" strokeLinecap="round" strokeWidth={1.3} strokeOpacity={0.55}>
            <Path d="M97,16.6 C92.5,18.2 88.6,22.2 86.4,28.4" />
            <Path d="M95.5,5.6 C98.8,4.2 102.8,4.6 105.4,6.8" />
          </G>
        </G>

        {arms.filter((a) => !a.behind).map(armLayer)}
      </G>
    </Svg>
  );
}
