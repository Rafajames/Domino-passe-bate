import { create } from 'zustand';
import { decideClaim, decideTurn } from '../ai/bots';
import type { ArmId } from '../engine/board';
import { applyAction, createMatch, startNextRound } from '../engine/match';
import { createRng, randomSeed } from '../engine/rng';
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

interface GameState {
  match: MatchState | null;
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

  return {
    match: null,
    difficulty: 'normal',
    selectedTileId: null,
    error: null,

    startSolo: (profile, rules, difficulty) => {
      clearBotTimer();
      botRng = createRng(randomSeed());
      const frozen = freezeRules(profile, rules);
      const me = usePlayer.getState().player;
      const names = [...BOT_NAMES].sort(() => botRng() - 0.5);
      const players: PlayerSlot[] = Array.from({ length: frozen.rules.players }, (_, seat) =>
        seat === HUMAN_SEAT
          ? { seat, name: me.name, kind: 'human', avatar: me.avatar }
          : { seat, name: names[seat] ?? `Bot ${seat}`, kind: 'bot', difficulty, avatar: BOT_AVATARS[seat % BOT_AVATARS.length] ?? '🎲' },
      );
      const match = createMatch({ id: `solo-${Date.now().toString(36)}`, frozen, players, seed: randomSeed() });
      set({ difficulty, selectedTileId: null });
      commit(match);
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
      if (m?.status === 'round-over') commit(startNextRound(m));
    },
    quit: () => {
      clearBotTimer();
      removeKey(KEYS.activeMatch);
      set({ match: null, selectedTileId: null });
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
