import type { ReactNode } from 'react';
import { useNav } from '../../state/navigation';
import { Icon } from './Icon';

export function ScreenHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  const back = useNav((s) => s.back);
  return (
    <header className="screen__header">
      <button className="icon-btn" onClick={back} aria-label="Voltar">
        <Icon name="back" />
      </button>
      <h1 className="screen__title" style={{ flex: 1 }}>
        {title}
      </h1>
      {actions}
    </header>
  );
}
