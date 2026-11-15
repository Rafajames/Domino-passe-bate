import { create } from 'zustand';
import { KEYS, readJSON, writeJSON } from '../services/storage';

export type TableTheme = 'feltro' | 'madeira' | 'noite';

interface Settings {
  tableTheme: TableTheme;
  reducedMotion: boolean;
  soundEnabled: boolean;
  volume: number;
  /** Esconde os assentos dos outros jogadores para a mesa ocupar a tela toda. */
  focusMode: boolean;
}

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
}

const defaults: Settings = { tableTheme: 'feltro', reducedMotion: false, soundEnabled: true, volume: 0.7, focusMode: false };
const initial: Settings = { ...defaults, ...readJSON<Partial<Settings>>(KEYS.settings, {}) };

export const useSettings = create<SettingsState>((set, get) => ({
  ...initial,
  set: (patch) => {
    set(patch);
    const { tableTheme, reducedMotion, soundEnabled, volume, focusMode } = { ...get(), ...patch };
    writeJSON(KEYS.settings, { tableTheme, reducedMotion, soundEnabled, volume, focusMode });
  },
}));
