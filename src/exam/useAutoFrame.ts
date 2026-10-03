import { useEffect, useRef, useState } from 'react';
import type { VideoRect } from '../camera/CameraFeed';
import type { DetectionEvent } from '../detection/detector';

/**
 * Auto-framing ("center stage"): the camera image always fills the screen; within that it zooms and
 * pans so the shoulders span about half the width at ~30% height. Eased per frame.
 */
export function useAutoFrame(ev: DetectionEvent, screen: { w: number; h: number }): VideoRect | null {
  const [rect, setRect] = useState<VideoRect | null>(null);
  const cur = useRef<{ s: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (ev.space !== 'video' || !ev.frame) return;
    const { w: fw, h: fh } = ev.frame;
    const cover = Math.max(screen.w / fw, screen.h / fh);
    let target = { s: cover, x: (screen.w - fw * cover) / 2, y: (screen.h - fh * cover) / 2 };
    const kp = ev.keypoints;
    if (kp && (!ev.seen || (ev.seen.ls && ev.seen.rs))) {
      const span = Math.hypot(kp.rs[0] - kp.ls[0], kp.rs[1] - kp.ls[1]);
      // zoom in on a distant body, but never below "cover": a close body is handled by asking her to
      // step back, not by shrinking the picture into a letterbox
      const s = Math.max(cover, Math.min(cover * 1.8, (screen.w * 0.5) / Math.max(span, 1)));
      const mx = (kp.ls[0] + kp.rs[0]) / 2;
      const my = (kp.ls[1] + kp.rs[1]) / 2;
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      target = {
        s,
        x: clamp(screen.w / 2 - mx * s, screen.w - fw * s, 0),
        y: clamp(screen.h * 0.3 - my * s, screen.h - fh * s, 0),
      };
    }
    const c = cur.current ?? target;
    const k = cur.current ? 0.12 : 1;
    const next = { s: c.s + (target.s - c.s) * k, x: c.x + (target.x - c.x) * k, y: c.y + (target.y - c.y) * k };
    cur.current = next;
    setRect({ left: next.x, top: next.y, width: fw * next.s, height: fh * next.s });
  }, [ev, screen.w, screen.h]);

  return rect;
}
