import { emptyBoard } from './board';
import { applyAction, archiveRound } from './match';
import type { ArchivedRound, GameAction, GameEvent, MatchState, PlayerSlot } from './types';
import type { FrozenRules } from './rules/types';

/**
 * Revisão de partidas. O motor é determinístico: partindo das mãos iniciais e
 * reaplicando as ações registradas, cada passo da rodada é reconstruído exatamente.
 */

export interface GameRecord {
  id: string;
  frozen: FrozenRules;
  players: readonly PlayerSlot[];
  rounds: readonly ArchivedRound[];
  finalScores: readonly number[];
  status: MatchState['status'];
  winnerSide: number | null;
  savedAt: string;
}

export interface ReplayStep {
  /** Estado depois do passo (o passo 0 é a mesa vazia com as mãos distribuídas). */
  match: MatchState;
  event: GameEvent | null;
}

/** Ações do jogador a partir do histórico de eventos. */
export function actionsFromEvents(events: readonly GameEvent[]): GameAction[] {
  const out: GameAction[] = [];
  for (const e of events) {
    if (e.kind === 'play') out.push({ type: 'play', seat: e.seat, tileId: e.tile.id, arm: e.arm });
    else if (e.kind === 'draw') out.push({ type: 'draw', seat: e.seat });
    else if (e.kind === 'pass') out.push({ type: 'pass', seat: e.seat });
    else if (e.kind === 'score' && e.reason === 'claim') out.push({ type: 'claim', seat: e.seat, points: e.points });
    else if (e.kind === 'claim-wrong') out.push({ type: 'claim', seat: e.seat, points: e.claimed });
  }
  return out;
}

export function replayRound(frozen: FrozenRules, players: readonly PlayerSlot[], round: ArchivedRound): ReplayStep[] {
  let match: MatchState = {
    id: 'replay',
    seed: 0,
    frozen,
    players,
    scores: round.scoresBefore,
    roundStartScores: round.scoresBefore,
    archive: [],
    round: {
      index: round.index,
      initial: round.initial,
      hands: round.initial.hands,
      boneyard: round.initial.boneyard,
      outOfPlay: round.initial.outOfPlay,
      board: emptyBoard(),
      starter: round.starter,
      turn: round.starter,
      turnNumber: 0,
      passesInRow: 0,
      mustOpenWith: round.mustOpenWith,
      pendingClaim: null,
      events: [{ kind: 'round-start', round: round.index, starter: round.starter, mustOpenWith: round.mustOpenWith }],
      result: null,
    },
    history: [],
    status: 'playing',
    winnerSide: null,
    startedAt: '',
  };
  const steps: ReplayStep[] = [{ match, event: null }];
  for (const action of actionsFromEvents(round.events)) {
    const before = match.round.events.length;
    match = applyAction(match, action);
    // O evento principal do passo (jogada, compra, passe ou marcação).
    const fresh = match.round.events.slice(before);
    const main = fresh.find((e) => e.kind === 'play' || e.kind === 'draw' || e.kind === 'pass' || e.kind === 'score' || e.kind === 'claim-wrong') ?? fresh[0] ?? null;
    steps.push({ match, event: main });
  }
  return steps;
}

/** Registro da partida para revisão: rodadas encerradas + a atual, se já terminou. */
export function buildGameRecord(match: MatchState, now = new Date()): GameRecord {
  const current = match.round.result ? archiveRound(match) : null;
  return {
    id: match.id,
    frozen: match.frozen,
    players: match.players,
    rounds: [...(match.archive ?? []), ...(current ? [current] : [])],
    finalScores: match.scores,
    status: match.status,
    winnerSide: match.winnerSide,
    savedAt: now.toISOString(),
  };
}
