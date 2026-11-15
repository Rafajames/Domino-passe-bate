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

export function sideName(side: number, rules: RuleSet, players: readonly PlayerSlot[]): string {
  if (rules.teams) return side === 0 ? 'Nós' : 'Eles';
  return players[side]?.name ?? `Jogador ${side + 1}`;
}

export function eventText(e: GameEvent, players: readonly PlayerSlot[], rules: RuleSet): string | null {
  const name = (seat: number) => players[seat]?.name ?? `Jogador ${seat + 1}`;
  switch (e.kind) {
    case 'round-start':
      return `Rodada ${e.round + 1}: ${name(e.starter)} sai${e.mustOpenWith ? ` com a ${tileName(e.mustOpenWith)}` : ''}.`;
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

export function resultTitle(r: RoundResult): string {
  if (r.type === 'blocked') return 'Jogo trancado';
  return r.batida ? `${BATIDA_LABEL[r.batida]}!` : 'Bateu!';
}

export function resultDetail(r: RoundResult, players: readonly PlayerSlot[], rules: RuleSet): string {
  const who = r.winnerSeat !== null ? players[r.winnerSeat]?.name : r.winnerSide !== null ? sideName(r.winnerSide, rules, players) : null;
  if (r.winnerSide === null) return r.type === 'blocked' ? 'Empate na menor mão. Ninguém pontuou.' : 'Ninguém pontuou.';
  const verb = r.type === 'blocked' ? 'venceu com a menor mão' : 'bateu';
  return `${who} ${verb} e ${rules.teams ? 'a dupla ganhou' : 'ganhou'} ${pts(r.points)}.`;
}

export function resultText(r: RoundResult, players: readonly PlayerSlot[], rules: RuleSet): string {
  return `${resultTitle(r)} ${resultDetail(r, players, rules)}`;
}
