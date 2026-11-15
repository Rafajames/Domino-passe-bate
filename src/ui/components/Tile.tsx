import { memo } from 'react';

/**
 * Pedra de dominó em SVG, desenhada em "unidades" (1 = lado menor).
 * `TileShape` é usado dentro do SVG da mesa; `TileSvg` é a versão avulsa (mão, resumos).
 */

// Posições dos pontos numa metade 1×1, orientação vertical (colunas).
const PIPS: Record<number, [number, number][]> = {
  0: [],
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.24], [0.28, 0.5], [0.28, 0.76], [0.72, 0.24], [0.72, 0.5], [0.72, 0.76]],
};

function Half({ value, ox, oy, horizontal }: { value: number; ox: number; oy: number; horizontal: boolean }) {
  const pts = PIPS[value] ?? [];
  return (
    <>
      {pts.map(([px, py], i) => {
        // Em pedras deitadas, o padrão gira junto com a pedra.
        const x = horizontal ? py : px;
        const y = horizontal ? px : py;
        return <circle key={i} cx={ox + x} cy={oy + y} r={0.088} className="tile__pip" />;
      })}
    </>
  );
}

export interface TileShapeProps {
  x: number;
  y: number;
  w: number;
  h: number;
  first: number;
  second: number;
  className?: string;
}

export const TileShape = memo(function TileShape({ x, y, w, h, first, second, className }: TileShapeProps) {
  const horizontal = w > h;
  const left = x - w / 2;
  const top = y - h / 2;
  const inset = 0.03;
  return (
    <g className={`tile ${className ?? ''}`}>
      <rect x={left + inset} y={top + inset + 0.07} width={w - inset * 2} height={h - inset * 2} rx={0.15} className="tile__edge" />
      <rect x={left + inset} y={top + inset} width={w - inset * 2} height={h - inset * 2} rx={0.15} className="tile__face" />
      {horizontal ? (
        <line x1={x} y1={top + 0.14} x2={x} y2={top + h - 0.14} className="tile__divider" />
      ) : (
        <line x1={left + 0.14} y1={y} x2={left + w - 0.14} y2={y} className="tile__divider" />
      )}
      <circle cx={x} cy={y} r={0.055} className="tile__pin" />
      <Half value={first} ox={left} oy={top} horizontal={horizontal} />
      <Half value={second} ox={horizontal ? left + 1 : left} oy={horizontal ? top : top + 1} horizontal={horizontal} />
    </g>
  );
});

export function TileSvg({
  first,
  second,
  unit,
  horizontal = false,
  label,
}: {
  first: number;
  second: number;
  unit: number;
  horizontal?: boolean;
  label?: string;
}) {
  const w = horizontal ? 2 : 1;
  const h = horizontal ? 1 : 2;
  return (
    <svg
      width={w * unit}
      height={h * unit + unit * 0.08}
      viewBox={`0 0 ${w} ${h + 0.08}`}
      role="img"
      aria-label={label ?? `Pedra ${first} e ${second}`}
      className="tile-svg"
    >
      <TileShape x={w / 2} y={h / 2} w={w} h={h} first={first} second={second} />
    </svg>
  );
}

/** Verso da pedra (mãos ocultas). */
export function TileBack({ unit, horizontal = false }: { unit: number; horizontal?: boolean }) {
  const w = horizontal ? 2 : 1;
  const h = horizontal ? 1 : 2;
  return (
    <svg width={w * unit} height={h * unit} viewBox={`0 0 ${w} ${h}`} aria-hidden className="tile-back">
      <rect x={0.04} y={0.04} width={w - 0.08} height={h - 0.08} rx={0.15} className="tile-back__face" />
      <rect x={0.2} y={0.2} width={w - 0.4} height={h - 0.4} rx={0.08} className="tile-back__inlay" />
    </svg>
  );
}

/** Definições compartilhadas de gradientes (montadas uma vez no App). */
export function TileDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <linearGradient id="dpb-ivory" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset="0.55" stopColor="var(--ivory)" />
          <stop offset="1" stopColor="var(--ivory-shade)" />
        </linearGradient>
        <radialGradient id="dpb-pip" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#4a443b" />
          <stop offset="1" stopColor="var(--pip)" />
        </radialGradient>
        <linearGradient id="dpb-back" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a4a41" />
          <stop offset="1" stopColor="#15302a" />
        </linearGradient>
      </defs>
    </svg>
  );
}
