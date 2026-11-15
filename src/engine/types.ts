import type { ArmId, BoardState } from './board';
import type { FrozenRules } from './rules/types';
import type { Tile } from './tiles';

export type BatidaType = 'simples' | 'carroca' | 'laELoSimples' | 'laELoCarroca';

export type GameAction =
  | { readonly type: 'play'; readonly seat: number; readonly tileId: string; readonly arm: ArmId | 'root' }
  | { readonly type: 'draw'; readonly seat: number }
  | { readonly type: 'pass'; readonly seat: number }
  | { readonly type: 'claim'; readonly seat: number; readonly points: number };

export interface Move {
  readonly tileId: string;
  readonly arm: ArmId | 'root';
}

export type GameEvent =
  | { readonly kind: 'round-start'; readonly round: number; readonly starter: number; readonly mustOpenWith: string | null }
  | { readonly kind: 'play'; readonly seat: number; readonly tile: Tile; readonly arm: ArmId | 'root'; readonly turn: number; readonly endsSum: number }
  | { readonly kind: 'draw'; readonly seat: number; readonly turn: number; readonly tileId: string | null }
  | { readonly kind: 'pass'; readonly seat: number; readonly turn: number; readonly openValues: readonly number[] }
  | { readonly kind: 'score'; readonly seat: number; readonly side: number; readonly points: number; readonly reason: 'ends' | 'claim' }
  | { readonly kind: 'claim-wrong'; readonly seat: number; readonly claimed: number }
  | { readonly kind: 'claim-missed'; readonly seat: number }
  | { readonly kind: 'round-end'; readonly result: RoundResult };

export interface RoundResult {
  readonly round: number;
  readonly type: 'domino' | 'blocked';
  readonly winnerSeat: number | null;
  readonly winnerSide: number | null;
  readonly batida: BatidaType | null;
  readonly points: number;
  readonly pipCounts: readonly number[];
  readonly hands: readonly (readonly Tile[])[];
}

export interface PendingClaim {
  readonly seat: number;
  readonly points: number;
}

export interface RoundState {
  readonly index: number;
  readonly hands: readonly (readonly Tile[])[];
  readonly boneyard: readonly Tile[];
  readonly outOfPlay: readonly Tile[];
  readonly board: BoardState;
  readonly starter: number;
  readonly turn: number;
  readonly turnNumber: number;
  readonly passesInRow: number;
  readonly mustOpenWith: string | null;
  readonly pendingClaim: PendingClaim | null;
  readonly events: readonly GameEvent[];
  readonly result: RoundResult | null;
}

export interface PlayerSlot {
  readonly seat: number;
  readonly name: string;
  readonly kind: 'human' | 'bot';
  readonly difficulty?: BotDifficulty;
  readonly avatar: string;
}

export type BotDifficulty = 'facil' | 'normal' | 'dificil' | 'mestre';

export interface MatchState {
  readonly id: string;
  readonly seed: number;
  readonly frozen: FrozenRules;
  readonly players: readonly PlayerSlot[];
  readonly scores: readonly number[];
  readonly round: RoundState;
  readonly history: readonly RoundResult[];
  readonly status: 'playing' | 'round-over' | 'finished';
  readonly winnerSide: number | null;
  readonly startedAt: string;
}
