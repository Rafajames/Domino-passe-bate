import { describe, expect, it } from 'vitest';
import { createMatch } from '../../engine/match';
import { BUILTIN_PROFILES, freezeRules } from '../../engine/rules';
import { fullSet } from '../../engine/tiles';
import { players } from '../../engine/__tests__/helpers';
import { redealText, resultDetail, resultTitle } from './text';

describe('textos das carroças', () => {
  it('vitória com cinco carroças', () => {
    const p = BUILTIN_PROFILES.find((x) => x.id === 'pb-paraiba')!;
    const d = fullSet().filter((x) => x.a === x.b);
    const o = fullSet().filter((x) => x.a !== x.b);
    const hands = [[...d.slice(0, 5), ...o.slice(0, 2)], o.slice(2, 9), [d[5]!, d[6]!, ...o.slice(9, 14)], o.slice(14, 21)];
    const m = createMatch({ id: 'x', frozen: freezeRules(p), players: players(4), seed: 1, presetHands: hands });
    const r = m.round.result!;
    expect(resultTitle(r)).toBe('Cinco carroças!');
    expect(resultDetail(r, m.players, m.frozen.rules)).toBe('P0 veio com cinco carroças e a dupla ganhou a partida.');
  });

  it('aviso de nova distribuição', () => {
    expect(redealText([{ seat: 1, doubles: 4 }], players(4))).toBe('P1 veio com quatro carroças: embaralhado de novo. ');
  });
});
