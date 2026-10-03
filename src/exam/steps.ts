import type { Finding } from '../storage/log';

export type Method = 'spiral' | 'radial' | 'strips';
export type Check = 'front' | 'raised' | 'hips' | 'palpation' | 'armpit';
export type PoseName = 'down' | 'up' | 'hips' | 'palpateRight' | 'palpateLeft' | 'armpitRight';

export type ExamStep = {
  id: string;
  title: string;
  /** shown until the AI recognises the pose */
  seeking: string;
  /** shown once the pose is recognised */
  doing: string;
  hint: string;
  pose: PoseName;
  check: Check;
  side?: 'left' | 'right';
  /** how long a visual pose must be held */
  holdMs: number;
  /** demo mode: time to sweep the whole guide path */
  sweepMs?: number;
  watch?: Finding[];
};

export const METHODS: { id: Method; label: string; hint: string }[] = [
  { id: 'spiral', label: 'Spiralnie', hint: 'Małe okrężne ruchy, spiralnie od brzegu do brodawki.' },
  { id: 'radial', label: 'Promieniście', hint: 'Od brzegu do brodawki, wzdłuż promieni, jak wskazówki zegara.' },
  { id: 'strips', label: 'Pasami', hint: 'Pasami góra–dół, od pachy w stronę mostka.' },
];

export const STEPS: ExamStep[] = [
  {
    id: 'front',
    title: 'Oględziny z przodu',
    seeking: 'Stań przodem, ręce swobodnie wzdłuż ciała',
    doing: 'Dobrze. Przyjrzyj się piersiom',
    hint: 'Porównaj kształt, wielkość i skórę obu piersi.',
    pose: 'down',
    check: 'front',
    holdMs: 5000,
    watch: ['obrzek', 'wciagniecie', 'zaczerwienienie', 'brodawka'],
  },
  {
    id: 'raised',
    title: 'Ręce nad głową',
    seeking: 'Unieś obie ręce wysoko nad głowę',
    doing: 'Świetnie. Obserwuj kontur piersi',
    hint: 'Piersi powinny unosić się równo, bez wciągnięć skóry.',
    pose: 'up',
    check: 'raised',
    holdMs: 5000,
    watch: ['wciagniecie', 'obrzek', 'brodawka'],
  },
  {
    id: 'hips',
    title: 'Dłonie na biodrach',
    seeking: 'Oprzyj dłonie na biodrach i napnij klatkę',
    doing: 'Trzymaj napięcie mięśni',
    hint: 'Napięcie uwidacznia zagłębienia i zmiany konturu.',
    pose: 'hips',
    check: 'hips',
    holdMs: 4000,
    watch: ['wciagniecie', 'skorka', 'zyly'],
  },
  {
    id: 'right',
    title: 'Prawa pierś',
    seeking: 'Prawą rękę połóż za głową, lewą dłoń na prawej piersi',
    doing: 'Prowadź opuszki po zaznaczonej ścieżce',
    hint: '',
    pose: 'palpateRight',
    check: 'palpation',
    side: 'right',
    holdMs: 0,
    sweepMs: 16000,
  },
  {
    id: 'left',
    title: 'Lewa pierś',
    seeking: 'Lewą rękę połóż za głową, prawą dłoń na lewej piersi',
    doing: 'Prowadź opuszki po zaznaczonej ścieżce',
    hint: '',
    pose: 'palpateLeft',
    check: 'palpation',
    side: 'left',
    holdMs: 0,
    sweepMs: 16000,
  },
  {
    id: 'armpit',
    title: 'Pacha i brodawki',
    seeking: 'Unieś prawą rękę, lewą dłonią sięgnij do pachy',
    doing: 'Wyczuj węzły chłonne opuszkami trzech palców',
    hint: 'Na koniec delikatnie uciśnij każdą brodawkę.',
    pose: 'armpitRight',
    check: 'armpit',
    side: 'right',
    holdMs: 4000,
    watch: ['guzek', 'wydzielina', 'bol'],
  },
];
