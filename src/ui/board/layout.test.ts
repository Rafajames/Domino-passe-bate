import { describe, expect, it } from 'vitest';
import { emptyBoard, placeTile, openEnds, type BoardState } from '../../engine/board';
import { applyAction, legalMoves, startNextRound } from '../../engine/match';
import { createRng } from '../../engine/rng';
import { makeTile } from '../../engine/tiles';
import { matchWith } from '../../engine/__tests__/helpers';
import { hasCollision, layoutBoard } from './layout';

describe('layout da mesa', () => {
  it('mesa vazia mostra a vaga central', () => {
    const l = layoutBoard(emptyBoard(), 1.5);
    expect(l.slots).toEqual([expect.objectContaining({ arm: 'root' })]);
  });

  it('carroça fica atravessada e cada ponta aberta tem uma vaga', () => {
    let b: BoardState = placeTile(emptyBoard(), makeTile(6, 6), 'root', 0, 0, false);
    b = placeTile(b, makeTile(6, 3), 'right', 1, 1, false);
    const l = layoutBoard(b, 1.5);
    expect(l.tiles[0]).toMatchObject({ w: 1, h: 2 });
    expect(l.tiles[1]).toMatchObject({ w: 2, h: 1, first: 6, second: 3 });
    expect(l.slots.map((s) => s.arm).sort()).toEqual(openEnds(b).map((e) => e.arm).sort());
  });

  it('a metade encostada mostra o valor que casa com a pedra vizinha', () => {
    let b: BoardState = placeTile(emptyBoard(), makeTile(2, 5), 'root', 0, 0, false);
    b = placeTile(b, makeTile(2, 4), 'left', 1, 1, false);
    const l = layoutBoard(b, 1.5);
    // Braço esquerdo corre para oeste: metade da direita (second) encosta no 2.
    expect(l.tiles[1]).toMatchObject({ first: 4, second: 2 });
  });

  it('partidas completas nunca geram pedras sobrepostas (várias proporções)', () => {
    for (const [id, aspect] of [
      ['pb-paraiba', 0.6],
      ['pb-paraiba', 1.8],
      ['af-padrao', 0.6],
      ['af-padrao', 1.6],
      ['af-boa-vista', 0.7],
    ] as const) {
      for (let seed = 1; seed <= 25; seed++) {
        let m = matchWith(id, { targetScore: 10_000 }, seed);
        const rng = createRng(seed);
        for (let r = 0; r < 2; r++) {
          let guard = 0;
          while (m.status === 'playing' && guard++ < 200) {
            const seat = m.round.turn;
            const moves = legalMoves(m, seat);
            if (moves.length) {
              const mv = moves[Math.floor(rng() * moves.length)]!;
              m = applyAction(m, { type: 'play', seat, tileId: mv.tileId, arm: mv.arm });
              expect(hasCollision(layoutBoard(m.round.board, aspect))).toBe(false);
            } else {
              const drawable = m.round.boneyard.length > 0 && m.frozen.rules.boneyard;
              m = applyAction(m, drawable ? { type: 'draw', seat } : { type: 'pass', seat });
            }
          }
          if (m.status === 'round-over') m = startNextRound(m);
        }
      }
    }
  });
});

describe('vagas', () => {
  it('vagas de pontas diferentes nunca se sobrepõem às pedras nem entre si', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let m = matchWith('af-padrao', { targetScore: 10_000 }, seed);
      const rng = createRng(seed);
      let guard = 0;
      while (m.status === 'playing' && guard++ < 200) {
        const seat = m.round.turn;
        const moves = legalMoves(m, seat);
        const l = layoutBoard(m.round.board, 0.6);
        const boxes = [...l.tiles, ...l.slots];
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]!;
            const b = boxes[j]!;
            const hit = Math.abs(a.x - b.x) * 2 < a.w + b.w - 0.05 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 0.05;
            if (hit && ('arm' in a || 'arm' in b)) throw new Error(`seed ${seed}: sobreposição ${JSON.stringify(a)} ${JSON.stringify(b)}`);
          }
        if (moves.length) {
          const mv = moves[Math.floor(rng() * moves.length)]!;
          m = applyAction(m, { type: 'play', seat, tileId: mv.tileId, arm: mv.arm });
        } else m = applyAction(m, m.round.boneyard.length ? { type: 'draw', seat } : { type: 'pass', seat });
      }
    }
  });
});
