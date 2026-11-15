import type { RuleStatus } from '../../engine/rules/types';

export const STATUS_LABEL: Record<RuleStatus, string> = {
  confirmed: 'Confirmada',
  regional: 'Regional',
  researched: 'Pesquisada',
  pending: 'Pendente',
};

const STATUS_HINT: Record<RuleStatus, string> = {
  confirmed: 'Regra confirmada para este perfil.',
  regional: 'Variação regional registrada — não é universal.',
  researched: 'Padrão encontrado em fontes públicas de regras.',
  pending: 'Em revisão. Valor provisório ou regra desativada até confirmação.',
};

export function StatusBadge({ status }: { status: RuleStatus }) {
  return (
    <span className="badge" style={{ color: `var(--status-${status})` }} title={STATUS_HINT[status]}>
      {STATUS_LABEL[status]}
    </span>
  );
}
