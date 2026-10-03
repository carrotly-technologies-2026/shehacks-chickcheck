import { RibbonFallback } from './RibbonFallback';

/** Native: the WebGL hero is web-only, show the flat ribbon. */
export function Hero3D({ size }: { size: number }) {
  return <RibbonFallback size={size} />;
}
