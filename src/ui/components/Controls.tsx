import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} aria-pressed={o.value === value} disabled={o.disabled} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button className="switch" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />;
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button aria-label={`Diminuir ${label}`} disabled={value - step < min} onClick={() => onChange(Math.max(min, value - step))}>
        <Icon name="minus" size={18} />
      </button>
      <output aria-live="polite">{value}</output>
      <button aria-label={`Aumentar ${label}`} disabled={value + step > max} onClick={() => onChange(Math.min(max, value + step))}>
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

export function RuleRow({ label, hint, badge, children, inline }: { label: string; hint?: string; badge?: ReactNode; children: ReactNode; inline?: boolean }) {
  return (
    <div className={`rule-row ${inline ? 'rule-row--inline' : ''}`}>
      <div className="rule-row__head" style={inline ? { flex: 1, flexDirection: 'column', alignItems: 'flex-start' } : undefined}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="rule-row__label">{label}</span>
          {badge}
        </span>
        {hint && <span className="rule-row__hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
