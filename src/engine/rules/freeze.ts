import type { FrozenRules, RuleProfile, RuleSet } from './types';

/** JSON com chaves ordenadas — base para hash estável. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

/** FNV-1a 32 bits. Não é criptográfico; serve para identificar o conjunto de regras. */
export function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj);
    for (const v of Object.values(obj as object)) deepFreeze(v);
  }
  return obj;
}

export function cloneRules(rules: RuleSet): RuleSet {
  return JSON.parse(JSON.stringify(rules)) as RuleSet;
}

/** Congela uma cópia das regras do perfil para uma partida. */
export function freezeRules(profile: RuleProfile, rules: RuleSet = profile.rules, now = new Date()): FrozenRules {
  const copy = cloneRules(rules);
  return deepFreeze({
    profileId: profile.id,
    profileName: profile.name,
    profileVersion: profile.version,
    frozenAt: now.toISOString(),
    hash: hashString(stableStringify(copy)),
    rules: copy,
  });
}
