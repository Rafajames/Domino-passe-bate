import type { RuleProfile, RuleSet, RuleStatus } from '../../engine/rules/types';

export interface RuleLine {
  key: string;
  label: string;
  value: string;
  status?: RuleStatus;
}

export const MODE_LABEL = { 'passe-bate': 'Passe e Bate', 'all-fives': 'All Fives' } as const;

const OPENING: Record<RuleSet['opening'], string> = {
  'double-six': 'Carroça de seis abre',
  'highest-double': 'Maior carroça abre',
  any: 'Sorteado abre com qualquer pedra',
};

const BLOCKED_PB: Record<RuleSet['passeBate']['blocked']['winner'], string> = {
  'lowest-individual': 'Menor mão individual vence',
  'lowest-team': 'Menor soma da dupla vence',
  none: 'Ninguém pontua',
};

export function describeRules(rules: RuleSet, status: Record<string, RuleStatus> = {}): RuleLine[] {
  const s = (k: string) => status[k];
  const lines: RuleLine[] = [
    {
      key: 'players',
      label: 'Jogadores',
      value: `${rules.players}${rules.teams ? ' em duplas' : ' individuais'}`,
      status: s('players') ?? s('teams'),
    },
    {
      key: 'handSize',
      label: 'Distribuição',
      value: (() => {
        const rest = 28 - rules.players * rules.handSize;
        const restText = rest === 0 ? 'todas distribuídas' : rules.boneyard ? `${rest} no dorme para compra${rules.boneyardReserve ? ` (reserva ${rules.boneyardReserve})` : ''}` : `${rest} no cemitério`;
        return `${rules.handSize} pedras cada · ${restText}${rules.dealMode === 'pick' ? ' · embaralhar e escolher' : ''}`;
      })(),
      status: s('handSize') ?? s('boneyard'),
    },
    { key: 'opening', label: 'Saída', value: `${OPENING[rules.opening]}; depois, ${rules.nextRoundStarter === 'round-winner' ? 'quem venceu a rodada' : 'o próximo jogador'}`, status: s('opening') },
  ];
  if (rules.mode === 'passe-bate') {
    const b = rules.passeBate.batidaPoints;
    lines.push(
      { key: 'passeBate.batidaPoints', label: 'Batidas', value: `Simples ${b.simples} · Carroça ${b.carroca} · Lá e lô ${b.laELoSimples} · Lá e lô de carroça ${b.laELoCarroca}`, status: s('passeBate.batidaPoints') },
      { key: 'passeBate.blocked', label: 'Jogo trancado', value: `${BLOCKED_PB[rules.passeBate.blocked.winner]}${rules.passeBate.blocked.winner !== 'none' ? ` (${rules.passeBate.blocked.points} pt)` : ''}`, status: s('passeBate.blocked') },
    );
  } else {
    const af = rules.allFives;
    lines.push(
      { key: 'spinner', label: 'Spinner', value: rules.spinner ? 'Primeira carroça abre para os quatro lados' : 'Sem spinner', status: s('spinner') },
      { key: 'allFives.scoringMode', label: 'Pontas', value: af.scoringMode === 'full' ? 'Múltiplo de 5 vale o valor integral' : 'Múltiplo de 5 vale 1 ponto por 5', status: s('allFives.scoringMode') },
      { key: 'allFives.endRounding', label: 'Fim da mão', value: `Pedras dos adversários, ${af.endRounding === 'nearest' ? 'arredondadas ao 5 mais próximo' : 'arredondadas para baixo'}`, status: s('allFives.endRounding') },
      { key: 'allFives.blockedScoring', label: 'Mão trancada', value: af.blockedScoring === 'others-total' ? 'Menor mão leva o total das outras' : 'Menor mão leva a diferença', status: s('allFives.blockedScoring') },
      { key: 'allFives.passBonus', label: 'Ponto por passe', value: 'Desativado — regra em revisão', status: 'pending' },
    );
  }
  lines.push(
    { key: 'targetScore', label: 'Meta', value: `${rules.targetScore} pontos${rules.mode === 'all-fives' && rules.allFives.winImmediately ? ' (vence ao atingir)' : ''}`, status: s('targetScore') },
    {
      key: 'assists',
      label: 'Assistências',
      value: rules.assists.highlightPlayable || rules.assists.autoScore
        ? [rules.assists.highlightPlayable && 'destaca jogadas', rules.assists.autoScore && 'soma automática'].filter(Boolean).join(' · ')
        : 'Modo fiel à mesa (sem ajudas)',
    },
  );
  return lines;
}

export function profileSummary(p: RuleProfile): RuleLine[] {
  return describeRules(p.rules, p.ruleStatus);
}
