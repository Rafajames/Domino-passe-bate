import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArmId, BoardState } from '../../engine/board';
import { hasCollision, layoutBoard, type Arrangement, type Dir } from '../board/layout';
import { Icon } from '../components/Icon';
import { TileShape } from '../components/Tile';
import { ARM_LABEL } from './text';
import { seatColor } from './colors';
import { useElementSize } from './useElementSize';

export interface SlotTarget {
  arm: ArmId | 'root';
  /** Se a pedra selecionada encaixa (só exibido com assistência ligada). */
  valid: boolean;
}

interface Props {
  board: BoardState;
  targets: SlotTarget[] | null;
  showValidity: boolean;
  /** `dir` só vem quando o jogador escolhe uma vaga alternativa. */
  onPlace: (arm: ArmId | 'root', dir?: Dir) => void;
  lastTurn: number | null;
  scorePopup: { key: number; points: number; color: string } | null;
  arrangement: Arrangement;
  /** Modo organizar (jogo pausado): tocar numa pedra da mesa muda a direção dela. */
  organizing: boolean;
  onArrange: (tileId: string, dir: Dir) => void;
  /** Marcar cada pedra com a cor de quem a jogou. */
  colorBySeat?: boolean;
}

const PERP: Record<Dir, Dir[]> = { E: ['N', 'S'], W: ['N', 'S'], N: ['E', 'W'], S: ['E', 'W'] };
const ARROW: Record<Dir, string> = { N: '↑', S: '↓', E: '→', W: '←' };

const PAD = 0.9;
const MIN_UNIT = 18;
const MAX_UNIT = 64;

export function BoardView({ board, targets, showValidity, onPlace, lastTurn, scorePopup, arrangement, organizing, onArrange, colorBySeat = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(wrapRef);
  const [zoom, setZoom] = useState(1);
  const aspect = size.h > 0 ? Math.round((size.w / size.h) * 4) / 4 : 1.4;
  const layout = useMemo(() => layoutBoard(board, aspect, arrangement), [board, aspect, arrangement]);

  /** Próxima direção válida para uma pedra: reto, virar para um lado, virar para o outro. */
  function cycleDir(tileId: string) {
    const idx = layout.tiles.findIndex((t) => t.id === tileId);
    const tile = layout.tiles[idx];
    if (!tile?.arm || !tile.dir) return;
    const prev = layout.tiles.slice(0, idx).reverse().find((t) => t.arm === tile.arm);
    const base: Dir = prev?.dir ?? (tile.arm === 'left' ? 'W' : tile.arm === 'right' ? 'E' : tile.dir);
    const options: Dir[] = [base, ...PERP[base]];
    const start = Math.max(0, options.indexOf(tile.dir));
    for (let k = 1; k <= options.length; k++) {
      const d = options[(start + k) % options.length]!;
      if (d === tile.dir) continue;
      if (!hasCollision(layoutBoard(board, aspect, { ...arrangement, [tileId]: d }))) {
        onArrange(tileId, d);
        return;
      }
    }
  }

  const vbX = layout.minX - PAD;
  const vbY = layout.minY - PAD;
  const vbW = layout.maxX - layout.minX + PAD * 2;
  const vbH = layout.maxY - layout.minY + PAD * 2;
  const fit = size.w > 0 ? Math.min(size.w / vbW, size.h / vbH) : 24;
  const unit = Math.max(MIN_UNIT, Math.min(MAX_UNIT, fit * zoom));
  const svgW = vbW * unit;
  const svgH = vbH * unit;
  const overflow = svgW > size.w + 1 || svgH > size.h + 1;

  const targetByArm = new Map(targets?.map((t) => [t.arm, t]) ?? []);
  const lastTile = layout.tiles.find((t) => t.turn === lastTurn);

  // Mantém a última pedra visível quando a mesa precisa de rolagem.
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc || !overflow || !lastTile) return;
    const x = (lastTile.x - vbX) * unit;
    const y = (lastTile.y - vbY) * unit;
    sc.scrollTo({ left: x - sc.clientWidth / 2, top: y - sc.clientHeight / 2, behavior: 'smooth' });
  }, [lastTile?.id, overflow, unit, vbX, vbY]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="board" ref={wrapRef}>
      <div className="board__scroll" ref={scrollRef}>
        <div className="board__canvas" style={{ minWidth: svgW, minHeight: svgH }}>
          <svg
            width={svgW}
            height={svgH}
            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
            role="group"
            aria-label={`Mesa com ${layout.tiles.length} pedra${layout.tiles.length === 1 ? '' : 's'}`}
          >
            {layout.tiles.map((t) =>
              organizing && t.arm ? (
                <g
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  className="board-tile-btn"
                  aria-label={`Pedra ${t.tile.a} e ${t.tile.b}: tocar para mudar a direção`}
                  onClick={() => cycleDir(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      cycleDir(t.id);
                    }
                  }}
                >
                  <TileShape x={t.x} y={t.y} w={t.w} h={t.h} first={t.first} second={t.second} className="board-tile board-tile--editable" accent={colorBySeat ? seatColor(t.seat) : undefined} />
                </g>
              ) : (
                <TileShape
                  key={t.id}
                  x={t.x}
                  y={t.y}
                  w={t.w}
                  h={t.h}
                  first={t.first}
                  second={t.second}
                  className={`board-tile ${t.turn === lastTurn ? 'board-tile--last' : ''}`}
                  accent={colorBySeat ? seatColor(t.seat) : undefined}
                />
              ),
            )}
            {targets &&
              layout.slots
                .filter((s) => targetByArm.has(s.arm))
                .map((s) => {
                  const target = targetByArm.get(s.arm)!;
                  const cls = showValidity ? (target.valid ? 'slot--valid' : 'slot--invalid') : 'slot--neutral';
                  if (showValidity && !target.valid) return null;
                  const place = () => onPlace(s.arm, s.primary ? undefined : s.dir);
                  return (
                    <g
                      key={`${s.arm}-${s.dir ?? 'root'}-${s.primary ? 'p' : 'a'}`}
                      className={`slot ${cls} ${s.primary ? '' : 'slot--alt'}`}
                      role="button"
                      tabIndex={0}
                      aria-label={
                        s.arm === 'root'
                          ? 'Abrir a mesa com a pedra selecionada'
                          : `Jogar ${ARM_LABEL[s.arm]} (ponta ${s.value})${s.primary ? '' : `, virando para ${s.dir === 'N' ? 'cima' : s.dir === 'S' ? 'baixo' : s.dir === 'E' ? 'a direita' : 'a esquerda'}`}`
                      }
                      onClick={place}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          place();
                        }
                      }}
                    >
                      {/* Área de toque um pouco maior que a vaga, sem invadir vagas vizinhas */}
                      <rect x={s.x - s.w / 2 - 0.12} y={s.y - s.h / 2 - 0.12} width={s.w + 0.24} height={s.h + 0.24} fill="transparent" />
                      <rect x={s.x - s.w / 2 + 0.04} y={s.y - s.h / 2 + 0.04} width={s.w - 0.08} height={s.h - 0.08} rx={0.15} className="slot__rect" />
                      {s.value !== null && (
                        <text x={s.x} y={s.y + 0.16} className="slot__label" textAnchor="middle">
                          {s.primary ? s.value : `${s.value}${s.dir ? ARROW[s.dir] : ''}`}
                        </text>
                      )}
                    </g>
                  );
                })}
          </svg>
          {scorePopup && (
            <span key={scorePopup.key} className="score-popup" style={{ color: scorePopup.color }}>
              +{scorePopup.points}
            </span>
          )}
        </div>
      </div>
      <div className="board__zoom" role="group" aria-label="Zoom da mesa">
        <button className="icon-btn" onClick={() => setZoom((z) => Math.min(3, z * 1.25))} aria-label="Aproximar">
          <Icon name="plus" size={18} />
        </button>
        <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.6, z / 1.25))} aria-label="Afastar">
          <Icon name="minus" size={18} />
        </button>
        {zoom !== 1 && (
          <button className="icon-btn" onClick={() => setZoom(1)} aria-label="Ajustar à tela">
            <Icon name="fit" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
