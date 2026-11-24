import type { RuleStatus } from '../../engine/rules/types';

export const STATUS_LABEL: Record<RuleStatus, string> = {
  confirmed: 'Confirmada',
  regional: 'Regional',
  researched: 'Pesquisada',
  pending: 'Em revisão',
};

const STATUS_HINT: Record<RuleStatus, string> = {
  confirmed: 'Regra confirmada para este perfil.',
  regional: 'Variação regional registrada — não é universal.',
  researched: 'Padrão encontrado em fontes públicas de regras.',
  pending: 'Em revisão. Valor provisório ou regra desativada até confirmação.',
};

/**
 * Só "Em revisão" aparece para o jogador: "Confirmada", "Regional" e "Pesquisada" são
 * anotações de quem mantém as regras (ficam no código e em docs/regras) e só confundiam.
 */
export function StatusBadge({ status }: { status: RuleStatus }) {
  if (status !== 'pending') return null;
  return (
    <span className="badge" style={{ color: `var(--status-${status})` }} title={STATUS_HINT[status]}>
      {STATUS_LABEL[status]}
    </span>
  );
}
