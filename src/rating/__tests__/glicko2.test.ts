import { describe, expect, it } from 'vitest';
import { affectsRating, updateRating } from '../glicko2';

describe('Glicko-2', () => {
  it('reproduz o exemplo do artigo de Glickman', () => {
    const r = updateRating({ rating: 1500, rd: 200, volatility: 0.06 }, [
      { opponent: { rating: 1400, rd: 30, volatility: 0.06 }, score: 1 },
      { opponent: { rating: 1550, rd: 100, volatility: 0.06 }, score: 0 },
      { opponent: { rating: 1700, rd: 300, volatility: 0.06 }, score: 0 },
    ]);
    expect(r.rating).toBeCloseTo(1464.06, 1);
    expect(r.rd).toBeCloseTo(151.52, 1);
    expect(r.volatility).toBeCloseTo(0.05999, 4);
  });

  it('inatividade aumenta a incerteza', () => {
    expect(updateRating({ rating: 1500, rd: 100, volatility: 0.06 }, []).rd).toBeGreaterThan(100);
  });

  it('bots e partidas casuais não afetam o ranking', () => {
    expect(affectsRating('bots', false)).toBe(false);
    expect(affectsRating('casual', true)).toBe(false);
    expect(affectsRating('ranked', false)).toBe(false);
    expect(affectsRating('ranked', true)).toBe(true);
  });
});
