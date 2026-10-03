import { useEffect, useRef } from 'react';

export type CameraStatus = 'pending' | 'live' | 'denied';
export type VideoRect = { left: number; top: number; width: number; height: number };

type Props = {
  onStatus: (s: CameraStatus) => void;
  onVideo: (v: HTMLVideoElement | null) => void;
  /** where to draw the sharp video (auto-framing); omitted = cover the screen */
  rect?: VideoRect | null;
};

const mirrored = { transform: 'scaleX(-1)' } as const;

/**
 * Front camera, mirrored. A blurred copy fills the screen behind the auto-framed sharp image, so a
 * landscape laptop webcam still reads as a phone camera. The stream is only drawn and passed to
 * the on-device model: no recorder, no canvas export, no upload anywhere in the app.
 */
export function CameraFeed({ onStatus, onVideo, rect }: Props) {
  const fg = useRef<HTMLVideoElement>(null);
  const bg = useRef<HTMLVideoElement>(null);
  const cb = useRef({ onStatus, onVideo });
  cb.current = { onStatus, onVideo };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('camera API unavailable (needs https or localhost)');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        const v = fg.current!;
        v.srcObject = stream;
        if (bg.current) bg.current.srcObject = stream;
        await v.play();
        void bg.current?.play().catch(() => undefined);
        cb.current.onStatus('live');
        cb.current.onVideo(v);
      } catch (e) {
        console.warn('[ChickCheck] camera unavailable', e);
        if (!cancelled) cb.current.onStatus('denied');
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      cb.current.onVideo(null);
    };
  }, []);

  const box = rect
    ? { position: 'absolute' as const, left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    : { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const };

  return (
    <>
      <video
        ref={bg}
        playsInline
        muted
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(28px) brightness(0.75) saturate(0.8)', ...mirrored, scale: '1.15' }}
      />
      <video
        ref={fg}
        playsInline
        muted
        style={{
          ...box, ...mirrored, filter: 'saturate(0.92) contrast(1.03)',
          // feather the edges of the framed image into the blurred backdrop
          maskImage: 'linear-gradient(to bottom, transparent 0%, #000 7%, #000 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 7%, #000 90%, transparent 100%)',
        }}
      />
    </>
  );
}
