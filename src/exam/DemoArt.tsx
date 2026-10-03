import { View } from 'react-native';
import { Circle } from 'react-native-svg';
import { LineArt } from '../components/LineArt';
import { LineArtName } from '../components/lineArtData';
import { colors } from '../theme';
import type { ExamStep } from './steps';

type Art = { name: LineArtName; mirror?: boolean; target?: [number, number] };

// The raised-arm drawing has the hand on the breast on the screen-right side, which in the mirror
// view is her right breast; the left-breast step mirrors it.
const ART: Record<string, Art> = {
  right: { name: 'raise-palpate', target: [208, 214] },
  left: { name: 'raise-palpate', mirror: true, target: [208, 214] },
  armpit: { name: 'shoulder' },
};

/** Demo mode stand-in for the camera: the moodboard drawing for the step, with a pulsing touch target. */
export function DemoArt({ step, width, t, active }: { step: ExamStep; width: number; t: number; active: boolean }) {
  const art = ART[step.id] ?? { name: 'lift' };
  const ph = (t % 1.8) / 1.8;
  return (
    <View style={art.mirror ? { transform: [{ scaleX: -1 }] } : undefined}>
      <LineArt name={art.name} width={width}>
        {art.target && (
          <>
            <Circle cx={art.target[0]} cy={art.target[1]} r={30 + ph * 22} fill="none" stroke={colors.blush} strokeWidth={2} strokeOpacity={(1 - ph) * 0.9} />
            <Circle cx={art.target[0]} cy={art.target[1]} r={30} fill={active ? colors.rose : 'none'} fillOpacity={0.25} stroke="#fff" strokeWidth={1.6} strokeDasharray="3 5" />
            <Circle cx={art.target[0]} cy={art.target[1]} r={4} fill="#fff" />
          </>
        )}
      </LineArt>
    </View>
  );
}
