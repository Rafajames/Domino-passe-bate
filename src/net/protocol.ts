import type { GameAction, MatchState } from '../engine/types';
import type { FrozenRules } from '../engine/rules/types';

/** Mensagens trocadas entre anfitrião (host) e convidados (guest). */

export interface LobbySeat {
  seat: number;
  name: string;
  avatar: string;
  kind: 'host' | 'guest' | 'open' | 'bot';
  connected: boolean;
}

export interface LobbyInfo {
  code: string;
  hostName: string;
  /** Quantos convidados o anfitrião aceita pelo link. */
  maxGuests: number;
  frozen: FrozenRules;
  seats: LobbySeat[];
  started: boolean;
}

export interface ChatMessage {
  id: string;
  seat: number;
  name: string;
  text: string;
  kind: 'text' | 'quick' | 'emoji';
  at: number;
}

export type GuestToHost =
  | { t: 'hello'; clientId: string; name: string; avatar: string }
  | { t: 'join' }
  | { t: 'action'; action: GameAction }
  | { t: 'next-round' }
  | { t: 'chat'; text: string; kind: ChatMessage['kind'] };

export type HostToGuest =
  | { t: 'lobby'; lobby: LobbyInfo; yourSeat: number | null }
  | { t: 'state'; match: MatchState; yourSeat: number }
  | { t: 'chat'; message: ChatMessage }
  | { t: 'error'; message: string }
  | { t: 'closed'; reason: string };

export const QUICK_PHRASES = ['Boa jogada!', 'Passei!', 'Bate logo!', 'Valeu, parceiro!', 'Essa doeu…', 'Tô pensando…', 'Joga aí!', 'Lá e lô!'];
export const EMOJIS = ['😂', '😎', '🔥', '😱', '👏', '🙏', '😤', '🐴'];

/** Código da sala: 6 caracteres sem ambiguidades (sem 0/O, 1/I). */
export function newRoomCode(rand: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(rand() * alphabet.length)]).join('');
}

export const peerIdFor = (code: string) => `passe-e-bate-${code.toUpperCase()}`;
