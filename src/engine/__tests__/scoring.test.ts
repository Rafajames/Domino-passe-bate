import { describe, expect, it } from 'vitest';
import type { OpenEnd } from '../board';
import { allFivesEndPoints, classifyBatida, roundToFive, scoreBlocked, scoreDomino } from '../scoring';
import { ALL_FIVES_STANDARD, PASSE_BATE_PB } from '../rules';
import { t } from './helpers';

const ends = (l: number, r: number): OpenEnd[] => [
  { arm: 'left', value: l, doubleExposed: false },
  { arm: 'right', value: r, doubleExposed: false },
];

describe('batidas paraibanas', () => {
  it('classifica os quatro tipos', () => {
    expect(classifyBatida(t(3, 1), ends(3, 5))).toBe('simples');
    expect(classifyBatida(t(3, 3), ends(3, 5))).toBe('carroca');
    expect(classifyBatida(t(3, 5), ends(3, 5))).toBe('laELoSimples');
    expect(classifyBatida(t(4, 4), ends(4, 4))).toBe('laELoCarroca');
  });

  it('lá e lô exige um lado da pedra em cada ponta (pontas iguais não contam)', () => {
    expect(classifyBatida(t(2, 4), ends(4, 2))).toBe('laELoSimples');
    expect(classifyBatida(t(3, 5), ends(3, 3))).toBe('simples');
    expect(classifyBatida(t(3, 5), ends(5, 5))).toBe('simples');
    expect(classifyBatida(t(4, 4), ends(4, 1))).toBe('carroca');
  });

  it('pontua conforme os valores de referência', () => {
    const hands = [[], [t(1, 1)], [], [t(2, 2)]];
    expect(scoreDomino(PASSE_BATE_PB, 0, hands, 'simples')).toEqual({ winnerSide: 0, points: 1 });
    expect(scoreDomino(PASSE_BATE_PB, 1, hands, 'carroca').points).toBe(2);
    expect(scoreDomino(PASSE_BATE_PB, 2, hands, 'laELoSimples').points).toBe(3);
    expect(scoreDomino(PASSE_BATE_PB, 3, hands, 'laELoCarroca')).toEqual({ winnerSide: 1, points: 6 });
  });

  it('variação: quadrada vale 4', () => {
    const r = { ...PASSE_BATE_PB, passeBate: { ...PASSE_BATE_PB.passeBate, batidaPoints: { ...PASSE_BATE_PB.passeBate.batidaPoints, laELoCarroca: 4 } } };
    expect(scoreDomino(r, 0, [[], [], [], []], 'laELoCarroca').points).toBe(4);
  });

  it('jogo trancado: menor mão individual vence; empate entre duplas não pontua', () => {
    expect(scoreBlocked(PASSE_BATE_PB, [[t(0, 1)], [t(6, 6)], [t(3, 3)], [t(5, 5)]])).toEqual({ winnerSide: 0, points: 1 });
    expect(scoreBlocked(PASSE_BATE_PB, [[t(0, 1)], [t(1, 0)], [t(3, 3)], [t(5, 5)]])).toEqual({ winnerSide: null, points: 0 });
  });
});

describe('All Fives', () => {
  it('múltiplos de cinco valem o valor integral', () => {
    expect(allFivesEndPoints(15, ALL_FIVES_STANDARD)).toBe(15);
    expect(allFivesEndPoints(12, ALL_FIVES_STANDARD)).toBe(0);
    expect(allFivesEndPoints(0, ALL_FIVES_STANDARD)).toBe(0);
    expect(allFivesEndPoints(15, { ...ALL_FIVES_STANDARD, allFives: { ...ALL_FIVES_STANDARD.allFives, scoringMode: 'divided' } })).toBe(3);
  });

  it('arredonda para o múltiplo de 5 mais próximo', () => {
    expect(roundToFive(12, 'nearest')).toBe(10);
    expect(roundToFive(13, 'nearest')).toBe(15);
    expect(roundToFive(13, 'down')).toBe(10);
  });

  it('batida soma as pedras dos adversários', () => {
    expect(scoreDomino(ALL_FIVES_STANDARD, 0, [[], [t(6, 6), t(0, 1)]], 'simples')).toEqual({ winnerSide: 0, points: 15 });
  });

  it('em duplas, a mão do parceiro não conta', () => {
    const r = { ...ALL_FIVES_STANDARD, players: 4 as const, teams: true };
    const res = scoreDomino(r, 0, [[], [t(2, 3)], [t(6, 6)], [t(4, 1)]], 'simples');
    expect(res).toEqual({ winnerSide: 0, points: 10 });
  });

  it('mão trancada: menor mão leva o total das outras', () => {
    expect(scoreBlocked(ALL_FIVES_STANDARD, [[t(1, 1)], [t(6, 6), t(5, 4)]])).toEqual({ winnerSide: 0, points: 20 });
  });
});
