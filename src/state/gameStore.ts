import { create } from 'zustand';
import { decideClaim, decideTurn } from '../ai/bots';
import type { ArmId } from '../engine/board';
import { applyAction, createMatch, startNextRound } from '../engine/match';
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

interface Persisted {
  match: MatchState;
  difficulty: BotDifficulty;
}

/**
 * Fase "embaralhar e escolher": as 28 pedras viradas na mesa.
 * A ordem (`deck`) é secreta para a interface — ela só mostra versos.
 */
export interface PickingState {
  deck: Tile[];
  chosen: string[];
  need: number;
  shuffles: number;
  pending: { kind: 'new'; profile: RuleProfile; rules: RuleSet; difficulty: BotDifficulty } | { kind: 'next' };
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
  /** Sequência de eventos já vistos — a UI anima apenas os novos. */
  startSolo: (profile: RuleProfile, rules: RuleSet, difficulty: BotDifficulty) => void;
  select: (tileId: string | null) => void;
  play: (tileId: string, arm: ArmId | 'root') => void;
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
  function commit(match: MatchState) {
    set({ match, error: null });
    writeJSON(KEYS.activeMatch, { match, difficulty: get().difficulty } satisfies Persisted);
    if (match.status === 'finished') recordResult(match, get().difficulty);
    scheduleBots();
  }

  function dispatch(action: GameAction) {
    const m = get().match;
    if (!m) return;
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
    if (!m) return;

    // Bots que acabaram de jogar decidem se "cantam" os pontos (modo fiel).
    const pc = m.round.pendingClaim;
    if (pc && pc.seat !== HUMAN_SEAT) {
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
    const humanClaimOpen = pc?.seat === HUMAN_SEAT;
    const view = playerView(m, seat);
    const action = decideTurn(view, slot.difficulty ?? 'normal', botRng);
    const base = action.type === 'draw' ? 500 : action.type === 'pass' ? 1000 : 850;
    const delay = base + Math.floor(botRng() * 350) + (humanClaimOpen ? 2200 : 0);
    botTimer = setTimeout(() => dispatch(action), delay);
  }

  function beginPicking(rules: RuleSet, pending: PickingState['pending']) {
    clearBotTimer();
    set({ picking: { deck: shuffle(fullSet(6), botRng), chosen: [], need: rules.handSize, shuffles: 0, pending }, selectedTileId: null });
  }

  /** Mão do humano = pedras escolhidas; cada bot pega pedras ao acaso entre as que sobraram. */
  function handsFromPicks(p: PickingState, players: number, handSize: number): Tile[][] {
    const chosen = new Set(p.chosen);
    const mine = p.deck.filter((t) => chosen.has(t.id));
    let rest = shuffle(p.deck.filter((t) => !chosen.has(t.id)), botRng);
    const hands: Tile[][] = [];
    for (let seat = 0; seat < players; seat++) {
      if (seat === HUMAN_SEAT) hands.push(mine);
      else {
        hands.push(rest.slice(0, handSize));
        rest = rest.slice(handSize);
      }
    }
    return hands;
  }

  function createSolo(profile: RuleProfile, rules: RuleSet, difficulty: BotDifficulty, presetHands?: Tile[][]) {
    const frozen = freezeRules(profile, rules);
    const me = usePlayer.getState().player;
    const names = [...BOT_NAMES].sort(() => botRng() - 0.5);
    const players: PlayerSlot[] = Array.from({ length: frozen.rules.players }, (_, seat) =>
      seat === HUMAN_SEAT
        ? { seat, name: me.name, kind: 'human', avatar: me.avatar }
        : { seat, name: names[seat] ?? `Bot ${seat}`, kind: 'bot', difficulty, avatar: BOT_AVATARS[seat % BOT_AVATARS.length] ?? '🎲' },
    );
    const match = createMatch({ id: `solo-${Date.now().toString(36)}`, frozen, players, seed: randomSeed(), presetHands });
    set({ difficulty, selectedTileId: null, picking: null });
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
        const { profile, rules, difficulty } = p.pending;
        createSolo(profile, rules, difficulty, handsFromPicks(p, rules.players, rules.handSize));
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

    startSolo: (profile, rules, difficulty) => {
      clearBotTimer();
      botRng = createRng(randomSeed());
      if (rules.dealMode === 'pick') {
        removeKey(KEYS.activeMatch);
        set({ match: null, difficulty });
        beginPicking(rules, { kind: 'new', profile, rules, difficulty });
        return;
      }
      createSolo(profile, rules, difficulty);
    },
    select: (tileId) => set({ selectedTileId: tileId }),
    play: (tileId, arm) => {
      set({ selectedTileId: null });
      dispatch({ type: 'play', seat: HUMAN_SEAT, tileId, arm });
    },
    draw: () => dispatch({ type: 'draw', seat: HUMAN_SEAT }),
    pass: () => dispatch({ type: 'pass', seat: HUMAN_SEAT }),
    claim: (points) => dispatch({ type: 'claim', seat: HUMAN_SEAT, points }),
    nextRound: () => {
      const m = get().match;
      if (m?.status !== 'round-over') return;
      if (m.frozen.rules.dealMode === 'pick') beginPicking(m.frozen.rules, { kind: 'next' });
      else commit(startNextRound(m));
    },
    quit: () => {
      clearBotTimer();
      removeKey(KEYS.activeMatch);
      set({ match: null, selectedTileId: null, picking: null });
    },
    resume: () => {
      const saved = readJSON<Persisted | null>(KEYS.activeMatch, null);
      if (!saved?.match || saved.match.status === 'finished') return false;
      set({ match: saved.match, difficulty: saved.difficulty, selectedTileId: null });
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
    won: match.winnerSide === mySide,
    myScore: match.scores[mySide] ?? 0,
    bestOpponentScore: Math.max(...match.scores.filter((_, i) => i !== mySide)),
    rounds: match.history.length,
    finishedAt: new Date().toISOString(),
  });
}
