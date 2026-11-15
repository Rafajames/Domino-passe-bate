import type { RuleSet } from './types';

/** Valida combinações de regras. Retorna lista de problemas (vazia = válido). */
export function validateRules(r: RuleSet): string[] {
  const errors: string[] = [];
  const totalTiles = 28;
  if (![2, 3, 4].includes(r.players)) errors.push('Número de jogadores deve ser 2, 3 ou 4.');
  if (r.teams && r.players !== 4) errors.push('Duplas exigem 4 jogadores.');
  if (r.handSize < 1 || r.handSize > 14) errors.push('Pedras por jogador devem estar entre 1 e 14.');
  if (r.players * r.handSize > totalTiles) errors.push('Pedras insuficientes para essa distribuição.');
  const remaining = totalTiles - r.players * r.handSize;
  if (r.boneyard && r.boneyardReserve > remaining) errors.push('Reserva do dorme maior que o dorme.');
  if (r.targetScore < 1) errors.push('Meta de pontuação deve ser positiva.');
  if (r.mode === 'all-fives' && r.allFives.passBonus.enabled) {
    errors.push('Pontuação por passe está pendente e não pode ser ativada.');
  }
  return errors;
}
