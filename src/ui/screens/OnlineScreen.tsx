import { useEffect, useMemo, useState } from 'react';
import { DIFFICULTY_LABEL } from '../../ai/bots';
import { researchedHandSize } from '../../engine/rules/profiles';
import type { RuleSet } from '../../engine/rules/types';
import { validateRules } from '../../engine/rules/validate';
import type { BotDifficulty } from '../../engine/types';
import { useGame } from '../../state/gameStore';
import { useNav } from '../../state/navigation';
import { lastOnlineRoom, useOnline } from '../../state/onlineStore';
import { useProfiles } from '../../state/profilesStore';
import { usePlayer } from '../../state/playerStore';
import { Segmented, Switch } from '../components/Controls';
import { Icon } from '../components/Icon';
import { RuleSummary } from '../components/RuleSummary';
import { ScreenHeader } from '../components/ScreenHeader';
import { useToast } from '../components/Toast';
import { MODE_LABEL } from '../rules/describe';
import './menus.css';

function roomLink(code: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}?sala=${code}`;
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
  // Ajustes da mesa por cima do perfil (null = usar o do perfil).
  const [playersSel, setPlayersSel] = useState<2 | 3 | 4 | null>(null);
  const [teamsSel, setTeamsSel] = useState<boolean | null>(null);
  const [guestsSel, setGuestsSel] = useState<number | null>(null);
  useEffect(() => {
    setPlayersSel(null);
    setTeamsSel(null);
    setGuestsSel(null);
  }, [profileId]);
  const tableRules: RuleSet | null = useMemo(() => {
    if (!profile) return null;
    const r = profile.rules;
    const players = playersSel ?? r.players;
    const handSize =
      players === r.players || profile.mode === 'burrinha'
        ? r.handSize
        : profile.mode !== 'passe-bate' && r.boneyard
          ? researchedHandSize(players)
          : players === 4
            ? 7
            : r.handSize;
    return { ...r, players, teams: players === 4 ? (teamsSel ?? r.teams) : false, handSize };
  }, [profile, playersSel, teamsSel]);
  const tableErrors = tableRules ? validateRules(tableRules) : [];
  const maxGuests = tableRules ? Math.max(1, Math.min(guestsSel ?? tableRules.players - 1, tableRules.players - 1)) : 1;
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
          {!nameOk && <span className="field__hint-warn">Digite seu nome (2 letras ou mais) para criar ou entrar numa sala.</span>}
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
        {!nameOk && <span className="muted" style={{ fontSize: 'var(--fs-xs)', textAlign: 'center' }}>Falta o seu nome lá em cima.</span>}
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
                {p.name.startsWith(MODE_LABEL[p.mode]) ? p.name : `${MODE_LABEL[p.mode]} — ${p.name}`}
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
        {tableRules && (
          <>
            <div className="field">
              <span className="field__label">Jogadores na mesa</span>
              <Segmented<number>
                label="Jogadores na mesa"
                value={tableRules.players}
                onChange={(v) => {
                  setPlayersSel(v as 2 | 3 | 4);
                  setGuestsSel(null);
                }}
                options={[2, 3, 4].map((n) => ({ value: n, label: String(n) }))}
              />
            </div>
            {tableRules.players === 4 && (
              <div className="rule-row rule-row--inline" style={{ padding: 0, border: 0 }}>
                <span className="list__main">
                  <span className="rule-row__label">Jogar em duplas</span>
                  <span className="rule-row__hint">Você joga com quem senta à sua frente.</span>
                </span>
                <Switch label="Jogar em duplas" checked={tableRules.teams} onChange={setTeamsSel} />
              </div>
            )}
            <div className="field">
              <span className="field__label">Amigos que podem entrar pelo link</span>
              <Segmented<number>
                label="Vagas para amigos"
                value={maxGuests}
                onChange={setGuestsSel}
                options={Array.from({ length: tableRules.players - 1 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
              />
              {maxGuests < tableRules.players - 1 && (
                <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>Os outros {tableRules.players - 1 - maxGuests} lugar(es) ficam com bots.</span>
              )}
            </div>
            {tableErrors.length > 0 && <p className="errors" role="alert">{tableErrors[0]}</p>}
          </>
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
        <button className="btn btn--primary" disabled={!profile || !tableRules || tableErrors.length > 0 || !nameOk} onClick={() => profile && tableRules && (commitName(), createRoom(profile, tableRules, difficulty, maxGuests))}>
          <Icon name="plus" size={18} /> Criar sala
        </button>
        {!nameOk && <span className="muted" style={{ fontSize: 'var(--fs-xs)', textAlign: 'center' }}>Falta o seu nome lá em cima.</span>}
      </section>

      <section className="panel" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="info" />
        <p style={{ fontSize: 'var(--fs-sm)' }}>
          Funciona sem servidor próprio: o celular de quem cria a sala vira a mesa e precisa ficar com o app aberto até o fim.
          Cada convidado vê só as próprias pedras. Partidas online entre amigos não contam para ranking. Algumas redes móveis
          bloqueiam conexões diretas; se não conectar, tente pelo Wi-Fi.
        </p>
      </section>

    </>
  );
}

function Lobby() {
  const online = useOnline();
  const match = useGame((s) => s.match);
  const go = useNav((s) => s.go);
  const back = useNav((s) => s.back);
  const toast = useToast();
  const { role, status, code, lobby, mySeat, error, phase, via } = online;
  const teams = !!lobby?.frozen.rules.teams;

  async function share() {
    if (!code) return;
    const link = roomLink(code);
    try {
      if (navigator.share) await navigator.share({ title: 'Passe & Bate', text: `Bora jogar dominó? Sala ${code}`, url: link });
      else {
        await navigator.clipboard.writeText(link);
        toast('Link copiado.');
      }
    } catch {
      /* cancelado */
    }
  }

  if (status === 'connecting')
    return (
      <>
        <p className="muted" role="status">{phase ?? 'Conectando…'}</p>
        <button className="btn btn--sm" onClick={() => online.leave()}>Cancelar</button>
      </>
    );
  if (status === 'error')
    return (
      <>
        <p className="errors" role="alert">{error}</p>
        {role === 'guest' && <button className="btn" onClick={() => online.retry()}>Tentar de novo</button>}
        <button className="btn" onClick={() => online.leave()}>Voltar</button>
      </>
    );

  return (
    <>
      {status === 'reconnecting' && <p className="errors" role="status">Conexão perdida. Tentando reconectar…</p>}
      {role === 'guest' && via === 'relay' && status !== 'reconnecting' && <p className="muted" style={{ textAlign: 'center' }}>Conectado pelo servidor reserva.</p>}
      <section className="panel" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <span className="section-title">Código da sala</span>
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', letterSpacing: '0.18em' }}>{code}</strong>
        {role === 'host' && (
          <button className="btn btn--sm" onClick={share}>
            <Icon name="share" size={18} /> Convidar (enviar link)
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
            {teams && mySeat !== null && mySeat !== 0 && (
              <p className="panel" role="status" style={{ marginBottom: 8 }}>
                {mySeat % 2 === 0 ? `Você é parceiro de ${lobby.hostName}.` : `Você joga contra ${lobby.hostName}.`}
              </p>
            )}
            {role === 'host' && <p className="muted" style={{ marginBottom: 8, fontSize: 'var(--fs-sm)' }}>Até {lobby.maxGuests} amigo(s) entram pelo link.</p>}
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
                      {teams && ` · ${s.seat % 2 === 0 ? 'Dupla do anfitrião' : 'Dupla adversária'}`}
                    </span>
                    {role === 'host' && s.kind === 'guest' && status !== 'playing' && (
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                        {teams && (
                          <Segmented<'ally' | 'rival'>
                            label={`Lado de ${s.name}`}
                            value={s.seat % 2 === 0 ? 'ally' : 'rival'}
                            onChange={(side) => online.setSide(s.seat, side)}
                            options={[{ value: 'ally', label: 'A favor' }, { value: 'rival', label: 'Contra' }]}
                          />
                        )}
                        <select className="input" aria-label={`Lugar de ${s.name}`} value={s.seat} onChange={(e) => online.moveGuest(s.seat, Number(e.target.value))}>
                          {lobby.seats.filter((x) => x.seat !== 0).map((x) => (
                            <option key={x.seat} value={x.seat}>
                              Lugar {x.seat + 1}{teams ? (x.seat % 2 === 0 ? ' (parceiro)' : ' (adversário)') : ''}{x.seat !== s.seat && x.kind === 'guest' ? ` — troca com ${x.name}` : ''}
                            </option>
                          ))}
                        </select>
                      </span>
                    )}
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
