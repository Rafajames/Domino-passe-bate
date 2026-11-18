import type { Tile } from '../engine/tiles';
import type { GameEvent, MatchState } from '../engine/types';

/** Pedra virada (sem valores) usada para manter a quantidade sem revelar a face. */
function hidden(prefix: string, n: number): Tile[] {
  return Array.from({ length: n }, (_, i) => ({ id: `?${prefix}${i}`, a: -1, b: -1 }));
}

/**
 * Estado da partida como um convidado pode ver: a própria mão, a mesa e o
 * histórico público. Mãos alheias, dorme e cemitério viram pedras viradas.
 * Ao fim da rodada, como na mesa, as mãos são reveladas (em `result`).
 */
export function redactMatch(match: MatchState, seat: number): MatchState {
  const r = match.round;
  const over = r.result !== null;
  const events: GameEvent[] = r.events.map((e) => (e.kind === 'draw' && e.seat !== seat ? { ...e, tileId: null } : e));
  const pc = r.pendingClaim;
  return {
    ...match,
    seed: 0,
    archive: [],
    round: {
      ...r,
      initial: undefined,
      hands: r.hands.map((h, s) => (s === seat || over ? h : hidden(`h${s}-`, h.length))),
      boneyard: hidden('b', r.boneyard.length),
      outOfPlay: over ? r.outOfPlay : hidden('o', r.outOfPlay.length),
      events,
      pendingClaim: pc && pc.seat === seat ? { seat, points: -1 } : null,
    },
  };
}
