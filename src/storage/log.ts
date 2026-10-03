import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

export type Finding =
  | 'guzek' | 'obrzek' | 'wciagniecie' | 'zaczerwienienie' | 'skorka' | 'zyly' | 'brodawka' | 'wydzielina' | 'bol';

export const FINDINGS: { id: Finding; label: string }[] = [
  { id: 'guzek', label: 'Guzek' },
  { id: 'obrzek', label: 'Obrzęk' },
  { id: 'wciagniecie', label: 'Wciągnięcie' },
  { id: 'zaczerwienienie', label: 'Zaczerwienienie' },
  { id: 'skorka', label: 'Skórka pomarańczy' },
  { id: 'zyly', label: 'Widoczne żyły' },
  { id: 'brodawka', label: 'Brodawka' },
  { id: 'wydzielina', label: 'Wydzielina' },
  { id: 'bol', label: 'Ból' },
];
export const findingLabel = (f: Finding) => FINDINGS.find((x) => x.id === f)?.label ?? f;

/** Location in clinical notation: side, clock hour as seen by an examiner, distance ring from the nipple. */
export type Mark = { side: 'left' | 'right'; hour: number; ring: number };

export type LogEntry = {
  id: string;
  date: string; // ISO
  source: 'exam' | 'manual';
  findings: Finding[];
  marks: Mark[];
  /** 0 none .. 3 strong */
  pain: number;
  note: string;
  /** exam coverage 0..1 per side */
  coverage?: { left: number; right: number };
};

export type Cadence = 'daily' | 'weekly';

const KEY = 'chickcheck.log.v2';
const KEY_CADENCE = 'chickcheck.cadence.v1';
const DAY = 86_400_000;
export const EXAM_EVERY_DAYS = 28;

function seed(): LogEntry[] {
  const at = (d: number, h = 19) => {
    const x = new Date(Date.now() - d * DAY);
    x.setHours(h, 30, 0, 0);
    return x.toISOString();
  };
  const ok = 'Samobadanie z asystentem. Bez niepokojących zmian.';
  return [
    { id: 's1', date: at(2), source: 'manual', findings: [], marks: [], pain: 0, note: 'Samopoczucie dobre, nic nowego.' },
    { id: 's2', date: at(9), source: 'manual', findings: ['bol'], marks: [{ side: 'left', hour: 2, ring: 2 }], pain: 1, note: 'Lekka tkliwość lewej piersi przed miesiączką.' },
    { id: 's3', date: at(16), source: 'manual', findings: [], marks: [], pain: 0, note: 'Bez zmian.' },
    { id: 's4', date: at(24), source: 'exam', findings: [], marks: [], pain: 0, note: ok, coverage: { left: 0.94, right: 0.97 } },
    { id: 's5', date: at(31), source: 'manual', findings: ['zaczerwienienie'], marks: [{ side: 'right', hour: 10, ring: 1 }], pain: 0, note: 'Zaczerwienienie po treningu, zniknęło po 2 dniach.' },
    { id: 's6', date: at(52), source: 'exam', findings: [], marks: [], pain: 0, note: ok, coverage: { left: 0.91, right: 0.95 } },
    { id: 's7', date: at(80), source: 'exam', findings: [], marks: [], pain: 0, note: ok, coverage: { left: 0.88, right: 0.9 } },
  ];
}

// Tiny external store so every screen sees the same list.
let entries: LogEntry[] = [];
let cadence: Cadence = 'weekly';
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const sortDesc = (a: LogEntry, b: LogEntry) => +new Date(b.date) - +new Date(a.date);

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const [raw, cad] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(KEY_CADENCE)]);
    entries = (raw ? (JSON.parse(raw) as LogEntry[]) : seed()).sort(sortDesc);
    if (cad === 'daily' || cad === 'weekly') cadence = cad;
  } catch {
    entries = seed();
  }
  emit();
}

async function persist() {
  try {
    await AsyncStorage.multiSet([[KEY, JSON.stringify(entries)], [KEY_CADENCE, cadence]]);
  } catch {
    // best effort: the in-memory list still works for this session
  }
}

export async function addEntry(e: Omit<LogEntry, 'id' | 'date'>) {
  await load();
  entries = [{ id: String(Date.now()), date: new Date().toISOString(), ...e }, ...entries].sort(sortDesc);
  emit();
  await persist();
}

export async function setCadence(c: Cadence) {
  cadence = c;
  emit();
  await persist();
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export function useLog(): LogEntry[] {
  useEffect(() => { void load(); }, []);
  return useSyncExternalStore(subscribe, () => entries, () => entries);
}

export function useCadence(): Cadence {
  useEffect(() => { void load(); }, []);
  return useSyncExternalStore(subscribe, () => cadence, () => cadence);
}

// ------------------------------------------------------------------ dates (pl-PL without Intl)
const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
export const MONTHS_NOM = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
export const DAYS_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
const WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

export const formatDate = (iso: string | Date) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const formatLong = (d: Date) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
export const daysBetween = (a: Date, b: Date) =>
  Math.round((new Date(b.toDateString()).getTime() - new Date(a.toDateString()).getTime()) / DAY);

/** Polish noun agreement for "dzień". */
export const dniLabel = (n: number) => (n === 1 ? 'dzień' : 'dni');

export function describeMark(m: Mark) {
  const outer = m.side === 'right' ? m.hour >= 6 && m.hour <= 12 : m.hour >= 12 || m.hour <= 6;
  const upper = m.hour >= 9 || m.hour <= 3;
  const zone = m.ring === 0 ? 'okolica brodawki' : `${upper ? 'górna' : 'dolna'} ${outer ? 'zewnętrzna' : 'wewnętrzna'}`;
  const cm = ['do 2 cm', '2–4 cm', '4–6 cm'][m.ring];
  return `${m.side === 'right' ? 'Prawa' : 'Lewa'} · godz. ${m.hour} · ${zone} · ${cm} od brodawki`;
}
