import { describe, expect, it } from 'vitest';
import { applyAction, startNextRound } from '../match';
import { createRng } from '../rng';
import { playerView } from '../view';
import { buildGameRecord, replayRound } from '../replay';
import { decideClaim, decideTurn } from '../../ai/bots';
import type { MatchState } from '../types';
import { matchWith } from './helpers';

function playMatch(m: MatchState, seed: number): MatchState {
  const rng = createRng(seed);
  let guard = 0;
  while (m.status !== 'finished' && guard++ < 3000) {
    if (m.status === 'round-over') {
      m = startNextRound(m);
      continue;
    }
    const seat = m.round.turn;
    m = applyAction(m, decideTurn(playerView(m, seat), 'normal', rng));
    const pc = m.round.pendingClaim;
    if (pc) {
      const claim = decideClaim(playerView(m, pc.seat), 'facil', rng);
      if (claim) m = applyAction(m, claim);
    }
  }
  return m;
}

describe('revisão de partidas', () => {
  for (const [id, overrides] of [
    ['pb-paraiba', {}],
    ['af-padrao', { targetScore: 100 }],
    ['af-boa-vista', { targetScore: 100, assists: { highlightPlayable: false, autoScore: false } }],
  ] as const) {
    it(`${id}: reconstrói cada rodada exatamente`, () => {
      const m = playMatch(matchWith(id, overrides, 21), 9);
      const record = buildGameRecord(m);
      expect(record.rounds.length).toBe(m.history.length);
      for (const round of record.rounds) {
        const steps = replayRound(record.frozen, record.players, round);
        const last = steps[steps.length - 1]!.match;
        if (round.index === m.round.index) expect(last.round.board).toEqual(m.round.board);
        if (round.result) expect(last.round.result ?? null).toEqual(round.result);
        expect(last.scores).toEqual(round.scoresAfter);
        expect(steps[0]!.match.round.hands).toEqual(round.initial.hands);
      }
    });
  }
});
