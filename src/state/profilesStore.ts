import { create } from 'zustand';
import { BUILTIN_PROFILES } from '../engine/rules/profiles';
import { cloneRules } from '../engine/rules/freeze';
import type { GameMode, RuleProfile, RuleSet } from '../engine/rules/types';
import { KEYS, readJSON, writeJSON } from '../services/storage';

interface ProfilesState {
  custom: RuleProfile[];
  all: () => RuleProfile[];
  byMode: (mode: GameMode) => RuleProfile[];
  get: (id: string) => RuleProfile | undefined;
  /** Cria um novo perfil personalizado. */
  create: (input: { name: string; mode: GameMode; rules: RuleSet; basedOn?: string; description?: string }) => RuleProfile;
  /** Salva nova versão de um perfil personalizado, preservando a anterior no histórico. */
  saveVersion: (id: string, rules: RuleSet, name?: string) => RuleProfile;
  remove: (id: string) => void;
}

function persist(custom: RuleProfile[]) {
  writeJSON(KEYS.customProfiles, custom);
}

function newId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useProfiles = create<ProfilesState>((set, get) => ({
  custom: readJSON<RuleProfile[]>(KEYS.customProfiles, []),
  all: () => [...BUILTIN_PROFILES, ...get().custom],
  byMode: (mode) => get().all().filter((p) => p.mode === mode),
  get: (id) => get().all().find((p) => p.id === id),
  create: ({ name, mode, rules, basedOn, description }) => {
    const now = new Date().toISOString();
    const base = basedOn ? get().get(basedOn) : undefined;
    const profile: RuleProfile = {
      id: newId(),
      name: name.trim() || 'Meu perfil',
      mode,
      version: 1,
      builtIn: false,
      basedOn,
      description: description ?? (base ? `Personalizado a partir de “${base.name}”.` : 'Perfil personalizado.'),
      rules: cloneRules(rules),
      ruleStatus: base ? { ...base.ruleStatus } : {},
      history: [],
      createdAt: now,
      updatedAt: now,
    };
    const custom = [...get().custom, profile];
    persist(custom);
    set({ custom });
    return profile;
  },
  saveVersion: (id, rules, name) => {
    const current = get().custom.find((p) => p.id === id);
    if (!current) throw new Error('Perfis embutidos não podem ser alterados; salve uma cópia.');
    const now = new Date().toISOString();
    const updated: RuleProfile = {
      ...current,
      name: name?.trim() || current.name,
      version: current.version + 1,
      rules: cloneRules(rules),
      history: [...current.history, { version: current.version, rules: current.rules, savedAt: current.updatedAt }],
      updatedAt: now,
    };
    const custom = get().custom.map((p) => (p.id === id ? updated : p));
    persist(custom);
    set({ custom });
    return updated;
  },
  remove: (id) => {
    const custom = get().custom.filter((p) => p.id !== id);
    persist(custom);
    set({ custom });
  },
}));
