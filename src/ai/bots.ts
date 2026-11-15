import { endsSum } from '../engine/board';
import { allFivesEndPoints } from '../engine/scoring';
import type { BotDifficulty, GameAction, Move } from '../engine/types';
import { viewLegalMoves, type PlayerView } from '../engine/view';
import { hardScore, normalScore, pickBest } from './heuristics';
import { buildKnowledge } from './inference';
import { masterChoose } from './montecarlo';

export const DIFFICULTY_LABEL: Record<BotDifficulty, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
  mestre: 'Mestre',
};

export const DIFFICULTY_DESCRIPTION: Record<BotDifficulty, string> = {
  facil: 'Joga qualquer pedra que encaixa. Ideal para aprender.',
  normal: 'Livra-se das pedras pesadas e aproveita pontos imediatos.',
  dificil: 'Conta pedras jogadas, deduz o que falta aos adversários e controla as pontas.',
  mestre: 'Simula centenas de cenários prováveis antes de cada jogada.',
};

/** Chance de o bot esquecer de marcar pontos no modo fiel (como um humano). */
const FORGET_CLAIM: Record<BotDifficulty, number> = { facil: 0.35, normal: 0.12, dificil: 0.03, mestre: 0 };

/** Decide a ação do turno usando somente a visão do próprio bot. */
export interface BotOptions {
  /** Tempo máximo de reflexão da IA Mestre por jogada. */
  masterBudgetMs?: number;
}

export function decideTurn(view: PlayerView, difficulty: BotDifficulty, rng: () => number, opts: BotOptions = {}): GameAction {
  const moves = viewLegalMoves(view);
  if (moves.length === 0) {
    return view.drawable > 0 ? { type: 'draw', seat: view.seat } : { type: 'pass', seat: view.seat };
  }
  const move = chooseMove(view, moves, difficulty, rng, opts);
  return { type: 'play', seat: view.seat, tileId: move.tileId, arm: move.arm };
}

export function chooseMove(
  view: PlayerView,
  moves: readonly Move[],
  difficulty: BotDifficulty,
  rng: () => number,
  opts: BotOptions = {},
): Move {
  switch (difficulty) {
    case 'facil':
      return moves[Math.floor(rng() * moves.length)] as Move;
    case 'normal':
      return pickBest(moves, (m) => normalScore(view, m), rng, 1.5);
    case 'dificil': {
      const k = buildKnowledge(view);
      return pickBest(moves, (m) => hardScore(view, k, m), rng, 0.3);
    }
    case 'mestre':
      return masterChoose(view, moves, rng, opts.masterBudgetMs);
  }
}

/** No modo fiel (sem soma automática), decide se o bot "canta" os pontos que fez. */
export function decideClaim(view: PlayerView, difficulty: BotDifficulty, rng: () => number): GameAction | null {
  if (!view.myPendingClaim || view.rules.mode !== 'all-fives') return null;
  const points = allFivesEndPoints(endsSum(view.board), view.rules);
  if (points <= 0) return null;
  if (rng() < FORGET_CLAIM[difficulty]) return null;
  return { type: 'claim', seat: view.seat, points };
}
