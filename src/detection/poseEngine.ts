import type { PoseDetector } from './detector';

/*
 * Native builds: Expo Go has no ML runtime, so the exam runs on the demo detector.
 * A dev build would plug MediaPipe / TFLite (e.g. react-native-fast-tflite + a frame processor) in here.
 */
export const hasPoseModel = false;

export async function createModelDetector(_video: unknown): Promise<PoseDetector> {
  throw new Error('On-device pose model is only wired up for the web build');
}

export function loadPoseModel(): Promise<never> {
  return Promise.reject(new Error('unsupported'));
}
