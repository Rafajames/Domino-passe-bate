import { useState } from 'react';
import { DIFFICULTY_DESCRIPTION, DIFFICULTY_LABEL } from '../../ai/bots';
import type { BotDifficulty } from '../../engine/types';
import { useGame } from '../../state/gameStore';
import { useNav } from '../../state/navigation';
import { useProfiles } from '../../state/profilesStore';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Controls';
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

  if (!profile) return null;
  const players = profile.rules.players;
  const remaining = 28 - players * handSize;
  const sizes = [5, 6, 7].filter((n) => n * players <= 28);
  if (!sizes.includes(profile.rules.handSize)) sizes.push(profile.rules.handSize);
  sizes.sort((a, b) => a - b);
  // Ajustes desta partida (não alteram o perfil salvo).
  const rules = {
    ...profile.rules,
    handSize,
    boneyard: remaining > 0 ? boneyard : false,
    dealMode,
    assists: faithful ? { highlightPlayable: false, autoScore: false } : { highlightPlayable: true, autoScore: true },
  };
  const opponents = rules.teams ? 'Você e um bot parceiro contra dois bots' : `Você contra ${rules.players - 1} bot${rules.players > 2 ? 's' : ''}`;

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

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 className="section-title">Pedras</h3>
          <Segmented
            label="Pedras por jogador"
            value={handSize}
            onChange={setHandSize}
            options={sizes.map((n) => ({ value: n, label: `${n} cada` }))}
          />
          {remaining > 0 && (
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
            {remaining === 0
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
              <span className="difficulty__desc">Sem destaques. No All Fives, quem não marca os pontos, perde.</span>
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

        <div className="sticky-footer">
          <button
            className="btn btn--primary btn--block"
            style={{ minHeight: 54, fontSize: 'var(--fs-lg)' }}
            onClick={() => {
              startSolo(profile, rules, difficulty);
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
