import { describe, expect, it } from 'vitest';
import { applyAction, canDraw, legalMoves, startNextRound } from '../match';
import { replayRound, buildGameRecord } from '../replay';
import { createRng } from '../rng';
import { playerView } from '../view';
import { decideTurn } from '../../ai/bots';
import type { MatchState } from '../types';
import { matchWith, t, withRound } from './helpers';

function step(m: MatchState, rng: () => number): MatchState {
  const seat = m.round.turn;
  return applyAction(m, decideTurn(playerView(m, seat), 'normal', rng));
}

describe('burrinha', () => {
  it('começa com 3 pedras cada e o resto no dorme', () => {
    const m = matchWith('burrinha-pb');
    expect(m.round.hands.map((h) => h.length)).toEqual([3, 3, 3, 3]);
    expect(m.round.boneyard).toHaveLength(16);
    expect(m.handSizes).toEqual([3, 3, 3, 3]);
  });

  it('quem bate sai da rodada; o jogo continua e perde o último com pedras', () => {
    let m = matchWith('burrinha-pb', { players: 3 });
    m = withRound(m, {
      hands: [[t(6, 1)], [t(6, 2), t(0, 0)], [t(6, 3), t(5, 5)]],
      boneyard: [],
      turn: 0,
      board: { root: { tile: t(6, 6), seat: 2, turn: 0, leftValue: 6, rightValue: 6 }, arms: { left: [], right: [], up: [], down: [] }, spinner: null },
    });
    m = applyAction(m, { type: 'play', seat: 0, tileId: '1-6', arm: 'left' });
    expect(m.status).toBe('playing');
    expect(m.round.finished).toEqual([0]);
    expect(m.round.turn).toBe(1);
    m = applyAction(m, { type: 'play', seat: 1, tileId: '2-6', arm: 'right' });
    // assento 2 não encaixa (pontas 1 e 2) e não há dorme: passa; assento 1 (0-0) também não; trancado entre os ativos
    expect(m.round.turn).toBe(2);
    m = applyAction(m, { type: 'pass', seat: 2 });
    expect(m.round.turn).toBe(1); // pula o assento 0, que já bateu
    m = applyAction(m, { type: 'pass', seat: 1 });
    expect(m.status).toBe('round-over');
    // menor mão vence o trancado: assento 1 tem 0 pontos, assento 2 tem 19 → assento 2 perde
    expect(m.round.result?.loserSeats).toEqual([2]);
    expect(m.scores).toEqual([0, 0, 1]);
    expect(m.handSizes).toEqual([3, 3, 4]);
    const next = startNextRound(m);
    expect(next.round.hands.map((h) => h.length)).toEqual([3, 3, 4]);
  });

  it('a partida acaba quando o dorme acabaria e aponta a burrinha', () => {
    for (const seed of [1, 2, 3]) {
      let m = matchWith('burrinha-pb', { players: 4 }, seed);
      const rng = createRng(seed);
      let guard = 0;
      while (m.status !== 'finished' && guard++ < 20000) {
        if (m.status === 'round-over') {
          m = startNextRound(m);
          continue;
        }
        m = step(m, rng);
      }
      expect(m.status).toBe('finished');
      expect((m.handSizes ?? []).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(28);
      const max = Math.max(...m.scores);
      expect(m.loserSeats?.every((s) => m.scores[s] === max)).toBe(true);
      // a revisão reconstrói a última rodada
      const rec = buildGameRecord(m);
      const last = rec.rounds[rec.rounds.length - 1]!;
      const steps = replayRound(rec.frozen, rec.players, last);
      expect(steps[steps.length - 1]!.match.round.result?.loserSeats).toEqual(last.result?.loserSeats);
    }
  });

  it('variação: perde quem tiver mais pontos quando alguém bate', () => {
    let m = matchWith('burrinha-pb', { players: 3, burrinha: { startTiles: 3, penalty: 1, loser: 'most-pips' } });
    m = withRound(m, {
      hands: [[t(6, 1)], [t(6, 2), t(0, 0)], [t(5, 5)]],
      boneyard: [],
      turn: 0,
      board: { root: { tile: t(6, 6), seat: 2, turn: 0, leftValue: 6, rightValue: 6 }, arms: { left: [], right: [], up: [], down: [] }, spinner: null },
    });
    m = applyAction(m, { type: 'play', seat: 0, tileId: '1-6', arm: 'left' });
    expect(m.status).toBe('round-over');
    expect(m.round.result?.loserSeats).toEqual([2]);
    expect(legalMoves(m, 1)).toEqual([]);
    expect(canDraw(m, 1)).toBe(false);
  });
});
