import { useRef } from 'react';
import type { Tile } from '../../engine/tiles';
import { TileSvg } from '../components/Tile';
import { useElementSize } from './useElementSize';

interface Props {
  hand: readonly Tile[];
  selectedId: string | null;
  playableIds: Set<string> | null;
  myTurn: boolean;
  onTap: (tileId: string) => void;
}

export function HandRack({ hand, selectedId, playableIds, myTurn, onTap }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { w } = useElementSize(ref);
  const sorted = [...hand].sort((x, y) => x.a - y.a || x.b - y.b);
  const n = Math.max(7, sorted.length);
  // Em telas baixas (celular deitado) a mão não pode roubar a altura da mesa.
  const maxByHeight = typeof window !== 'undefined' ? Math.max(22, window.innerHeight * 0.075) : 48;
  const unit = Math.max(22, Math.min(48, maxByHeight, w > 0 ? (w - 24) / (n * 1.22) : 40));

  return (
    <div className="hand" ref={ref} role="toolbar" aria-label="Suas pedras">
      <div className="hand__row">
        {sorted.map((t) => {
          const playable = playableIds ? playableIds.has(t.id) : true;
          const selected = selectedId === t.id;
          const dim = myTurn && playableIds !== null && !playable;
          return (
            <button
              key={t.id}
              className={`hand__tile ${selected ? 'is-selected' : ''} ${dim ? 'is-dim' : ''} ${myTurn && playableIds && playable ? 'is-playable' : ''}`}
              onClick={() => onTap(t.id)}
              aria-pressed={selected}
              aria-label={`Pedra ${t.a} e ${t.b}${myTurn && playableIds ? (playable ? ', jogável' : ', não encaixa') : ''}`}
            >
              <TileSvg first={t.a} second={t.b} unit={unit} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
