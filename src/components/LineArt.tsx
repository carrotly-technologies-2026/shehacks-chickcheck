import { ReactNode } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { colors } from '../theme';
import { LINE_ART, LineArtName } from './lineArtData';

type Props = {
  name: LineArtName;
  /** rendered width; height follows the drawing's aspect ratio */
  width: number;
  color?: string;
  disc?: boolean;
  /** extra SVG drawn in the drawing's own coordinate space (e.g. a target ring) */
  children?: ReactNode;
};

/** Moodboard line art (vectorised from the Figma reference), recoloured for the brown screens. */
export function LineArt({ name, width, color = '#FFF8F3', disc = true, children }: Props) {
  const a = LINE_ART[name];
  const [cx, cy, r] = a.disc;
  return (
    <Svg width={width} height={(width * a.h) / a.w} viewBox={`0 0 ${a.w} ${a.h}`} style={{ overflow: 'visible' }}>
      {disc && <Circle cx={cx} cy={cy} r={r} fill={colors.blush} fillOpacity={0.3} />}
      <G transform={a.transform}>
        <Path d={a.d} fill={color} />
      </G>
      {children}
    </Svg>
  );
}

export const TECHNIQUES: { name: LineArtName; caption: string }[] = [
  { name: 'raise-palpate', caption: 'Ręka uniesiona, palce okrężnie po piersi' },
  { name: 'side', caption: 'Boczna część piersi i okolica pachy' },
  { name: 'shoulder', caption: 'Okolica obojczyka i pachy' },
  { name: 'cross-squeeze', caption: 'Ucisk płasko całą dłonią' },
  { name: 'nipple', caption: 'Delikatny ucisk brodawki' },
  { name: 'lift', caption: 'Unieś piersi, sprawdź dolną część' },
];
