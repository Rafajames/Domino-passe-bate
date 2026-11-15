import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../components/Icon';

/** Painel modal (de baixo no celular, lateral em telas largas). */
export function Sheet({ title, onClose, children, side = false }: { title: string; onClose?: () => void; children: ReactNode; side?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className={`sheet ${side ? 'sheet--side' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet__header">
          <h2 className="sheet__title">{title}</h2>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">
              <Icon name="close" />
            </button>
          )}
        </header>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}
