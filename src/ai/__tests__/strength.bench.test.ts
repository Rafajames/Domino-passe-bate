declare const process: { env: Record<string, string | undefined> };
import { it } from 'vitest';
import { applyAction, startNextRound } from '../../engine/match';
import { createRng } from '../../engine/rng';
import { playerView } from '../../engine/view';
import type { BotDifficulty } from '../../engine/types';
import { decideTurn } from '../bots';
import { matchWith } from '../../engine/__tests__/helpers';

function duel(a: BotDifficulty, b: BotDifficulty, games: number, profile: string) {
  let aWins = 0;
  for (let g = 0; g < games; g++) {
    const aSeat = g % 2;
    const n = profile === 'pb-paraiba' ? 4 : 2;
    const diffs = Array.from({ length: n }, (_, s) => (s % 2 === aSeat ? a : b));
    let m = matchWith(profile, profile === 'pb-paraiba' ? {} : { targetScore: 100 }, 1000 + g);
    const rng = createRng(77 + g);
    let guard = 0;
    while (m.status !== 'finished' && guard++ < 4000) {
      if (m.status === 'round-over') { m = startNextRound(m); continue; }
      const seat = m.round.turn;
      m = applyAction(m, decideTurn(playerView(m, seat), diffs[seat]!, rng, { masterBudgetMs: 25 }));
    }
    if (m.winnerSide === aSeat) aWins++;
  }
  return aWins;
}

it.skipIf(!process.env.BENCH)('benchmark de força', () => {
  const G = Number(process.env.GAMES ?? 20);
  for (const profile of ['af-padrao', 'pb-paraiba']) {
    for (const [a, b] of (process.env.PAIRS === 'mestre' ? [['mestre', 'dificil']] : [['normal', 'facil'], ['dificil', 'normal'], ['mestre', 'dificil']]) as [BotDifficulty, BotDifficulty][]) {
      console.log(`${profile}: ${a} venceu ${duel(a, b, G, profile)}/${G} contra ${b}`);
    }
  }
}, 600_000);
