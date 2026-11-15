import { ALL_FIVES_STANDARD, PASSE_BATE_PB } from '../engine/rules/profiles';
import { validateRules } from '../engine/rules/validate';
import type { GameMode, RuleSet } from '../engine/rules/types';

/**
 * Código de compartilhamento de perfil de regras (funciona offline — basta copiar e colar).
 * Formato: "DPB1." + base64url(JSON). No multiplayer, perfis também serão salvos no servidor.
 */
const PREFIX = 'DPB1.';

export interface SharedProfile {
  name: string;
  mode: GameMode;
  rules: RuleSet;
  basedOn?: string;
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeProfile(p: SharedProfile): string {
  return PREFIX + toBase64Url(JSON.stringify(p));
}

/** Mescla campo a campo sobre o perfil-base para tolerar códigos de versões antigas. */
function sanitize(mode: GameMode, rules: Partial<RuleSet>): RuleSet {
  const base = mode === 'passe-bate' ? PASSE_BATE_PB : ALL_FIVES_STANDARD;
  return {
    ...base,
    ...rules,
    mode,
    passeBate: {
      batidaPoints: { ...base.passeBate.batidaPoints, ...rules.passeBate?.batidaPoints },
      blocked: { ...base.passeBate.blocked, ...rules.passeBate?.blocked },
    },
    allFives: {
      ...base.allFives,
      ...rules.allFives,
      // Regra pendente: nunca pode ser ativada por um código importado.
      passBonus: { status: 'pending', enabled: false, points: null },
    },
    assists: { ...base.assists, ...rules.assists },
  };
}

export function decodeProfile(code: string): SharedProfile {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) throw new Error('Código inválido.');
  let parsed: Partial<SharedProfile>;
  try {
    parsed = JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length))) as Partial<SharedProfile>;
  } catch {
    throw new Error('Código corrompido.');
  }
  if (parsed.mode !== 'passe-bate' && parsed.mode !== 'all-fives') throw new Error('Modalidade desconhecida.');
  const rules = sanitize(parsed.mode, parsed.rules ?? {});
  const errors = validateRules(rules);
  if (errors.length) throw new Error(errors.join(' '));
  return {
    name: String(parsed.name ?? 'Perfil compartilhado').slice(0, 40),
    mode: parsed.mode,
    rules,
    basedOn: parsed.basedOn,
  };
}
