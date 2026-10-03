import { CELLS } from '../detection/detector';
import type { Method } from './steps';

export type ExamResult = {
  startedAt: number;
  endedAt?: number;
  method: Method;
  source: 'model' | 'demo';
  done: string[];
  cells: { left: boolean[]; right: boolean[] };
};

let current: ExamResult | null = null;

/** In-memory record of the exam in progress. Only the summary is ever persisted (to the local log). */
export const examResults = {
  begin(method: Method, source: 'model' | 'demo') {
    current = { startedAt: Date.now(), method, source, done: [], cells: { left: new Array(CELLS).fill(false), right: new Array(CELLS).fill(false) } };
  },
  setCells(side: 'left' | 'right', cells: boolean[]) {
    if (current) current.cells[side] = cells;
  },
  markDone(id: string) {
    if (current && !current.done.includes(id)) current.done.push(id);
  },
  finish() {
    if (current) current.endedAt = Date.now();
  },
  get(): ExamResult | null {
    return current;
  },
};
