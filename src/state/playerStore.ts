import { create } from 'zustand';
import type { GameMode } from '../engine/rules/types';
import type { BotDifficulty } from '../engine/types';
import { KEYS, readJSON, writeJSON } from '../services/storage';

/** Resultado resumido de uma partida solo. Fica só neste dispositivo e NUNCA entra em ranking. */
export interface SoloMatchRecord {
  id: string;
  mode: GameMode;
  profileName: string;
  difficulty: BotDifficulty;
  won: boolean;
  myScore: number;
  bestOpponentScore: number;
  rounds: number;
  finishedAt: string;
}

export interface LocalPlayer {
  name: string;
  avatar: string;
}

interface PlayerState {
  player: LocalPlayer;
  history: SoloMatchRecord[];
  setPlayer: (p: Partial<LocalPlayer>) => void;
  record: (r: SoloMatchRecord) => void;
  clearHistory: () => void;
}

export const AVATARS = ['🦜', '🐆', '🦉', '🐢', '🦊', '🐺', '🦩', '🐬', '🌵', '⚓', '🌻', '🎲'] as const;

const initial = readJSON<{ player: LocalPlayer; history: SoloMatchRecord[] }>(KEYS.player, {
  player: { name: 'Você', avatar: '🦜' },
  history: [],
});

export const usePlayer = create<PlayerState>((set, get) => ({
  player: initial.player,
  history: initial.history,
  setPlayer: (p) => {
    const player = { ...get().player, ...p, name: (p.name ?? get().player.name).slice(0, 20) };
    set({ player });
    writeJSON(KEYS.player, { player, history: get().history });
  },
  record: (r) => {
    if (get().history.some((h) => h.id === r.id)) return;
    const history = [r, ...get().history].slice(0, 200);
    set({ history });
    writeJSON(KEYS.player, { player: get().player, history });
  },
  clearHistory: () => {
    set({ history: [] });
    writeJSON(KEYS.player, { player: get().player, history: [] });
  },
}));

export interface ModeStats {
  played: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function statsFor(history: readonly SoloMatchRecord[], mode?: GameMode): ModeStats {
  const list = mode ? history.filter((h) => h.mode === mode) : history;
  const wins = list.filter((h) => h.won).length;
  return { played: list.length, wins, losses: list.length - wins, winRate: list.length ? wins / list.length : 0 };
}
