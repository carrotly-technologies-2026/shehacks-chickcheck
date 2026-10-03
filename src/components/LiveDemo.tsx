import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { DetectionEvent, Pt } from '../detection/detector';
import { FIG_W } from '../detection/geometry';
import { MockDetector } from '../detection/mockDetector';
import { ExamOverlay } from '../exam/ExamOverlay';
import { STEPS } from '../exam/steps';
import { useTime } from '../lib/useTime';
import { Figure } from './Figure';

/** Self-running miniature of the exam: the illustrated body, pose landmarks and the touch target. */
export function LiveDemo({ size }: { size: number }) {
  const t = useTime();
  const [ev, setEv] = useState<DetectionEvent | null>(null);
  const [since, setSince] = useState<number | null>(null);
  const det = useMemo(() => new MockDetector(), []);
  const h = (size * 260) / FIG_W;

  useEffect(() => {
    const step = { ...STEPS.find((s) => s.id === 'right')!, sweepMs: 9000 };
    let run = 0;
    const go = () => {
      run++;
      const mine = run;
      setSince(null);
      det.start(step, { method: 'spiral' }, (e) => {
        if (mine !== run) return;
        setEv(e);
        if (e.keypoints) setSince((s) => s ?? performance.now());
        if (e.state === 'complete') setTimeout(go, 1600);
      });
    };
    go();
    return () => { run++; det.dispose(); };
  }, [det]);

  const k = size / FIG_W;
  const proj = { p: (q: Pt): Pt => [q[0] * k, q[1] * k], s: k };
  return (
    <View style={{ width: size, height: h }}>
      {ev?.figure && <Figure kp={ev.figure} size={size} />}
      {ev && <ExamOverlay ev={ev} proj={proj} method="spiral" width={size} height={h} t={t} sinceDetect={since === null ? null : (performance.now() - since) / 1000} />}
    </View>
  );
}
