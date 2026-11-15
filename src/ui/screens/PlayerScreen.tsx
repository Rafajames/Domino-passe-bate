import { DIFFICULTY_LABEL } from '../../ai/bots';
import { AVATARS, statsFor, usePlayer } from '../../state/playerStore';
import { useSettings, type TableTheme } from '../../state/settingsStore';
import { Avatar } from '../components/Avatar';
import { Segmented, Switch } from '../components/Controls';
import { ScreenHeader } from '../components/ScreenHeader';
import { MODE_LABEL } from '../rules/describe';
import './menus.css';

export function PlayerScreen() {
  const player = usePlayer((s) => s.player);
  const history = usePlayer((s) => s.history);
  const setPlayer = usePlayer((s) => s.setPlayer);
  const clearHistory = usePlayer((s) => s.clearHistory);
  const settings = useSettings();
  const all = statsFor(history);

  return (
    <main className="screen">
      <ScreenHeader title="Meu perfil" />
      <div className="screen__body">
        <div className="player-head">
          <Avatar emoji={player.avatar} size={72} ring="var(--brass)" />
          <div className="field" style={{ flex: 1 }}>
            <label className="field__label" htmlFor="pn">Nome na mesa</label>
            <input id="pn" className="input" value={player.name} maxLength={20} onChange={(e) => setPlayer({ name: e.target.value })} />
          </div>
        </div>

        <section>
          <h2 className="section-title" style={{ marginBottom: 8 }}>Avatar</h2>
          <div className="avatar-grid" role="group" aria-label="Escolha um avatar">
            {AVATARS.map((a) => (
              <button key={a} aria-pressed={player.avatar === a} onClick={() => setPlayer({ avatar: a })} aria-label={`Avatar ${a}`}>
                {a}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="section-title" style={{ marginBottom: 4 }}>Partidas contra bots</h2>
          <p className="muted" style={{ fontSize: 'var(--fs-xs)', marginBottom: 8 }}>
            Registradas só neste dispositivo. Não contam para o ranking competitivo.
          </p>
          <div className="stats">
            <div className="stat"><div className="stat__value">{all.played}</div><div className="stat__label">Partidas</div></div>
            <div className="stat"><div className="stat__value">{all.wins}</div><div className="stat__label">Vitórias</div></div>
            <div className="stat"><div className="stat__value">{all.played ? Math.round(all.winRate * 100) : 0}%</div><div className="stat__label">Aproveitamento</div></div>
          </div>
          <div className="list" style={{ marginTop: 12 }}>
            {(['passe-bate', 'all-fives'] as const).map((m) => {
              const s = statsFor(history, m);
              return (
                <div key={m} className="list__item" aria-disabled="true" style={{ cursor: 'default', opacity: 1 }}>
                  <span className="list__main">
                    <span className="list__label">{MODE_LABEL[m]}</span>
                    <span className="list__hint">{s.played} partidas · {s.wins} vitórias · {s.losses} derrotas</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {history.length > 0 && (
          <section>
            <h2 className="section-title" style={{ marginBottom: 8 }}>Últimas partidas</h2>
            <div className="list">
              {history.slice(0, 10).map((h) => (
                <div key={h.id} className="list__item" style={{ cursor: 'default' }}>
                  <span className="list__main">
                    <span className="list__label" style={{ color: h.won ? 'var(--success)' : 'var(--text-2)' }}>
                      {h.won ? 'Vitória' : 'Derrota'} · {h.myScore} × {h.bestOpponentScore}
                    </span>
                    <span className="list__hint">
                      {h.profileName} · {DIFFICULTY_LABEL[h.difficulty]} · {new Date(h.finishedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <button className="btn btn--sm btn--ghost" style={{ marginTop: 8 }} onClick={() => confirm('Apagar o histórico local?') && clearHistory()}>
              Apagar histórico local
            </button>
          </section>
        )}

        <section>
          <h2 className="section-title" style={{ marginBottom: 8 }}>Preferências</h2>
          <div className="panel">
            <div className="rule-row">
              <span className="rule-row__label">Tema da mesa</span>
              <Segmented<TableTheme>
                label="Tema da mesa"
                value={settings.tableTheme}
                onChange={(tableTheme) => settings.set({ tableTheme })}
                options={[
                  { value: 'feltro', label: 'Feltro' },
                  { value: 'madeira', label: 'Madeira' },
                  { value: 'noite', label: 'Noite' },
                ]}
              />
            </div>
            <div className="rule-row rule-row--inline">
              <span className="list__main">
                <span className="rule-row__label">Sons</span>
                <span className="rule-row__hint">Pedra na mesa, passe, pontos e fim de rodada.</span>
              </span>
              <Switch label="Sons" checked={settings.soundEnabled} onChange={(soundEnabled) => settings.set({ soundEnabled })} />
            </div>
            {settings.soundEnabled && (
              <div className="rule-row">
                <label className="rule-row__label" htmlFor="vol">Volume</label>
                <input id="vol" type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => settings.set({ volume: Number(e.target.value) })} className="range" />
              </div>
            )}
            <div className="rule-row rule-row--inline">
              <span className="list__main">
                <span className="rule-row__label">Reduzir animações</span>
                <span className="rule-row__hint">Também segue a configuração do sistema.</span>
              </span>
              <Switch label="Reduzir animações" checked={settings.reducedMotion} onChange={(reducedMotion) => settings.set({ reducedMotion })} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-title" style={{ marginBottom: 8 }}>Online</h2>
          <div className="list">
            {['Ranking e rating competitivo', 'Conquistas e medalhas', 'Amigos e duplas favoritas'].map((t) => (
              <div key={t} className="list__item" aria-disabled="true">
                <span className="list__main"><span className="list__label">{t}</span></span>
                <span className="badge badge--soon">Requer conta · em breve</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
