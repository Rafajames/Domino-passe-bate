import { applyAction, canDraw, legalMoves } from '../engine/match';
import { sideCount, sideOf } from '../engine/scoring';
import type { FrozenRules } from '../engine/rules/types';
import type { GameAction, MatchState, Move, RoundState } from '../engine/types';
import { playerView, type PlayerView } from '../engine/view';
import { hardScore, normalScore, pickBest } from './heuristics';
import { buildKnowledge, sampleWorld, type Knowledge } from './inference';

/**
 * Monte Carlo com determinização (PIMC): para cada mundo plausível sorteado,
 * cada jogada candidata é simulada até o fim da mão com uma política rápida.
 * O sorteio respeita apenas informação pública — a IA nunca lê mãos ocultas.
 */
export function masterChoose(view: PlayerView, moves: readonly Move[], rng: () => number, budgetMs = 120): Move {
  if (moves.length === 1) return moves[0] as Move;
  const k = buildKnowledge(view);
  const totals = new Map<Move, { sum: number; n: number }>();
  for (const m of moves) totals.set(m, { sum: 0, n: 0 });
  const start = now();
  let worlds = 0;
  while (worlds < 200 && (worlds < Math.min(12, Math.ceil(budgetMs / 4)) || now() - start < budgetMs)) {
    const world = sampleWorld(view, k, rng);
    if (!world) break;
    worlds++;
    for (const m of moves) {
      const value = simulate(view, world, m, rng);
      const acc = totals.get(m)!;
      acc.sum += value;
      acc.n++;
    }
  }
  if (worlds === 0) return pickBest(moves, (m) => normalScore(view, m), rng);
  // Combina o valor simulado com a avaliação estratégica do nível Difícil:
  // a simulação capta consequências concretas; a heurística, controle de naipes e bloqueio.
  // Medido em benchmark: ajuda no All Fives; na Passe e Bate a simulação pura é mais forte.
  const allFives = view.rules.mode === 'all-fives';
  return pickBest(moves, (m) => {
    const acc = totals.get(m)!;
    const extra = allFives ? hardScore(view, k, m) : normalScore(view, m) * 0.01;
    return acc.sum / Math.max(1, acc.n) + extra;
  }, rng);
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function simulate(view: PlayerView, world: { hands: RoundState['hands']; boneyard: RoundState['boneyard'] }, first: Move, rng: () => number): number {
  const rules = { ...view.rules, assists: { highlightPlayable: true, autoScore: true }, allFives: { ...view.rules.allFives, winImmediately: false }, targetScore: 1_000_000 };
  const frozen: FrozenRules = { profileId: 'sim', profileName: 'sim', profileVersion: 0, frozenAt: '', hash: '', rules };
  let m: MatchState = {
    id: 'sim',
    seed: 0,
    frozen,
    players: view.handCounts.map((_, seat) => ({ seat, name: '', kind: 'bot' as const, avatar: '' })),
    scores: new Array<number>(sideCount(rules)).fill(0),
    round: {
      index: view.roundIndex,
      hands: world.hands,
      boneyard: world.boneyard,
      outOfPlay: [],
      board: view.board,
      starter: 0,
      turn: view.seat,
      turnNumber: view.turnNumber,
      passesInRow: 0,
      mustOpenWith: view.mustOpenWith,
      mustOpenDouble: view.mustOpenDouble,
      pendingClaim: null,
      events: view.events,
      result: null,
    },
    history: [],
    status: 'playing',
    winnerSide: null,
    startedAt: '',
  };
  m = applyAction(m, { type: 'play', seat: view.seat, tileId: first.tileId, arm: first.arm });
  let guard = 0;
  while (m.status === 'playing' && guard++ < 200) {
    const seat = m.round.turn;
    m = applyAction(m, rolloutAction(m, seat, rng));
  }
  const mySide = sideOf(view.seat, rules);
  const myScore = m.scores[mySide] ?? 0;
  const others = m.scores.reduce((s, v, i) => (i === mySide ? s : Math.max(s, v)), 0);
  // Recompensa: diferença de pontos na mão (+ bônus por vencer a mão no Passe e Bate).
  const res = m.round.result;
  const winBonus = res && res.winnerSide === mySide ? 1 : res && res.winnerSide !== null ? -1 : 0;
  return myScore - others + (rules.mode === 'passe-bate' ? winBonus * 2 : 0);
}

function rolloutAction(m: MatchState, seat: number, rng: () => number): GameAction {
  const moves = legalMoves(m, seat);
  if (moves.length > 0) {
    const v = playerView(m, seat);
    const mv = rng() < 0.05 ? (moves[Math.floor(rng() * moves.length)] as Move) : pickBest(moves, (x) => normalScore(v, x), rng);
    return { type: 'play', seat, tileId: mv.tileId, arm: mv.arm };
  }
  return canDraw(m, seat) ? { type: 'draw', seat } : { type: 'pass', seat };
}

export type { Knowledge };
