import type { HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { ExamStep } from '../exam/steps';
import { CELLS, DetectionEvent, DetectorOptions, KeyName, Keypoints, PoseDetector, Pt } from './detector';
import { add, cellAt, checkPose, coverage, dist, lerp, mul, sub, targetsFor } from './geometry';

/*
 * On-device pose recognition for the web build.
 * WASM runtime (public/mediapipe) and model (public/models) ship with the app: nothing is fetched
 * from third parties and no frame ever leaves the browser tab.
 */

type Vision = typeof import('@mediapipe/tasks-vision');
let vision: Promise<{ mod: Vision; files: Awaited<ReturnType<Vision['FilesetResolver']['forVisionTasks']>> }> | null = null;
let model: Promise<PoseLandmarker> | null = null;
let handModel: Promise<HandLandmarker | null> | null = null;

function loadVision() {
  if (!vision) {
    vision = (async () => {
      // Loaded by the browser itself from /public: Metro cannot transform this bundle (it contains a
      // dynamic import), and serving it ourselves keeps the whole pipeline first-party and offline.
      const nativeImport = new Function('u', 'return import(u)') as (u: string) => Promise<Vision>;
      const mod = await nativeImport('/mediapipe/vision_bundle.mjs');
      return { mod, files: await mod.FilesetResolver.forVisionTasks('/mediapipe') };
    })();
    vision.catch(() => { vision = null; });
  }
  return vision;
}

/** Fingertip model: optional, the exam falls back to estimating finger pads from the pose. */
function loadHandModel(): Promise<HandLandmarker | null> {
  if (!handModel) {
    handModel = (async () => {
      const { mod, files } = await loadVision();
      const make = (delegate: 'GPU' | 'CPU') =>
        mod.HandLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: '/models/hand_landmarker.task', delegate },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minTrackingConfidence: 0.4,
        });
      try {
        return await make('GPU');
      } catch {
        return await make('CPU');
      }
    })().catch(() => null);
  }
  return handModel;
}

export function loadPoseModel(): Promise<PoseLandmarker> {
  if (!model) {
    model = (async () => {
      const { mod, files } = await loadVision();
      const { PoseLandmarker } = mod;
      const make = (delegate: 'GPU' | 'CPU') =>
        PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      try {
        return await make('GPU');
      } catch {
        return await make('CPU');
      }
    })();
    model.catch(() => { model = null; });
  }
  return model;
}

export const hasPoseModel = true;

export async function createModelDetector(video: HTMLVideoElement): Promise<PoseDetector> {
  const [pose, hands] = await Promise.all([loadPoseModel(), loadHandModel()]);
  return new ModelDetector(pose, hands, video);
}

// MediaPipe BlazePose indices
const I = { nose: 0, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lpinky: 17, rpinky: 18, lindex: 19, rindex: 20, lh: 23, rh: 24 };
const SMOOTH = 0.5;
// hand landmarks: DIP joints and tips of index, middle and ring fingers = the pads used to palpate
const PADS = [7, 8, 11, 12, 15, 16];
const mean = (pts: Pt[]): Pt => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

class ModelDetector implements PoseDetector {
  readonly kind = 'model' as const;
  private raf = 0;
  private running = false;
  private paused = false;
  private last = 0;
  private lastDetect = 0;
  private hold = 0;
  private cells: boolean[] = [];
  private kp: Keypoints | null = null;

  constructor(private lm: PoseLandmarker, private hands: HandLandmarker | null, private video: HTMLVideoElement) {}

  start(step: ExamStep, _opts: DetectorOptions, emit: (e: DetectionEvent) => void) {
    this.stop();
    this.hold = 0;
    this.cells = new Array(CELLS).fill(false);
    this.running = true;
    this.last = performance.now();
    const loop = () => {
      if (!this.running) return;
      this.frame(step, emit);
      if (this.running) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private frame(step: ExamStep, emit: (e: DetectionEvent) => void) {
    const v = this.video;
    const now = performance.now();
    const dt = Math.min(100, now - this.last);
    this.last = now;
    if (this.paused || v.readyState < 2 || !v.videoWidth || now - this.lastDetect < 28) return;
    this.lastDetect = now;

    const W = v.videoWidth;
    const H = v.videoHeight;
    const frame = { w: W, h: H };
    const palpation = step.check === 'palpation';
    const lms = this.lm.detectForVideo(v, now).landmarks?.[0];
    if (!lms) {
      this.kp = null;
      this.hold = 0;
      emit({ state: 'searching', progress: palpation ? coverage(this.cells) : 0, space: 'video', frame, cells: palpation ? [...this.cells] : undefined, coach: 'Nie widzę sylwetki. Stań przodem do telefonu' });
      return;
    }

    // mirror x so the overlay matches the selfie preview
    const P = (i: number): Pt => [(1 - lms[i].x) * W, lms[i].y * H];
    const vis = (i: number) => (lms[i].visibility ?? 1) > 0.5 && lms[i].x > -0.02 && lms[i].x < 1.02 && lms[i].y > -0.02 && lms[i].y < 1.02;
    // pose-only estimate of the finger pads: past the knuckles, along wrist → knuckles
    const padsFromPose = (w: number, a: number, b: number): Pt => {
      const k = mean([P(a), P(b)]);
      return add(k, mul(sub(k, P(w)), 0.6));
    };
    // fingertip model on the steps where touch matters; each hand goes to the nearest pose wrist
    const touchStep = step.check === 'palpation' || step.check === 'armpit';
    const found: { l?: Pt[]; r?: Pt[] } = {};
    if (touchStep && this.hands) {
      const sets = (this.hands.detectForVideo(v, now).landmarks ?? []).map((h) => h.map((l): Pt => [(1 - l.x) * W, l.y * H]));
      for (const h of sets) {
        const side = dist(h[0], P(I.lw)) <= dist(h[0], P(I.rw)) ? 'l' : 'r';
        if (!found[side]) found[side] = h;
        else found[side === 'l' ? 'r' : 'l'] ??= h;
      }
    }
    const raw: Keypoints = {
      nose: P(I.nose), ls: P(I.ls), rs: P(I.rs), le: P(I.le), re: P(I.re), lw: P(I.lw), rw: P(I.rw),
      lp: found.l ? mean(PADS.map((i) => found.l![i])) : padsFromPose(I.lw, I.lindex, I.lpinky),
      rp: found.r ? mean(PADS.map((i) => found.r![i])) : padsFromPose(I.rw, I.rindex, I.rpinky),
      lh: P(I.lh), rh: P(I.rh),
    };
    const seenMap: Record<KeyName, boolean> = {
      nose: vis(I.nose), ls: vis(I.ls), rs: vis(I.rs), le: vis(I.le), re: vis(I.re), lw: vis(I.lw), rw: vis(I.rw),
      lp: !!found.l || vis(I.lw), rp: !!found.r || vis(I.rw), lh: vis(I.lh), rh: vis(I.rh),
    };
    const prev = this.kp;
    const kp = prev
      ? (Object.fromEntries(Object.entries(raw).map(([k, p]) => [k, lerp(prev[k as KeyName], p, SMOOTH)])) as Keypoints)
      : raw;
    this.kp = kp;
    const seen = (k: KeyName) => seenMap[k];

    // Distance gate: landmarks get unreliable when the chest leaves the frame (too close) or the
    // body is tiny (too far). One shoulder in view almost always means "too close".
    // judged against the part of the frame a portrait phone screen actually shows (cover crop)
    const span = dist(kp.ls, kp.rs);
    const visibleW = Math.min(W, H * 0.46);
    const chestY = (kp.ls[1] + kp.rs[1]) / 2 + span * 0.75;
    const distance: 'near' | 'far' | undefined =
      seen('ls') !== seen('rs') || span > visibleW * 0.8 || chestY > H ? 'near'
      : seen('ls') && seen('rs') && span < W * 0.14 ? 'far'
      : undefined;
    if (!seen('ls') || !seen('rs') || distance) {
      this.hold = Math.max(0, this.hold - dt * 2);
      const coach = distance === 'far' ? 'Podejdź trochę bliżej telefonu' : distance === 'near' ? 'Odsuń się od telefonu, tak by widzieć całą klatkę piersiową' : 'Stań przodem, tak by widzieć oba ramiona';
      const progress = palpation ? coverage(this.cells) : Math.min(1, this.hold / Math.max(1, step.holdMs));
      emit({ state: 'searching', progress, keypoints: kp, seen: seenMap, space: 'video', frame, coach, distance: distance ?? 'near', cells: palpation ? [...this.cells] : undefined });
      return;
    }

    const res = checkPose(step, kp, seen);
    const targets = targetsFor(step, kp, seen);
    let progress: number;
    if (palpation) {
      if (res.ok && res.hand) {
        const c = cellAt(res.hand, targets[0]);
        if (c >= 0) this.cells[c] = true;
      }
      progress = coverage(this.cells);
    } else {
      this.hold = res.ok ? this.hold + dt : Math.max(0, this.hold - dt * 2);
      progress = Math.min(1, this.hold / step.holdMs);
    }
    const state = progress >= 1 ? 'complete' : res.ok ? 'detected' : 'searching';
    const handPts = res.hand ? (res.hand === kp.lp ? found.l : found.r) : undefined;
    emit({
      state, progress, keypoints: kp, seen: seenMap, targets, hand: res.ok ? res.hand : undefined, handPts,
      cells: palpation ? [...this.cells] : undefined, space: 'video', frame, coach: res.coach,
    });
    if (state === 'complete') this.stop();
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  dispose() { this.stop(); }
}
