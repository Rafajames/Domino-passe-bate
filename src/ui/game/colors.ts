const SIDE_COLORS = ['var(--team-a)', 'var(--team-b)', 'var(--team-c)', 'var(--team-d)'];

export function sideColor(side: number, teams: boolean): string {
  return teams ? (SIDE_COLORS[side] ?? 'var(--brass)') : (SIDE_COLORS[side] ?? 'var(--brass)');
}

/** Cor própria de cada jogador (assento). */
export function seatColor(seat: number): string {
  return `var(--seat-${seat % 4})`;
}
