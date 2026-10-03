import { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTime } from '../lib/useTime';
import { colors } from '../theme';

/** Concentric pulse from the moodboard ("PRE CHECK"): three blush rings breathing outwards. */
export function Rings({ size, children }: { size: number; children?: ReactNode }) {
  const t = useTime();
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {[0, 1, 2].map((k) => {
          const ph = ((t / 2.4 + k / 3) % 1);
          return <Circle key={k} cx={c} cy={c} r={c * (0.35 + ph * 0.62)} fill="none" stroke={colors.blush} strokeWidth={1.2} strokeOpacity={(1 - ph) * 0.8} />;
        })}
        <Circle cx={c} cy={c} r={c * 0.34} fill={colors.w14} stroke={colors.w40} strokeWidth={1} />
      </Svg>
      {children}
    </View>
  );
}
