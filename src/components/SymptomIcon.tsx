import Svg, { Circle, G, Path } from 'react-native-svg';
import type { Finding } from '../storage/log';

type Props = { id: Finding; size?: number; color?: string; accent?: string };

/**
 * Clinical warning signs drawn on a breast outline (circle + areola), the way patient leaflets do.
 * 40x40 grid, 1.4 stroke.
 */
export function SymptomIcon({ id, size = 40, color = '#fff', accent = '#EE9DB2' }: Props) {
  const s = { stroke: color, strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const breast = <Circle cx={20} cy={20} r={13} {...s} />;
  const areola = <Circle cx={20} cy={22} r={2.6} {...s} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {id === 'guzek' && (
        <G>
          {breast}{areola}
          <Circle cx={26} cy={15} r={3.2} fill={accent} stroke={color} strokeWidth={1.2} />
        </G>
      )}
      {id === 'obrzek' && (
        <G>
          <Path d="M20 6.5c8.5 0 14.5 5.8 14.5 13.5S28.5 33.5 20 33.5 6.5 28 7.5 20.5" {...s} />
          <Path d="M7.5 20.5C7 13 12 6.5 20 6.5" {...s} strokeDasharray="1.5 2.5" />
          {areola}
          <Path d="M31 9l3-3M31 6h3v3" {...s} />
        </G>
      )}
      {id === 'wciagniecie' && (
        <G>
          <Path d="M20 7a13 13 0 1 1-12.4 9c1.2-.3 2.5.3 3.4 1.6 1-1.4 2.1-2.2 3.3-2.3" {...s} />
          {areola}
          <Path d="M10.5 13.5c.6 1 1.4 1.6 2.4 1.8" {...s} stroke={accent} />
        </G>
      )}
      {id === 'zaczerwienienie' && (
        <G>
          <Path d="M20 7a13 13 0 0 1 0 26z" fill={accent} fillOpacity={0.55} />
          {breast}{areola}
        </G>
      )}
      {id === 'skorka' && (
        <G>
          {breast}{areola}
          {[[14, 13], [18, 11], [22, 12.5], [15, 17], [24, 16.5], [12, 21], [27, 21], [14.5, 26], [25, 26], [20, 28]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={0.9} fill={color} />
          ))}
        </G>
      )}
      {id === 'zyly' && (
        <G>
          {breast}{areola}
          <Path d="M12 11c3 2 4 5 4 8M16 14l3-2M27 12c-2 3-3 5-2.5 8M25 16l-3-1.5M14 29c1-2 3-3 5-3" {...s} stroke={accent} />
        </G>
      )}
      {id === 'brodawka' && (
        <G>
          {breast}
          <Circle cx={20} cy={22} r={3.4} {...s} />
          <Path d="M18.4 22c.5-.9 2.7-.9 3.2 0" {...s} stroke={accent} />
        </G>
      )}
      {id === 'wydzielina' && (
        <G>
          {breast}{areola}
          <Path d="M20 26.5c0 0-2.2 2.6-2.2 4a2.2 2.2 0 0 0 4.4 0c0-1.4-2.2-4-2.2-4z" fill={accent} stroke={color} strokeWidth={1.1} />
        </G>
      )}
      {id === 'bol' && (
        <G>
          {breast}{areola}
          <Path d="M24 9.5l-4 6h4l-4 6" {...s} stroke={accent} strokeWidth={1.8} />
        </G>
      )}
    </Svg>
  );
}
