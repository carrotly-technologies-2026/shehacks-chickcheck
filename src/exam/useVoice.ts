import * as Speech from 'expo-speech';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const SETTLE_MS = 700;
const MIN_GAP_MS = 2500;
const REPEAT_MS = 9000;

/** Some browsers (or locked-down Linux setups) ship without the Web Speech API. */
export const voiceSupported =
  Platform.OS !== 'web' ||
  (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function');

// Speech is a nice-to-have: it must never take the exam down.
function say(text: string) {
  if (!voiceSupported) return;
  try {
    void Speech.stop();
    Speech.speak(text, { language: 'pl-PL', rate: 0.98 });
  } catch (e) {
    console.warn('[ChickCheck] speech unavailable', e);
  }
}

function hush() {
  if (!voiceSupported) return;
  try {
    void Speech.stop();
  } catch {
    // nothing to stop
  }
}

/**
 * Speaks exam prompts in Polish so she does not have to read the screen from 1.5 m.
 * Waits for the text to settle (detection flickers), never talks over itself, and does not
 * repeat the same sentence within a few seconds. `key` (the step) bypasses the gap on change.
 */
export function useVoice(text: string | null, key: string, enabled: boolean) {
  const last = useRef({ text: '', key: '', at: 0 });

  useEffect(() => {
    if (!enabled || !text || !voiceSupported) return;
    const t = setTimeout(() => {
      const now = Date.now();
      const l = last.current;
      const newStep = key !== l.key;
      if (!newStep && text === l.text && now - l.at < REPEAT_MS) return;
      if (!newStep && now - l.at < MIN_GAP_MS) return;
      last.current = { text, key, at: now };
      say(text);
    }, SETTLE_MS);
    return () => clearTimeout(t);
  }, [text, key, enabled]);

  useEffect(() => {
    if (!enabled) hush();
  }, [enabled]);
  useEffect(() => () => hush(), []);
}
