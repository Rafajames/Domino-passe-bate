import { describe, expect, it } from 'vitest';
import { emptyBoard, endsSum, openEnds, placeTile, spinnerSidesOpen } from '../board';
import { t } from './helpers';

describe('tabuleiro', () => {
  it('abre a mesa e expõe as duas faces', () => {
    const b = placeTile(emptyBoard(), t(2, 5), 'root', 0, 0, false);
    expect(openEnds(b).map((e) => [e.arm, e.value])).toEqual([
      ['left', 2],
      ['right', 5],
    ]);
  });

  it('rejeita pedra que não encaixa', () => {
    const b = placeTile(emptyBoard(), t(2, 5), 'root', 0, 0, false);
    expect(() => placeTile(b, t(3, 4), 'left', 1, 1, false)).toThrow();
  });

  it('orienta a pedra jogada: valor encostado e valor exposto', () => {
    let b = placeTile(emptyBoard(), t(2, 5), 'root', 0, 0, false);
    b = placeTile(b, t(5, 1), 'right', 1, 1, false);
    expect(b.arms.right[0]).toMatchObject({ inner: 5, outer: 1 });
  });

  it('sem spinner, carroça inicial tem apenas duas pontas', () => {
    let b = placeTile(emptyBoard(), t(6, 6), 'root', 0, 0, false);
    b = placeTile(b, t(6, 1), 'left', 1, 1, false);
    b = placeTile(b, t(6, 2), 'right', 2, 2, false);
    expect(b.spinner).toBeNull();
    expect(openEnds(b)).toHaveLength(2);
  });

  it('spinner abre os lados apenas após os dois lados principais', () => {
    let b = placeTile(emptyBoard(), t(5, 5), 'root', 0, 0, true);
    expect(b.spinner).toEqual({ arm: 'root' });
    b = placeTile(b, t(5, 0), 'right', 1, 1, true);
    expect(spinnerSidesOpen(b)).toBe(false);
    b = placeTile(b, t(5, 3), 'left', 2, 2, true);
    expect(spinnerSidesOpen(b)).toBe(true);
    expect(openEnds(b).map((e) => e.arm)).toEqual(['left', 'right', 'up', 'down']);
  });

  it('primeira carroça jogada num braço vira spinner', () => {
    let b = placeTile(emptyBoard(), t(3, 4), 'root', 0, 0, true);
    b = placeTile(b, t(4, 4), 'right', 1, 1, true);
    expect(b.spinner).toEqual({ arm: 'right', index: 0 });
    expect(spinnerSidesOpen(b)).toBe(false);
    b = placeTile(b, t(4, 1), 'right', 2, 2, true);
    expect(spinnerSidesOpen(b)).toBe(true);
  });
});

describe('soma das pontas (All Fives)', () => {
  it('pedra inicial conta inteira', () => {
    expect(endsSum(placeTile(emptyBoard(), t(5, 5), 'root', 0, 0, true))).toBe(10);
    expect(endsSum(placeTile(emptyBoard(), t(4, 1), 'root', 0, 0, true))).toBe(5);
  });

  it('spinner com um lado vazio conta em dobro', () => {
    let b = placeTile(emptyBoard(), t(5, 5), 'root', 0, 0, true);
    b = placeTile(b, t(5, 0), 'right', 1, 1, true);
    expect(endsSum(b)).toBe(10);
  });

  it('carroça na ponta conta as duas metades', () => {
    let b = placeTile(emptyBoard(), t(3, 2), 'root', 0, 0, true);
    b = placeTile(b, t(2, 2), 'left', 1, 1, true);
    expect(endsSum(b)).toBe(3 + 4);
  });

  it('lados do spinner vazios não contam; preenchidos contam', () => {
    let b = placeTile(emptyBoard(), t(5, 5), 'root', 0, 0, true);
    b = placeTile(b, t(5, 0), 'right', 1, 1, true);
    b = placeTile(b, t(5, 1), 'left', 2, 2, true);
    expect(endsSum(b)).toBe(1);
    b = placeTile(b, t(5, 4), 'up', 3, 3, true);
    expect(endsSum(b)).toBe(5);
  });
});
