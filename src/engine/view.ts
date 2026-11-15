import type { BoardState } from './board';
import { drawableCount, legalMovesFor } from './match';
import type { RuleSet } from './rules/types';
import type { Tile } from './tiles';
import type { GameEvent, MatchState, Move } from './types';

/**
 * Tudo o que um jogador sentado no assento `seat` pode legitimamente saber.
 * Mãos dos outros jogadores e o conteúdo do dorme NUNCA aparecem aqui.
 * É a única entrada aceita pela IA e o formato que o servidor enviará aos clientes.
 */
export interface PlayerView {
  readonly seat: number;
  readonly rules: RuleSet;
  readonly hand: readonly Tile[];
  readonly handCounts: readonly number[];
  readonly board: BoardState;
  readonly boneyardCount: number;
  readonly drawable: number;
  readonly turn: number;
  readonly turnNumber: number;
  readonly mustOpenWith: string | null;
  readonly scores: readonly number[];
  readonly events: readonly GameEvent[];
  readonly myPendingClaim: boolean;
  readonly roundIndex: number;
}

function redact(e: GameEvent, seat: number): GameEvent {
  if (e.kind === 'draw' && e.seat !== seat) return { ...e, tileId: null };
  if (e.kind === 'round-end') return e; // mãos são reveladas ao fim da rodada, como na mesa
  return e;
}

export function playerView(match: MatchState, seat: number): PlayerView {
  const r = match.round;
  const rules = match.frozen.rules;
  return {
    seat,
    rules,
    hand: r.hands[seat] ?? [],
    handCounts: r.hands.map((h) => h.length),
    board: r.board,
    boneyardCount: r.boneyard.length,
    drawable: drawableCount(r, rules),
    turn: r.turn,
    turnNumber: r.turnNumber,
    mustOpenWith: r.mustOpenWith && (r.hands[seat] ?? []).some((t) => t.id === r.mustOpenWith) ? r.mustOpenWith : null,
    scores: match.scores,
    events: r.events.map((e) => redact(e, seat)),
    myPendingClaim: r.pendingClaim?.seat === seat,
    roundIndex: r.index,
  };
}

export function viewLegalMoves(view: PlayerView): Move[] {
  if (view.turn !== view.seat) return [];
  return legalMovesFor(view.board, view.hand, view.mustOpenWith);
}
