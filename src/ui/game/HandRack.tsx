import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Tile } from '../../engine/tiles';
import { TileSvg } from '../components/Tile';
import { useElementSize } from './useElementSize';

interface Props {
  hand: readonly Tile[];
  /** Ordem manual (ids). Pedras novas (compradas) entram no fim. */
  order: readonly string[];
  flipped: readonly string[];
  selectedId: string | null;
  playableIds: Set<string> | null;
  myTurn: boolean;
  /** Modo organizar: tocar gira a pedra em vez de selecionar. */
  organizing: boolean;
  onTap: (tileId: string) => void;
  onFlip: (tileId: string) => void;
  onReorder: (ids: string[]) => void;
  /** Pedras em pé (padrão) ou deitadas. */
  orientation?: 'vertical' | 'horizontal';
  /** Multiplicador de tamanho escolhido pelo jogador. */
  scale?: number;
}

const DRAG_THRESHOLD = 8;

export function orderedHand(hand: readonly Tile[], order: readonly string[]): Tile[] {
  const byId = new Map(hand.map((t) => [t.id, t]));
  const known = order.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  const rest = hand.filter((t) => !order.includes(t.id)).sort((x, y) => x.a - y.a || x.b - y.b);
  return [...known, ...rest];
}

export function HandRack({ hand, order, flipped, selectedId, playableIds, myTurn, organizing, onTap, onFlip, onReorder, orientation = 'vertical', scale = 1 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const { w } = useElementSize(ref);
  const tiles = orderedHand(hand, order);
  const n = Math.max(7, tiles.length);
  const horizontal = orientation === 'horizontal';
  const maxByHeight = typeof window !== 'undefined' ? Math.max(22, window.innerHeight * 0.075) : 48;
  // Deitadas: duas fileiras quando não cabem numa só.
  const perRow = horizontal ? Math.ceil(n / (n > 4 ? 2 : 1)) : n;
  const widthPerTile = horizontal ? 2.12 : 1.22;
  const fitUnit = w > 0 ? (w - 24) / (perRow * widthPerTile) : 40;
  const unit = Math.max(18, Math.min(64, maxByHeight * scale * (horizontal ? 0.75 : 1), fitUnit * scale, 48 * scale));

  // Arrastar para reordenar (toque ou mouse). Um toque sem arrastar = seleção.
  const [drag, setDrag] = useState<{ id: string; dx: number; preview: string[] } | null>(null);
  const start = useRef<{ id: string; x: number; dragging: boolean } | null>(null);
  const clientY = useRef(0);

  function targetIndex(clientX: number, ids: string[], dragId: string): number {
    const row = rowRef.current;
    if (!row) return ids.indexOf(dragId);
    const els = Array.from(row.querySelectorAll<HTMLElement>('[data-tile]')).filter((el) => el.dataset.tile !== dragId);
    let idx = 0;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const before = clientY.current > r.bottom || (clientY.current >= r.top && clientX > r.left + r.width / 2);
      if (before) idx++;
    }
    return idx;
  }

  function onPointerDown(e: ReactPointerEvent, id: string) {
    clientY.current = e.clientY;
    start.current = { id, x: e.clientX, dragging: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent) {
    clientY.current = e.clientY;
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (!s.dragging && Math.abs(dx) < DRAG_THRESHOLD) return;
    s.dragging = true;
    const ids = tiles.map((t) => t.id);
    const without = ids.filter((x) => x !== s.id);
    const idx = targetIndex(e.clientX, ids, s.id);
    const preview = [...without.slice(0, idx), s.id, ...without.slice(idx)];
    setDrag({ id: s.id, dx, preview });
  }

  function onPointerUp() {
    const s = start.current;
    start.current = null;
    if (!s) return;
    if (s.dragging && drag) {
      onReorder(drag.preview);
      setDrag(null);
      return;
    }
    setDrag(null);
    if (organizing) onFlip(s.id);
    else onTap(s.id);
  }

  const shown = drag ? drag.preview.map((id) => tiles.find((t) => t.id === id)!).filter(Boolean) : tiles;

  return (
    <div className={`hand ${organizing ? 'hand--organizing' : ''} ${horizontal ? 'hand--horizontal' : ''}`} ref={ref} role="toolbar" aria-label="Suas pedras">
      <div className="hand__row" ref={rowRef}>
        {shown.map((t) => {
          const playable = playableIds ? playableIds.has(t.id) : true;
          const selected = selectedId === t.id;
          const dim = !organizing && myTurn && playableIds !== null && !playable;
          const isFlipped = flipped.includes(t.id);
          const dragging = drag?.id === t.id;
          return (
            <button
              key={t.id}
              data-tile={t.id}
              className={`hand__tile ${selected ? 'is-selected' : ''} ${dim ? 'is-dim' : ''} ${myTurn && playableIds && playable && !organizing ? 'is-playable' : ''} ${dragging ? 'is-dragging' : ''}`}
              style={dragging ? { transform: `translateX(${Math.max(-40, Math.min(40, drag!.dx * 0.15))}px) translateY(-10px) scale(1.06)` } : undefined}
              onPointerDown={(e) => onPointerDown(e, t.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                start.current = null;
                setDrag(null);
              }}
              onClick={(e) => {
                // Teclado (Enter/Espaço) gera click sem ponteiro.
                if (e.detail === 0) (organizing ? onFlip : onTap)(t.id);
              }}
              aria-pressed={selected}
              aria-label={`Pedra ${t.a} e ${t.b}${organizing ? ', toque para girar, arraste para mudar de lugar' : myTurn && playableIds ? (playable ? ', jogável' : ', não encaixa') : ''}`}
            >
              <TileSvg first={isFlipped ? t.b : t.a} second={isFlipped ? t.a : t.b} unit={unit} horizontal={horizontal} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
