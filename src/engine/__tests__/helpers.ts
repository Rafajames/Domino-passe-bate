import { BUILTIN_PROFILES, freezeRules, type RuleSet } from '../rules';
import { createMatch } from '../match';
import { makeTile, type Tile } from '../tiles';
import type { MatchState, PlayerSlot, RoundState } from '../types';
import { emptyBoard } from '../board';

export const t = (a: number, b: number): Tile => makeTile(a, b);

export function profile(id: string) {
  const p = BUILTIN_PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p;
}

export function players(n: number): PlayerSlot[] {
  return Array.from({ length: n }, (_, seat) => ({ seat, name: `P${seat}`, kind: 'bot' as const, difficulty: 'normal' as const, avatar: 'a' }));
}

export function matchWith(id: string, overrides: Partial<RuleSet> = {}, seed = 1): MatchState {
  const p = profile(id);
  const frozen = freezeRules(p, { ...p.rules, ...overrides });
  return createMatch({ id: 'm', frozen, players: players(frozen.rules.players), seed });
}

/** Substitui a rodada por um cenário controlado. */
export function withRound(match: MatchState, patch: Partial<RoundState>): MatchState {
  return {
    ...match,
    round: {
      ...match.round,
      board: emptyBoard(),
      boneyard: [],
      mustOpenWith: null,
      pendingClaim: null,
      passesInRow: 0,
      ...patch,
    },
  };
}
