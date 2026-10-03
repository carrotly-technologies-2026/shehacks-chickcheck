import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import type { ExamStep } from '../exam/steps';
import { CELLS, DetectionEvent, DetectorOptions, KeyName, Keypoints, PoseDetector, Pt } from './detector';
import { cellAt, checkPose, coverage, lerp, targetsFor } from './geometry';

/*
 * On-device pose recognition for the web build.
 * WASM runtime (public/mediapipe) and model (public/models) ship with the app: nothing is fetched
 * from third parties and no frame ever leaves the browser tab.
 */

let model: Promise<PoseLandmarker> | null = null;

export function loadPoseModel(): Promise<PoseLandmarker> {
  if (!model) {
    model = (async () => {
      // Loaded by the browser itself from /public: Metro cannot transform this bundle (it contains a
      // dynamic import), and serving it ourselves keeps the whole pipeline first-party and offline.
      const nativeImport = new Function('u', 'return import(u)') as (u: string) => Promise<typeof import('@mediapipe/tasks-vision')>;
      const { FilesetResolver, PoseLandmarker } = await nativeImport('/mediapipe/vision_bundle.mjs');
      const files = await FilesetResolver.forVisionTasks('/mediapipe');
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
  return new ModelDetector(await loadPoseModel(), video);
}

// MediaPipe BlazePose indices
const I = { nose: 0, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lpinky: 17, rpinky: 18, lindex: 19, rindex: 20, lh: 23, rh: 24 };
const SMOOTH = 0.5;

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

  constructor(private lm: PoseLandmarker, private video: HTMLVideoElement) {}

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
    const palm = (w: number, a: number, b: number): Pt => {
      const [p, q, r] = [P(w), P(a), P(b)];
      return [(p[0] + q[0] + r[0]) / 3, (p[1] + q[1] + r[1]) / 3];
    };
    const raw: Keypoints = {
      nose: P(I.nose), ls: P(I.ls), rs: P(I.rs), le: P(I.le), re: P(I.re), lw: P(I.lw), rw: P(I.rw),
      lp: palm(I.lw, I.lindex, I.lpinky), rp: palm(I.rw, I.rindex, I.rpinky), lh: P(I.lh), rh: P(I.rh),
    };
    const seenMap: Record<KeyName, boolean> = {
      nose: vis(I.nose), ls: vis(I.ls), rs: vis(I.rs), le: vis(I.le), re: vis(I.re), lw: vis(I.lw), rw: vis(I.rw),
      lp: vis(I.lw), rp: vis(I.rw), lh: vis(I.lh), rh: vis(I.rh),
    };
    const prev = this.kp;
    const kp = prev
      ? (Object.fromEntries(Object.entries(raw).map(([k, p]) => [k, lerp(prev[k as KeyName], p, SMOOTH)])) as Keypoints)
      : raw;
    this.kp = kp;
    const seen = (k: KeyName) => seenMap[k];

    if (!seen('ls') || !seen('rs')) {
      this.hold = 0;
      emit({ state: 'searching', progress: 0, keypoints: kp, seen: seenMap, space: 'video', frame, coach: 'Pokaż oba ramiona w kadrze' });
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
    emit({
      state, progress, keypoints: kp, seen: seenMap, targets, hand: res.ok ? res.hand : undefined,
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
