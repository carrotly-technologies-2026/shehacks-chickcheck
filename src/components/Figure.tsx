import { useId, useMemo } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import type { Keypoints, Pt } from '../detection/detector';
import { BREAST_L, BREAST_R, FIG_H, FIG_W, figureKeypoints, poseHands } from '../detection/geometry';
import type { PoseName } from '../exam/steps';
import { colors } from '../theme';

type Props = {
  pose?: PoseName;
  /** explicit body pose in figure space; wins over `pose` (used by the animated demo) */
  kp?: Keypoints;
  size: number;
  /** line = brush line-art illustration, ghost = translucent silhouette used as the camera framing guide */
  variant?: 'line' | 'ghost';
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
type Arm = { fill: string; wrist: Pt; angle: number; sides: [Pt[], Pt[]]; outerFirst: boolean };

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
  const mid = Math.floor(N * 0.55);
  return {
    fill: spline(outline, true),
    sides: [A, B],
    outerFirst: Math.abs(A[mid][0] - 100) > Math.abs(B[mid][0] - 100),
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


/** ghost silhouette: a slightly smaller head reads as more graceful */
const HEAD_T = 'translate(100 55) scale(0.86) translate(-100 -60)';

// ------------------------------------------------------------------ brush line art
/** Dense polyline along the Catmull-Rom spline through `pts`. */
function sampleSpline(pts: Pt[], per = 10): Pt[] {
  const n = pts.length;
  const at = (i: number) => pts[Math.max(0, Math.min(n - 1, i))];
  const out: Pt[] = [pts[0]];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let k = 1; k <= per; k++) {
      const t = k / per;
      const u = 1 - t;
      out.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  return out;
}

/**
 * A pen stroke: a filled shape whose width swells to `w` in the middle and tapers to a hairline
 * at both ends, like an ink line drawn with pressure.
 */
function brush(ctrl: Pt[], w: number, taperIn = 0.22, taperOut = 0.28): string {
  const pts = resample(sampleSpline(ctrl, 12), 72);
  const n = pts.length;
  const L: Pt[] = [];
  const R: Pt[] = [];
  pts.forEach((p, i) => {
    const t = i / (n - 1);
    const k = Math.max(0.12, Math.sin((Math.min(1, t / taperIn, (1 - t) / taperOut) * Math.PI) / 2));
    const q = pts[Math.min(n - 1, i + 2)];
    const o = pts[Math.max(0, i - 2)];
    const dx = q[0] - o[0];
    const dy = q[1] - o[1];
    const l = Math.hypot(dx, dy) || 1;
    const hw = (w * k) / 2;
    L.push([p[0] - (dy / l) * hw, p[1] + (dx / l) * hw]);
    R.push([p[0] + (dy / l) * hw, p[1] - (dx / l) * hw]);
  });
  return spline([...L, ...R.reverse()], true);
}

const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [200 - x, y]);

/** Moving-average smoothing, endpoints pinned: irons out kinks from the IK chain. */
function smooth(pts: Pt[], passes = 3): Pt[] {
  let a = pts;
  for (let k = 0; k < passes; k++) {
    a = a.map((p, i) => (i === 0 || i === a.length - 1 ? p : [(a[i - 1][0] + 2 * p[0] + a[i + 1][0]) / 4, (a[i - 1][1] + 2 * p[1] + a[i + 1][1]) / 4]));
  }
  return a;
}

// Body contours, left side (mirrored for the right). Drawn as pen strokes, never closed.
const NECK_TRAP: Pt[] = [[92.6, 34], [92.8, 47], [91.8, 57.5], [89, 65.5], [82, 72], [72, 76.2], [62.5, 80.5]];
const SIDE: Pt[] = [[61.6, 107], [60.4, 120], [60.8, 133], [63.6, 145], [68.2, 155.5], [72, 166], [72.6, 179], [71.2, 193], [69.4, 207], [68.6, 220]];
const NAVEL: Pt[] = [[100.2, 188.5], [99.4, 192.2], [100.2, 196]];
const CLEAVAGE: Pt[] = [[100, 121], [99.5, 127], [100, 133]];
const breastLine = (c: Pt, s: 1 | -1): Pt[] =>
  ([[-17.4, -7], [-18, 5], [-12, 14.6], [-2, 18], [8, 15.8], [14.4, 8.4], [16.2, 0.5]] as Pt[]).map(([dx, dy]) => [c[0] + dx * s, c[1] + dy]);

// Hand as open pen lines, local space (wrist at origin, fingers along +x, thumb towards -y)
const HAND_EDGE_TOP: Pt[] = [[0.5, -3.7], [5, -4.6], [10.6, -5], [16.5, -4.4], [21.2, -2.6], [23, -0.5]];
const HAND_EDGE_BOTTOM: Pt[] = [[23, -0.5], [21.6, 1.6], [16.5, 3.4], [10.2, 4.3], [4.5, 4.5], [0.5, 3.8]];
const THUMB_LINE: Pt[] = [[3.2, -3.9], [6.2, -6.6], [9.4, -7.9], [11.6, -7.4], [10.6, -5.9]];
const FINGER_GAPS: Pt[][] = [[[12, -2.2], [16.5, -2], [20.2, -1.6]], [[12, 0.5], [16.5, 0.6], [20.4, 0.4]], [[11.4, 2.9], [15, 2.6], [18.6, 2.2]]];

const HAND_SCALE = 1.36;

function ArmLines({ a, ink, w }: { a: Arm & { flip: number }; ink: string; w: number }) {
  const [outer, inner] = a.outerFirst ? a.sides : [a.sides[1], a.sides[0]];
  const n = outer.length;
  const side = (p: Pt): Pt => (a.flip === 1 ? p : mirror([p])[0]);
  // hanging arm: the outer contour grows out of the shoulder line;
  // raised arm: the torso side line runs on into the underside of the arm through the armpit
  const raised = a.wrist[1] < 88;
  const outerPts = raised ? outer.slice(2) : [side(NECK_TRAP[NECK_TRAP.length - 1]), ...outer.slice(3)];
  const innerPts = raised ? [side(SIDE[0]), ...inner.slice(2)] : inner.slice(Math.round(n * 0.3));
  const t = `translate(${f(a.wrist)}) rotate(${a.angle.toFixed(1)}) scale(${HAND_SCALE} ${(HAND_SCALE * a.flip).toFixed(2)})`;
  return (
    <G fill={ink}>
      <Path d={brush(smooth(outerPts), w * 1.05, 0.06, 0.2)} />
      <Path d={brush(smooth(innerPts), w * 0.9, raised ? 0.08 : 0.3, 0.2)} />
      <G transform={t}>
        <Path d={brush(HAND_EDGE_TOP, w * 0.62, 0.15, 0.1)} />
        <Path d={brush(HAND_EDGE_BOTTOM, w * 0.62, 0.1, 0.25)} />
        <Path d={brush(THUMB_LINE, w * 0.58, 0.2, 0.3)} />
        {FINGER_GAPS.map((g, i) => <Path key={i} d={brush(g, w * 0.36, 0.3, 0.35)} opacity={0.8} />)}
      </G>
    </G>
  );
}

export function Figure({ pose = 'down', kp, size, variant = 'line', fade = true, halo = false }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const body = kp ?? figureKeypoints(poseHands(pose));
  const arms = useMemo(() => [
    { ...arm(body.ls, body.le, body.lw), flip: 1 },
    { ...arm(body.rs, body.re, body.rw), flip: -1 },
  ], [body]);
  const h = (size * FIG_H) / FIG_W;
  const handT = (a: (typeof arms)[number]) => `translate(${f(a.wrist)}) rotate(${a.angle.toFixed(1)}) scale(${HAND_SCALE} ${(HAND_SCALE * a.flip).toFixed(2)})`;

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

  const ink = '#FFF8F3';
  // constant ~2 px pen on screen whatever the drawing size (thumbnails a touch finer)
  const W = Math.min(3.4, Math.max(1.05, ((size < 120 ? 1.3 : 2.2) * FIG_W) / size));
  return (
    <Svg width={size} height={h} viewBox={`0 0 ${FIG_W} ${FIG_H}`} style={{ overflow: 'visible' }}>
      <Defs>
        {/* body lines disappear behind arms and hands, like overlapping strokes in a drawing */}
        <Mask id={`occ${id}`} x="-20" y="-20" width="240" height="300" maskUnits="userSpaceOnUse">
          <Rect x={-20} y={-20} width={240} height={300} fill="#fff" />
          <G fill="#000">
            {arms.map((a, i) => (
              <G key={i}>
                <Path d={a.fill} />
                <Path d={HAND} transform={handT(a)} />
                <Path d={THUMB} transform={handT(a)} />
              </G>
            ))}
          </G>
        </Mask>
        {/* crop at the neck like a drawing on paper, and fade the hips */}
        <LinearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="260" gradientUnits="userSpaceOnUse">
          <Stop offset={0.11} stopColor="#fff" stopOpacity={0} />
          <Stop offset={0.17} stopColor="#fff" stopOpacity={1} />
          <Stop offset={fade ? 0.74 : 0.97} stopColor="#fff" stopOpacity={1} />
          <Stop offset={fade ? 0.88 : 1} stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
        <Mask id={`m${id}`} x="-20" y="-20" width="240" height="300" maskUnits="userSpaceOnUse">
          <Rect x={-20} y={-20} width={240} height={300} fill={`url(#g${id})`} />
        </Mask>
      </Defs>

      {halo && <Circle cx={128} cy={124} r={62} fill={colors.blush} fillOpacity={0.22} />}

      <G mask={`url(#m${id})`}>
        <G mask={`url(#occ${id})`} fill={ink}>
          {[NECK_TRAP, SIDE].flatMap((c, i) => [
            <Path key={`l${i}`} d={brush(c, W)} />,
            <Path key={`r${i}`} d={brush(mirror(c), W)} />,
          ])}
          <Path d={brush(breastLine(BREAST_L.c, 1), W * 1.05, 0.2, 0.3)} />
          <Path d={brush(breastLine(BREAST_R.c, -1), W * 1.05, 0.2, 0.3)} />
          <G opacity={0.75}>
            <Path d={brush(NAVEL, W * 0.6, 0.4, 0.4)} />
            <Path d={brush(CLEAVAGE, W * 0.45, 0.4, 0.4)} />
          </G>
        </G>
        {arms.map((a, i) => <ArmLines key={i} a={a} ink={ink} w={W} />)}
      </G>
    </Svg>
  );
}
