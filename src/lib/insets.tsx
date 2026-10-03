import { createContext, useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Insets = { top: number; bottom: number };

/** On web the app renders inside a phone mockup, which supplies its own fake insets. */
export const FrameInsets = createContext<Insets | null>(null);

export function useInsets(): Insets {
  const frame = useContext(FrameInsets);
  const native = useSafeAreaInsets();
  return frame ?? { top: Math.max(native.top, 24), bottom: Math.max(native.bottom, 16) };
}
