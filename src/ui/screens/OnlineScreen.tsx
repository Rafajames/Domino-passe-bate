import { useMemo, useState } from 'react';
import { DIFFICULTY_LABEL } from '../../ai/bots';
import type { BotDifficulty } from '../../engine/types';
import { useGame } from '../../state/gameStore';
import { useNav } from '../../state/navigation';
import { lastOnlineRoom, useOnline } from '../../state/onlineStore';
import { useProfiles } from '../../state/profilesStore';
import { usePlayer } from '../../state/playerStore';
import { Segmented } from '../components/Controls';
import { Icon } from '../components/Icon';
import { RuleSummary } from '../components/RuleSummary';
import { ScreenHeader } from '../components/ScreenHeader';
import { useToast } from '../components/Toast';
import { MODE_LABEL } from '../rules/describe';
import { publicBaseUrl, shareText } from '../../services/platform';
import './menus.css';

/** Link de convite; no app sem site público configurado não há link, só o código. */
function roomLink(code: string): string | undefined {
  const base = publicBaseUrl();
  return base ? `${base}?sala=${code}` : undefined;
}

export function OnlineScreen({ code: initialCode }: { code?: string }) {
  const online = useOnline();
  const inRoom = online.role !== null;
  return (
    <main className="screen">
      <ScreenHeader title={inRoom ? (online.role === 'host' ? 'Sua sala' : 'Sala') : 'Jogar online'} />
      <div className="screen__body">{inRoom ? <Lobby /> : <Hub initialCode={initialCode} />}</div>
    </main>
  );
}

function Hub({ initialCode }: { initialCode?: string }) {
  const { joinRoom, createRoom } = useOnline.getState();
  const all = useProfiles((s) => s.all)();
  const [code, setCode] = useState(initialCode ?? '');
  const [profileId, setProfileId] = useState(all[0]?.id ?? '');
  const [difficulty, setDifficulty] = useState<BotDifficulty>('normal');
  const last = useMemo(lastOnlineRoom, []);
  const profile = all.find((p) => p.id === profileId);
  const player = usePlayer((s) => s.player);
  const setPlayer = usePlayer((s) => s.setPlayer);
  const [name, setName] = useState(player.name === 'Você' ? '' : player.name);
  const nameOk = name.trim().length >= 2 && name.trim().toLowerCase() !== 'você';
  const commitName = () => setPlayer({ name: name.trim() });

  return (
    <>
      <section className="panel">
        <div className="field">
          <label className="field__label" htmlFor="online-name">Seu nome na mesa</label>
          <input id="online-name" className="input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="Como os amigos vão te ver" />
          {!nameOk && <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>Digite seu nome para criar ou entrar numa sala.</span>}
        </div>
      </section>
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 'var(--fs-xl)' }}>Entrar numa sala</h2>
        <div className="field">
          <label className="field__label" htmlFor="room-code">Código da sala</label>
          <input
            id="room-code"
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="Ex.: K7QX2M"
            autoCapitalize="characters"
            style={{ fontSize: 'var(--fs-xl)', letterSpacing: '0.2em', textAlign: 'center' }}
          />
        </div>
        <button className="btn btn--primary" disabled={code.length !== 6 || !nameOk} onClick={() => (commitName(), joinRoom(code))}>
          Entrar
        </button>
        {last && last !== code && (
          <button className="btn btn--sm btn--ghost" disabled={!nameOk} onClick={() => (commitName(), joinRoom(last))}>
            Reconectar à última sala ({last})
          </button>
        )}
      </section>

      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 'var(--fs-xl)' }}>Criar sala</h2>
        <div className="field">
          <label className="field__label" htmlFor="room-profile">Regras</label>
          <select id="room-profile" className="input" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            {all.map((p) => (
              <option key={p.id} value={p.id}>
                {MODE_LABEL[p.mode]} — {p.name}
              </option>
            ))}
          </select>
        </div>
        {profile && (
          <details>
            <summary className="muted" style={{ cursor: 'pointer', fontSize: 'var(--fs-sm)' }}>Ver resumo das regras</summary>
            <RuleSummary rules={profile.rules} status={profile.ruleStatus} compact />
          </details>
        )}
        <div className="field">
          <span className="field__label">Bots nos lugares vazios</span>
          <Segmented<BotDifficulty>
            label="Dificuldade dos bots"
            value={difficulty}
            onChange={setDifficulty}
            options={(['facil', 'normal', 'dificil', 'mestre'] as const).map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
          />
        </div>
        <button className="btn btn--primary" disabled={!profile || !nameOk} onClick={() => profile && (commitName(), createRoom(profile, profile.rules, difficulty))}>
          <Icon name="plus" size={18} /> Criar sala
        </button>
      </section>

      <section className="panel" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="info" />
        <p style={{ fontSize: 'var(--fs-sm)' }}>
          Funciona sem servidor próprio: o celular de quem cria a sala vira a mesa e precisa ficar com o app aberto até o fim.
          Cada convidado vê só as próprias pedras. Partidas online entre amigos não contam para ranking. Algumas redes móveis
          bloqueiam conexões diretas; se não conectar, tente pelo Wi-Fi.
        </p>
      </section>

      <div className="list">
        {['Ranking e temporadas', 'Torneios', 'Partida rápida com desconhecidos'].map((t) => (
          <div key={t} className="list__item" aria-disabled="true">
            <span className="list__main"><span className="list__label">{t}</span></span>
            <span className="badge badge--soon">Requer servidor · em breve</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Lobby() {
  const online = useOnline();
  const match = useGame((s) => s.match);
  const go = useNav((s) => s.go);
  const back = useNav((s) => s.back);
  const toast = useToast();
  const { role, status, code, lobby, mySeat, error } = online;

  async function share() {
    if (!code) return;
    const link = roomLink(code);
    const text = link
      ? `Bora jogar dominó? Sala ${code}`
      : `Bora jogar dominó no Passe & Bate? Abra o jogo, toque em Jogar online e entre na sala ${code}.`;
    try {
      if ((await shareText({ title: 'Passe & Bate', text, url: link })) === 'copied') toast(link ? 'Link copiado.' : 'Convite copiado.');
    } catch {
      toast('Não foi possível compartilhar automaticamente.');
    }
  }

  if (status === 'connecting') return <p className="muted">Conectando…</p>;
  if (status === 'error')
    return (
      <>
        <p className="errors">{error}</p>
        <button className="btn" onClick={() => online.leave()}>Voltar</button>
      </>
    );

  return (
    <>
      {status === 'reconnecting' && <p className="errors">Conexão perdida. Tentando reconectar…</p>}
      <section className="panel" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <span className="section-title">Código da sala</span>
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', letterSpacing: '0.18em' }}>{code}</strong>
        {role === 'host' && (
          <button className="btn btn--sm" onClick={share}>
            <Icon name="share" size={18} /> Convidar
          </button>
        )}
      </section>

      {lobby && (
        <>
          <section>
            <h2 className="section-title" style={{ marginBottom: 8 }}>
              {MODE_LABEL[lobby.frozen.rules.mode]} · {lobby.frozen.profileName}
            </h2>
            <div className="panel">
              <RuleSummary rules={lobby.frozen.rules} />
            </div>
          </section>

          <section>
            <h2 className="section-title" style={{ marginBottom: 8 }}>Mesa</h2>
            <div className="list">
              {lobby.seats.map((s) => (
                <div key={s.seat} className="list__item" style={{ cursor: 'default' }}>
                  <span style={{ fontSize: 22 }}>{s.avatar}</span>
                  <span className="list__main">
                    <span className="list__label">
                      {s.name} {s.seat === mySeat ? '(você)' : ''}
                    </span>
                    <span className="list__hint">
                      {s.kind === 'host' ? 'Anfitrião' : s.kind === 'guest' ? (s.connected ? 'Conectado' : 'Desconectado') : s.kind === 'bot' ? 'Bot' : 'Vai virar bot se ninguém entrar'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="sticky-footer" style={{ flexDirection: 'column' }}>
        {status === 'playing' && match ? (
          <button className="btn btn--primary btn--block" onClick={() => go({ name: 'game' })}>
            Voltar à partida
          </button>
        ) : role === 'host' ? (
          <button className="btn btn--primary btn--block" onClick={() => online.startGame()}>
            <Icon name="play" size={18} /> Começar partida
          </button>
        ) : mySeat === null ? (
          <button className="btn btn--primary btn--block" disabled={!lobby} onClick={() => online.acceptSeat()}>
            Aceitar as regras e sentar à mesa
          </button>
        ) : (
          <p className="muted" style={{ textAlign: 'center' }}>Aguardando o anfitrião começar…</p>
        )}
        <button
          className="btn btn--ghost btn--block"
          onClick={() => {
            online.leave();
            back();
          }}
        >
          Sair da sala
        </button>
      </div>
    </>
  );
}
