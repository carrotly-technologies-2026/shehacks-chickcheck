import { useCallback, useEffect, useRef, useState } from 'react';
import { DetectionEvent, PoseDetector } from '../detection/detector';
import { examResults } from './results';
import { Method, STEPS } from './steps';

type Options = {
  detector: PoseDetector | null;
  method: Method;
  startIndex: number;
  onFinish: () => void;
};

const LOADING: DetectionEvent = { state: 'loading', progress: 0, space: 'figure' };

/** One detector run per step; auto-advances shortly after a step completes. */
export function useExamSession({ detector, method, startIndex, onFinish }: Options) {
  const [index, setIndex] = useState(startIndex);
  const [ev, setEv] = useState<DetectionEvent>(LOADING);
  const [paused, setPaused] = useState(false);
  const [detectedAt, setDetectedAt] = useState<number | null>(null);
  const finish = useRef(onFinish);
  finish.current = onFinish;
  const step = STEPS[index];

  // a fresh record per exam; the source flips to "model" once the on-device model takes over
  useEffect(() => {
    examResults.begin(method, 'demo');
  }, [method]);
  useEffect(() => {
    const r = examResults.get();
    if (r && detector) r.source = detector.kind;
  }, [detector]);

  /** `confirmed` = the detector completed the step; skipping with "Dalej" does not count it as done. */
  const next = useCallback((confirmed = false) => {
    if (confirmed) examResults.markDone(STEPS[index].id);
    setPaused(false);
    if (index >= STEPS.length - 1) {
      examResults.finish();
      finish.current();
    } else setIndex(index + 1);
  }, [index]);

  useEffect(() => {
    setDetectedAt(null);
    if (!detector) {
      setEv(LOADING);
      return;
    }
    setEv({ state: 'searching', progress: 0, space: detector.kind === 'model' ? 'video' : 'figure' });
    detector.start(step, { method }, (e) => {
      setEv(e);
      if (e.keypoints) setDetectedAt((d) => d ?? performance.now());
      if (e.cells && step.side) examResults.setCells(step.side, e.cells);
    });
    return () => detector.stop();
  }, [detector, step, method]);

  useEffect(() => {
    if (!detector) return;
    if (paused) detector.pause();
    else detector.resume();
  }, [paused, detector]);

  useEffect(() => {
    if (ev.state !== 'complete') return;
    const t = setTimeout(() => next(true), 1100);
    return () => clearTimeout(t);
  }, [ev.state, next]);

  return { step, index, total: STEPS.length, ev, paused, detectedAt, togglePause: () => setPaused((p) => !p), next: () => next(false) };
}
