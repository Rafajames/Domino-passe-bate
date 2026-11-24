import { useState } from 'react';
import { DIFFICULTY_DESCRIPTION, DIFFICULTY_LABEL } from '../../ai/bots';
import type { BotDifficulty } from '../../engine/types';
import { useGame } from '../../state/gameStore';
import { useNav } from '../../state/navigation';
import { useProfiles } from '../../state/profilesStore';
import { Icon } from '../components/Icon';
import { Segmented, Switch } from '../components/Controls';
import type { DealMode } from '../../engine/rules/types';
import { RuleSummary } from '../components/RuleSummary';
import { ScreenHeader } from '../components/ScreenHeader';
import { MODE_LABEL } from '../rules/describe';
import './menus.css';

const LEVELS: BotDifficulty[] = ['facil', 'normal', 'dificil', 'mestre'];

export function SetupScreen({ profileId }: { profileId: string }) {
  const profile = useProfiles((s) => s.get(profileId));
  const startSolo = useGame((s) => s.startSolo);
  const replace = useNav((s) => s.replace);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('normal');
  const [faithful, setFaithful] = useState(() => !!profile && !profile.rules.assists.highlightPlayable && !profile.rules.assists.autoScore);
  const [handSize, setHandSize] = useState(profile?.rules.handSize ?? 7);
  const [boneyard, setBoneyard] = useState(profile?.rules.boneyard ?? false);
  const [dealMode, setDealMode] = useState<DealMode>(profile?.rules.dealMode ?? 'auto');
  const [openWithDouble, setOpenWithDouble] = useState(profile?.rules.openWithDouble ?? false);

  const [humans, setHumans] = useState<Record<number, string>>({});
  const [playersChoice, setPlayersChoice] = useState<2 | 3 | 4>(profile?.rules.players ?? 4);

  if (!profile) return null;
  const isBurrinha = profile.rules.mode === 'burrinha';
  const players = isBurrinha ? playersChoice : profile.rules.players;
  const remaining = 28 - players * handSize;
  const sizes = [5, 6, 7].filter((n) => n * players <= 28);
  if (!sizes.includes(profile.rules.handSize)) sizes.push(profile.rules.handSize);
  sizes.sort((a, b) => a - b);
  // Ajustes desta partida (não alteram o perfil salvo).
  const rules = {
    ...profile.rules,
    players,
    handSize: isBurrinha ? profile.rules.handSize : handSize,
    boneyard: isBurrinha ? profile.rules.boneyard : remaining > 0 ? boneyard : false,
    dealMode,
    openWithDouble,
    assists: faithful ? { highlightPlayable: false, autoScore: false } : { highlightPlayable: true, autoScore: true },
  };
  const humanSeats = Object.keys(humans).map(Number).filter((s) => s < players);
  const botCount = players - 1 - humanSeats.length;
  const opponents = humanSeats.length
    ? `${humanSeats.length + 1} pessoas neste aparelho${botCount ? ` e ${botCount} bot${botCount > 1 ? 's' : ''}` : ''} — passem o celular a cada vez`
    : rules.teams
      ? 'Você e um bot parceiro contra dois bots'
      : `Você contra ${players - 1} bot${players > 2 ? 's' : ''}`;
  const seatLabel = (seat: number) => {
    if (players === 2) return 'À sua frente';
    if (players === 3) return seat === 1 ? 'À sua direita' : 'À sua esquerda';
    return seat === 1 ? 'À sua direita' : seat === 2 ? (rules.teams ? 'À sua frente (parceiro)' : 'À sua frente') : 'À sua esquerda';
  };

  return (
    <main className="screen">
      <ScreenHeader title="Nova partida" />
      <div className="screen__body">
        <div>
          <p className="section-title">{MODE_LABEL[profile.mode]}</p>
          <h2 style={{ fontSize: 'var(--fs-xl)', marginTop: 4 }}>{profile.name}</h2>
          <p className="muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 4 }}>{opponents}</p>
        </div>

        <section>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Quem joga</h3>
          <p className="muted" style={{ fontSize: 'var(--fs-xs)', marginBottom: 8 }}>
            Mais de uma pessoa? Escolha "Pessoa" nos lugares e passem o celular — as pedras ficam escondidas entre uma vez e outra.
          </p>
          <div className="list">
            {Array.from({ length: players - 1 }, (_, i) => i + 1).map((seat) => {
              const isHuman = seat in humans;
              return (
                <div key={seat} className="list__item" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                  <span className="list__main" style={{ minWidth: 120 }}>
                    <span className="list__label">{seatLabel(seat)}</span>
                  </span>
                  <Segmented<'bot' | 'human'>
                    label={`Lugar ${seatLabel(seat)}`}
                    value={isHuman ? 'human' : 'bot'}
                    onChange={(v) =>
                      setHumans((h) => {
                        const next = { ...h };
                        if (v === 'human') next[seat] = h[seat] ?? '';
                        else delete next[seat];
                        return next;
                      })
                    }
                    options={[
                      { value: 'bot', label: 'Bot' },
                      { value: 'human', label: 'Pessoa' },
                    ]}
                  />
                  {isHuman && (
                    <input
                      className="input"
                      style={{ width: '100%' }}
                      placeholder={`Nome (ex.: Jogador ${seat + 1})`}
                      maxLength={20}
                      value={humans[seat]}
                      onChange={(e) => setHumans((h) => ({ ...h, [seat]: e.target.value }))}
                      aria-label={`Nome de quem senta ${seatLabel(seat).toLowerCase()}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ display: botCount === 0 ? 'none' : undefined }}>
          <h3 className="section-title" style={{ marginBottom: 8 }}>Dificuldade dos bots</h3>
          <div className="difficulty">
            {LEVELS.map((lvl, i) => (
              <button key={lvl} aria-pressed={difficulty === lvl} onClick={() => setDifficulty(lvl)}>
                <span className="difficulty__level" aria-hidden>
                  {LEVELS.map((_, j) => (
                    <i key={j} className={j <= i ? 'on' : ''} />
                  ))}
                </span>
                <span className="difficulty__name">{DIFFICULTY_LABEL[lvl]}</span>
                <span className="difficulty__desc">{DIFFICULTY_DESCRIPTION[lvl]}</span>
              </button>
            ))}
          </div>
        </section>

        <details className="setup__more">
          <summary>Mais opções <span className="muted">— pedras, distribuição, estilo e regras</span></summary>
          <div className="setup__more-body">
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 className="section-title">{isBurrinha ? 'Mesa' : 'Pedras'}</h3>
          {isBurrinha && (
            <Segmented<2 | 3 | 4>
              label="Jogadores"
              value={playersChoice}
              onChange={setPlayersChoice}
              options={[
                { value: 2, label: '2 jogadores' },
                { value: 3, label: '3 jogadores' },
                { value: 4, label: '4 jogadores' },
              ]}
            />
          )}
          {!isBurrinha && (
            <Segmented
              label="Pedras por jogador"
              value={handSize}
              onChange={setHandSize}
              options={sizes.map((n) => ({ value: n, label: `${n} cada` }))}
            />
          )}
          {!isBurrinha && remaining > 0 && (
            <Segmented
              label="O que fazer com as pedras que sobram"
              value={boneyard ? 'dorme' : 'cemiterio'}
              onChange={(v) => setBoneyard(v === 'dorme')}
              options={[
                { value: 'cemiterio', label: `Cemitério (${remaining})` },
                { value: 'dorme', label: `Dorme para compra (${remaining})` },
              ]}
            />
          )}
          <p className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
            {isBurrinha
              ? `Cada um começa com ${profile.rules.burrinha?.startTiles ?? 3} pedras; as outras ${28 - players * (profile.rules.burrinha?.startTiles ?? 3)} ficam no dorme.`
              : remaining === 0
              ? 'Todas as 28 pedras são distribuídas.'
              : boneyard
                ? `As ${remaining} pedras que sobram ficam no dorme: quem não tem jogada compra.`
                : `As ${remaining} pedras que sobram vão para o cemitério: ficam fora do jogo e ninguém compra.`}
          </p>
          <Segmented<DealMode>
            label="Distribuição"
            value={dealMode}
            onChange={setDealMode}
            options={[
              { value: 'auto', label: 'Automática' },
              { value: 'pick', label: 'Embaralhar e escolher' },
            ]}
          />
          <div className="rule-row rule-row--inline" style={{ padding: 0, border: 0 }}>
            <span className="list__main">
              <span className="rule-row__label">Sair só de carroça</span>
              <span className="rule-row__hint">Toda rodada começa com uma carroça. Sem carroça, sai o próximo da roda que tiver.</span>
            </span>
            <Switch label="Sair só de carroça" checked={openWithDouble} onChange={setOpenWithDouble} />
          </div>
          {dealMode === 'pick' && (
            <p className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
              As 28 pedras ficam viradas na mesa. Você embaralha e escolhe as suas; os bots pegam das que sobrarem.
            </p>
          )}
        </section>

        <section>
          <h3 className="section-title" style={{ marginBottom: 8 }}>Estilo</h3>
          <div className="assist-choice">
            <button aria-pressed={!faithful} onClick={() => setFaithful(false)}>
              <strong>Assistido</strong>
              <span className="difficulty__desc">Destaca jogadas válidas e soma os pontos para você.</span>
            </button>
            <button aria-pressed={faithful} onClick={() => setFaithful(true)}>
              <strong>Fiel à mesa</strong>
              <span className="difficulty__desc">Sem destaques. No De 5 em 5, quem não marca os pontos, perde.</span>
            </button>
          </div>
        </section>

        <section>
          <h3 className="section-title" style={{ marginBottom: 8 }}>Regras desta partida</h3>
          <div className="panel">
            <RuleSummary rules={rules} status={profile.ruleStatus} />
          </div>
          <p className="muted" style={{ fontSize: 'var(--fs-xs)', marginTop: 8 }}>
            As regras são congeladas ao iniciar: editar o perfil depois não altera esta partida. Partidas contra bots não contam para o ranking.
          </p>
        </section>
          </div>
        </details>

        <div className="sticky-footer">
          <button
            className="btn btn--primary btn--block"
            style={{ minHeight: 54, fontSize: 'var(--fs-lg)' }}
            onClick={() => {
              startSolo(
                profile,
                rules,
                difficulty,
                humanSeats.map((seat) => ({ seat, name: humans[seat] || `Jogador ${seat + 1}` })),
              );
              replace({ name: 'game' });
            }}
          >
            <Icon name="play" size={20} /> Começar
          </button>
        </div>
      </div>
    </main>
  );
}
