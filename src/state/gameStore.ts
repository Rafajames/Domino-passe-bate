import { create } from 'zustand';
import { decideClaim, decideTurn } from '../ai/bots';
import type { ArmId } from '../engine/board';
import type { Dir } from '../ui/board/layout';
import { applyAction, createMatch, startNextRound } from '../engine/match';
import { buildGameRecord } from '../engine/replay';
import { createRng, randomSeed, shuffle } from '../engine/rng';
import { fullSet, type Tile } from '../engine/tiles';
import { freezeRules } from '../engine/rules/freeze';
import type { RuleProfile, RuleSet } from '../engine/rules/types';
import { sideOf } from '../engine/scoring';
import type { BotDifficulty, GameAction, MatchState, PlayerSlot } from '../engine/types';
import { playerView } from '../engine/view';
import { KEYS, readJSON, removeKey, writeJSON } from '../services/storage';
import { usePlayer } from './playerStore';

export const HUMAN_SEAT = 0;

const BOT_NAMES = ['Zé da Praça', 'Dona Céu', 'Biu', 'Tonhão', 'Nena', 'Seu Lula', 'Ritinha', 'Galego'];
const BOT_AVATARS = ['🐆', '🦉', '🐢', '🦊', '🐺', '🦩', '🐬'];

export interface LocalHuman {
  seat: number;
  name: string;
}

/** Assentos controlados por pessoas neste aparelho. */
export function localHumanSeats(match: MatchState): number[] {
  return match.players.filter((p) => p.kind === 'human').map((p) => p.seat);
}

interface Persisted {
  viewSeat?: number;
  match: MatchState;
  difficulty: BotDifficulty;
  arrangement?: Record<string, Dir>;
  handOrder?: string[];
  flipped?: string[];
}

export type HandSort = 'numero' | 'carrocas' | 'soma';

/**
 * Fase "embaralhar e escolher": as 28 pedras viradas na mesa.
 * A ordem (`deck`) é secreta para a interface — ela só mostra versos.
 */
export interface PickingState {
  deck: Tile[];
  chosen: string[];
  need: number;
  /** Tamanho da mão de cada jogador (burrinha: varia por jogador). */
  sizes?: number[];
  shuffles: number;
  pending: { kind: 'new'; profile: RuleProfile; rules: RuleSet; difficulty: BotDifficulty; extraHumans?: LocalHuman[] } | { kind: 'next' };
}

interface GameState {
  match: MatchState | null;
  picking: PickingState | null;
  shuffleTable: () => void;
  togglePick: (tileId: string) => void;
  autoPick: () => void;
  confirmPick: () => void;
  difficulty: BotDifficulty;
  selectedTileId: string | null;
  error: string | null;
  /** Jogo pausado: bots param e o jogador pode arrumar mesa e mão. */
  paused: boolean;
  /** De qual assento a tela mostra o jogo (no "passar o celular", muda a cada vez). */
  viewSeat: number;
  /** Troca de jogador pendente no "passar o celular": tela que esconde as mãos. */
  handoff: number | null;
  confirmHandoff: () => void;
  /** Direções escolhidas pelo jogador para pedras da mesa (rodada atual). */
  arrangement: Record<string, Dir>;
  /** Ordem manual das pedras na mão. */
  handOrder: string[];
  /** Pedras da mão giradas (mostradas de cabeça para baixo). */
  flipped: string[];
  pause: () => void;
  unpause: () => void;
  setTileDir: (tileId: string, dir: Dir | null) => void;
  resetArrangement: () => void;
  setHandOrder: (ids: string[]) => void;
  sortHand: (mode: HandSort) => void;
  toggleFlip: (tileId: string) => void;
  /** Sequência de eventos já vistos — a UI anima apenas os novos. */
  startSolo: (profile: RuleProfile, rules: RuleSet, difficulty: BotDifficulty, extraHumans?: { seat: number; name: string }[]) => void;
  select: (tileId: string | null) => void;
  play: (tileId: string, arm: ArmId | 'root', dir?: Dir) => void;
  draw: () => void;
  pass: () => void;
  claim: (points: number) => void;
  nextRound: () => void;
  quit: () => void;
  resume: () => boolean;
}

let botTimer: ReturnType<typeof setTimeout> | null = null;
let botRng = createRng(randomSeed());

function clearBotTimer() {
  if (botTimer) clearTimeout(botTimer);
  botTimer = null;
}

export const useGame = create<GameState>((set, get) => {
  function persist() {
    const { match, difficulty, arrangement, handOrder, flipped, viewSeat } = get();
    if (match) writeJSON(KEYS.activeMatch, { match, difficulty, arrangement, handOrder, flipped, viewSeat } satisfies Persisted);
  }

  /** Passar o celular: quando a vez é de outra pessoa deste aparelho, cobre as mãos. */
  function updateHandoff(match: MatchState) {
    const humans = localHumanSeats(match);
    if (humans.length < 2 || match.status !== 'playing') {
      if (get().handoff !== null) set({ handoff: null });
      return;
    }
    const turn = match.round.turn;
    if (humans.includes(turn) && turn !== get().viewSeat) set({ handoff: turn, selectedTileId: null });
  }

  function commit(match: MatchState) {
    const prev = get().match;
    const newRound = !prev || prev.id !== match.id || prev.round.index !== match.round.index;
    set(newRound ? { match, error: null, arrangement: {}, handOrder: [], flipped: [], paused: false } : { match, error: null });
    updateHandoff(match);
    persist();
    // A cada fim de rodada, guarda o jogo para a revisão ("último jogo").
    if (match.status !== 'playing') writeJSON(KEYS.lastGame, buildGameRecord(match));
    if (match.status === 'finished' && localHumanSeats(match).length === 1) recordResult(match, get().difficulty);
    scheduleBots();
  }

  function dispatch(action: GameAction) {
    const m = get().match;
    if (!m) return;
    if (get().paused) {
      set({ error: 'Jogo pausado. Toque em Continuar para jogar.' });
      return;
    }
    try {
      commit(applyAction(m, action));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  /** Executa ações dos bots com um ritmo legível para humanos. */
  function scheduleBots() {
    clearBotTimer();
    const m = get().match;
    if (!m || get().paused) return;

    // Bots que acabaram de jogar decidem se "cantam" os pontos (modo fiel).
    const pc = m.round.pendingClaim;
    if (pc && m.players[pc.seat]?.kind === 'bot') {
      const slot = m.players[pc.seat];
      const claim = decideClaim(playerView(m, pc.seat), slot?.difficulty ?? 'normal', botRng);
      if (claim) {
        botTimer = setTimeout(() => dispatch(claim), 350);
        return;
      }
    }

    if (m.status !== 'playing') return;
    const seat = m.round.turn;
    const slot = m.players[seat];
    if (!slot || slot.kind !== 'bot') return;
    const humanClaimOpen = !!pc && m.players[pc.seat]?.kind === 'human';
    const view = playerView(m, seat);
    const action = decideTurn(view, slot.difficulty ?? 'normal', botRng);
    const base = action.type === 'draw' ? 500 : action.type === 'pass' ? 1000 : 850;
    const delay = base + Math.floor(botRng() * 350) + (humanClaimOpen ? 2200 : 0);
    botTimer = setTimeout(() => dispatch(action), delay);
  }

  function beginPicking(rules: RuleSet, pending: PickingState['pending'], sizes?: readonly number[]) {
    clearBotTimer();
    const need = sizes?.[get().viewSeat] ?? (rules.mode === 'burrinha' ? (rules.burrinha?.startTiles ?? 3) : rules.handSize);
    set({ picking: { deck: shuffle(fullSet(6), botRng), chosen: [], need, sizes: sizes ? [...sizes] : undefined, shuffles: 0, pending }, selectedTileId: null });
  }

  /** Mão do humano = pedras escolhidas; cada bot pega pedras ao acaso entre as que sobraram. */
  function handsFromPicks(p: PickingState, players: number, handSize: number): Tile[][] {
    const sizeOf = (seat: number) => p.sizes?.[seat] ?? handSize;
    const chosen = new Set(p.chosen);
    const mine = p.deck.filter((t) => chosen.has(t.id));
    let rest = shuffle(p.deck.filter((t) => !chosen.has(t.id)), botRng);
    const hands: Tile[][] = [];
    for (let seat = 0; seat < players; seat++) {
      if (seat === get().viewSeat) hands.push(mine);
      else {
        hands.push(rest.slice(0, sizeOf(seat)));
        rest = rest.slice(sizeOf(seat));
      }
    }
    return hands;
  }

  function createSolo(profile: RuleProfile, rules: RuleSet, difficulty: BotDifficulty, presetHands?: Tile[][], extraHumans: LocalHuman[] = []) {
    const frozen = freezeRules(profile, rules);
    const me = usePlayer.getState().player;
    const names = [...BOT_NAMES].sort(() => botRng() - 0.5);
    const HUMAN_AVATARS = ['🦊', '🐢', '🦉', '🐺'];
    const players: PlayerSlot[] = Array.from({ length: frozen.rules.players }, (_, seat) => {
      if (seat === HUMAN_SEAT) return { seat, name: me.name, kind: 'human' as const, avatar: me.avatar };
      const human = extraHumans.find((h) => h.seat === seat);
      if (human) return { seat, name: human.name.trim() || `Jogador ${seat + 1}`, kind: 'human' as const, avatar: HUMAN_AVATARS[seat] ?? '🎲' };
      return { seat, name: names[seat] ?? `Bot ${seat}`, kind: 'bot' as const, difficulty, avatar: BOT_AVATARS[seat % BOT_AVATARS.length] ?? '🎲' };
    });
    const match = createMatch({ id: `solo-${Date.now().toString(36)}`, frozen, players, seed: randomSeed(), presetHands });
    set({ difficulty, selectedTileId: null, picking: null, viewSeat: HUMAN_SEAT, handoff: null });
    commit(match);
  }

  return {
    match: null,
    picking: null,
    shuffleTable: () => {
      const p = get().picking;
      if (p) set({ picking: { ...p, deck: shuffle(p.deck, botRng), shuffles: p.shuffles + 1 } });
    },
    togglePick: (tileId) => {
      const p = get().picking;
      if (!p) return;
      const has = p.chosen.includes(tileId);
      if (!has && p.chosen.length >= p.need) return;
      set({ picking: { ...p, chosen: has ? p.chosen.filter((x) => x !== tileId) : [...p.chosen, tileId] } });
    },
    autoPick: () => {
      const p = get().picking;
      if (!p) return;
      const free = shuffle(p.deck.filter((t) => !p.chosen.includes(t.id)), botRng).map((t) => t.id);
      set({ picking: { ...p, chosen: [...p.chosen, ...free.slice(0, p.need - p.chosen.length)] } });
    },
    confirmPick: () => {
      const p = get().picking;
      if (!p || p.chosen.length !== p.need) return;
      if (p.pending.kind === 'new') {
        const { profile, rules, difficulty, extraHumans } = p.pending;
        createSolo(profile, rules, difficulty, handsFromPicks(p, rules.players, rules.handSize), extraHumans);
      } else {
        const m = get().match;
        if (!m || m.status !== 'round-over') return;
        const r = m.frozen.rules;
        set({ picking: null });
        commit(startNextRound(m, handsFromPicks(p, r.players, r.handSize)));
      }
    },
    difficulty: 'normal',
    selectedTileId: null,
    error: null,

    startSolo: (profile, rules, difficulty, extraHumans = []) => {
      clearBotTimer();
      botRng = createRng(randomSeed());
      set({ viewSeat: HUMAN_SEAT, handoff: null });
      if (rules.dealMode === 'pick') {
        removeKey(KEYS.activeMatch);
        set({ match: null, difficulty });
        beginPicking(rules, { kind: 'new', profile, rules, difficulty, extraHumans });
        return;
      }
      createSolo(profile, rules, difficulty, undefined, extraHumans);
    },
    paused: false,
    viewSeat: HUMAN_SEAT,
    handoff: null,
    confirmHandoff: () => {
      const h = get().handoff;
      if (h === null) return;
      set({ viewSeat: h, handoff: null, selectedTileId: null, handOrder: [], flipped: [] });
      persist();
    },
    arrangement: {},
    handOrder: [],
    flipped: [],
    pause: () => {
      clearBotTimer();
      set({ paused: true, selectedTileId: null });
    },
    unpause: () => {
      set({ paused: false });
      scheduleBots();
    },
    setTileDir: (tileId, dir) => {
      const next = { ...get().arrangement };
      if (dir) next[tileId] = dir;
      else delete next[tileId];
      set({ arrangement: next });
      persist();
    },
    resetArrangement: () => {
      set({ arrangement: {} });
      persist();
    },
    setHandOrder: (ids) => {
      set({ handOrder: ids });
      persist();
    },
    sortHand: (mode) => {
      const m = get().match;
      if (!m) return;
      const hand = [...(m.round.hands[get().viewSeat] ?? [])];
      const cmp: Record<HandSort, (x: Tile, y: Tile) => number> = {
        numero: (x, y) => x.a - y.a || x.b - y.b,
        carrocas: (x, y) => Number(y.a === y.b) - Number(x.a === x.b) || y.a + y.b - (x.a + x.b),
        soma: (x, y) => y.a + y.b - (x.a + x.b) || y.b - x.b,
      };
      set({ handOrder: hand.sort(cmp[mode]).map((t) => t.id) });
      persist();
    },
    toggleFlip: (tileId) => {
      const f = get().flipped;
      set({ flipped: f.includes(tileId) ? f.filter((x) => x !== tileId) : [...f, tileId] });
      persist();
    },
    select: (tileId) => set({ selectedTileId: tileId }),
    play: (tileId, arm, dir) => {
      set({ selectedTileId: null });
      if (dir) set({ arrangement: { ...get().arrangement, [tileId]: dir } });
      dispatch({ type: 'play', seat: get().viewSeat, tileId, arm });
    },
    draw: () => dispatch({ type: 'draw', seat: get().viewSeat }),
    pass: () => dispatch({ type: 'pass', seat: get().viewSeat }),
    claim: (points) => dispatch({ type: 'claim', seat: get().viewSeat, points }),
    nextRound: () => {
      const m = get().match;
      if (m?.status !== 'round-over') return;
      if (m.frozen.rules.dealMode === 'pick') beginPicking(m.frozen.rules, { kind: 'next' }, m.handSizes);
      else commit(startNextRound(m));
    },
    quit: () => {
      clearBotTimer();
      removeKey(KEYS.activeMatch);
      set({ match: null, selectedTileId: null, picking: null, handoff: null, viewSeat: HUMAN_SEAT });
    },
    resume: () => {
      const saved = readJSON<Persisted | null>(KEYS.activeMatch, null);
      if (!saved?.match || saved.match.status === 'finished') return false;
      set({
        match: saved.match,
        difficulty: saved.difficulty,
        selectedTileId: null,
        paused: false,
        viewSeat: saved.viewSeat ?? HUMAN_SEAT,
        handoff: null,
        arrangement: saved.arrangement ?? {},
        handOrder: saved.handOrder ?? [],
        flipped: saved.flipped ?? [],
      });
      updateHandoff(saved.match);
      scheduleBots();
      return true;
    },
  };
});

export function hasSavedMatch(): boolean {
  const saved = readJSON<Persisted | null>(KEYS.activeMatch, null);
  return !!saved?.match && saved.match.status !== 'finished';
}

function recordResult(match: MatchState, difficulty: BotDifficulty) {
  const rules = match.frozen.rules;
  const mySide = sideOf(HUMAN_SEAT, rules);
  usePlayer.getState().record({
    id: match.id,
    mode: rules.mode,
    profileName: match.frozen.profileName,
    difficulty,
    won: rules.mode === 'burrinha' ? !(match.loserSeats ?? []).includes(HUMAN_SEAT) : match.winnerSide === mySide,
    myScore: match.scores[mySide] ?? 0,
    bestOpponentScore: Math.max(...match.scores.filter((_, i) => i !== mySide)),
    rounds: match.history.length,
    finishedAt: new Date().toISOString(),
  });
}
