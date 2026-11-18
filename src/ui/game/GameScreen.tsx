import { useEffect, useMemo, useState } from 'react';
import { openEnds } from '../../engine/board';
import { canDraw, canPass, drawableCount, legalMoves } from '../../engine/match';
import { sideOf } from '../../engine/scoring';
import { hasValue, tileFromId } from '../../engine/tiles';
import type { ArmId } from '../../engine/board';
import type { Dir } from '../board/layout';
import type { GameEvent } from '../../engine/types';
import { useGame } from '../../state/gameStore';
import { HandoffCover } from './HandoffCover';
import { ChatSheet } from './ChatSheet';
import { useOnline } from '../../state/onlineStore';
import { useNav } from '../../state/navigation';
import { useProfiles } from '../../state/profilesStore';
import { useSettings } from '../../state/settingsStore';
import { PickPhase } from './PickPhase';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { BoardView, type SlotTarget } from './BoardView';
import { ClaimBar } from './ClaimBar';
import { sideColor } from './colors';
import { GameMenu } from './GameMenu';
import { HandRack } from './HandRack';
import { HistoryPanel } from './HistoryPanel';
import { RoundEndSheet } from './RoundEndSheet';
import { Scoreboard } from './Scoreboard';
import { Seat, type SeatPosition } from './Seat';
import { eventText, tileName } from './text';
import { useGameSounds } from './useGameSounds';
import { decideTurnAsync } from '../../ai/async';
import { playerView } from '../../engine/view';
import { createRng, randomSeed } from '../../engine/rng';
import { playSound } from '../../services/sound';
import './game.css';

const ARM_HINT = { left: 'na ponta esquerda', right: 'na ponta direita', up: 'em cima do spinner', down: 'embaixo do spinner' } as const;

const POSITIONS: Record<number, SeatPosition[]> = {
  2: ['top'],
  3: ['right', 'left'],
  4: ['right', 'top', 'left'],
};

function lastIndex(events: readonly GameEvent[], pred: (e: GameEvent) => boolean): number {
  for (let i = events.length - 1; i >= 0; i--) if (pred(events[i]!)) return i;
  return -1;
}

export function GameScreen() {
  const match = useGame((s) => s.match);
  const picking = useGame((s) => s.picking);
  const paused = useGame((s) => s.paused);
  const HUMAN_SEAT = useGame((s) => s.viewSeat);
  const handoff = useGame((s) => s.handoff);
  const net = useGame((s) => s.net);
  const unread = useOnline((s) => s.unread);
  const lobbySeats = useOnline((s) => s.lobby?.seats);
  const onlineStatus = useOnline((s) => s.status);
  const [chatOpen, setChatOpen] = useState(false);
  const [hintBusy, setHintBusy] = useState(false);
  const arrangement = useGame((s) => s.arrangement);
  const handOrder = useGame((s) => s.handOrder);
  const flipped = useGame((s) => s.flipped);
  const { pause, unpause, setTileDir, resetArrangement, setHandOrder, sortHand, toggleFlip } = useGame.getState();
  const focusMode = useSettings((s) => s.focusMode);
  const setSettings = useSettings((s) => s.set);
  const selectedId = useGame((s) => s.selectedTileId);
  const error = useGame((s) => s.error);
  const { select, play, draw, pass, claim, nextRound, quit, startSolo, difficulty } = useGame.getState();
  const reset = useNav((s) => s.reset);
  const go = useNav((s) => s.go);
  const getProfile = useProfiles((s) => s.get);
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [claimHidden, setClaimHidden] = useState<number | null>(null);
  const [showEnd, setShowEnd] = useState(false);

  useEffect(() => {
    if (error) toast(error);
  }, [error, toast]);

  useGameSounds(match, HUMAN_SEAT);

  // Mostra o resumo do fim de rodada depois da animação da última pedra.
  const status = match?.status;
  useEffect(() => {
    if (status === 'playing' || !status) {
      setShowEnd(false);
      return;
    }
    const t = setTimeout(() => setShowEnd(true), 1100);
    return () => clearTimeout(t);
  }, [status, match?.round.index]);

  const derived = useMemo(() => {
    if (!match) return null;
    const r = match.round;
    const rules = match.frozen.rules;
    const myTurn = match.status === 'playing' && r.turn === HUMAN_SEAT;
    const moves = myTurn ? legalMoves(match, HUMAN_SEAT) : [];
    const playable = new Set(moves.map((m) => m.tileId));
    const lastPlay = lastIndex(r.events, (e) => e.kind === 'play');
    const lastPlayEvent = r.events[lastPlay];
    const lastScore = lastIndex(r.events, (e) => e.kind === 'score');
    const scoreEvent = r.events[lastScore];
    return { r, rules, myTurn, moves, playable, lastPlayEvent, lastScore, scoreEvent };
  }, [match, HUMAN_SEAT]);

  if (picking) {
    const pr = picking.pending.kind === 'new' ? picking.pending.rules : match?.frozen.rules;
    return (
      <PickPhase
        picking={picking}
        players={pr?.players ?? 4}
        boneyard={pr?.boneyard ?? false}
        onExit={() => {
          if (confirm('Sair da partida?')) {
            quit();
            reset();
          }
        }}
      />
    );
  }

  if (match && handoff !== null) {
    return <HandoffCover match={match} seat={handoff} />;
  }

  if (!match || !derived) {
    return (
      <main className="screen" style={{ display: 'grid', placeItems: 'center' }}>
        <button className="btn" onClick={() => reset()}>Voltar ao início</button>
      </main>
    );
  }

  const { r, rules, myTurn, moves, playable, lastPlayEvent, lastScore, scoreEvent } = derived;
  const highlight = rules.assists.highlightPlayable;
  const n = rules.players;
  const hand = r.hands[HUMAN_SEAT] ?? [];

  // Vagas na mesa para a pedra selecionada.
  let targets: SlotTarget[] | null = null;
  if (myTurn && selectedId) {
    const tile = tileFromId(selectedId);
    if (!r.board.root) targets = [{ arm: 'root', valid: playable.has(selectedId) }];
    else targets = openEnds(r.board).map((e) => ({ arm: e.arm, valid: hasValue(tile, e.value) && moves.some((m) => m.tileId === selectedId && m.arm === e.arm) }));
  }

  function onTapTile(tileId: string) {
    if (!myTurn) {
      select(selectedId === tileId ? null : tileId);
      return;
    }
    if (selectedId === tileId) {
      // Segundo toque: joga direto se só houver um destino.
      const options = moves.filter((m) => m.tileId === tileId);
      if (options.length === 1) play(tileId, options[0]!.arm);
      else if (options.length === 0) {
        toast(highlight ? 'Essa pedra não encaixa.' : 'Escolha uma ponta na mesa.');
        if (highlight) select(null);
      } else toast('Toque na ponta onde quer jogar.');
      return;
    }
    playSound('select');
    select(tileId);
  }

  function onPlace(arm: ArmId | 'root', dir?: Dir) {
    if (!selectedId) return;
    if (!moves.some((m) => m.tileId === selectedId && m.arm === arm)) {
      toast('Essa pedra não encaixa nessa ponta.');
      return;
    }
    play(selectedId, arm, dir);
  }

  const canBuy = myTurn && (highlight ? canDraw(match, HUMAN_SEAT) : drawableCount(r, rules) > 0);
  const canSkip = myTurn && (highlight ? canPass(match, HUMAN_SEAT) : drawableCount(r, rules) === 0);
  const claimOpen = r.pendingClaim?.seat === HUMAN_SEAT && claimHidden !== r.turnNumber;

  // Bolhas "Passou"/"Comprou" e destaque de pontuação.
  const bubbleFor = (seat: number) => {
    const i = lastIndex(r.events, (e) => (e.kind === 'pass' || e.kind === 'draw') && e.seat === seat);
    if (i < 0 || i < r.events.length - n - 1) return null;
    const e = r.events[i]!;
    return { key: i, text: e.kind === 'pass' ? 'Passou' : 'Comprou' };
  };
  const scorePopup =
    scoreEvent && scoreEvent.kind === 'score' && lastScore >= r.events.length - 3
      ? { key: lastScore, points: scoreEvent.points, color: sideColor(scoreEvent.side, rules.teams) }
      : null;
  const pulseSide = scoreEvent && scoreEvent.kind === 'score' ? { side: scoreEvent.side, key: lastScore } : null;

  const turnPlayer = match.players[r.turn];
  let statusText: string;
  if (match.status !== 'playing') statusText = 'Rodada encerrada';
  else if (myTurn) {
    if (!r.board.root && r.mustOpenWith) statusText = `Você sai com a ${tileName(r.mustOpenWith)}`;
    else if (!r.board.root && r.mustOpenDouble) statusText = 'Você sai — escolha uma carroça';
    else if (highlight && moves.length === 0) statusText = canBuy ? 'Sem jogada — compre do dorme' : 'Sem jogada — passe a vez';
    else statusText = selectedId ? 'Toque na ponta para jogar' : 'Sua vez — escolha uma pedra';
  } else if (rules.mode === 'burrinha' && hand.length === 0) statusText = `Você bateu! Vez de ${turnPlayer?.name ?? ''}`;
  else statusText = `Vez de ${turnPlayer?.name ?? ''}`;

  const lastAnnouncement = r.events.length ? eventText(r.events[r.events.length - 1]!, match.players, rules) : '';
  const mySide = sideOf(HUMAN_SEAT, rules);

  return (
    <main className={`game game--p${n} ${focusMode ? 'game--focus' : ''}`}>
      <header className="game__top">
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Menu da partida">
          <Icon name="menu" />
        </button>
        <Scoreboard match={match} pulseSide={pulseSide} />
        {net !== 'local' && (
          <button className="icon-btn icon-badge" data-count={unread || undefined} onClick={() => setChatOpen(true)} aria-label={`Conversa da mesa${unread ? `, ${unread} novas` : ''}`}>
            <Icon name="chat" />
          </button>
        )}
        {match.status === 'playing' && net !== 'guest' && (
          <button
            className={`icon-btn ${paused ? 'is-on' : ''}`}
            onClick={() => (paused ? unpause() : pause())}
            aria-pressed={paused}
            aria-label={paused ? 'Continuar o jogo' : 'Pausar para organizar'}
            title={paused ? 'Continuar' : 'Pausar e organizar'}
          >
            <Icon name={paused ? 'play' : 'pause'} />
          </button>
        )}
        <button
          className={`icon-btn ${focusMode ? 'is-on' : ''}`}
          onClick={() => setSettings({ focusMode: !focusMode })}
          aria-pressed={focusMode}
          aria-label={focusMode ? 'Mostrar jogadores' : 'Esconder jogadores e ampliar a mesa'}
          title={focusMode ? 'Mostrar jogadores' : 'Ampliar mesa'}
        >
          <Icon name={focusMode ? 'shrink' : 'expand'} />
        </button>
        <button className="icon-btn" onClick={() => setHistoryOpen(true)} aria-label="Histórico de jogadas">
          <Icon name="history" />
        </button>
      </header>

      <section className="game__table" aria-label="Mesa">
        {POSITIONS[n]?.map((pos, i) => {
          const seat = (HUMAN_SEAT + i + 1) % n;
          const player = match.players[seat]!;
          return (
            <div key={seat} className={`game__seat game__seat--${pos}`}>
              <Seat
                player={lobbySeats?.find((x) => x.seat === seat && x.kind === 'guest' && !x.connected) ? { ...player, name: `${player.name} (desconectado)` } : player}
                position={pos}
                count={r.hands[seat]?.length ?? 0}
                active={match.status === 'playing' && r.turn === seat}
                teamColor={sideColor(sideOf(seat, rules), rules.teams)}
                bubble={bubbleFor(seat)}
                showBacks={pos === 'top'}
              />
            </div>
          );
        })}
        <div className="game__board">
          <BoardView
            board={r.board}
            targets={targets}
            showValidity={highlight}
            onPlace={onPlace}
            lastTurn={lastPlayEvent && lastPlayEvent.kind === 'play' ? lastPlayEvent.turn : null}
            scorePopup={scorePopup}
            arrangement={arrangement}
            organizing={paused}
            onArrange={(id, d) => {
              playSound('place');
              setTileDir(id, d);
            }}
          />
          {paused && (
            <div className="pause-banner" role="status">
              <strong>Jogo pausado</strong>
              <span>Toque numa pedra da mesa para mudar a direção. Na sua mão: arraste para mudar de lugar e toque para girar.</span>
            </div>
          )}
          {rules.boneyard ? (
            <span className="game__boneyard" aria-label={`Dorme com ${r.boneyard.length} pedras`}>
              Dorme · {r.boneyard.length}
            </span>
          ) : (
            r.outOfPlay.length > 0 && (
              <span className="game__boneyard" aria-label={`Cemitério com ${r.outOfPlay.length} pedras fora do jogo`}>
                Cemitério · {r.outOfPlay.length}
              </span>
            )
          )}
          {focusMode && match.status === 'playing' && (
            <div className="focus-strip" aria-hidden>
              {match.players.map((pl, seat) =>
                seat === HUMAN_SEAT ? null : (
                  <span
                    key={seat}
                    className={`focus-strip__chip ${r.turn === seat ? 'is-active' : ''}`}
                    style={{ ['--side' as string]: sideColor(sideOf(seat, rules), rules.teams) }}
                  >
                    {pl.avatar} {r.hands[seat]?.length ?? 0}
                    {bubbleFor(seat) && <em key={bubbleFor(seat)!.key}>{bubbleFor(seat)!.text}</em>}
                  </span>
                ),
              )}
            </div>
          )}
        </div>
      </section>

      {paused ? (
        <section className="pause-tools" aria-label="Organizar">
          <button className="btn btn--sm" onClick={() => sortHand('numero')}>Ordenar por número</button>
          <button className="btn btn--sm" onClick={() => sortHand('carrocas')}>Carroças primeiro</button>
          <button className="btn btn--sm" onClick={() => sortHand('soma')}>Mais pesadas primeiro</button>
          <button className="btn btn--sm btn--ghost" onClick={resetArrangement}>Mesa automática</button>
          <button className="btn btn--sm btn--primary" onClick={unpause}>
            <Icon name="play" size={16} /> Continuar
          </button>
        </section>
      ) : (
      <section className={`game__me ${myTurn ? 'is-active' : ''}`} style={{ ['--side' as string]: sideColor(mySide, rules.teams) }}>
        <div className="game__status">
          {myTurn && <span className="game__turn-dot" aria-hidden />}
          <span>{statusText}</span>
        </div>
        <div className="game__actions">
          {myTurn && highlight && net === 'local' && moves.length > 1 && (
            <button
              className="btn btn--sm btn--ghost"
              disabled={hintBusy}
              onClick={async () => {
                setHintBusy(true);
                const action = await decideTurnAsync(playerView(match, HUMAN_SEAT), 'mestre', createRng(randomSeed()));
                setHintBusy(false);
                if (action.type !== 'play') return;
                select(action.tileId);
                const [a, b] = action.tileId.split('-');
                toast(`Dica do Mestre: jogue a ${a === b ? `carroça de ${a}` : `${a} e ${b}`} ${action.arm === 'root' ? 'para abrir' : ARM_HINT[action.arm]}.`);
              }}
            >
              {hintBusy ? 'Pensando…' : 'Dica'}
            </button>
          )}
          {canBuy && (
            <button className="btn btn--sm btn--primary" onClick={draw}>
              Comprar
            </button>
          )}
          {canSkip && (
            <button className="btn btn--sm btn--primary" onClick={pass}>
              Passar
            </button>
          )}
        </div>
      </section>
      )}

      {claimOpen && !paused && <ClaimBar onClaim={(p) => claim(p)} onDismiss={() => setClaimHidden(r.turnNumber)} />}

      <HandRack
        hand={hand}
        order={handOrder}
        flipped={flipped}
        selectedId={selectedId}
        playableIds={highlight && myTurn ? playable : null}
        myTurn={myTurn}
        organizing={paused}
        onTap={onTapTile}
        onFlip={(id) => {
          playSound('select');
          toggleFlip(id);
        }}
        onReorder={setHandOrder}
      />

      <p className="sr-only" aria-live="polite">
        {lastAnnouncement}
      </p>

      {net === 'guest' && onlineStatus === 'reconnecting' && (
        <div className="toast" role="status">Conexão com o anfitrião perdida. Reconectando…</div>
      )}
      {chatOpen && <ChatSheet onClose={() => setChatOpen(false)} />}
      {menuOpen && (
        <GameMenu
          match={match}
          net={net}
          disconnected={net === 'host' ? (lobbySeats ?? []).filter((x) => x.kind === 'guest' && !x.connected).map((x) => ({ seat: x.seat, name: x.name })) : []}
          onBot={(seat) => useOnline.getState().botForSeat(seat)}
          onClose={() => setMenuOpen(false)}
          onQuit={() => {
            if (net !== 'local') useOnline.getState().leave();
            else quit();
            reset();
          }}
        />
      )}
      {historyOpen && <HistoryPanel match={match} seat={HUMAN_SEAT} onClose={() => setHistoryOpen(false)} />}
      {showEnd && match.status !== 'playing' && (
        <RoundEndSheet
          match={match}
          viewSeat={HUMAN_SEAT}
          net={net}
          onNext={nextRound}
          onExit={() => {
            if (net !== 'local') useOnline.getState().leave();
            else quit();
            reset();
          }}
          onReview={() => go({ name: 'replay', round: match.round.index })}
          onRematch={() => {
            if (net === 'host') {
              useOnline.getState().startGame();
              return;
            }
            const p = getProfile(match.frozen.profileId);
            if (p) startSolo(p, { ...match.frozen.rules, assists: { ...match.frozen.rules.assists } }, difficulty);
            else {
              quit();
              reset();
            }
          }}
        />
      )}
    </main>
  );
}
