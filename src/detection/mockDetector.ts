import type { ExamStep } from '../exam/steps';
import { CELLS, DetectionEvent, DetectorOptions, PoseDetector } from './detector';
import {
  Hands, add, cellAt, coverage, figureKeypoints, guidePath, lerpHands, mul, poseHands, targetsFor,
} from './geometry';

const TICK = 33;
const SEARCH_MS = 1500;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Demo detector: animates the illustrated body into each pose, "recognises" it, then plays the
 * palm along the chosen examination path. Emits exactly what the real model detector emits.
 */
export class MockDetector implements PoseDetector {
  readonly kind = 'demo' as const;
  private timer: ReturnType<typeof setInterval> | null = null;
  private t = 0;
  private paused = false;
  private from: Hands = poseHands('down');
  private current: Hands = poseHands('down');
  private cells: boolean[] = [];

  start(step: ExamStep, opts: DetectorOptions, onEvent: (e: DetectionEvent) => void) {
    this.stop();
    this.t = 0;
    this.paused = false;
    this.from = this.current;
    this.cells = new Array(CELLS).fill(false);
    const path = guidePath(opts.method);
    const goal = poseHands(step.pose);
    const palpation = step.check === 'palpation';
    const handKey: 'l' | 'r' = step.side === 'right' ? 'l' : 'r';
    const target = targetsFor(step, figureKeypoints(goal), undefined, 'figure')[0];
    if (palpation && target) goal[handKey] = add(target.c, mul(path[0], target.r * 0.95));

    this.timer = setInterval(() => {
      if (this.paused) return;
      this.t += TICK;
      const t = this.t;
      let hands = lerpHands(this.from, goal, ease(Math.min(1, t / 1200)));
      let state: DetectionEvent['state'] = t < SEARCH_MS ? 'searching' : 'detected';
      let progress = 0;
      let hand;

      if (state === 'detected' && palpation && target) {
        const u = Math.min(1, (t - SEARCH_MS) / (step.sweepMs ?? 15000));
        const p = path[Math.round(u * (path.length - 1))];
        // small circular finger movements on top of the path, as taught
        const wob: [number, number] = [Math.cos(t / 90) * 0.05, Math.sin(t / 90) * 0.05];
        hand = add(target.c, mul(add(p, wob), target.r * 0.95));
        hands = { ...hands, [handKey]: hand };
        const cell = cellAt(hand, target);
        if (cell >= 0) this.cells[cell] = true;
        progress = u >= 1 ? 1 : coverage(this.cells);
      } else if (state === 'detected') {
        progress = Math.min(1, (t - SEARCH_MS) / step.holdMs);
      }
      if (progress >= 1) state = 'complete';
      this.current = hands;

      const kp = figureKeypoints(hands);
      onEvent({
        state,
        progress,
        figure: kp,
        keypoints: state === 'searching' ? undefined : kp,
        targets: state === 'searching' ? undefined : targetsFor(step, kp, undefined, 'figure'),
        hand,
        cells: palpation ? [...this.cells] : undefined,
        space: 'figure',
      });
      if (state === 'complete') this.stop();
    }, TICK);
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  dispose() { this.stop(); }
}
