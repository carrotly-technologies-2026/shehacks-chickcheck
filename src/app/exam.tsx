import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraFeed, CameraStatus } from '../camera/CameraFeed';
import { BreastDial } from '../components/BreastDial';
import { Figure } from '../components/Figure';
import { Grain } from '../components/Grain';
import { Icon } from '../components/Icon';
import { PillButton } from '../components/PillButton';
import { ProgressRing } from '../components/ProgressRing';
import { Rings } from '../components/Rings';
import { SymptomIcon } from '../components/SymptomIcon';
import { PoseDetector, Pt } from '../detection/detector';
import { FIG_H, FIG_W } from '../detection/geometry';
import { MockDetector } from '../detection/mockDetector';
import { createModelDetector, hasPoseModel } from '../detection/poseEngine';
import { ExamOverlay, Projector } from '../exam/ExamOverlay';
import { METHODS, Method, STEPS } from '../exam/steps';
import { useAutoFrame } from '../exam/useAutoFrame';
import { useExamSession } from '../exam/useExamSession';
import { useInsets } from '../lib/insets';
import { useTime } from '../lib/useTime';
import { findingLabel } from '../storage/log';
import { colors, fonts, gradient, type } from '../theme';

const isMethod = (m: unknown): m is Method => METHODS.some((x) => x.id === m);

/**
 * Guided exam. Web: live front camera + MediaPipe Pose running locally; the overlay is anchored to
 * the detected body. Without a camera (or with ?demo=1) an illustrated body stands in for the feed.
 * Deep links for demos: ?step=1..6, ?method=spiral|radial|strips, ?demo=1.
 */
export default function Exam() {
  const router = useRouter();
  const params = useLocalSearchParams<{ method?: string; step?: string; demo?: string }>();
  const method: Method = isMethod(params.method) ? params.method : 'spiral';
  const startIndex = Math.max(0, Math.min(STEPS.length - 1, (Number(params.step) || 1) - 1));
  const forceDemo = params.demo === '1' || !hasPoseModel;

  const { top, bottom } = useInsets();
  const t = useTime();
  const [size, setSize] = useState({ w: 393, h: 852 });
  const [cam, setCam] = useState<CameraStatus>(forceDemo ? 'denied' : 'pending');
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [model, setModel] = useState<PoseDetector | null>(null);
  const [modelFailed, setModelFailed] = useState(false);
  const [camKey, setCamKey] = useState(0);
  const demoDetector = useMemo(() => new MockDetector(), []);

  useEffect(() => {
    if (!video) return;
    let alive = true;
    createModelDetector(video)
      .then((d) => (alive ? setModel(d) : d.dispose()))
      .catch((e) => {
        console.warn('[ChickCheck] pose model unavailable', e);
        if (alive) setModelFailed(true);
      });
    return () => { alive = false; };
  }, [video]);
  useEffect(() => () => demoDetector.dispose(), [demoDetector]);
  useEffect(() => () => model?.dispose(), [model]);

  const demo = forceDemo || cam === 'denied' || modelFailed;
  // never fall back silently: say why the camera is not used and offer a retry
  const fallback = forceDemo
    ? null
    : cam === 'denied'
      ? (typeof window !== 'undefined' && !window.isSecureContext ? 'Kamera działa tylko przez https lub localhost' : 'Brak dostępu do kamery')
      : modelFailed ? 'Model AI nie wczytał się' : null;
  const retryCamera = () => {
    setModelFailed(false);
    setModel(null);
    setVideo(null);
    setCam('pending');
    setCamKey((k) => k + 1);
  };
  const detector = demo ? demoDetector : model;
  const onFinish = useCallback(() => router.replace('/result'), [router]);
  const { step, index, total, ev, paused, detectedAt, togglePause, next } = useExamSession({ detector, method, startIndex, onFinish });

  const rect = useAutoFrame(ev, size);

  // ---- projection from detector space to screen
  const bw = size.w;
  const box = { x: (size.w - bw) / 2, y: top + 58, k: bw / FIG_W };
  const proj: Projector = useMemo(() => {
    if (ev.space === 'video' && ev.frame && rect) {
      const s = rect.width / ev.frame.w;
      return { p: (q: Pt): Pt => [rect.left + q[0] * s, rect.top + q[1] * s], s };
    }
    return { p: (q: Pt): Pt => [box.x + q[0] * box.k, box.y + q[1] * box.k], s: box.k };
  }, [ev.space, ev.frame, rect, box.x, box.y, box.k]);

  const palpation = step.check === 'palpation';
  const loading = !demo && (cam === 'pending' || !model);
  const pct = Math.round(ev.progress * 100);
  const hasBody = !!ev.keypoints;
  const done = ev.state === 'complete';

  const status = loading
    ? 'Ładuję model AI'
    : done ? 'Gotowe'
    : !hasBody ? 'Szukam sylwetki'
    : ev.state === 'searching' ? 'Widzę Cię'
    : palpation ? `Śledzę dłoń · ${pct}%`
    : 'Pozycja rozpoznana';
  const dot = loading || !hasBody ? colors.amber : ev.state === 'searching' ? colors.white : colors.sage;
  const instruction = done ? 'Świetnie. Przechodzimy dalej' : ev.state === 'detected' ? step.doing : ev.coach ?? step.seeking;
  const hint = palpation ? METHODS.find((m) => m.id === method)!.hint : step.hint;

  return (
    <View style={styles.fill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {demo ? (
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      ) : (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#2b1d17' }]} />
          <CameraFeed key={camKey} onStatus={setCam} onVideo={setVideo} rect={rect} />
          <View style={[StyleSheet.absoluteFill, styles.grade]} />
        </>
      )}
      <Grain opacity={demo ? 0.16 : 0.1} />

      {demo && ev.figure && (
        <View style={[styles.abs, { left: box.x, top: box.y }]}>
          <Figure kp={ev.figure} size={bw} />
        </View>
      )}
      {!demo && !loading && !hasBody && (
        <View style={[styles.abs, { left: box.x + bw * 0.1, top: box.y + 10, opacity: 0.55 + 0.3 * Math.sin(t * 2.2) }]}>
          <Figure pose={step.pose} size={bw * 0.8} variant="ghost" />
        </View>
      )}

      <LinearGradient colors={['rgba(169,137,114,0.96)', 'rgba(169,137,114,0)']} style={[styles.scrimTop, { height: top + 150 }]} />
      <LinearGradient colors={['rgba(137,96,77,0)', 'rgba(137,96,77,0.9)', colors.bottom]} locations={[0, 0.42, 1]} style={styles.scrimBottom} />

      <ExamOverlay
        ev={ev}
        proj={proj}
        method={method}
        width={size.w}
        height={size.h}
        t={t}
        sinceDetect={detectedAt === null ? null : (performance.now() - detectedAt) / 1000}
      />

      {loading && (
        <View style={styles.loading}>
          <Rings size={150}><Icon name="sparkle" size={26} /></Rings>
          <Text style={[type.body, styles.center]}>{cam === 'pending' ? 'Włączam kamerę…' : 'Uruchamiam model AI na urządzeniu…'}</Text>
        </View>
      )}

      {/* header: Figma title row */}
      <View style={[styles.header, { paddingTop: top }]}>
        <View style={styles.headRow}>
          <Pressable accessibilityLabel="Zakończ badanie" onPress={() => router.replace('/home')} hitSlop={12} style={styles.side}>
            <Icon name="close" size={22} />
          </Pressable>
          <Text style={type.overline}>Krok {index + 1} z {total}</Text>
          <View style={[styles.side, styles.local]}>
            <Icon name="lock" size={13} color={colors.w80} />
            <Text style={type.caption}>{demo ? 'Demo' : 'Lokalnie'}</Text>
          </View>
        </View>
        <View style={styles.bars}>
          {STEPS.map((s, i) => (
            <View key={s.id} style={styles.bar}>
              <View style={[styles.barFill, { width: `${i < index ? 100 : i === index ? pct : 0}%` }]} />
            </View>
          ))}
        </View>
        <Text style={[type.title, styles.center, { marginTop: 14 }]}>{step.title}</Text>
        {fallback && (
          <Pressable onPress={retryCamera} style={styles.fallback} accessibilityRole="button">
            <Icon name="camera-off" size={16} color={colors.w80} />
            <Text style={[type.caption, { color: colors.white }]}>{fallback} · tryb demo</Text>
            <Text style={[type.caption, { color: colors.white, fontFamily: fonts.medium, textDecorationLine: 'underline' }]}>Włącz kamerę</Text>
          </Pressable>
        )}
      </View>

      {/* assistant: bottom-anchored like the Figma frames */}
      <View style={[styles.bottom, { paddingBottom: bottom + 6 }]}>
        <View style={styles.status}>
          <View style={[styles.dot, { backgroundColor: dot }]} />
          <Text style={[type.overline, { color: colors.w80 }]}>{status}</Text>
        </View>
        <Text style={[type.lead, styles.center]}>{instruction}</Text>
        <Text style={[type.body, styles.center, { color: colors.w80 }]}>{hint}</Text>
        {step.watch && (
          <View style={styles.watch}>
            {step.watch.map((f) => (
              <View key={f} style={styles.watchItem}>
                <SymptomIcon id={f} size={30} />
                <Text style={styles.watchLabel} numberOfLines={1}>{findingLabel(f)}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.controls}>
          <PillButton size="s" label={paused ? 'Wznów' : 'Pauza'} icon={null} leadingIcon={paused ? 'play' : 'pause'} onPress={togglePause} style={styles.ctl} />
          <ProgressRing size={76} progress={ev.progress}>
            {done ? (
              <Icon name="check" size={30} stroke={2} />
            ) : palpation ? (
              <BreastDial size={58} cells={ev.cells} ticks={false} />
            ) : (
              <View style={{ marginTop: 26 }}>
                <Figure pose={step.pose} size={60} fade={false} />
              </View>
            )}
          </ProgressRing>
          <PillButton size="s" label={index === total - 1 ? 'Zakończ' : 'Dalej'} onPress={next} style={styles.ctl} />
        </View>
      </View>

      {paused && (
        <Pressable style={styles.pause} onPress={togglePause}>
          <Icon name="play" size={34} />
          <Text style={type.title}>Wstrzymano</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden', backgroundColor: colors.bottom },
  abs: { position: 'absolute', pointerEvents: 'none' },
  grade: { backgroundColor: 'rgba(137,96,77,0.12)', pointerEvents: 'none' },
  scrimTop: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' },
  scrimBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 360, pointerEvents: 'none' },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 48, pointerEvents: 'none' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 24, marginTop: -1 },
  side: { width: 72 },
  local: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  bars: { flexDirection: 'row', gap: 4, marginTop: 14 },
  bar: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.w24, overflow: 'hidden' },
  barFill: { height: 2, backgroundColor: colors.white },
  center: { textAlign: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 33, alignItems: 'center', gap: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  watch: { flexDirection: 'row', gap: 4, marginTop: 6 },
  watchItem: { alignItems: 'center', gap: 2, width: 78 },
  watchLabel: { ...type.caption, fontSize: 10, lineHeight: 13, color: colors.w80 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 14 },
  ctl: { minWidth: 104 },
  fallback: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', marginTop: 10,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.w40,
  },
  pause: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(61,37,25,0.55)', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
