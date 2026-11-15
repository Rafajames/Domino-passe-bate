import type { OpenEnd } from './board';
import type { RuleSet } from './rules/types';
import { handPips, hasValue, isDouble, type Tile } from './tiles';
import type { BatidaType } from './types';

export function sideOf(seat: number, rules: Pick<RuleSet, 'teams'>): number {
  return rules.teams ? seat % 2 : seat;
}

export function sideCount(rules: Pick<RuleSet, 'teams' | 'players'>): number {
  return rules.teams ? 2 : rules.players;
}

/**
 * Classifica a batida (Passe e Bate) a partir da última pedra e das pontas antes da jogada.
 * "Lá e lô": a pedra serve nas duas pontas. Ver docs/regras/passe-e-bate.md.
 */
export function classifyBatida(tile: Tile, endsBefore: readonly OpenEnd[]): BatidaType {
  const mainEnds = endsBefore.filter((e) => e.arm === 'left' || e.arm === 'right');
  const fitsBoth = mainEnds.length === 2 && mainEnds.every((e) => hasValue(tile, e.value));
  const dbl = isDouble(tile);
  if (fitsBoth) return dbl ? 'laELoCarroca' : 'laELoSimples';
  return dbl ? 'carroca' : 'simples';
}

export function roundToFive(n: number, mode: 'nearest' | 'down'): number {
  return mode === 'nearest' ? Math.round(n / 5) * 5 : Math.floor(n / 5) * 5;
}

/** Pontos do All Fives para uma soma de pontas (0 se não for múltiplo de 5). */
export function allFivesEndPoints(sum: number, rules: RuleSet): number {
  if (sum <= 0 || sum % 5 !== 0) return 0;
  return rules.allFives.scoringMode === 'full' ? sum : sum / 5;
}

function scaleAllFives(points: number, rules: RuleSet): number {
  const rounded = roundToFive(points, rules.allFives.endRounding);
  return rules.allFives.scoringMode === 'full' ? rounded : rounded / 5;
}

export interface EndOfRoundScore {
  winnerSide: number | null;
  points: number;
}

export function sidePips(hands: readonly (readonly Tile[])[], rules: RuleSet): number[] {
  const totals = new Array<number>(sideCount(rules)).fill(0);
  hands.forEach((h, seat) => {
    const side = sideOf(seat, rules);
    totals[side] = (totals[side] ?? 0) + handPips(h);
  });
  return totals;
}

export function scoreDomino(
  rules: RuleSet,
  winnerSeat: number,
  hands: readonly (readonly Tile[])[],
  batida: BatidaType,
): EndOfRoundScore {
  const winnerSide = sideOf(winnerSeat, rules);
  if (rules.mode === 'passe-bate') {
    return { winnerSide, points: rules.passeBate.batidaPoints[batida] };
  }
  const others = sidePips(hands, rules).reduce((s, v, side) => (side === winnerSide ? s : s + v), 0);
  return { winnerSide, points: scaleAllFives(others, rules) };
}

export function scoreBlocked(rules: RuleSet, hands: readonly (readonly Tile[])[]): EndOfRoundScore {
  if (rules.mode === 'passe-bate') {
    const { winner, points } = rules.passeBate.blocked;
    if (winner === 'none') return { winnerSide: null, points: 0 };
    if (winner === 'lowest-team') {
      const totals = sidePips(hands, rules);
      const side = uniqueMinIndex(totals);
      return side === null ? { winnerSide: null, points: 0 } : { winnerSide: side, points };
    }
    const perSeat = hands.map(handPips);
    const min = Math.min(...perSeat);
    const sides = new Set(perSeat.flatMap((p, seat) => (p === min ? [sideOf(seat, rules)] : [])));
    if (sides.size !== 1) return { winnerSide: null, points: 0 };
    return { winnerSide: [...sides][0] ?? null, points };
  }
  const totals = sidePips(hands, rules);
  const side = uniqueMinIndex(totals);
  if (side === null) return { winnerSide: null, points: 0 };
  const own = totals[side] ?? 0;
  const raw =
    rules.allFives.blockedScoring === 'others-total'
      ? totals.reduce((s, v, i) => (i === side ? s : s + v), 0)
      : totals.reduce((s, v, i) => (i === side ? s : s + (v - own)), 0);
  return { winnerSide: side, points: scaleAllFives(raw, rules) };
}

function uniqueMinIndex(values: readonly number[]): number | null {
  const min = Math.min(...values);
  const idx = values.flatMap((v, i) => (v === min ? [i] : []));
  return idx.length === 1 ? (idx[0] ?? null) : null;
}
