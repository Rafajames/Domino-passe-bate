import type { ArmId } from '../../engine/board';
import type { RuleSet } from '../../engine/rules/types';
import type { BatidaType, GameEvent, PlayerSlot, RoundResult } from '../../engine/types';

export const ARM_LABEL: Record<ArmId | 'root', string> = {
  root: 'no centro',
  left: 'na ponta esquerda',
  right: 'na ponta direita',
  up: 'no lado de cima do spinner',
  down: 'no lado de baixo do spinner',
};

/** Nome falado de uma pedra: "carroça de 6" ou "6 e 4". */
export function tileName(id: string): string {
  const [a, b] = id.split('-');
  return a === b ? `carroça de ${a}` : `${a} e ${b}`;
}

const pts = (n: number) => `${n} ponto${n === 1 ? '' : 's'}`;

export const BATIDA_LABEL: Record<BatidaType, string> = {
  simples: 'Batida simples',
  carroca: 'Batida de carroça',
  laELoSimples: 'Lá e lô',
  laELoCarroca: 'Lá e lô de carroça',
};

/**
 * Lado de quem está olhando a tela. Em duplas, "Nós" é sempre o lado do jogador deste aparelho —
 * no online o convidado pode estar no lado 1. A tela de jogo atualiza a cada render.
 */
let viewSide = 0;
export function setViewSide(side: number): void {
  viewSide = side;
}
export const getViewSide = () => viewSide;

export function sideName(side: number, rules: RuleSet, players: readonly PlayerSlot[]): string {
  if (rules.teams) return side === viewSide ? 'Nós' : 'Eles';
  return players[side]?.name ?? `Jogador ${side + 1}`;
}

export function eventText(e: GameEvent, players: readonly PlayerSlot[], rules: RuleSet): string | null {
  const name = (seat: number) => players[seat]?.name ?? `Jogador ${seat + 1}`;
  switch (e.kind) {
    case 'round-start':
      return `${redealText(e.redeals, players, rules)}Rodada ${e.round + 1}: ${name(e.starter)} sai${e.mustOpenWith ? ` com a ${tileName(e.mustOpenWith)}` : e.mustOpenDouble ? ' de carroça' : ''}.`;
    case 'play':
      return `${name(e.seat)} jogou ${e.tile.a === e.tile.b ? 'a ' : ''}${tileName(e.tile.id)} ${ARM_LABEL[e.arm]}.${rules.mode === 'all-fives' ? ` Pontas: ${e.endsSum}.` : ''}`;
    case 'draw':
      return `${name(e.seat)} comprou do dorme.`;
    case 'pass':
      return `${name(e.seat)} passou.`;
    case 'score':
      return `${name(e.seat)} marcou ${pts(e.points)}.`;
    case 'claim-wrong':
      return `${name(e.seat)} marcou ${e.claimed} — marcação incorreta, não valeu.`;
    case 'claim-missed':
      return `${name(e.seat)} esqueceu de marcar os pontos.`;
    case 'round-end':
      return resultText(e.result, players, rules);
  }
}

const NUM = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete'];

/** "João veio com quatro carroças: embaralhado de novo." (uma frase por redistribuição) */
export function redealText(redeals: readonly { seat: number; doubles: number }[] | undefined, players: readonly PlayerSlot[], rules?: RuleSet): string {
  if (!redeals?.length) return '';
  const bonus = rules?.mode === 'passe-bate' ? rules.doubles?.bonus : undefined;
  const note = bonus === 'double' ? 'Esta rodada vale o dobro. ' : bonus === 'plus-one' ? 'Esta rodada vale 1 ponto a mais. ' : '';
  return redeals.map((r) => `${players[r.seat]?.name ?? `Jogador ${r.seat + 1}`} veio com ${NUM[r.doubles] ?? r.doubles} carroças: embaralhado de novo. `).join('') + note;
}

export function burrinhaLosers(r: RoundResult, players: readonly PlayerSlot[]): string {
  return (r.loserSeats ?? []).map((s) => players[s]?.name ?? `Jogador ${s + 1}`).join(' e ');
}

const countDoublesIn = (r: RoundResult) => (r.winnerSeat !== null ? (r.hands[r.winnerSeat] ?? []).filter((t) => t.a === t.b).length : 0);

export function resultTitle(r: RoundResult): string {
  if (r.type === 'carrocas') return `${(NUM[countDoublesIn(r)] ?? '').replace(/^./, (c) => c.toUpperCase())} carroças!`;
  if (r.loserSeats) return r.type === 'blocked' ? 'Jogo trancado' : 'Fim da rodada';
  if (r.type === 'blocked') return 'Jogo trancado';
  return r.batida ? `${BATIDA_LABEL[r.batida]}!` : 'Bateu!';
}

export function resultDetail(r: RoundResult, players: readonly PlayerSlot[], rules: RuleSet): string {
  if (r.type === 'carrocas') {
    const who = r.winnerSeat !== null ? players[r.winnerSeat]?.name : '';
    return `${who} veio com ${NUM[countDoublesIn(r)] ?? ''} carroças e ${rules.teams ? 'a dupla ganhou' : 'ganhou'} a partida.`;
  }
  if (r.loserSeats) {
    const who = burrinhaLosers(r, players);
    const plural = (r.loserSeats.length ?? 0) > 1;
    return `${who} ${plural ? 'perderam' : 'perdeu'} e ${plural ? 'recomeçam' : 'recomeça'} com ${r.points} pedra${r.points === 1 ? '' : 's'} a mais.`;
  }
  const who = r.winnerSeat !== null ? players[r.winnerSeat]?.name : r.winnerSide !== null ? sideName(r.winnerSide, rules, players) : null;
  if (r.winnerSide === null) return r.type === 'blocked' ? 'Empate na menor mão. Ninguém pontuou.' : 'Ninguém pontuou.';
  const extra = r.bonus === 'double' ? ' (rodada valendo o dobro)' : r.bonus === 'plus-one' ? ' (com o ponto a mais das carroças)' : '';
  if (r.type === 'blocked') return `Vitória de ${who} pela menor mão: +${pts(r.points)}${extra}.`;
  return `${who} bateu e ${rules.teams ? 'a dupla ganhou' : 'ganhou'} ${pts(r.points)}${extra}.`;
}

export function resultText(r: RoundResult, players: readonly PlayerSlot[], rules: RuleSet): string {
  const title = resultTitle(r);
  return `${title}${title.endsWith('!') ? '' : '.'} ${resultDetail(r, players, rules)}`;
}
