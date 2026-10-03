import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** Flat awareness ribbon for platforms without WebGL. */
export function RibbonFallback({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="rb" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F7CFD8" />
          <Stop offset="1" stopColor="#D7708F" />
        </LinearGradient>
      </Defs>
      <Path
        d="M35 86 L48 56 C40 44 36 34 38 24 C40 14 60 14 62 24 C64 34 60 44 52 56 L65 86"
        fill="none" stroke="url(#rb)" strokeWidth={9} strokeLinecap="butt" strokeLinejoin="round"
      />
    </Svg>
  );
}
