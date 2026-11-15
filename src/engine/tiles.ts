/** Pedras de dominó. Uma pedra é sempre normalizada com a <= b. */
export interface Tile {
  readonly id: string;
  readonly a: number;
  readonly b: number;
}

export function makeTile(x: number, y: number): Tile {
  const a = Math.min(x, y);
  const b = Math.max(x, y);
  return { id: `${a}-${b}`, a, b };
}

/** Conjunto completo duplo-N (duplo-seis = 28 pedras). */
export function fullSet(maxPip = 6): Tile[] {
  const set: Tile[] = [];
  for (let a = 0; a <= maxPip; a++) {
    for (let b = a; b <= maxPip; b++) set.push(makeTile(a, b));
  }
  return set;
}

export const isDouble = (t: Tile): boolean => t.a === t.b;
export const pips = (t: Tile): number => t.a + t.b;
export const hasValue = (t: Tile, v: number): boolean => t.a === v || t.b === v;
export const otherSide = (t: Tile, v: number): number => (t.a === v ? t.b : t.a);
export const handPips = (hand: readonly Tile[]): number => hand.reduce((s, t) => s + pips(t), 0);

export function tileFromId(id: string): Tile {
  const [x, y] = id.split('-').map(Number);
  if (x === undefined || y === undefined || Number.isNaN(x) || Number.isNaN(y)) {
    throw new Error(`Pedra inválida: ${id}`);
  }
  return makeTile(x, y);
}
