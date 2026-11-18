import type { RuleSet } from './rules/types';
import { handPips, type Tile } from './tiles';

/** Regras da burrinha com valores padrão (dados antigos podem não ter o campo). */
export function burrinhaRules(rules: RuleSet) {
  return { startTiles: 3, penalty: 1, loser: 'last-remaining' as const, ...rules.burrinha };
}

export const isBurrinha = (rules: RuleSet) => rules.mode === 'burrinha';

/** Próximo jogador da roda; na burrinha, pula quem já bateu. */
export function nextSeat(rules: RuleSet, hands: readonly (readonly Tile[])[], from: number): number {
  const n = rules.players;
  if (!isBurrinha(rules)) return (from + 1) % n;
  for (let k = 1; k <= n; k++) {
    const s = (from + k) % n;
    if ((hands[s]?.length ?? 0) > 0) return s;
  }
  return (from + 1) % n;
}

export function activeSeats(hands: readonly (readonly Tile[])[]): number[] {
  return hands.flatMap((h, s) => (h.length > 0 ? [s] : []));
}

/** Entre os candidatos, quem tem mais pontos na mão (empates: todos). */
export function mostPips(hands: readonly (readonly Tile[])[], candidates: readonly number[]): number[] {
  const max = Math.max(...candidates.map((s) => handPips(hands[s] ?? [])));
  return candidates.filter((s) => handPips(hands[s] ?? []) === max);
}

/** Tamanho das mãos na próxima rodada e se a partida acabou (o dorme acabaria). */
export function nextHandSizes(rules: RuleSet, sizes: readonly number[], losers: readonly number[]) {
  const { penalty } = burrinhaRules(rules);
  const next = sizes.map((n, s) => (losers.includes(s) ? n + penalty : n));
  const total = next.reduce((a, b) => a + b, 0);
  return { next, matchOver: total >= 28 };
}

export function initialHandSizes(rules: RuleSet): number[] {
  return new Array<number>(rules.players).fill(burrinhaRules(rules).startTiles);
}
