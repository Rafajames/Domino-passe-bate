import { canPlayOn, emptyBoard, endsSum, openEnds, placeTile, type BoardState } from './board';
import { createRng, shuffle } from './rng';
import type { FrozenRules, RuleSet } from './rules/types';
import { allFivesEndPoints, classifyBatida, scoreBlocked, scoreDomino, sideCount, sideOf } from './scoring';
import { fullSet, handPips, type Tile } from './tiles';
import type { ArchivedRound, GameAction, GameEvent, MatchState, Move, PlayerSlot, RoundResult, RoundState } from './types';

export class IllegalActionError extends Error {}

// ---------------------------------------------------------------- distribuição

function findHolder(hands: readonly (readonly Tile[])[], tileId: string): number {
  return hands.findIndex((h) => h.some((t) => t.id === tileId));
}

function highestDoubleHolder(hands: readonly (readonly Tile[])[]): { seat: number; tileId: string } | null {
  for (let v = 6; v >= 0; v--) {
    const id = `${v}-${v}`;
    const seat = findHolder(hands, id);
    if (seat >= 0) return { seat, tileId: id };
  }
  return null;
}

/**
 * Valida mãos escolhidas pelos jogadores (modo "embaralhar e escolher"):
 * quantidade certa por jogador, pedras existentes e sem repetição.
 */
export function validatePresetHands(rules: RuleSet, hands: readonly (readonly Tile[])[]): void {
  if (hands.length !== rules.players) throw new IllegalActionError('Mãos escolhidas não conferem com o número de jogadores.');
  const valid = new Set(fullSet(6).map((t) => t.id));
  const seen = new Set<string>();
  for (const h of hands) {
    if (h.length !== rules.handSize) throw new IllegalActionError(`Cada jogador deve escolher ${rules.handSize} pedras.`);
    for (const t of h) {
      if (!valid.has(t.id) || seen.has(t.id)) throw new IllegalActionError(`Pedra inválida ou repetida: ${t.id}`);
      seen.add(t.id);
    }
  }
}

export function dealRound(
  rules: RuleSet,
  seed: number,
  index: number,
  previous: { starter: number; winnerSeat: number | null } | null,
  presetHands?: readonly (readonly Tile[])[],
): RoundState {
  const rng = createRng((seed + Math.imul(index + 1, 0x9e3779b1)) >>> 0);
  const deck = shuffle(fullSet(6), rng);
  const hands: Tile[][] = [];
  let rest: Tile[];
  if (presetHands) {
    validatePresetHands(rules, presetHands);
    presetHands.forEach((h) => hands.push(h.slice()));
    const taken = new Set(presetHands.flat().map((t) => t.id));
    rest = deck.filter((t) => !taken.has(t.id));
  } else {
    let order = deck;
    // "Sair de carroça": se nenhuma mão tiver carroça, embaralha de novo (determinístico).
    for (let attempt = 0; attempt < 50; attempt++) {
      const dealt = Array.from({ length: rules.players }, (_, s) => order.slice(s * rules.handSize, (s + 1) * rules.handSize));
      if (!rules.openWithDouble || dealt.some((h) => h.some((t) => t.a === t.b))) break;
      order = shuffle(fullSet(6), rng);
    }
    for (let s = 0; s < rules.players; s++) hands.push(order.slice(s * rules.handSize, (s + 1) * rules.handSize));
    rest = order.slice(rules.players * rules.handSize);
  }

  let starter = 0;
  let mustOpenWith: string | null = null;
  if (previous) {
    starter =
      rules.nextRoundStarter === 'round-winner' && previous.winnerSeat !== null
        ? previous.winnerSeat
        : (previous.starter + 1) % rules.players;
  } else if (rules.opening === 'any') {
    starter = Math.floor(rng() * rules.players);
  } else {
    const holder =
      rules.opening === 'double-six' && findHolder(hands, '6-6') >= 0
        ? { seat: findHolder(hands, '6-6'), tileId: '6-6' }
        : highestDoubleHolder(hands);
    if (holder) {
      starter = holder.seat;
      mustOpenWith = holder.tileId;
    } else {
      starter = Math.floor(rng() * rules.players);
    }
  }

  // Sair de carroça: se quem sairia não tem carroça, sai o próximo da roda que tiver.
  let mustOpenDouble = false;
  if (rules.openWithDouble && !mustOpenWith) {
    for (let k = 0; k < rules.players; k++) {
      const seat = (starter + k) % rules.players;
      if ((hands[seat] ?? []).some((t) => t.a === t.b)) {
        starter = seat;
        mustOpenDouble = true;
        break;
      }
    }
  }

  const boneyard = rules.boneyard ? rest : [];
  const outOfPlay = rules.boneyard ? [] : rest;
  return {
    index,
    initial: { hands: hands.map((h) => h.slice()), boneyard, outOfPlay },
    hands,
    boneyard,
    outOfPlay,
    board: emptyBoard(),
    starter,
    turn: starter,
    turnNumber: 0,
    passesInRow: 0,
    mustOpenWith,
    mustOpenDouble,
    pendingClaim: null,
    events: [{ kind: 'round-start', round: index, starter, mustOpenWith, mustOpenDouble }],
    result: null,
  };
}

export interface CreateMatchInput {
  id: string;
  frozen: FrozenRules;
  players: readonly PlayerSlot[];
  seed: number;
  now?: Date;
  /** Mãos escolhidas pelos jogadores para a 1ª rodada (modo "embaralhar e escolher"). */
  presetHands?: readonly (readonly Tile[])[];
}

export function createMatch({ id, frozen, players, seed, now = new Date(), presetHands }: CreateMatchInput): MatchState {
  const rules = frozen.rules;
  if (players.length !== rules.players) throw new Error('Quantidade de jogadores não confere com as regras.');
  return {
    id,
    seed,
    frozen,
    players,
    scores: new Array<number>(sideCount(rules)).fill(0),
    roundStartScores: new Array<number>(sideCount(rules)).fill(0),
    archive: [],
    round: dealRound(rules, seed, 0, null, presetHands),
    history: [],
    status: 'playing',
    winnerSide: null,
    startedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------- consultas

export function legalMovesFor(
  board: BoardState,
  hand: readonly Tile[],
  mustOpenWith: string | null,
  mustOpenDouble = false,
): Move[] {
  if (!board.root) {
    const candidates = mustOpenWith
      ? hand.filter((t) => t.id === mustOpenWith)
      : mustOpenDouble
        ? hand.filter((t) => t.a === t.b)
        : hand;
    return candidates.map((t) => ({ tileId: t.id, arm: 'root' as const }));
  }
  const ends = openEnds(board);
  const moves: Move[] = [];
  for (const tile of hand) for (const end of ends) if (canPlayOn(tile, end)) moves.push({ tileId: tile.id, arm: end.arm });
  return moves;
}

export function legalMoves(match: MatchState, seat: number): Move[] {
  const r = match.round;
  if (match.status !== 'playing' || r.turn !== seat) return [];
  return legalMovesFor(r.board, r.hands[seat] ?? [], r.mustOpenWith, r.mustOpenDouble);
}

export function drawableCount(round: RoundState, rules: RuleSet): number {
  return rules.boneyard ? Math.max(0, round.boneyard.length - rules.boneyardReserve) : 0;
}

export function canDraw(match: MatchState, seat: number): boolean {
  return (
    match.status === 'playing' &&
    match.round.turn === seat &&
    legalMoves(match, seat).length === 0 &&
    drawableCount(match.round, match.frozen.rules) > 0
  );
}

export function canPass(match: MatchState, seat: number): boolean {
  return (
    match.status === 'playing' &&
    match.round.turn === seat &&
    legalMoves(match, seat).length === 0 &&
    drawableCount(match.round, match.frozen.rules) === 0
  );
}

// ---------------------------------------------------------------- ações

function withScore(scores: readonly number[], side: number, points: number): number[] {
  const next = scores.slice();
  next[side] = (next[side] ?? 0) + points;
  return next;
}

function reachedTarget(scores: readonly number[], target: number): number | null {
  let best: number | null = null;
  scores.forEach((s, side) => {
    if (s >= target && (best === null || s > (scores[best] ?? 0))) best = side;
  });
  if (best === null) return null;
  const top = scores[best] ?? 0;
  return scores.filter((s) => s === top).length > 1 ? null : best;
}

/** Fecha a janela de marcação manual quando outro jogador age. */
function expireClaim(round: RoundState, actingSeat: number): RoundState {
  const pc = round.pendingClaim;
  if (!pc || pc.seat === actingSeat) return round;
  const events: GameEvent[] = pc.points > 0 ? [...round.events, { kind: 'claim-missed', seat: pc.seat }] : [...round.events];
  return { ...round, pendingClaim: null, events };
}

function endRound(match: MatchState, round: RoundState, result: RoundResult, scores: readonly number[]): MatchState {
  const finalScores = result.winnerSide !== null ? withScore(scores, result.winnerSide, result.points) : scores.slice();
  const finishedRound: RoundState = {
    ...round,
    result,
    events: [...round.events, { kind: 'round-end', result }],
  };
  const winner = reachedTarget(finalScores, match.frozen.rules.targetScore);
  return {
    ...match,
    scores: finalScores,
    // Partida decidida: não há mais o que marcar.
    round: winner !== null ? { ...finishedRound, pendingClaim: null } : finishedRound,
    history: [...match.history, result],
    status: winner !== null ? 'finished' : 'round-over',
    winnerSide: winner,
  };
}

function assertTurn(match: MatchState, seat: number): void {
  if (match.status !== 'playing') throw new IllegalActionError('A rodada não está em andamento.');
  if (match.round.turn !== seat) throw new IllegalActionError('Não é a vez deste jogador.');
}

export function applyAction(match: MatchState, action: GameAction): MatchState {
  const rules = match.frozen.rules;
  switch (action.type) {
    case 'claim':
      return applyClaim(match, action.seat, action.points);
    case 'play': {
      assertTurn(match, action.seat);
      const legal = legalMoves(match, action.seat).some((m) => m.tileId === action.tileId && m.arm === action.arm);
      if (!legal) throw new IllegalActionError('Jogada inválida.');
      let round = expireClaim(match.round, action.seat);
      const hand = round.hands[action.seat] ?? [];
      const tile = hand.find((t) => t.id === action.tileId);
      if (!tile) throw new IllegalActionError('A pedra não pertence a este jogador.');
      const endsBefore = openEnds(round.board);
      const board = placeTile(round.board, tile, action.arm, action.seat, round.turnNumber, rules.spinner);
      const hands = round.hands.map((h, s) => (s === action.seat ? h.filter((t) => t.id !== tile.id) : h));
      const sum = endsSum(board);
      const events: GameEvent[] = [
        ...round.events,
        { kind: 'play', seat: action.seat, tile, arm: action.arm, turn: round.turnNumber, endsSum: sum },
      ];
      let scores = match.scores;
      let pendingClaim = null as RoundState['pendingClaim'];
      if (rules.mode === 'all-fives') {
        const pts = allFivesEndPoints(sum, rules);
        if (rules.assists.autoScore) {
          if (pts > 0) {
            const side = sideOf(action.seat, rules);
            scores = withScore(scores, side, pts);
            events.push({ kind: 'score', seat: action.seat, side, points: pts, reason: 'ends' });
          }
        } else {
          pendingClaim = { seat: action.seat, points: pts };
        }
      }
      round = {
        ...round,
        board,
        hands,
        events,
        pendingClaim,
        passesInRow: 0,
        mustOpenWith: null,
        mustOpenDouble: false,
        turnNumber: round.turnNumber + 1,
        turn: (action.seat + 1) % rules.players,
      };
      if (rules.mode === 'all-fives' && rules.allFives.winImmediately) {
        const winner = reachedTarget(scores, rules.targetScore);
        if (winner !== null) return { ...match, scores, round, status: 'finished', winnerSide: winner };
      }
      if ((hands[action.seat] ?? []).length === 0) {
        const batida = classifyBatida(tile, endsBefore);
        const { winnerSide, points } = scoreDomino(rules, action.seat, hands, batida);
        const result: RoundResult = {
          round: round.index,
          type: 'domino',
          winnerSeat: action.seat,
          winnerSide,
          batida: rules.mode === 'passe-bate' ? batida : null,
          points,
          pipCounts: hands.map(handPips),
          hands,
        };
        return endRound(match, round, result, scores);
      }
      return { ...match, scores, round };
    }
    case 'draw': {
      assertTurn(match, action.seat);
      if (!canDraw(match, action.seat)) throw new IllegalActionError('Compra não permitida agora.');
      let round = expireClaim(match.round, action.seat);
      const [tile, ...boneyard] = round.boneyard;
      if (!tile) throw new IllegalActionError('Dorme vazio.');
      const hands = round.hands.map((h, s) => (s === action.seat ? [...h, tile] : h));
      round = {
        ...round,
        hands,
        boneyard,
        events: [...round.events, { kind: 'draw', seat: action.seat, turn: round.turnNumber, tileId: tile.id }],
      };
      return { ...match, round };
    }
    case 'pass': {
      assertTurn(match, action.seat);
      if (!canPass(match, action.seat)) throw new IllegalActionError('Passe não permitido: há jogada ou compra disponível.');
      let round = expireClaim(match.round, action.seat);
      const openValues = openEnds(round.board).map((e) => e.value);
      // Pontuação por passe provocado (Boa Vista): PENDENTE — intencionalmente não aplicada.
      round = {
        ...round,
        passesInRow: round.passesInRow + 1,
        turnNumber: round.turnNumber + 1,
        turn: (action.seat + 1) % rules.players,
        events: [...round.events, { kind: 'pass', seat: action.seat, turn: round.turnNumber, openValues }],
      };
      if (round.passesInRow >= rules.players) {
        const { winnerSide, points } = scoreBlocked(rules, round.hands);
        const result: RoundResult = {
          round: round.index,
          type: 'blocked',
          winnerSeat: null,
          winnerSide,
          batida: null,
          points,
          pipCounts: round.hands.map(handPips),
          hands: round.hands,
        };
        return endRound(match, round, result, match.scores);
      }
      return { ...match, round };
    }
  }
}

function applyClaim(match: MatchState, seat: number, points: number): MatchState {
  const rules = match.frozen.rules;
  const pc = match.round.pendingClaim;
  if (!pc || pc.seat !== seat) throw new IllegalActionError('Não há marcação disponível para este jogador.');
  if (match.status === 'finished') throw new IllegalActionError('Partida encerrada.');
  const round: RoundState = { ...match.round, pendingClaim: null };
  if (pc.points <= 0 || points !== pc.points) {
    return { ...match, round: { ...round, events: [...round.events, { kind: 'claim-wrong', seat, claimed: points }] } };
  }
  const side = sideOf(seat, rules);
  const scores = withScore(match.scores, side, points);
  const next: MatchState = {
    ...match,
    scores,
    round: { ...round, events: [...round.events, { kind: 'score', seat, side, points, reason: 'claim' }] },
  };
  const winner = reachedTarget(scores, rules.targetScore);
  if (winner !== null && (rules.allFives.winImmediately || match.status === 'round-over')) {
    return { ...next, status: 'finished', winnerSide: winner };
  }
  return next;
}

export function startNextRound(match: MatchState, presetHands?: readonly (readonly Tile[])[]): MatchState {
  if (match.status !== 'round-over') throw new IllegalActionError('A rodada atual ainda não terminou.');
  const prev = match.round;
  const winnerSeat = prev.result?.winnerSeat ?? blockedWinnerSeat(match);
  const round = dealRound(match.frozen.rules, match.seed, prev.index + 1, { starter: prev.starter, winnerSeat }, presetHands);
  const archived = archiveRound(match);
  return {
    ...match,
    round,
    status: 'playing',
    archive: archived ? [...(match.archive ?? []), archived] : match.archive,
    roundStartScores: match.scores,
  };
}

/** No jogo trancado, inicia a próxima rodada o jogador de menor mão do lado vencedor. */
function blockedWinnerSeat(match: MatchState): number | null {
  const res = match.round.result;
  if (!res || res.winnerSide === null) return null;
  const rules = match.frozen.rules;
  let best: number | null = null;
  res.pipCounts.forEach((p, seat) => {
    if (sideOf(seat, rules) !== res.winnerSide) return;
    if (best === null || p < (res.pipCounts[best] ?? Infinity)) best = seat;
  });
  return best;
}


/** Converte a rodada atual em registro de revisão (null se faltarem dados antigos). */
export function archiveRound(match: MatchState): ArchivedRound | null {
  const r = match.round;
  if (!r.initial) return null;
  return {
    index: r.index,
    starter: r.starter,
    mustOpenWith: (r.events[0]?.kind === 'round-start' ? r.events[0].mustOpenWith : null) ?? null,
    mustOpenDouble: r.events[0]?.kind === 'round-start' ? (r.events[0].mustOpenDouble ?? false) : false,
    initial: r.initial,
    events: r.events,
    result: r.result,
    scoresBefore: match.roundStartScores ?? new Array<number>(match.scores.length).fill(0),
    scoresAfter: match.scores,
  };
}
