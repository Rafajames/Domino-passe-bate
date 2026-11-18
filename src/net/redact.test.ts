import { describe, expect, it } from 'vitest';
import { applyAction } from '../engine/match';
import { matchWith, t, withRound } from '../engine/__tests__/helpers';
import { redactMatch } from './redact';
import { legalMoves } from '../engine/match';

describe('estado enviado aos convidados', () => {
  it('não revela mãos alheias, dorme nem compras dos outros', () => {
    let m = matchWith('af-padrao');
    m = withRound(m, { hands: [[t(0, 0), t(2, 2)], [t(3, 4)]], boneyard: [t(5, 6), t(1, 6)], turn: 0 });
    m = applyAction(m, { type: 'play', seat: 0, tileId: '0-0', arm: 'root' });
    m = applyAction(m, { type: 'draw', seat: 1 });
    const g = redactMatch(m, 0);
    const json = JSON.stringify(g);
    for (const id of ['3-4', '5-6', '1-6']) expect(json).not.toContain(`"${id}"`);
    expect(g.round.hands[1]).toHaveLength(2);
    expect(g.round.boneyard).toHaveLength(1);
    expect(g.round.hands[0]!.map((x) => x.id)).toEqual(['2-2']);
    expect(g.round.initial).toBeUndefined();
  });

  it('o convidado calcula as próprias jogadas a partir do estado recebido', () => {
    const m = matchWith('pb-paraiba', {}, 4);
    const seat = m.round.turn;
    expect(legalMoves(redactMatch(m, seat), seat)).toEqual(legalMoves(m, seat));
  });
});
