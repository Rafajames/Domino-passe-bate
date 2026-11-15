import { hasValue, isDouble, otherSide, type Tile } from './tiles';

export type ArmId = 'left' | 'right' | 'up' | 'down';
export const ARMS: readonly ArmId[] = ['left', 'right', 'up', 'down'];

export interface Placement {
  readonly tile: Tile;
  /** Valor encostado na pedra anterior. */
  readonly inner: number;
  /** Valor que fica exposto (ponta aberta). */
  readonly outer: number;
  readonly seat: number;
  readonly turn: number;
}

export interface RootPlacement {
  readonly tile: Tile;
  readonly seat: number;
  readonly turn: number;
  /** Face voltada para o braço esquerdo / direito. */
  readonly leftValue: number;
  readonly rightValue: number;
}

export type SpinnerRef = { readonly arm: 'root' } | { readonly arm: 'left' | 'right'; readonly index: number };

export interface BoardState {
  readonly root: RootPlacement | null;
  readonly arms: Readonly<Record<ArmId, readonly Placement[]>>;
  readonly spinner: SpinnerRef | null;
}

export interface OpenEnd {
  readonly arm: ArmId;
  readonly value: number;
  /** A pedra exposta nessa ponta é uma carroça (conta em dobro no All Fives). */
  readonly doubleExposed: boolean;
}

export const emptyBoard = (): BoardState => ({
  root: null,
  arms: { left: [], right: [], up: [], down: [] },
  spinner: null,
});

export function spinnerTile(board: BoardState): Tile | null {
  const s = board.spinner;
  if (!s) return null;
  if (s.arm === 'root') return board.root?.tile ?? null;
  return board.arms[s.arm][s.index]?.tile ?? null;
}

/** Os lados do spinner (cima/baixo) só abrem depois que os dois lados principais foram jogados. */
export function spinnerSidesOpen(board: BoardState): boolean {
  const s = board.spinner;
  if (!s || !board.root) return false;
  if (s.arm === 'root') return board.arms.left.length > 0 && board.arms.right.length > 0;
  return board.arms[s.arm].length > s.index + 1;
}

export function openEnds(board: BoardState): OpenEnd[] {
  const root = board.root;
  if (!root) return [];
  const ends: OpenEnd[] = [];
  const rootDouble = isDouble(root.tile);
  for (const arm of ['left', 'right'] as const) {
    const list = board.arms[arm];
    const last = list[list.length - 1];
    if (last) ends.push({ arm, value: last.outer, doubleExposed: isDouble(last.tile) });
    else ends.push({ arm, value: arm === 'left' ? root.leftValue : root.rightValue, doubleExposed: rootDouble });
  }
  if (spinnerSidesOpen(board)) {
    const sp = spinnerTile(board);
    if (sp) {
      for (const arm of ['up', 'down'] as const) {
        const list = board.arms[arm];
        const last = list[list.length - 1];
        if (last) ends.push({ arm, value: last.outer, doubleExposed: isDouble(last.tile) });
        else ends.push({ arm, value: sp.a, doubleExposed: true });
      }
    }
  }
  return ends;
}

/**
 * Soma das pontas para o All Fives.
 * - Carroça exposta conta as duas metades.
 * - Pedra inicial sozinha conta inteira (uma vez).
 * - Lados do spinner ainda vazios não contam.
 */
export function endsSum(board: BoardState): number {
  const root = board.root;
  if (!root) return 0;
  const { left, right, up, down } = board.arms;
  if (left.length === 0 && right.length === 0) return root.tile.a + root.tile.b;
  let sum = 0;
  for (const end of openEnds(board)) {
    const armEmpty = (end.arm === 'up' && up.length === 0) || (end.arm === 'down' && down.length === 0);
    if (armEmpty) continue;
    sum += end.doubleExposed ? end.value * 2 : end.value;
  }
  return sum;
}

export function canPlayOn(tile: Tile, end: OpenEnd): boolean {
  return hasValue(tile, end.value);
}

/** Coloca uma pedra. Não valida regras de turno — apenas encaixe. */
export function placeTile(
  board: BoardState,
  tile: Tile,
  arm: ArmId | 'root',
  seat: number,
  turn: number,
  useSpinner: boolean,
): BoardState {
  if (arm === 'root') {
    if (board.root) throw new Error('A mesa já foi aberta.');
    return {
      root: { tile, seat, turn, leftValue: tile.a, rightValue: tile.b },
      arms: { left: [], right: [], up: [], down: [] },
      spinner: useSpinner && isDouble(tile) ? { arm: 'root' } : null,
    };
  }
  const end = openEnds(board).find((e) => e.arm === arm);
  if (!end) throw new Error(`Ponta indisponível: ${arm}`);
  if (!canPlayOn(tile, end)) throw new Error(`A pedra ${tile.id} não encaixa na ponta ${end.value}.`);
  const placement: Placement = { tile, inner: end.value, outer: otherSide(tile, end.value), seat, turn };
  const nextList = [...board.arms[arm], placement];
  let spinner = board.spinner;
  if (useSpinner && !spinner && isDouble(tile) && (arm === 'left' || arm === 'right')) {
    spinner = { arm, index: nextList.length - 1 };
  }
  return { ...board, arms: { ...board.arms, [arm]: nextList }, spinner };
}

/** Todas as pedras na mesa, em ordem de jogada. */
export function boardTiles(board: BoardState): Tile[] {
  if (!board.root) return [];
  const all: { tile: Tile; turn: number }[] = [{ tile: board.root.tile, turn: board.root.turn }];
  for (const arm of ARMS) for (const p of board.arms[arm]) all.push({ tile: p.tile, turn: p.turn });
  return all.sort((x, y) => x.turn - y.turn).map((x) => x.tile);
}
