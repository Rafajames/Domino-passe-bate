/** Acesso seguro ao localStorage (pode falhar em modo privado ou com cota cheia). */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    /* sem persistência disponível — o jogo continua funcionando em memória */
  }
}

export function removeKey(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const KEYS = {
  customProfiles: 'dpb.profiles.v1',
  player: 'dpb.player.v1',
  activeMatch: 'dpb.match.v1',
  matchHistory: 'dpb.history.v1',
  settings: 'dpb.settings.v1',
} as const;
