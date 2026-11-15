/**
 * Glicko-2 (Glickman, 2012). Escolhido em vez de Elo porque modela a incerteza
 * (RD) — importante para jogadores com poucas partidas e para temporadas.
 *
 * Política (ver docs/arquitetura.md):
 * - Somente partidas ranqueadas entre humanos alteram o rating.
 * - Partidas contra bots e partidas casuais nunca entram aqui.
 * - Em duplas, cada jogador é avaliado contra o rating médio da dupla adversária.
 */
export interface Rating {
  rating: number;
  rd: number;
  volatility: number;
}

export interface GameOutcome {
  opponent: Rating;
  /** 1 vitória, 0.5 empate, 0 derrota. */
  score: 0 | 0.5 | 1;
}

const SCALE = 173.7178;
const TAU = 0.5;
const EPS = 0.000001;

export const DEFAULT_RATING: Rating = { rating: 1500, rd: 350, volatility: 0.06 };

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const E = (mu: number, muj: number, phij: number) => 1 / (1 + Math.exp(-g(phij) * (mu - muj)));

export function updateRating(player: Rating, games: readonly GameOutcome[]): Rating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  if (games.length === 0) {
    const phiStar = Math.sqrt(phi * phi + player.volatility * player.volatility);
    return { ...player, rd: Math.min(350, phiStar * SCALE) };
  }
  let vInv = 0;
  let deltaSum = 0;
  for (const gm of games) {
    const muj = (gm.opponent.rating - 1500) / SCALE;
    const phij = gm.opponent.rd / SCALE;
    const e = E(mu, muj, phij);
    vInv += g(phij) ** 2 * e * (1 - e);
    deltaSum += g(phij) * (gm.score - e);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;

  const a = Math.log(player.volatility ** 2);
  const f = (x: number) =>
    (Math.exp(x) * (delta ** 2 - phi ** 2 - v - Math.exp(x))) / (2 * (phi ** 2 + v + Math.exp(x)) ** 2) - (x - a) / TAU ** 2;
  let A = a;
  let B: number;
  if (delta ** 2 > phi ** 2 + v) B = Math.log(delta ** 2 - phi ** 2 - v);
  else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPS) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else fA /= 2;
    B = C;
    fB = fC;
  }
  const sigma = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi ** 2 + sigma ** 2);
  const phiNew = 1 / Math.sqrt(1 / phiStar ** 2 + 1 / v);
  const muNew = mu + phiNew ** 2 * deltaSum;
  return { rating: muNew * SCALE + 1500, rd: phiNew * SCALE, volatility: sigma };
}

/** Rating combinado de uma dupla (média dos ratings, RD pela média quadrática). */
export function teamRating(a: Rating, b: Rating): Rating {
  return {
    rating: (a.rating + b.rating) / 2,
    rd: Math.sqrt((a.rd ** 2 + b.rd ** 2) / 2),
    volatility: (a.volatility + b.volatility) / 2,
  };
}

export type MatchKind = 'ranked' | 'casual' | 'bots';

/** Barreira explícita: só partidas ranqueadas entre humanos contam. */
export function affectsRating(kind: MatchKind, allHumans: boolean): boolean {
  return kind === 'ranked' && allHumans;
}
