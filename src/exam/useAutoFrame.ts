import { useEffect, useRef, useState } from 'react';
import type { VideoRect } from '../camera/CameraFeed';
import type { DetectionEvent } from '../detection/detector';

/**
 * Auto-framing ("center stage"): scales and shifts the camera image so the shoulders span half the
 * screen and sit at ~30% height, whatever the camera's aspect ratio or distance. Eased per frame.
 */
export function useAutoFrame(ev: DetectionEvent, screen: { w: number; h: number }): VideoRect | null {
  const [rect, setRect] = useState<VideoRect | null>(null);
  const cur = useRef<{ s: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (ev.space !== 'video' || !ev.frame) return;
    const { w: fw, h: fh } = ev.frame;
    const contain = Math.min(screen.w / fw, screen.h / fh);
    const cover = Math.max(screen.w / fw, screen.h / fh);
    let target = { s: cover, x: (screen.w - fw * cover) / 2, y: (screen.h - fh * cover) / 2 };
    const kp = ev.keypoints;
    if (kp && (!ev.seen || (ev.seen.ls && ev.seen.rs))) {
      const span = Math.hypot(kp.rs[0] - kp.ls[0], kp.rs[1] - kp.ls[1]);
      const s = Math.max(contain, Math.min(cover * 1.8, (screen.w * 0.5) / Math.max(span, 1)));
      const mx = (kp.ls[0] + kp.rs[0]) / 2;
      const my = (kp.ls[1] + kp.rs[1]) / 2;
      target = { s, x: screen.w / 2 - mx * s, y: screen.h * 0.3 - my * s };
    }
    const c = cur.current ?? target;
    const k = cur.current ? 0.12 : 1;
    const next = { s: c.s + (target.s - c.s) * k, x: c.x + (target.x - c.x) * k, y: c.y + (target.y - c.y) * k };
    cur.current = next;
    setRect({ left: next.x, top: next.y, width: fw * next.s, height: fh * next.s });
  }, [ev, screen.w, screen.h]);

  return rect;
}
