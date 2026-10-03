import { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

/** Circular progress around a round thumbnail. */
export function ProgressRing({ size, progress, children, stroke = 2.5 }: { size: number; progress: number; children?: ReactNode; stroke?: number }) {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.w24} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={colors.blush} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ width: size - stroke * 4 - 4, height: size - stroke * 4 - 4, borderRadius: size, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.w14 }}>
        {children}
      </View>
    </View>
  );
}
