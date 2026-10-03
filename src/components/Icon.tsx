import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'arrow-right' | 'arrow-left' | 'chevron-left' | 'chevron-right' | 'close' | 'check' | 'plus'
  | 'camera' | 'camera-off' | 'lock' | 'shield' | 'sparkle' | 'sun' | 'distance'
  | 'home' | 'calendar' | 'bulb' | 'bell' | 'pause' | 'play' | 'doctor' | 'note' | 'volume' | 'volume-off';

type Props = { name: IconName; size?: number; color?: string; stroke?: number };

/** 24px line icons, 1.6 stroke, matching the Figma "Arrow_Right_MD/2px" family. */
export function Icon({ name, size = 24, color = '#fff', stroke = 1.6 }: Props) {
  const p = { stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'arrow-right' && <Path d="M5 12h14M13 6l6 6-6 6" {...p} />}
      {name === 'arrow-left' && <Path d="M19 12H5M11 6l-6 6 6 6" {...p} />}
      {name === 'chevron-left' && <Path d="M15 5l-7 7 7 7" {...p} />}
      {name === 'chevron-right' && <Path d="M9 5l7 7-7 7" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} />}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />}
      {name === 'camera' && (
        <>
          <Path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" {...p} />
          <Circle cx="12" cy="13" r="3.6" {...p} />
        </>
      )}
      {name === 'camera-off' && (
        <>
          <Path d="M9.5 6h6L17 8h3a1 1 0 0 1 1 1v8M18 19H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h2" {...p} />
          <Path d="M10 10.8a3.6 3.6 0 0 0 4.9 4.9M3 3l18 18" {...p} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x="5" y="11" width="14" height="9.5" rx="2.5" {...p} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" {...p} />
        </>
      )}
      {name === 'shield' && (
        <>
          <Path d="M12 3l7 3v5c0 4.4-3 8.2-7 10-4-1.8-7-5.6-7-10V6z" {...p} />
          <Path d="M9 12l2.2 2.2L15 10" {...p} />
        </>
      )}
      {name === 'sparkle' && <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" {...p} />}
      {name === 'sun' && (
        <>
          <Circle cx="12" cy="12" r="4" {...p} />
          <Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" {...p} />
        </>
      )}
      {name === 'distance' && <Path d="M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3M12 6v2M12 16v2" {...p} />}
      {name === 'home' && <Path d="M4 11l8-7 8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5z" {...p} />}
      {name === 'calendar' && (
        <>
          <Rect x="4" y="5" width="16" height="15" rx="2.5" {...p} />
          <Path d="M4 10h16M8 3v4M16 3v4" {...p} />
        </>
      )}
      {name === 'bulb' && <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" {...p} />}
      {name === 'bell' && <Path d="M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" {...p} />}
      {name === 'pause' && <Path d="M9 6v12M15 6v12" {...p} />}
      {name === 'play' && <Path d="M8 5.5l11 6.5-11 6.5z" {...p} />}
      {name === 'doctor' && (
        <>
          <Circle cx="12" cy="8" r="3.5" {...p} />
          <Path d="M5 20c0-4 3-6 7-6s7 2 7 6M12 14v4M10 16h4" {...p} />
        </>
      )}
      {name === 'volume' && <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" {...p} />}
      {name === 'volume-off' && <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5" {...p} />}
      {name === 'note' && <Path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" {...p} />}
    </Svg>
  );
}
