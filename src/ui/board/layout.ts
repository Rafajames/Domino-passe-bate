import { openEnds, type ArmId, type BoardState, type OpenEnd } from '../../engine/board';
import { isDouble, type Tile } from '../../engine/tiles';

/**
 * Layout geométrico da mesa em "unidades" (1 = lado menor da pedra).
 * Pedras correm em serpentina: ao atingir o limite da área, viram 90° e voltam
 * na fileira seguinte. Carroças ficam atravessadas. Puramente funcional — sem DOM.
 */
type Vec = { x: number; y: number };

export interface LaidTile {
  id: string;
  tile: Tile;
  /** Centro. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Valor na metade superior/esquerda e inferior/direita. */
  first: number;
  second: number;
  seat: number;
  turn: number;
}

export interface EndSlot {
  arm: ArmId | 'root';
  value: number | null;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BoardLayout {
  tiles: LaidTile[];
  slots: EndSlot[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const E: Vec = { x: 1, y: 0 };
const W: Vec = { x: -1, y: 0 };
const N: Vec = { x: 0, y: -1 };
const S: Vec = { x: 0, y: 1 };
const add = (a: Vec, b: Vec, k = 1): Vec => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const neg = (a: Vec): Vec => ({ x: -a.x, y: -a.y });
const horizontal = (d: Vec) => d.y === 0;

interface Segment {
  dir: Vec;
  /** 'limit' corre até o limite; número = quantidade fixa de pedras. */
  run: 'limit' | number;
  /** Limite do lado oposto (fileiras de retorno não cruzam o centro quando há spinner). */
  limit?: number;
}

interface ArmWalker {
  pos: Vec;
  dir: Vec;
  lastHalfWidth: number;
  segIndex: number;
  placedInSeg: number;
  segments: (i: number) => Segment;
}

function snakeSegments(main: Vec, corner: Vec, bound: number, returnLimit: number, leadVertical?: Vec): (i: number) => Segment {
  return (i) => {
    if (leadVertical) {
      if (i === 0) return { dir: leadVertical, run: 'limit' };
      i -= 1;
    }
    const phase = i % 4;
    if (phase === 0) return { dir: main, run: 'limit', limit: bound };
    if (phase === 2) return { dir: neg(main), run: 'limit', limit: returnLimit };
    return { dir: corner, run: 1 };
  };
}

function rectFor(pos: Vec, dir: Vec, double: boolean): { c: Vec; w: number; h: number; len: number } {
  const len = double ? 1 : 2;
  const c = add(pos, dir, len / 2);
  const across = double ? 2 : 1;
  return horizontal(dir) ? { c, w: len, h: across, len } : { c, w: across, h: len, len };
}

function overlaps(a: LaidTile, b: { x: number; y: number; w: number; h: number }): boolean {
  const eps = 0.05;
  return Math.abs(a.x - b.x) * 2 < a.w + b.w - eps && Math.abs(a.y - b.y) * 2 < a.h + b.h - eps;
}

function exceeds(seg: Segment, far: Vec, bx: number, by: number): boolean {
  const d = seg.dir;
  if (horizontal(d)) {
    const lim = seg.limit ?? bx;
    return d.x > 0 ? far.x > lim : far.x < -lim;
  }
  return d.y > 0 ? far.y > by : far.y < -by;
}

function step(w: ArmWalker, double: boolean, bx: number, by: number): { c: Vec; w: number; h: number; dir: Vec } {
  let seg = w.segments(w.segIndex);
  const fixedDone = typeof seg.run === 'number' && w.placedInSeg >= seg.run;
  const wouldExceed = seg.run === 'limit' && w.placedInSeg > 0 && exceeds(seg, add(w.pos, w.dir, double ? 1 : 2), bx, by);
  if (fixedDone || wouldExceed) {
    const prevDir = w.dir;
    w.segIndex += 1;
    w.placedInSeg = 0;
    seg = w.segments(w.segIndex);
    // Vira: a nova pedra encosta na lateral da metade final da pedra anterior.
    w.pos = add(add(w.pos, prevDir, -0.5), seg.dir, w.lastHalfWidth);
    w.dir = seg.dir;
  }
  const r = rectFor(w.pos, w.dir, double);
  w.pos = add(w.pos, w.dir, r.len);
  w.lastHalfWidth = double ? 1 : 0.5;
  w.placedInSeg += 1;
  return { c: r.c, w: r.w, h: r.h, dir: w.dir };
}

/** Metade "primeira" (cima/esquerda) e "segunda" (baixo/direita) conforme a direção. */
function halves(dir: Vec, inner: number, outer: number): [number, number] {
  return dir.x > 0 || dir.y > 0 ? [inner, outer] : [outer, inner];
}

function layoutOnce(board: BoardState, bx: number, by: number): BoardLayout {
  const tiles: LaidTile[] = [];
  const slots: EndSlot[] = [];
  const root = board.root;
  if (!root) {
    return { tiles, slots: [{ arm: 'root', value: null, x: 0, y: 0, w: 2, h: 1 }], minX: -2, minY: -1.5, maxX: 2, maxY: 1.5 };
  }
  const hasSpinner = !!board.spinner;
  // Com spinner, as fileiras de retorno param antes do centro para não cruzar os braços verticais.
  const ret = hasSpinner ? -1.5 : bx;
  const rootDouble = isDouble(root.tile);
  tiles.push({
    id: root.tile.id,
    tile: root.tile,
    x: 0,
    y: 0,
    w: rootDouble ? 1 : 2,
    h: rootDouble ? 2 : 1,
    first: root.leftValue,
    second: root.rightValue,
    seat: root.seat,
    turn: root.turn,
  });
  const rootHalf = rootDouble ? 0.5 : 1;
  const walkers: Partial<Record<ArmId, ArmWalker>> = {
    left: { pos: { x: -rootHalf, y: 0 }, dir: W, lastHalfWidth: rootDouble ? 1 : 0.5, segIndex: 0, placedInSeg: 0, segments: snakeSegments(W, N, bx, ret) },
    right: { pos: { x: rootHalf, y: 0 }, dir: E, lastHalfWidth: rootDouble ? 1 : 0.5, segIndex: 0, placedInSeg: 0, segments: snakeSegments(E, S, bx, ret) },
  };

  let spinnerCenter: Vec | null = null;
  let spinnerDir: Vec = E;
  if (board.spinner?.arm === 'root') spinnerCenter = { x: 0, y: 0 };

  for (const arm of ['left', 'right'] as const) {
    const wk = walkers[arm]!;
    board.arms[arm].forEach((p, index) => {
      const dbl = isDouble(p.tile);
      const r = step(wk, dbl, bx, by);
      const [first, second] = halves(r.dir, p.inner, p.outer);
      tiles.push({ id: p.tile.id, tile: p.tile, x: r.c.x, y: r.c.y, w: r.w, h: r.h, first, second, seat: p.seat, turn: p.turn });
      if (board.spinner && board.spinner.arm === arm && board.spinner.index === index) {
        spinnerCenter = r.c;
        spinnerDir = r.dir;
      }
    });
  }

  if (spinnerCenter) {
    const c: Vec = spinnerCenter;
    // "up" = rotação anti-horária da direção do braço; "down" = horária.
    const upDir: Vec = horizontal(spinnerDir) ? N : spinnerDir.y > 0 ? E : W;
    const downDir = neg(upDir);
    const halfAcross = 1;
    const mk = (dir: Vec, corner: Vec, main: Vec): ArmWalker => ({
      pos: add(c, dir, halfAcross),
      dir,
      lastHalfWidth: 0.5,
      segIndex: 0,
      placedInSeg: 0,
      segments: snakeSegments(main, corner, bx, bx, dir),
    });
    walkers.up = mk(upDir, upDir, horizontal(upDir) ? N : E);
    walkers.down = mk(downDir, downDir, horizontal(downDir) ? S : W);
    for (const arm of ['up', 'down'] as const) {
      const wk = walkers[arm]!;
      for (const p of board.arms[arm]) {
        const r = step(wk, isDouble(p.tile), bx, by);
        const [first, second] = halves(r.dir, p.inner, p.outer);
        tiles.push({ id: p.tile.id, tile: p.tile, x: r.c.x, y: r.c.y, w: r.w, h: r.h, first, second, seat: p.seat, turn: p.turn });
      }
    }
  }

  const ends: OpenEnd[] = openEnds(board);
  for (const end of ends) {
    const wk = walkers[end.arm];
    if (!wk) continue;
    const probe: ArmWalker = { ...wk, pos: { ...wk.pos }, dir: { ...wk.dir } };
    const r = step(probe, false, bx, by);
    slots.push({ arm: end.arm, value: end.value, x: r.c.x, y: r.c.y, w: r.w, h: r.h });
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of [...tiles, ...slots]) {
    minX = Math.min(minX, r.x - r.w / 2);
    maxX = Math.max(maxX, r.x + r.w / 2);
    minY = Math.min(minY, r.y - r.h / 2);
    maxY = Math.max(maxY, r.y + r.h / 2);
  }
  return { tiles, slots, minX, minY, maxX, maxY };
}

/** Colisão entre pedras e, opcionalmente, entre vagas (pontas) e o resto. */
export function hasCollision(layout: BoardLayout, includeSlots = false): boolean {
  const boxes: { x: number; y: number; w: number; h: number }[] = includeSlots ? [...layout.tiles, ...layout.slots] : layout.tiles;
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) if (overlaps(boxes[i] as LaidTile, boxes[j]!)) return true;
  return false;
}

/**
 * Calcula o layout respeitando a proporção da área visível. Se houver colisão,
 * amplia os limites e tenta de novo (a mesa encolhe ou ganha rolagem).
 */
export function layoutBoard(board: BoardState, aspect: number): BoardLayout {
  // Retrato: fileiras curtas e mais fileiras (pedras maiores). Paisagem: fileiras longas.
  let bx = Math.max(4, 3.5 * aspect);
  let by = Math.max(3.5, bx / Math.max(aspect, 0.1));
  let layout = layoutOnce(board, bx, by);
  for (let i = 0; i < 10 && hasCollision(layout, true); i++) {
    bx += 2;
    by += 1.5;
    layout = layoutOnce(board, bx, by);
  }
  return layout;
}
