import { useEffect, useMemo, useState } from 'react';
import { replayRound, type GameRecord } from '../../engine/replay';
import { sideOf } from '../../engine/scoring';
import { handPips } from '../../engine/tiles';
import { KEYS, readJSON } from '../../services/storage';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { TileSvg } from '../components/Tile';
import { BoardView } from '../game/BoardView';
import { sideColor } from '../game/colors';
import { eventText, resultText, sideName, tileName } from '../game/text';
import { MODE_LABEL } from '../rules/describe';
import '../game/game.css';
import './menus.css';

export function loadLastGame(): GameRecord | null {
  const r = readJSON<GameRecord | null>(KEYS.lastGame, null);
  return r && Array.isArray(r.rounds) && r.rounds.length > 0 ? r : null;
}

const noop = () => {};

export function ReplayScreen({ initialRound }: { initialRound?: number }) {
  const record = useMemo(loadLastGame, []);
  const [roundIdx, setRoundIdx] = useState(() => {
    const n = record?.rounds.length ?? 1;
    return initialRound !== undefined ? Math.min(initialRound, n - 1) : n - 1;
  });
  const round = record?.rounds[roundIdx];
  const steps = useMemo(() => {
    if (!record || !round) return [];
    try {
      return replayRound(record.frozen, record.players, round);
    } catch {
      return [];
    }
  }, [record, round]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [roundIdx]);

  useEffect(() => {
    if (!playing) return;
    if (step >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [playing, step, steps.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setStep((s) => Math.min(steps.length - 1, s + 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steps.length]);

  if (!record || !round) {
    return (
      <main className="screen">
        <ScreenHeader title="Revisão" />
        <div className="screen__body">
          <p className="muted">Nenhum jogo para revisar ainda. Termine uma rodada e ela aparece aqui.</p>
        </div>
      </main>
    );
  }

  const rules = record.frozen.rules;
  const current = steps[Math.min(step, steps.length - 1)];
  if (!current) {
    return (
      <main className="screen">
        <ScreenHeader title="Revisão" />
        <div className="screen__body">
          <p className="muted">Não foi possível reconstruir esta rodada.</p>
        </div>
      </main>
    );
  }
  const m = current.match;
  const lastPlay = [...m.round.events].reverse().find((e) => e.kind === 'play');
  const caption =
    step === 0
      ? `Distribuição — ${record.players[round.starter]?.name} sai${round.mustOpenWith ? ` com a ${tileName(round.mustOpenWith)}` : round.mustOpenDouble ? ' de carroça' : ''}.`
      : current.event
        ? eventText(current.event, record.players, rules)
        : '';
  const atEnd = step === steps.length - 1;

  return (
    <main className="game replay">
      <ScreenHeader
        title="Revisão"
        actions={<span className="replay__meta">{MODE_LABEL[rules.mode]} · {new Date(record.savedAt).toLocaleDateString('pt-BR')}</span>}
      />

      <div className="replay__rounds" role="tablist" aria-label="Rodadas">
        {record.rounds.map((r, i) => (
          <button key={r.index} role="tab" aria-selected={i === roundIdx} onClick={() => setRoundIdx(i)}>
            Rodada {r.index + 1}
          </button>
        ))}
      </div>

      <section className="game__table replay__table" aria-label="Mesa">
        <div className="game__board">
          <BoardView
            board={m.round.board}
            targets={null}
            showValidity={false}
            onPlace={noop}
            lastTurn={lastPlay && lastPlay.kind === 'play' ? lastPlay.turn : null}
            scorePopup={null}
            arrangement={{}}
            organizing={false}
            onArrange={noop}
          />
          <p className="replay__caption" aria-live="polite">
            {caption}
            {atEnd && round.result ? ` ${resultText(round.result, record.players, rules)}` : ''}
          </p>
        </div>
      </section>

      <section className="replay__hands" aria-label="Mãos dos jogadores">
        {record.players.map((p, seat) => {
          const hand = m.round.hands[seat] ?? [];
          const color = sideColor(sideOf(seat, rules), rules.teams);
          return (
            <div key={seat} className={`replay__hand ${m.status === 'playing' && m.round.turn === seat ? 'is-turn' : ''}`} style={{ ['--side' as string]: color }}>
              <span className="replay__who">
                {p.avatar} {p.name} <span className="muted">· {handPips(hand)} pts na mão</span>
              </span>
              <span className="replay__tiles">
                {hand.length === 0 ? <span className="muted">bateu</span> : hand.map((t) => <TileSvg key={t.id} first={t.a} second={t.b} unit={15} />)}
              </span>
            </div>
          );
        })}
        <div className="replay__score">
          {m.scores.map((sc, side) => (
            <span key={side} style={{ color: sideColor(side, rules.teams) }}>
              {sideName(side, rules, record.players)} <strong>{sc}</strong>
            </span>
          ))}
        </div>
      </section>

      <section className="replay__controls" aria-label="Controles da revisão">
        <input
          type="range"
          className="range"
          min={0}
          max={steps.length - 1}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          aria-label="Passo da rodada"
        />
        <div className="replay__buttons">
          <button className="icon-btn" onClick={() => setStep(0)} aria-label="Início da rodada">⏮</button>
          <button className="icon-btn" onClick={() => setStep((s) => Math.max(0, s - 1))} aria-label="Jogada anterior">
            <Icon name="back" />
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => (atEnd ? (setStep(0), setPlaying(true)) : setPlaying((p) => !p))}>
            <Icon name={playing ? 'pause' : 'play'} size={16} /> {playing ? 'Pausar' : atEnd ? 'Rever' : 'Reproduzir'}
          </button>
          <button className="icon-btn" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} aria-label="Próxima jogada" style={{ transform: 'scaleX(-1)' }}>
            <Icon name="back" />
          </button>
          <button className="icon-btn" onClick={() => setStep(steps.length - 1)} aria-label="Fim da rodada">⏭</button>
        </div>
        <span className="replay__step muted">
          Passo {step} de {steps.length - 1}
        </span>
      </section>
    </main>
  );
}
