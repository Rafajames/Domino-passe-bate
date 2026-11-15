import { endsSum, openEnds, placeTile, type BoardState } from '../engine/board';
import { allFivesEndPoints, sideOf } from '../engine/scoring';
import { hasValue, isDouble, pips, tileFromId, type Tile } from '../engine/tiles';
import type { Move } from '../engine/types';
import type { PlayerView } from '../engine/view';
import { probHasValue, tileBlocked, type Knowledge } from './inference';

export function boardAfter(view: PlayerView, move: Move): BoardState {
  return placeTile(view.board, tileFromId(move.tileId), move.arm, view.seat, view.turnNumber, view.rules.spinner);
}

export function immediatePoints(view: PlayerView, board: BoardState): number {
  return view.rules.mode === 'all-fives' ? allFivesEndPoints(endsSum(board), view.rules) : 0;
}

/** Nível Normal: livra-se de pedras pesadas e carroças; no All Fives, prioriza pontos imediatos. */
export function normalScore(view: PlayerView, move: Move): number {
  const tile = tileFromId(move.tileId);
  const board = boardAfter(view, move);
  let score = pips(tile) * 0.4 + (isDouble(tile) ? 2.5 : 0);
  if (view.rules.mode === 'all-fives') score += immediatePoints(view, board) * 1.2;
  return score;
}

/**
 * Nível Difícil: além do Normal, considera
 * - controle de naipes (manter pontas que eu tenho para jogar depois);
 * - bloqueio (pontas que o próximo adversário provavelmente não tem);
 * - ajuda ao parceiro (pontas que o parceiro tem);
 * - no All Fives, o risco de entregar pontos ao próximo jogador.
 */
export function hardScore(view: PlayerView, k: Knowledge, move: Move): number {
  const tile = tileFromId(move.tileId);
  const board = boardAfter(view, move);
  const rest = view.hand.filter((t) => t.id !== tile.id);
  const ends = openEnds(board);
  const n = view.handCounts.length;
  const next = (view.seat + 1) % n;
  const partner = view.rules.teams ? (view.seat + 2) % n : -1;
  const mySide = sideOf(view.seat, view.rules);

  let score = normalScore(view, move);

  // Controle: quantas pontas resultantes eu ainda consigo cobrir.
  const coverable = ends.filter((e) => rest.some((t) => hasValue(t, e.value))).length;
  score += coverable * 1.5;
  // Diversidade da mão restante (evita ficar preso a poucos naipes).
  const suits = new Set(rest.flatMap((t) => [t.a, t.b]));
  score += suits.size * 0.6;

  // Bloqueio do próximo adversário.
  if (sideOf(next, view.rules) !== mySide) {
    const pNextCanPlay = 1 - ends.reduce((acc, e) => acc * (1 - probHasValue(view, k, next, e.value)), 1);
    score += (1 - pNextCanPlay) * 4;
  }
  // Facilitar o parceiro.
  if (partner >= 0) {
    const pPartner = 1 - ends.reduce((acc, e) => acc * (1 - probHasValue(view, k, partner, e.value)), 1);
    score += pPartner * 1.5;
  }

  if (view.rules.mode === 'all-fives' && sideOf(next, view.rules) !== mySide) {
    score -= expectedReplyPoints(view, k, board, next) * 0.8;
  }
  return score;
}

/** Valor esperado (aproximado) dos pontos que `seat` faria respondendo a `board`. */
export function expectedReplyPoints(view: PlayerView, k: Knowledge, board: BoardState, seat: number): number {
  const handN = view.handCounts[seat] ?? 0;
  const pool = k.unknown.filter((t) => !tileBlocked(k, seat, t));
  if (handN === 0 || pool.length === 0) return 0;
  const pHas = Math.min(1, handN / pool.length);
  let best = 0;
  let expected = 0;
  for (const t of pool) {
    for (const e of openEnds(board)) {
      if (!hasValue(t, e.value)) continue;
      const pts = allFivesEndPoints(endsSum(placeTile(board, t, e.arm, seat, 999, view.rules.spinner)), view.rules);
      if (pts > best) best = pts;
      expected = Math.max(expected, pts * pHas);
    }
  }
  return expected * 0.7 + best * 0.3 * pHas;
}

export function pickBest<T>(items: readonly T[], score: (x: T) => number, rng: () => number, noise = 0): T {
  let best = items[0] as T;
  let bestScore = -Infinity;
  for (const it of items) {
    const s = score(it) + (noise > 0 ? (rng() - 0.5) * noise : 0);
    if (s > bestScore) {
      bestScore = s;
      best = it;
    }
  }
  return best;
}

export type { Tile };
