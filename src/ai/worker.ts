/// <reference lib="webworker" />
import { createRng } from '../engine/rng';
import type { BotDifficulty } from '../engine/types';
import type { PlayerView } from '../engine/view';
import { decideTurn } from './bots';

/** Roda a IA fora da tela principal: o Mestre pode pensar mais sem travar a interface. */
self.onmessage = (e: MessageEvent<{ id: number; view: PlayerView; difficulty: BotDifficulty; seed: number; budgetMs: number }>) => {
  const { id, view, difficulty, seed, budgetMs } = e.data;
  const action = decideTurn(view, difficulty, createRng(seed), { masterBudgetMs: budgetMs });
  (self as unknown as Worker).postMessage({ id, action });
};
