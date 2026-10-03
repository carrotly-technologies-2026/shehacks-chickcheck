import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { FrameInsets } from '../lib/insets';
import { PHONE_H, PHONE_W, colors, fonts } from '../theme';

const BEZEL = 12;
const INSETS = { top: 46, bottom: 34 };

function StatusBar() {
  return (
    <View style={[styles.status, { pointerEvents: 'none' }]}>
      <Text style={styles.time}>9:41</Text>
      <Svg width={67} height={12} viewBox="0 0 67 12">
        <Rect x="0" y="7.5" width="3" height="4" rx="1" fill="#fff" />
        <Rect x="5" y="5" width="3" height="6.5" rx="1" fill="#fff" />
        <Rect x="10" y="2.5" width="3" height="9" rx="1" fill="#fff" />
        <Rect x="15" y="0" width="3" height="11.5" rx="1" fill="#fff" />
        <Path d="M30 3.2a7 7 0 0110 0M32 5.6a4.2 4.2 0 016 0M34.2 8a1.4 1.4 0 012.6 0z" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <Rect x="44.5" y="0.5" width="19" height="10.5" rx="3" stroke="#fff" strokeOpacity="0.5" fill="none" />
        <Rect x="46" y="2" width="16" height="7.5" rx="1.8" fill="#fff" />
        <Rect x="65" y="4" width="1.6" height="3.6" rx="0.8" fill="#fff" fillOpacity="0.5" />
      </Svg>
    </View>
  );
}

/**
 * Web only: renders the app inside an iPhone 16 sized mockup so screenshots look like a phone.
 * On native (and on narrow browser windows) it is a pass-through.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  // `?bare` renders just the device at 1:1, used to capture screenshots for the submission.
  const bare = Platform.OS === 'web' && typeof location !== 'undefined' && location.search.includes('bare');
  if (Platform.OS !== 'web' || (width < 520 && !bare)) return <>{children}</>;

  const outerH = PHONE_H + BEZEL * 2;
  const scale = bare ? 1 : Math.min(1, (height - 32) / outerH);

  return (
    <LinearGradient colors={['#2a1d17', '#141010']} style={styles.stage}>
      {!bare && (
        <View style={styles.caption}>
          <Text style={styles.brand}>ChickCheck</Text>
          <Text style={styles.sub}>Prywatne samobadanie piersi. AI działa lokalnie na telefonie.</Text>
        </View>
      )}
      <View style={[styles.device, { transform: [{ scale }] }]}>
        <View style={styles.screen}>
          <FrameInsets.Provider value={INSETS}>{children}</FrameInsets.Provider>
          <StatusBar />
          <View style={[styles.island, { pointerEvents: 'none' }]} />
          <View style={[styles.homeBar, { pointerEvents: 'none' }]} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 72 },
  caption: { maxWidth: 260 },
  brand: { color: '#fff', fontFamily: fonts.bold, fontSize: 30, letterSpacing: -0.5 },
  sub: { color: 'rgba(255,255,255,0.6)', fontFamily: fonts.light, fontSize: 14, marginTop: 8, lineHeight: 21 },
  device: {
    width: PHONE_W + BEZEL * 2,
    height: PHONE_H + BEZEL * 2,
    borderRadius: 64,
    backgroundColor: '#0b0b0c',
    padding: BEZEL,
    borderWidth: 2,
    borderColor: '#3a3a3d',
  },
  screen: { flex: 1, borderRadius: 52, overflow: 'hidden', backgroundColor: colors.bottom },
  status: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 46, zIndex: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 30, paddingTop: 6,
  },
  time: { color: '#fff', fontFamily: fonts.semibold, fontSize: 15, letterSpacing: -0.5 },
  island: {
    position: 'absolute', top: 11, alignSelf: 'center', width: 118, height: 34,
    borderRadius: 20, backgroundColor: '#000', zIndex: 60,
  },
  homeBar: {
    position: 'absolute', bottom: 8, alignSelf: 'center', width: 134, height: 5,
    borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.85)', zIndex: 60,
  },
});
