import { describe, expect, it } from 'vitest';
import { applyAction, canDraw, canPass, legalMoves, startNextRound } from '../match';
import { BUILTIN_PROFILES, freezeRules } from '../rules';
import { playerView } from '../view';
import { fullSet } from '../tiles';
import type { MatchState } from '../types';
import { matchWith, t, withRound } from './helpers';

function allTiles(m: MatchState) {
  const r = m.round;
  return [...r.hands.flat(), ...r.boneyard, ...r.outOfPlay].map((x) => x.id).sort();
}

describe('distribuição', () => {
  it('Passe e Bate (PB): 4 × 7, sem dorme, abre quem tem a carroça de seis', () => {
    const m = matchWith('pb-paraiba');
    expect(m.round.hands.map((h) => h.length)).toEqual([7, 7, 7, 7]);
    expect(m.round.boneyard).toHaveLength(0);
    expect(m.round.mustOpenWith).toBe('6-6');
    expect(m.round.hands[m.round.turn]?.some((x) => x.id === '6-6')).toBe(true);
    expect(legalMoves(m, m.round.turn)).toEqual([{ tileId: '6-6', arm: 'root' }]);
  });

  it('All Fives padrão: 2 × 7 com 14 no dorme', () => {
    const m = matchWith('af-padrao');
    expect(m.round.hands.map((h) => h.length)).toEqual([7, 7]);
    expect(m.round.boneyard).toHaveLength(14);
  });

  it('All Fives Boa Vista: 28 pedras distribuídas, sem dorme', () => {
    const m = matchWith('af-boa-vista');
    expect(m.round.hands.flat()).toHaveLength(28);
    expect(m.round.boneyard).toHaveLength(0);
  });

  it('não perde nem duplica pedras e é determinística pela semente', () => {
    const a = matchWith('af-padrao', {}, 42);
    const b = matchWith('af-padrao', {}, 42);
    expect(allTiles(a)).toEqual(fullSet().map((x) => x.id).sort());
    expect(a.round.hands).toEqual(b.round.hands);
  });
});

describe('turnos e integridade', () => {
  it('rejeita jogada fora da vez e pedra de outro jogador', () => {
    const m = matchWith('pb-paraiba');
    const other = (m.round.turn + 1) % 4;
    expect(() => applyAction(m, { type: 'play', seat: other, tileId: '6-6', arm: 'root' })).toThrow();
    const notMine = m.round.hands[other]![0]!.id;
    expect(() => applyAction(m, { type: 'play', seat: m.round.turn, tileId: notMine, arm: 'root' })).toThrow();
  });

  it('obriga jogar quando possível; compra só sem jogada; passe só sem compra', () => {
    let m = matchWith('af-padrao');
    m = withRound(m, { hands: [[t(1, 2)], [t(3, 4)]], boneyard: [t(5, 5), t(6, 0)], turn: 0 });
    m = applyAction(m, { type: 'play', seat: 0, tileId: '1-2', arm: 'root' });
    // Rodada terminou com batida do assento 0.
    expect(m.status).not.toBe('playing');

    let n = matchWith('af-padrao');
    n = withRound(n, { hands: [[t(0, 0), t(1, 1)], [t(3, 4), t(2, 2)]], boneyard: [t(5, 6), t(0, 6)], turn: 0 });
    n = applyAction(n, { type: 'play', seat: 0, tileId: '0-0', arm: 'root' });
    expect(canPass(n, 1)).toBe(false);
    expect(canDraw(n, 1)).toBe(true);
    expect(() => applyAction(n, { type: 'pass', seat: 1 })).toThrow();
    n = applyAction(n, { type: 'draw', seat: 1 });
    expect(n.round.hands[1]).toHaveLength(3);
    expect(n.round.turn).toBe(1);
    n = applyAction(n, { type: 'draw', seat: 1 });
    expect(legalMoves(n, 1).length).toBeGreaterThan(0);
    expect(canDraw(n, 1)).toBe(false);
  });
});

describe('fim de rodada', () => {
  it('Passe e Bate: lá e lô de carroça pontua 6 para a dupla', () => {
    let m = matchWith('pb-paraiba');
    m = withRound(m, {
      hands: [[t(4, 4)], [t(0, 1)], [t(0, 2)], [t(0, 3)]],
      turn: 0,
      board: { root: { tile: t(4, 6), seat: 1, turn: 0, leftValue: 4, rightValue: 6 }, arms: { left: [], right: [{ tile: t(6, 4), inner: 6, outer: 4, seat: 2, turn: 1 }], up: [], down: [] }, spinner: null },
    });
    m = applyAction(m, { type: 'play', seat: 0, tileId: '4-4', arm: 'left' });
    expect(m.round.result).toMatchObject({ type: 'domino', batida: 'laELoCarroca', points: 6, winnerSide: 0 });
    expect(m.scores).toEqual([6, 0]);
    expect(m.status).toBe('finished'); // meta provisória 6
  });

  it('jogo trancado quando todos passam', () => {
    let m = matchWith('pb-paraiba');
    m = withRound(m, {
      hands: [[t(0, 1)], [t(0, 2)], [t(0, 3)], [t(1, 2)]],
      turn: 0,
      board: { root: { tile: t(6, 6), seat: 1, turn: 0, leftValue: 6, rightValue: 6 }, arms: { left: [], right: [], up: [], down: [] }, spinner: null },
    });
    for (let s = 0; s < 4; s++) m = applyAction(m, { type: 'pass', seat: s });
    expect(m.round.result).toMatchObject({ type: 'blocked', winnerSide: 0, points: 1 });
    expect(m.status).toBe('round-over');
    const next = startNextRound(m);
    expect(next.round.index).toBe(1);
    expect(next.round.starter).toBe(0);
    expect(next.round.mustOpenWith).toBeNull();
  });

  it('All Fives: pontos automáticos ao fechar múltiplo de 5', () => {
    let m = matchWith('af-padrao');
    m = withRound(m, { hands: [[t(5, 5), t(1, 1)], [t(5, 0), t(2, 2)]], turn: 0 });
    m = applyAction(m, { type: 'play', seat: 0, tileId: '5-5', arm: 'root' });
    expect(m.scores).toEqual([10, 0]);
    m = applyAction(m, { type: 'play', seat: 1, tileId: '0-5', arm: 'right' });
    expect(m.scores).toEqual([10, 10]);
  });

  it('modo fiel: sem marcar, o ponto é perdido; marcando certo, pontua', () => {
    let m = matchWith('af-padrao', { assists: { highlightPlayable: false, autoScore: false } });
    m = withRound(m, { hands: [[t(5, 5), t(1, 1)], [t(5, 0), t(2, 2)]], turn: 0 });
    m = applyAction(m, { type: 'play', seat: 0, tileId: '5-5', arm: 'root' });
    expect(m.scores).toEqual([0, 0]);
    m = applyAction(m, { type: 'play', seat: 1, tileId: '0-5', arm: 'right' });
    expect(m.round.events.some((e) => e.kind === 'claim-missed' && e.seat === 0)).toBe(true);
    expect(() => applyAction(m, { type: 'claim', seat: 0, points: 10 })).toThrow();
    const wrong = applyAction(m, { type: 'claim', seat: 1, points: 15 });
    expect(wrong.scores).toEqual([0, 0]);
    m = applyAction(m, { type: 'claim', seat: 1, points: 10 });
    expect(m.scores).toEqual([0, 10]);
  });
});

describe('regras congeladas e informação oculta', () => {
  it('alterar o perfil não altera a partida em andamento', () => {
    const p = structuredClone(BUILTIN_PROFILES[0]!);
    const frozen = freezeRules(p);
    p.rules.passeBate.batidaPoints.simples = 99;
    expect(frozen.rules.passeBate.batidaPoints.simples).toBe(1);
    expect(Object.isFrozen(frozen.rules.passeBate.batidaPoints)).toBe(true);
  });

  it('a visão do jogador não expõe mãos alheias nem compras alheias', () => {
    let m = matchWith('af-padrao');
    m = withRound(m, { hands: [[t(0, 0)], [t(3, 4)]], boneyard: [t(5, 6), t(1, 6)], turn: 0 });
    m = applyAction(m, { type: 'play', seat: 0, tileId: '0-0', arm: 'root' });
    // assento 0 bateu; refaz cenário sem batida
    let n = matchWith('af-padrao');
    n = withRound(n, { hands: [[t(0, 0), t(2, 2)], [t(3, 4)]], boneyard: [t(5, 6), t(1, 6)], turn: 0 });
    n = applyAction(n, { type: 'play', seat: 0, tileId: '0-0', arm: 'root' });
    n = applyAction(n, { type: 'draw', seat: 1 });
    const v0 = playerView(n, 0);
    expect(v0.hand.map((x) => x.id)).toEqual(['2-2']);
    expect(v0.handCounts).toEqual([1, 2]);
    expect(JSON.stringify(v0)).not.toContain('3-4');
    const drawEvent = v0.events.find((e) => e.kind === 'draw');
    expect(drawEvent && drawEvent.kind === 'draw' ? drawEvent.tileId : 'x').toBeNull();
    expect(playerView(n, 1).events.find((e) => e.kind === 'draw')).toMatchObject({ tileId: '5-6' });
    expect(m.status).not.toBe('playing');
  });
});
