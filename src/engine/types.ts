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
  | { readonly kind: 'round-start'; readonly round: number; readonly starter: number; readonly mustOpenWith: string | null; readonly mustOpenDouble?: boolean }
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
  /** Burrinha: quem perdeu a rodada (recebe pedras a mais). */
  readonly loserSeats?: readonly number[];
  readonly pipCounts: readonly number[];
  readonly hands: readonly (readonly Tile[])[];
}

export interface PendingClaim {
  readonly seat: number;
  readonly points: number;
}

/** Situação no momento da distribuição (para revisar a rodada depois). */
export interface RoundInitial {
  readonly hands: readonly (readonly Tile[])[];
  readonly boneyard: readonly Tile[];
  readonly outOfPlay: readonly Tile[];
}

export interface RoundState {
  readonly index: number;
  /** Ausente em partidas salvas antes da revisão existir. */
  readonly initial?: RoundInitial;
  readonly hands: readonly (readonly Tile[])[];
  readonly boneyard: readonly Tile[];
  readonly outOfPlay: readonly Tile[];
  readonly board: BoardState;
  readonly starter: number;
  readonly turn: number;
  readonly turnNumber: number;
  readonly passesInRow: number;
  readonly mustOpenWith: string | null;
  /** A primeira pedra da rodada tem de ser uma carroça (qualquer uma). */
  readonly mustOpenDouble?: boolean;
  readonly pendingClaim: PendingClaim | null;
  readonly events: readonly GameEvent[];
  readonly result: RoundResult | null;
  /** Burrinha: assentos que já bateram nesta rodada, em ordem. */
  readonly finished?: readonly number[];
}

export interface PlayerSlot {
  readonly seat: number;
  readonly name: string;
  readonly kind: 'human' | 'bot';
  readonly difficulty?: BotDifficulty;
  readonly avatar: string;
}

export type BotDifficulty = 'facil' | 'normal' | 'dificil' | 'mestre';

/** Rodada encerrada guardada para revisão. */
export interface ArchivedRound {
  readonly index: number;
  readonly starter: number;
  readonly mustOpenWith: string | null;
  readonly mustOpenDouble?: boolean;
  readonly initial: RoundInitial;
  readonly events: readonly GameEvent[];
  readonly result: RoundResult | null;
  readonly scoresBefore: readonly number[];
  readonly scoresAfter: readonly number[];
}

export interface MatchState {
  readonly id: string;
  /** Rodadas anteriores (para revisão). A rodada atual fica em `round`. */
  readonly archive?: readonly ArchivedRound[];
  /** Placar no início da rodada atual. */
  readonly roundStartScores?: readonly number[];
  readonly seed: number;
  readonly frozen: FrozenRules;
  readonly players: readonly PlayerSlot[];
  readonly scores: readonly number[];
  readonly round: RoundState;
  readonly history: readonly RoundResult[];
  readonly status: 'playing' | 'round-over' | 'finished';
  readonly winnerSide: number | null;
  readonly startedAt: string;
  /** Burrinha: pedras de cada jogador na rodada atual. */
  readonly handSizes?: readonly number[];
  /** Burrinha: quem terminou a partida com mais castigos ("a burrinha"). */
  readonly loserSeats?: readonly number[];
}
