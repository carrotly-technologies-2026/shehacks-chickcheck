import type { ExamStep, Method, PoseName } from '../exam/steps';
import { CELLS, COVER_GOAL, KeyName, Keypoints, Pt, RINGS, SECTORS, Target } from './detector';

// ---------------------------------------------------------------- vectors
export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
export const len = (a: Pt) => Math.hypot(a[0], a[1]);
export const dist = (a: Pt, b: Pt) => len(sub(a, b));
export const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const norm = (a: Pt): Pt => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type Seen = (k: KeyName) => boolean;
const always: Seen = () => true;

// ---------------------------------------------------------------- body frame
/** Shoulder-anchored frame: works with a laptop webcam that only sees the upper torso. */
export function bodyFrame(kp: Keypoints, seen: Seen = always) {
  const mid = lerp(kp.ls, kp.rs, 0.5);
  const W = Math.max(1e-3, dist(kp.ls, kp.rs));
  const hips = seen('lh') && seen('rh');
  const down: Pt = hips ? norm(sub(lerp(kp.lh, kp.rh, 0.5), mid)) : [0, 1];
  return { mid, W, down, hips };
}

/** Position along the body axis below the shoulder line, in shoulder widths. */
const depth = (p: Pt, f: ReturnType<typeof bodyFrame>) => dot(sub(p, f.mid), f.down) / f.W;

// Anatomical ratios relative to shoulder width (measured on reference photos, rounded).
export function breastTarget(kp: Keypoints, side: 'left' | 'right', seen?: Seen): Target {
  const f = bodyFrame(kp, seen);
  const S = side === 'right' ? kp.rs : kp.ls;
  const c = add(add(S, mul(f.down, 0.62 * f.W)), mul(sub(f.mid, S), 0.42));
  return { c, r: 0.29 * f.W, kind: 'breast', side };
}

export function armpitTarget(kp: Keypoints, side: 'left' | 'right', seen?: Seen): Target {
  const f = bodyFrame(kp, seen);
  const S = side === 'right' ? kp.rs : kp.ls;
  const c = add(add(S, mul(f.down, 0.3 * f.W)), mul(sub(S, f.mid), 0.06));
  return { c, r: 0.2 * f.W, kind: 'armpit', side };
}

export function hipTarget(kp: Keypoints, side: 'left' | 'right', seen?: Seen): Target {
  const f = bodyFrame(kp, seen);
  const S = side === 'right' ? kp.rs : kp.ls;
  const H = side === 'right' ? kp.rh : kp.lh;
  const out = mul(sub(S, f.mid), 0.2);
  const c = f.hips ? add(sub(H, mul(f.down, 0.25 * f.W)), out) : add(add(S, mul(f.down, 1.6 * f.W)), out);
  return { c, r: 0.24 * f.W, kind: 'hip', side };
}

export function targetsFor(step: ExamStep, kp: Keypoints, seen?: Seen): Target[] {
  switch (step.check) {
    case 'palpation': return [breastTarget(kp, step.side!, seen)];
    case 'armpit': return [armpitTarget(kp, step.side!, seen)];
    case 'hips': return [hipTarget(kp, 'left', seen), hipTarget(kp, 'right', seen)];
    default: return [];
  }
}

// ---------------------------------------------------------------- pose checks
export type CheckResult = { ok: boolean; coach?: string; hand?: Pt };

export function checkPose(step: ExamStep, kp: Keypoints, seen: Seen = always): CheckResult {
  const f = bodyFrame(kp, seen);
  switch (step.check) {
    case 'front': {
      // a webcam often crops the wrists: then the elbows pointing down are enough
      const down = (w: KeyName, e: KeyName) =>
        seen(w) ? depth(kp[w], f) > 0.95 : !seen(e) || depth(kp[e], f) > 0.45;
      const ok = down('lw', 'le') && down('rw', 're');
      return { ok, coach: ok ? undefined : 'Opuść ręce swobodnie wzdłuż ciała' };
    }
    case 'raised': {
      const up = (w: KeyName) => seen(w) && depth(kp[w], f) < -0.2;
      const ok = up('lw') && up('rw');
      return { ok, coach: ok ? undefined : 'Unieś obie ręce wyżej, nad głowę' };
    }
    case 'hips': {
      const near = (p: KeyName, t: Target) => seen(p) && dist(kp[p], t.c) < t.r * 2.4;
      const ok = near('lp', hipTarget(kp, 'left', seen)) && near('rp', hipTarget(kp, 'right', seen));
      return { ok, coach: ok ? undefined : 'Oprzyj obie dłonie na biodrach' };
    }
    case 'palpation':
    case 'armpit': {
      const t = step.check === 'palpation' ? breastTarget(kp, step.side!, seen) : armpitTarget(kp, step.side!, seen);
      // the opposite hand examines; accept whichever visible palm is closer
      const order: KeyName[] = step.side === 'right' ? ['lp', 'rp'] : ['rp', 'lp'];
      const hand = order.filter(seen).map((k) => kp[k]).sort((a, b) => dist(a, t.c) - dist(b, t.c))[0];
      const reach = step.check === 'palpation' ? 1.35 : 2.2;
      const ok = !!hand && dist(hand, t.c) < t.r * reach;
      const coach = step.check === 'palpation' ? 'Połóż dłoń na piersi, w zaznaczonym kole' : 'Sięgnij dłonią do zaznaczonej pachy';
      return { ok, hand, coach: ok ? undefined : coach };
    }
  }
}

// ---------------------------------------------------------------- coverage
/** Polar cell under the palm: ring 0 at the nipple, sector 0 at 12 o'clock, clockwise. -1 = outside. */
export function cellAt(p: Pt, t: Target): number {
  const d = sub(p, t.c);
  const rr = len(d) / t.r;
  if (rr > 1.12) return -1;
  const ring = Math.min(RINGS - 1, Math.floor(rr * RINGS));
  let a = Math.atan2(d[0], -d[1]);
  if (a < 0) a += Math.PI * 2;
  return ring * SECTORS + (Math.floor(a / ((Math.PI * 2) / SECTORS)) % SECTORS);
}

export const coverage = (cells: boolean[]) => Math.min(1, cells.filter(Boolean).length / (CELLS * COVER_GOAL));
export const coveredShare = (cells: boolean[]) => cells.filter(Boolean).length / CELLS;

// ---------------------------------------------------------------- guide paths (unit circle)
function resample(pts: Pt[], n: number): Pt[] {
  const seg = pts.slice(1).map((p, i) => dist(pts[i], p));
  const total = seg.reduce((a, b) => a + b, 0);
  const out: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    let d = (k / n) * total;
    let i = 0;
    while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    out.push(lerp(pts[i], pts[i + 1], seg[i] ? Math.min(1, d / seg[i]) : 0));
  }
  return out;
}

const cache = new Map<Method, Pt[]>();

/** Examination path inside a unit circle, 12 o'clock up. Same paths drive the guide and the demo hand. */
export function guidePath(method: Method): Pt[] {
  const hit = cache.get(method);
  if (hit) return hit;
  let pts: Pt[] = [];
  if (method === 'spiral') {
    for (let i = 0; i <= 240; i++) {
      const t = i / 240;
      const r = 0.96 - t * 0.9;
      const a = t * 3.25 * Math.PI * 2;
      pts.push([r * Math.sin(a), -r * Math.cos(a)]);
    }
  } else if (method === 'radial') {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      pts.push([0.96 * Math.sin(a), -0.96 * Math.cos(a)], [0, 0]);
    }
    pts.push([0, -0.96]);
  } else {
    const cols = 7;
    for (let k = 0; k < cols; k++) {
      const x = -0.86 + (k / (cols - 1)) * 1.72;
      const h = Math.sqrt(Math.max(0, 0.94 - x * x));
      const [a, b]: Pt[] = [[x, -h], [x, h]];
      pts.push(...(k % 2 ? [b, a] : [a, b]));
    }
  }
  pts = resample(pts, 220);
  cache.set(method, pts);
  return pts;
}

// ---------------------------------------------------------------- illustrated body (figure space 200x260)
export const FIG_W = 200;
export const FIG_H = 260;
const SH_L: Pt = [68, 88];
const SH_R: Pt = [132, 88];
const HIP_L: Pt = [78, 212];
const HIP_R: Pt = [122, 212];
const NOSE: Pt = [100, 40];
const UPPER = 54;
const FORE = 48;
const PALM = 9;

export type Hands = { l: Pt; r: Pt };

/** Two-bone IK: elbow always bends away from the body midline. Returns elbow, wrist and reachable palm. */
export function solveArm(S: Pt, P: Pt) {
  const a = UPPER;
  const b = FORE + PALM;
  const dir = norm(sub(P, S));
  const d = clamp(dist(S, P), Math.abs(a - b) + 0.5, a + b - 0.5);
  const palm = add(S, mul(dir, d));
  const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const rot = (v: Pt, ang: number): Pt => [v[0] * Math.cos(ang) - v[1] * Math.sin(ang), v[0] * Math.sin(ang) + v[1] * Math.cos(ang)];
  const e1 = add(S, mul(rot(dir, A), a));
  const e2 = add(S, mul(rot(dir, -A), a));
  const e = Math.abs(e1[0] - 100) >= Math.abs(e2[0] - 100) ? e1 : e2;
  const w = add(e, mul(norm(sub(palm, e)), FORE));
  return { e, w, palm };
}

export function figureKeypoints(h: Hands): Keypoints {
  const L = solveArm(SH_L, h.l);
  const R = solveArm(SH_R, h.r);
  return { nose: NOSE, ls: SH_L, rs: SH_R, le: L.e, re: R.e, lw: L.w, rw: R.w, lp: L.palm, rp: R.palm, lh: HIP_L, rh: HIP_R };
}

const BASE = figureKeypoints({ l: [56, 196], r: [144, 196] });
const BEHIND_HEAD_L: Pt = [88, 22];
const BEHIND_HEAD_R: Pt = [112, 22];

/** Palm positions for each pose of the illustration. */
export function poseHands(p: PoseName): Hands {
  switch (p) {
    case 'down': return { l: [56, 196], r: [144, 196] };
    case 'up': return { l: [86, 8], r: [114, 8] };
    case 'hips': return { l: hipTarget(BASE, 'left').c, r: hipTarget(BASE, 'right').c };
    case 'palpateRight': return { l: breastTarget(BASE, 'right').c, r: BEHIND_HEAD_R };
    case 'palpateLeft': return { l: BEHIND_HEAD_L, r: breastTarget(BASE, 'left').c };
    case 'armpitRight': return { l: armpitTarget(BASE, 'right').c, r: BEHIND_HEAD_R };
  }
}

export const lerpHands = (a: Hands, b: Hands, t: number): Hands => ({ l: lerp(a.l, b.l, t), r: lerp(a.r, b.r, t) });
export const BREAST_L = breastTarget(BASE, 'left');
export const BREAST_R = breastTarget(BASE, 'right');
