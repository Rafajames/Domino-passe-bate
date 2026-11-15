import type { MatchState } from '../../engine/types';
import { useSettings, type TableTheme } from '../../state/settingsStore';
import { Segmented } from '../components/Controls';
import { RuleSummary } from '../components/RuleSummary';
import { Sheet } from './Sheet';

export function GameMenu({ match, onClose, onQuit }: { match: MatchState; onClose: () => void; onQuit: () => void }) {
  const tableTheme = useSettings((s) => s.tableTheme);
  const set = useSettings((s) => s.set);
  const f = match.frozen;
  return (
    <Sheet title="Partida" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section>
          <h3 className="section-title" style={{ marginBottom: 8 }}>Mesa</h3>
          <Segmented<TableTheme>
            label="Tema da mesa"
            value={tableTheme}
            onChange={(tableTheme) => set({ tableTheme })}
            options={[
              { value: 'feltro', label: 'Feltro' },
              { value: 'madeira', label: 'Madeira' },
              { value: 'noite', label: 'Noite' },
            ]}
          />
        </section>
        <section>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Regras desta partida</h3>
          <p className="muted" style={{ fontSize: 'var(--fs-xs)', marginBottom: 8 }}>
            {f.profileName} · versão {f.profileVersion} · congeladas em {new Date(f.frozenAt).toLocaleString('pt-BR')} · #{f.hash}
          </p>
          <RuleSummary rules={f.rules} compact />
        </section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn--primary btn--block" onClick={onClose}>Voltar ao jogo</button>
          <button
            className="btn btn--block btn--ghost"
            style={{ color: 'var(--danger)' }}
            onClick={() => {
              if (confirm('Abandonar a partida? Partidas abandonadas não entram nas estatísticas.')) onQuit();
            }}
          >
            Abandonar partida
          </button>
        </div>
      </div>
    </Sheet>
  );
}
