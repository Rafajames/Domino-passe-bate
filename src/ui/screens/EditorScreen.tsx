import { useMemo, useState } from 'react';
import { cloneRules } from '../../engine/rules/freeze';
import { researchedHandSize } from '../../engine/rules/profiles';
import type { GameMode, RuleSet, RuleStatus } from '../../engine/rules/types';
import { validateRules } from '../../engine/rules/validate';
import { useNav } from '../../state/navigation';
import { useProfiles } from '../../state/profilesStore';
import { RuleRow, Segmented, Stepper, Switch } from '../components/Controls';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import './menus.css';

export function EditorScreen({ mode, profileId }: { mode: GameMode; profileId: string }) {
  const get = useProfiles((s) => s.get);
  const create = useProfiles((s) => s.create);
  const saveVersion = useProfiles((s) => s.saveVersion);
  const replace = useNav((s) => s.replace);
  const toast = useToast();
  const base = get(profileId);
  const [rules, setRules] = useState<RuleSet>(() => cloneRules(base?.rules ?? ({} as RuleSet)));
  const [name, setName] = useState(base ? (base.builtIn ? `${base.name} (meu)` : base.name) : 'Meu perfil');
  const errors = useMemo(() => validateRules(rules), [rules]);

  if (!base) return null;
  const status = (k: string): RuleStatus | undefined => base.ruleStatus[k];
  const badge = (k: string) => {
    const s = status(k);
    return s ? <StatusBadge status={s} /> : null;
  };
  const patch = (p: Partial<RuleSet>) => setRules((r) => ({ ...r, ...p }));
  const isPB = mode === 'passe-bate';

  function setPlayers(players: 2 | 3 | 4) {
    setRules((r) => ({
      ...r,
      players,
      teams: players === 4 ? r.teams : false,
      handSize: !isPB && r.boneyard ? researchedHandSize(players) : players === 4 ? 7 : r.handSize,
    }));
  }

  function save() {
    if (errors.length) return;
    if (base!.builtIn) {
      const p = create({ name, mode, rules, basedOn: base!.id });
      toast(`Perfil “${p.name}” criado.`);
    } else {
      const p = saveVersion(base!.id, rules, name);
      toast(`Perfil salvo (versão ${p.version}). Versões anteriores foram preservadas.`);
    }
    replace({ name: 'profiles', mode });
  }

  const remaining = 28 - rules.players * rules.handSize;

  return (
    <main className="screen">
      <ScreenHeader title={base.builtIn ? 'Personalizar regras' : 'Editar perfil'} />
      <div className="screen__body">
        {base.builtIn && (
          <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
            Perfis oficiais não são alterados. Suas mudanças serão salvas como um novo perfil baseado em “{base.name}”.
          </p>
        )}
        <div className="field">
          <label className="field__label" htmlFor="pname">Nome do perfil</label>
          <input id="pname" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Dominó de sexta-feira" />
        </div>

        <section>
          <h2 className="section-title">Mesa</h2>
          <div className="panel">
            <RuleRow label="Jogadores" badge={badge('players')}>
              <Segmented
                label="Jogadores"
                value={rules.players}
                onChange={setPlayers}
                options={[
                  { value: 2, label: '2' },
                  { value: 3, label: '3', disabled: isPB },
                  { value: 4, label: '4' },
                ]}
              />
            </RuleRow>
            <RuleRow label="Jogar em duplas" hint="Parceiros sentam frente a frente." badge={badge('teams')} inline>
              <Switch label="Jogar em duplas" checked={rules.teams} disabled={rules.players !== 4} onChange={(teams) => patch({ teams })} />
            </RuleRow>
            <RuleRow label="Pedras por jogador" hint={`${remaining} pedra(s) fora das mãos`} badge={badge('handSize')} inline>
              <Stepper label="pedras por jogador" value={rules.handSize} min={3} max={Math.floor(28 / rules.players)} onChange={(handSize) => patch({ handSize })} />
            </RuleRow>
            <RuleRow
              label="Dorme (compra)"
              hint={rules.boneyard ? 'Sem jogada, compra-se do dorme.' : remaining > 0 ? `Sem jogada, passa a vez. As ${remaining} restantes vão para o cemitério.` : 'Sem jogada, passa a vez.'}
              badge={badge('boneyard')}
              inline
            >
              <Switch label="Dorme" checked={rules.boneyard} disabled={remaining === 0} onChange={(boneyard) => patch({ boneyard })} />
            </RuleRow>
            {rules.boneyard && (
              <RuleRow label="Reserva do dorme" hint="Pedras que não podem ser compradas." inline>
                <Stepper label="reserva do dorme" value={rules.boneyardReserve} min={0} max={Math.min(4, remaining)} onChange={(boneyardReserve) => patch({ boneyardReserve })} />
              </RuleRow>
            )}
            <RuleRow label="Distribuição" hint="Embaralhar e escolher: as pedras ficam viradas na mesa e cada um escolhe as suas.">
              <Segmented
                label="Distribuição"
                value={rules.dealMode ?? 'auto'}
                onChange={(dealMode) => patch({ dealMode })}
                options={[
                  { value: 'auto', label: 'Automática' },
                  { value: 'pick', label: 'Embaralhar e escolher' },
                ]}
              />
            </RuleRow>
            <RuleRow label="Saída da primeira rodada" badge={badge('opening')}>
              <Segmented
                label="Saída"
                value={rules.opening}
                onChange={(opening) => patch({ opening })}
                options={[
                  { value: 'double-six', label: 'Carroça de 6' },
                  { value: 'highest-double', label: 'Maior carroça' },
                  { value: 'any', label: 'Sorteio' },
                ]}
              />
            </RuleRow>
            <RuleRow
              label="Sair só de carroça"
              hint="Toda rodada começa com uma carroça. Sem carroça, sai o próximo da roda que tiver; se ninguém tiver, embaralha de novo."
              badge={badge('openWithDouble')}
              inline
            >
              <Switch label="Sair só de carroça" checked={rules.openWithDouble ?? false} onChange={(openWithDouble) => patch({ openWithDouble })} />
            </RuleRow>
            <RuleRow label="Quem sai nas rodadas seguintes" badge={badge('nextRoundStarter')}>
              <Segmented
                label="Próxima saída"
                value={rules.nextRoundStarter}
                onChange={(nextRoundStarter) => patch({ nextRoundStarter })}
                options={[
                  { value: 'round-winner', label: 'Quem venceu' },
                  { value: 'next-seat', label: 'Próximo da roda' },
                ]}
              />
            </RuleRow>
            {!isPB && (
              <RuleRow label="Spinner" hint="Primeira carroça abre para os quatro lados." badge={badge('spinner')} inline>
                <Switch label="Spinner" checked={rules.spinner} onChange={(spinner) => patch({ spinner })} />
              </RuleRow>
            )}
            <RuleRow label="Meta da partida" badge={badge('targetScore')} inline>
              <Stepper label="meta" value={rules.targetScore} min={isPB ? 1 : 25} max={isPB ? 50 : 500} step={isPB ? 1 : 25} onChange={(targetScore) => patch({ targetScore })} />
            </RuleRow>
          </div>
        </section>

        {isPB ? (
          <section>
            <h2 className="section-title">Batidas e pontuação</h2>
            <div className="panel">
              {(
                [
                  ['simples', 'Batida simples'],
                  ['carroca', 'Batida de carroça'],
                  ['laELoSimples', 'Lá e lô com pedra simples'],
                  ['laELoCarroca', 'Lá e lô de carroça (quadrada/cruzada)'],
                ] as const
              ).map(([key, label]) => (
                <RuleRow key={key} label={label} badge={key === 'simples' ? badge('passeBate.batidaPoints') : undefined} inline>
                  <Stepper
                    label={label}
                    value={rules.passeBate.batidaPoints[key]}
                    min={0}
                    max={20}
                    onChange={(v) => patch({ passeBate: { ...rules.passeBate, batidaPoints: { ...rules.passeBate.batidaPoints, [key]: v } } })}
                  />
                </RuleRow>
              ))}
              <RuleRow label="Jogo trancado" hint="Quando ninguém consegue jogar." badge={badge('passeBate.blocked')}>
                <Segmented
                  label="Jogo trancado"
                  value={rules.passeBate.blocked.winner}
                  onChange={(winner) => patch({ passeBate: { ...rules.passeBate, blocked: { ...rules.passeBate.blocked, winner } } })}
                  options={[
                    { value: 'lowest-individual', label: 'Menor mão' },
                    { value: 'lowest-team', label: 'Menor dupla' },
                    { value: 'none', label: 'Ninguém' },
                  ]}
                />
              </RuleRow>
              {rules.passeBate.blocked.winner !== 'none' && (
                <RuleRow label="Pontos do jogo trancado" inline>
                  <Stepper label="pontos do jogo trancado" value={rules.passeBate.blocked.points} min={0} max={10} onChange={(points) => patch({ passeBate: { ...rules.passeBate, blocked: { ...rules.passeBate.blocked, points } } })} />
                </RuleRow>
              )}
            </div>
          </section>
        ) : (
          <section>
            <h2 className="section-title">Pontuação</h2>
            <div className="panel">
              <RuleRow label="Valor das pontas" badge={badge('allFives.scoringMode')}>
                <Segmented
                  label="Valor das pontas"
                  value={rules.allFives.scoringMode}
                  onChange={(scoringMode) => patch({ allFives: { ...rules.allFives, scoringMode } })}
                  options={[
                    { value: 'full', label: 'Integral (15 = 15)' },
                    { value: 'divided', label: 'Dividido (15 = 3)' },
                  ]}
                />
              </RuleRow>
              <RuleRow label="Arredondamento no fim da mão" badge={badge('allFives.endRounding')}>
                <Segmented
                  label="Arredondamento"
                  value={rules.allFives.endRounding}
                  onChange={(endRounding) => patch({ allFives: { ...rules.allFives, endRounding } })}
                  options={[
                    { value: 'nearest', label: 'Mais próximo' },
                    { value: 'down', label: 'Para baixo' },
                  ]}
                />
              </RuleRow>
              <RuleRow label="Mão trancada" badge={badge('allFives.blockedScoring')}>
                <Segmented
                  label="Mão trancada"
                  value={rules.allFives.blockedScoring}
                  onChange={(blockedScoring) => patch({ allFives: { ...rules.allFives, blockedScoring } })}
                  options={[
                    { value: 'others-total', label: 'Total dos outros' },
                    { value: 'difference', label: 'Diferença' },
                  ]}
                />
              </RuleRow>
              <RuleRow label="Vence ao atingir a meta" hint="Encerra no meio da mão." badge={badge('allFives.winImmediately')} inline>
                <Switch label="Vence ao atingir a meta" checked={rules.allFives.winImmediately} onChange={(winImmediately) => patch({ allFives: { ...rules.allFives, winImmediately } })} />
              </RuleRow>
              <RuleRow label="Ponto por passe provocado" badge={<StatusBadge status="pending" />}>
                <span className="locked">
                  <Icon name="lock" size={18} /> Relato de Boa Vista em revisão. Valor e aplicação ainda não confirmados — não pode ser ativada.
                </span>
              </RuleRow>
            </div>
          </section>
        )}

        <section>
          <h2 className="section-title">Assistências</h2>
          <div className="panel">
            <RuleRow label="Destacar jogadas válidas" hint="Desligado = você procura as jogadas, como na mesa." inline>
              <Switch label="Destacar jogadas válidas" checked={rules.assists.highlightPlayable} onChange={(highlightPlayable) => patch({ assists: { ...rules.assists, highlightPlayable } })} />
            </RuleRow>
            <RuleRow
              label="Somar pontos automaticamente"
              hint={isPB ? 'Na Passe e Bate a batida é sempre registrada (marcação manual de batida ainda não implementada).' : 'Desligado = é preciso marcar os próprios pontos; quem esquece, perde.'}
              inline
            >
              <Switch label="Somar pontos automaticamente" checked={rules.assists.autoScore} disabled={isPB} onChange={(autoScore) => patch({ assists: { ...rules.assists, autoScore } })} />
            </RuleRow>
          </div>
        </section>

        {errors.length > 0 && (
          <div className="errors" role="alert">
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}

        <div className="sticky-footer">
          <button className="btn btn--primary btn--block" disabled={errors.length > 0} onClick={save}>
            <Icon name="check" size={20} /> {base.builtIn ? 'Salvar como novo perfil' : 'Salvar nova versão'}
          </button>
        </div>
      </div>
    </main>
  );
}
