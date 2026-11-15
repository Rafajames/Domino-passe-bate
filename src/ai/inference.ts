import { emptyBoard, openEnds, placeTile, type BoardState } from '../engine/board';
import { fullSet, hasValue, type Tile } from '../engine/tiles';
import type { PlayerView } from '../engine/view';

/**
 * Conhecimento público + privado de um jogador. Derivado SOMENTE da PlayerView:
 * pedras na mesa, a própria mão e o histórico público (passes e compras).
 */
export interface Knowledge {
  /** Pedras cuja localização o jogador não conhece (mãos alheias + dorme). */
  unknown: Tile[];
  /** Para cada assento, valores que esse jogador certamente não possui. */
  voids: Set<number>[];
  /** Quantas pedras de cada valor (0..6) ainda não foram vistas. */
  unseenByValue: number[];
}

export function buildKnowledge(view: PlayerView): Knowledge {
  const seen = new Set<string>(view.hand.map((t) => t.id));
  const voids = view.handCounts.map(() => new Set<number>());
  const lastDrawTurn = view.handCounts.map(() => -1);
  let board: BoardState = emptyBoard();

  for (const e of view.events) {
    if (e.kind === 'round-start') board = emptyBoard();
    if (e.kind === 'play') {
      board = placeTile(board, e.tile, e.arm, e.seat, e.turn, view.rules.spinner);
      seen.add(e.tile.id);
    } else if (e.kind === 'pass') {
      for (const v of e.openValues) voids[e.seat]?.add(v);
    } else if (e.kind === 'draw') {
      const set = voids[e.seat];
      if (!set) continue;
      // Nova sequência de compras: pedras novas podem conter valores antes "vazios".
      if (lastDrawTurn[e.seat] !== e.turn) set.clear();
      lastDrawTurn[e.seat] = e.turn;
      for (const end of openEnds(board)) set.add(end.value);
    }
  }
  for (const id of boardIds(view.board)) seen.add(id);
  const unknown = fullSet().filter((t) => !seen.has(t.id));
  const unseenByValue = [0, 0, 0, 0, 0, 0, 0];
  for (const t of unknown) {
    unseenByValue[t.a] = (unseenByValue[t.a] ?? 0) + 1;
    if (t.b !== t.a) unseenByValue[t.b] = (unseenByValue[t.b] ?? 0) + 1;
  }
  return { unknown, voids, unseenByValue };
}

function boardIds(board: BoardState): string[] {
  if (!board.root) return [];
  return [board.root.tile.id, ...Object.values(board.arms).flatMap((list) => list.map((p) => p.tile.id))];
}

/** Probabilidade aproximada de `seat` possuir alguma pedra com `value`. */
export function probHasValue(view: PlayerView, k: Knowledge, seat: number, value: number): number {
  if (seat === view.seat) return view.hand.some((t) => hasValue(t, value)) ? 1 : 0;
  if (k.voids[seat]?.has(value)) return 0;
  const candidates = k.unknown.filter((t) => hasValue(t, value) && !tileBlocked(k, seat, t)).length;
  const pool = k.unknown.filter((t) => !tileBlocked(k, seat, t)).length;
  const n = view.handCounts[seat] ?? 0;
  if (candidates === 0 || pool === 0 || n === 0) return 0;
  // P(nenhuma das n pedras é candidata) em amostragem sem reposição.
  let pNone = 1;
  for (let i = 0; i < n; i++) pNone *= Math.max(0, pool - candidates - i) / Math.max(1, pool - i);
  return 1 - pNone;
}

export function tileBlocked(k: Knowledge, seat: number, t: Tile): boolean {
  const v = k.voids[seat];
  return !!v && (v.has(t.a) || v.has(t.b));
}

/**
 * Sorteia uma distribuição das pedras desconhecidas coerente com tudo que se sabe
 * (quantidade de pedras de cada mão, tamanho do dorme e valores ausentes).
 * Usada pela IA Mestre (Monte Carlo com determinização).
 */
export function sampleWorld(
  view: PlayerView,
  k: Knowledge,
  rng: () => number,
  attempts = 30,
): { hands: Tile[][]; boneyard: Tile[] } | null {
  const seats = view.handCounts.map((_, s) => s).filter((s) => s !== view.seat);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const pool = k.unknown.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j] as Tile, pool[i] as Tile];
    }
    // Mais restritos primeiro.
    const order = seats.slice().sort((a, b) => (k.voids[b]?.size ?? 0) - (k.voids[a]?.size ?? 0));
    const hands: Tile[][] = view.handCounts.map(() => []);
    hands[view.seat] = view.hand.slice();
    let ok = true;
    for (const s of order) {
      const need = view.handCounts[s] ?? 0;
      for (let i = 0; i < need; i++) {
        const idx = pool.findIndex((t) => !tileBlocked(k, s, t));
        if (idx < 0) {
          ok = false;
          break;
        }
        hands[s]!.push(pool.splice(idx, 1)[0] as Tile);
      }
      if (!ok) break;
    }
    if (ok) return { hands, boneyard: pool.slice(0, view.boneyardCount) };
  }
  return null;
}
