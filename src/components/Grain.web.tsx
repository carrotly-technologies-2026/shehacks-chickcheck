// Film grain over the Figma gradient: a static SVG turbulence texture, blended at low opacity.
const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>" +
  "<feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.35  0 0 0 1.1 0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function Grain({ opacity = 0.16 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity,
        backgroundImage: NOISE, backgroundSize: '220px 220px', mixBlendMode: 'overlay',
      }}
    />
  );
}
