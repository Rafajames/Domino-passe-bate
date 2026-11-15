import type { RuleStatus, RuleSet } from '../../engine/rules/types';
import { describeRules } from '../rules/describe';
import { StatusBadge } from './StatusBadge';

export function RuleSummary({ rules, status, compact = false }: { rules: RuleSet; status?: Record<string, RuleStatus>; compact?: boolean }) {
  const lines = describeRules(rules, status);
  return (
    <dl className={`rule-summary ${compact ? 'rule-summary--compact' : ''}`}>
      {lines.map((l) => (
        <div key={l.key} className="rule-summary__row">
          <dt>{l.label}</dt>
          <dd>
            <span>{l.value}</span>
            {l.status && !compact && <StatusBadge status={l.status} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}
