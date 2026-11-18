import type { BotDifficulty, GameAction } from '../engine/types';
import type { PlayerView } from '../engine/view';
import { decideTurn } from './bots';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (a: GameAction) => void>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; action: GameAction }>) => {
      pending.get(e.data.id)?.(e.data.action);
      pending.delete(e.data.id);
    };
    return worker;
  } catch {
    return null;
  }
}

/** Decide a jogada; o nível Mestre roda num Web Worker com mais tempo para pensar. */
export function decideTurnAsync(view: PlayerView, difficulty: BotDifficulty, rng: () => number): Promise<GameAction> {
  const w = difficulty === 'mestre' ? getWorker() : null;
  if (!w) return Promise.resolve(decideTurn(view, difficulty, rng));
  const id = ++seq;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ id, view, difficulty, seed: Math.floor(rng() * 2 ** 32), budgetMs: 450 });
  });
}
