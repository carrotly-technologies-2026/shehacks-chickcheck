import type { ExamStep, Method } from '../exam/steps';

export type Pt = [number, number];

/**
 * Body keypoints in the *displayed* (mirrored) image. Names are anatomical: `rs` is the user's right
 * shoulder, which appears on the right of the screen because the preview behaves like a mirror.
 * `p*` are palm centres (wrist + index + pinky).
 */
export type Keypoints = {
  nose: Pt;
  ls: Pt; rs: Pt; le: Pt; re: Pt; lw: Pt; rw: Pt; lp: Pt; rp: Pt; lh: Pt; rh: Pt;
};
export type KeyName = keyof Keypoints;

/** Where the user should touch or place a hand. */
export type Target = { c: Pt; r: number; kind: 'breast' | 'armpit' | 'hip'; side: 'left' | 'right' };

export type DetectionState = 'loading' | 'searching' | 'detected' | 'complete';

export type DetectionEvent = {
  state: DetectionState;
  /** 0..1: how long the pose was held, or how much of the breast area the fingers covered */
  progress: number;
  keypoints?: Keypoints;
  /** demo only: pose of the illustrated body standing in for the camera image */
  figure?: Keypoints;
  /** visibility 0..1 per keypoint (model only) */
  seen?: Partial<Record<KeyName, boolean>>;
  targets?: Target[];
  /** palm doing the work, drawn as the live touch cursor */
  hand?: Pt;
  /** coverage cells, RINGS x SECTORS, ring 0 = around the nipple */
  cells?: boolean[];
  /** coordinate space of every point above */
  space: 'video' | 'figure';
  /** analysed frame size in px when space = video */
  frame?: { w: number; h: number };
  /** short coaching line when the pose is not right yet */
  coach?: string;
};

export type DetectorOptions = { method: Method };

/**
 * Contract between the exam UI and whatever recognises the pose.
 * Everything behind it runs on the device; frames are never stored or uploaded.
 *  - `ModelDetector` (web): MediaPipe Pose Landmarker from bundled WASM + model, on the live camera.
 *  - `MockDetector`: scripted, animates the illustrated body; demo mode / native builds.
 */
export interface PoseDetector {
  readonly kind: 'model' | 'demo';
  start(step: ExamStep, opts: DetectorOptions, onEvent: (e: DetectionEvent) => void): void;
  pause(): void;
  resume(): void;
  stop(): void;
  dispose(): void;
}

export const RINGS = 3;
export const SECTORS = 8;
export const CELLS = RINGS * SECTORS;
/** share of cells that counts as a complete palpation */
export const COVER_GOAL = 0.8;
