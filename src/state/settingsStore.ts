import { create } from 'zustand';
import { KEYS, readJSON, writeJSON } from '../services/storage';

export type TableTheme = 'feltro' | 'madeira' | 'noite';

interface Settings {
  tableTheme: TableTheme;
  reducedMotion: boolean;
}

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
}

const initial = readJSON<Settings>(KEYS.settings, { tableTheme: 'feltro', reducedMotion: false });

export const useSettings = create<SettingsState>((set, get) => ({
  ...initial,
  set: (patch) => {
    set(patch);
    const { tableTheme, reducedMotion } = { ...get(), ...patch };
    writeJSON(KEYS.settings, { tableTheme, reducedMotion });
  },
}));
