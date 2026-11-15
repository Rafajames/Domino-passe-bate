import { describe, expect, it } from 'vitest';
import { applyAction, startNextRound } from '../../engine/match';
import { createRng } from '../../engine/rng';
import { playerView } from '../../engine/view';
import type { BotDifficulty, MatchState } from '../../engine/types';
import { decideClaim, decideTurn } from '../bots';
import { buildKnowledge, sampleWorld } from '../inference';
import { matchWith, t, withRound } from '../../engine/__tests__/helpers';

function playOut(m: MatchState, diffs: BotDifficulty[], seed: number, maxRounds = 30): MatchState {
  const rng = createRng(seed);
  let rounds = 0;
  let guard = 0;
  while (m.status !== 'finished' && rounds < maxRounds && guard++ < 5000) {
    if (m.status === 'round-over') {
      m = startNextRound(m);
      rounds++;
      continue;
    }
    const seat = m.round.turn;
    const v = playerView(m, seat);
    m = applyAction(m, decideTurn(v, diffs[seat] as BotDifficulty, rng, { masterBudgetMs: 2 }));
    if (m.round.pendingClaim) {
      const c = m.round.pendingClaim.seat;
      const claim = decideClaim(playerView(m, c), diffs[c] as BotDifficulty, rng);
      if (claim) m = applyAction(m, claim);
    }
  }
  return m;
}

describe('bots', () => {
  const levels: BotDifficulty[] = ['facil', 'normal', 'dificil', 'mestre'];
  for (const level of levels) {
    it(`${level}: completa partidas válidas nas duas modalidades`, () => {
      const pb = playOut(matchWith('pb-paraiba', {}, 7), [level, level, level, level], 1);
      expect(pb.status).toBe('finished');
      const af = playOut(matchWith('af-padrao', { targetScore: 60 }, 9), [level, level], 2);
      expect(af.status).toBe('finished');
      const bv = playOut(matchWith('af-boa-vista', { targetScore: 60, assists: { highlightPlayable: false, autoScore: false } }, 11), [level, level, level, level], 3);
      expect(['finished', 'round-over', 'playing']).toContain(bv.status);
    }, 60_000);
  }

  it('dificil vence o fácil na maioria das partidas de All Fives', () => {
    let hardWins = 0;
    const games = 16;
    for (let g = 0; g < games; g++) {
      const hardSeat = g % 2;
      const diffs: BotDifficulty[] = hardSeat === 0 ? ['dificil', 'facil'] : ['facil', 'dificil'];
      const m = playOut(matchWith('af-padrao', { targetScore: 100 }, 100 + g), diffs, 500 + g);
      if (m.winnerSide === hardSeat) hardWins++;
    }
    expect(hardWins).toBeGreaterThan(games / 2);
  }, 60_000);
});

describe('inferência', () => {
  it('deduz valores ausentes a partir do passe', () => {
    let m = matchWith('pb-paraiba');
    m = withRound(m, {
      hands: [[t(0, 1), t(2, 2)], [t(0, 2)], [t(1, 3), t(4, 4)], [t(1, 2)]],
      turn: 0,
      board: { root: { tile: t(6, 6), seat: 3, turn: 0, leftValue: 6, rightValue: 6 }, arms: { left: [], right: [], up: [], down: [] }, spinner: null },
    });
    m = applyAction(m, { type: 'pass', seat: 0 });
    const k = buildKnowledge(playerView(m, 1));
    expect(k.voids[0]?.has(6)).toBe(true);
  });

  it('mundos sorteados respeitam contagens e valores ausentes', () => {
    const m = matchWith('pb-paraiba', {}, 3);
    const v = playerView(m, 0);
    const k = buildKnowledge(v);
    k.voids[1] = new Set([6]);
    const world = sampleWorld(v, k, createRng(1));
    expect(world).not.toBeNull();
    expect(world!.hands.map((h) => h.length)).toEqual(v.handCounts);
    expect(world!.hands[1]!.some((x) => x.a === 6 || x.b === 6)).toBe(false);
    expect(world!.hands[0]).toEqual(v.hand);
  });
});
