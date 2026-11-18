import type { MatchState } from '../../engine/types';
import { useSettings, type TableTheme } from '../../state/settingsStore';
import { Segmented, Switch } from '../components/Controls';
import { RuleSummary } from '../components/RuleSummary';
import { Sheet } from './Sheet';

export function GameMenu({
  match,
  net = 'local',
  disconnected = [],
  onBot,
  onClose,
  onQuit,
}: {
  match: MatchState;
  net?: 'local' | 'host' | 'guest';
  disconnected?: { seat: number; name: string }[];
  onBot?: (seat: number) => void;
  onClose: () => void;
  onQuit: () => void;
}) {
  const tableTheme = useSettings((s) => s.tableTheme);
  const set = useSettings((s) => s.set);
  const soundEnabled = useSettings((s) => s.soundEnabled);
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
        {disconnected.length > 0 && (
          <section>
            <h3 className="section-title" style={{ marginBottom: 8 }}>Jogadores desconectados</h3>
            {disconnected.map((d) => (
              <div key={d.seat} className="rule-row rule-row--inline" style={{ padding: '4px 0', border: 0 }}>
                <span>{d.name}</span>
                <button className="btn btn--sm" onClick={() => onBot?.(d.seat)}>Colocar um bot no lugar</button>
              </div>
            ))}
          </section>
        )}
        <section className="rule-row rule-row--inline" style={{ padding: 0, border: 0 }}>
          <span className="rule-row__label">Sons</span>
          <Switch label="Sons" checked={soundEnabled} onChange={(v) => set({ soundEnabled: v })} />
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
              if (confirm(net === 'host' ? 'Encerrar a sala? A partida acaba para todos.' : net === 'guest' ? 'Sair da sala?' : 'Abandonar a partida? Partidas abandonadas não entram nas estatísticas.')) onQuit();
            }}
          >
            {net === 'host' ? 'Encerrar a sala' : net === 'guest' ? 'Sair da sala' : 'Abandonar partida'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
