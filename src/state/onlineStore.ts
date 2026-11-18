import { create } from 'zustand';
import type { DataConnection, Peer } from 'peerjs';
import { freezeRules } from '../engine/rules/freeze';
import type { RuleProfile, RuleSet } from '../engine/rules/types';
import type { BotDifficulty, MatchState } from '../engine/types';
import { newRoomCode, peerIdFor, type ChatMessage, type GuestToHost, type HostToGuest, type LobbyInfo, type LobbySeat } from '../net/protocol';
import { redactMatch } from '../net/redact';
import { readJSON, writeJSON } from '../services/storage';
import { netHooks, useGame } from './gameStore';
import { useNav } from './navigation';
import { usePlayer } from './playerStore';
import { useToastStore } from '../ui/components/Toast';

/**
 * Online entre amigos sem servidor próprio: o aparelho de quem cria a sala
 * (anfitrião) roda o motor e é a única fonte da verdade. Convidados recebem só
 * a própria visão (redactMatch) e enviam ações, que o anfitrião valida.
 * A conexão é direta (WebRTC) via PeerJS; o servidor público do PeerJS só
 * apresenta os aparelhos e não guarda nada.
 */

type Status = 'idle' | 'connecting' | 'lobby' | 'playing' | 'reconnecting' | 'error';

interface Client {
  conn: DataConnection;
  clientId: string;
  name: string;
  avatar: string;
  seat: number | null;
}

interface OnlineState {
  role: 'host' | 'guest' | null;
  status: Status;
  code: string | null;
  lobby: LobbyInfo | null;
  mySeat: number | null;
  chat: ChatMessage[];
  unread: number;
  error: string | null;
  createRoom: (profile: RuleProfile, rules: RuleSet, difficulty: BotDifficulty) => Promise<void>;
  startGame: () => void;
  joinRoom: (code: string) => Promise<void>;
  acceptSeat: () => void;
  sendChat: (text: string, kind: ChatMessage['kind']) => void;
  markChatRead: () => void;
  botForSeat: (seat: number) => void;
  leave: () => void;
}

// ---------------------------------------------------------------- utilidades

function clientId(): string {
  let id = readJSON<string | null>('dpb.clientId', null);
  if (!id) {
    id = `c-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    writeJSON('dpb.clientId', id);
  }
  return id;
}

function peerOptions() {
  const env = import.meta.env;
  if (!env.VITE_PEER_HOST) return { debug: 0 };
  return {
    host: env.VITE_PEER_HOST as string,
    port: Number(env.VITE_PEER_PORT ?? 443),
    path: (env.VITE_PEER_PATH as string | undefined) ?? '/',
    secure: env.VITE_PEER_SECURE !== 'false',
    debug: 0,
  };
}

async function makePeer(id?: string): Promise<Peer> {
  const { Peer } = await import('peerjs');
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, peerOptions()) : new Peer(peerOptions());
    const timer = setTimeout(() => reject(new Error('Tempo esgotado ao conectar ao serviço de salas.')), 15000);
    peer.once('open', () => {
      clearTimeout(timer);
      resolve(peer);
    });
    peer.once('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

const toast = (m: string) => useToastStore.getState().show(m);

// ---------------------------------------------------------------- estado interno

let peer: Peer | null = null;
// Anfitrião
const clients = new Map<string, Client>(); // por clientId
let hostSetup: { profile: RuleProfile; rules: RuleSet; difficulty: BotDifficulty } | null = null;
// Convidado
let hostConn: DataConnection | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let leaving = false;

export const useOnline = create<OnlineState>((set, get) => {
  // ------------------------------------------------ anfitrião
  function lobbySeats(): LobbySeat[] {
    const rules = hostSetup!.rules;
    const me = usePlayer.getState().player;
    const match = useGame.getState().match;
    return Array.from({ length: rules.players }, (_, seat) => {
      if (seat === 0) return { seat, name: me.name, avatar: me.avatar, kind: 'host', connected: true };
      const c = [...clients.values()].find((x) => x.seat === seat);
      const slot = match?.players[seat];
      if (slot?.kind === 'bot') return { seat, name: slot.name, avatar: slot.avatar, kind: 'bot', connected: true };
      if (c) return { seat, name: c.name, avatar: c.avatar, kind: 'guest', connected: c.conn.open };
      return { seat, name: 'Lugar livre', avatar: '·', kind: 'open', connected: false };
    });
  }

  function lobbyInfo(): LobbyInfo {
    const { profile, rules } = hostSetup!;
    return {
      code: get().code ?? '',
      hostName: usePlayer.getState().player.name,
      frozen: freezeRules(profile, rules),
      seats: lobbySeats(),
      started: !!useGame.getState().match && get().status === 'playing',
    };
  }

  function sendTo(c: Client, msg: HostToGuest) {
    if (c.conn.open) c.conn.send(msg);
  }

  function broadcastLobby() {
    const lobby = lobbyInfo();
    set({ lobby });
    for (const c of clients.values()) sendTo(c, { t: 'lobby', lobby, yourSeat: c.seat });
  }

  function broadcastState(match: MatchState) {
    for (const c of clients.values()) if (c.seat !== null) sendTo(c, { t: 'state', match: redactMatch(match, c.seat), yourSeat: c.seat });
  }

  function addChat(message: ChatMessage) {
    const mine = message.seat === get().mySeat;
    set({ chat: [...get().chat.slice(-99), message], unread: mine ? get().unread : get().unread + 1 });
    if (!mine) toast(`${message.name}: ${message.text}`);
  }

  function hostHandle(conn: DataConnection, msg: GuestToHost) {
    const existing = [...clients.values()].find((c) => c.conn === conn);
    switch (msg.t) {
      case 'hello': {
        const prev = clients.get(msg.clientId);
        const client: Client = { conn, clientId: msg.clientId, name: msg.name.slice(0, 20) || 'Convidado', avatar: msg.avatar, seat: prev?.seat ?? null };
        clients.set(msg.clientId, client);
        broadcastLobby();
        const match = useGame.getState().match;
        if (client.seat !== null && match) {
          toast(`${client.name} voltou para a mesa.`);
          sendTo(client, { t: 'state', match: redactMatch(match, client.seat), yourSeat: client.seat });
        }
        return;
      }
      case 'join': {
        if (!existing) return;
        if (existing.seat !== null) return;
        if (get().status === 'playing') return sendTo(existing, { t: 'error', message: 'A partida já começou.' });
        const taken = new Set([...clients.values()].map((c) => c.seat));
        const free = Array.from({ length: hostSetup!.rules.players }, (_, s) => s).find((s) => s !== 0 && !taken.has(s));
        if (free === undefined) return sendTo(existing, { t: 'error', message: 'A mesa está cheia.' });
        existing.seat = free;
        toast(`${existing.name} sentou à mesa.`);
        broadcastLobby();
        return;
      }
      case 'action': {
        if (!existing || existing.seat === null) return;
        const err = useGame.getState().applyRemote(existing.seat, msg.action);
        if (err) sendTo(existing, { t: 'error', message: err });
        return;
      }
      case 'next-round': {
        if (useGame.getState().match?.status === 'round-over') useGame.getState().nextRound();
        return;
      }
      case 'chat': {
        if (!existing || existing.seat === null) return;
        const message: ChatMessage = { id: `${Date.now()}-${Math.random()}`, seat: existing.seat, name: existing.name, text: msg.text.slice(0, 200), kind: msg.kind, at: Date.now() };
        addChat(message);
        for (const c of clients.values()) sendTo(c, { t: 'chat', message });
        return;
      }
    }
  }

  // ------------------------------------------------ convidado
  async function guestConnect(code: string) {
    if (!peer || peer.destroyed) peer = await makePeer();
    const conn = peer.connect(peerIdFor(code), { reliable: true });
    hostConn = conn;
    conn.on('open', () => {
      const me = usePlayer.getState().player;
      conn.send({ t: 'hello', clientId: clientId(), name: me.name, avatar: me.avatar } satisfies GuestToHost);
      if (get().status === 'reconnecting') toast('Reconectado à mesa.');
    });
    conn.on('data', (raw) => {
      const msg = raw as HostToGuest;
      if (msg.t === 'lobby') {
        set({ lobby: msg.lobby, mySeat: msg.yourSeat, status: get().status === 'playing' ? 'playing' : 'lobby' });
      } else if (msg.t === 'state') {
        const first = useGame.getState().net !== 'guest' || !useGame.getState().match;
        useGame.getState().receiveState(msg.match, msg.yourSeat);
        set({ status: 'playing', mySeat: msg.yourSeat });
        const nav = useNav.getState();
        if (first && nav.current().name !== 'game') nav.go({ name: 'game' });
      } else if (msg.t === 'chat') addChat(msg.message);
      else if (msg.t === 'error') toast(msg.message);
      else if (msg.t === 'closed') {
        toast(msg.reason);
        get().leave();
      }
    });
    conn.on('close', () => scheduleRetry(code));
    conn.on('error', () => scheduleRetry(code));
  }

  function scheduleRetry(code: string) {
    if (leaving || get().role !== 'guest') return;
    set({ status: 'reconnecting' });
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      guestConnect(code).catch(() => scheduleRetry(code));
    }, 3000);
  }

  return {
    role: null,
    status: 'idle',
    code: null,
    lobby: null,
    mySeat: null,
    chat: [],
    unread: 0,
    error: null,

    createRoom: async (profile, rules, difficulty) => {
      get().leave();
      leaving = false;
      set({ role: 'host', status: 'connecting', error: null, chat: [], unread: 0, mySeat: 0 });
      hostSetup = { profile, rules: { ...rules, dealMode: 'auto' }, difficulty };
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = newRoomCode();
        try {
          peer = await makePeer(peerIdFor(code));
          set({ code });
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!peer) {
        set({ status: 'error', error: `Não foi possível criar a sala. ${lastErr instanceof Error ? lastErr.message : ''}` });
        return;
      }
      peer.on('connection', (conn) => {
        conn.on('data', (raw) => hostHandle(conn, raw as GuestToHost));
        conn.on('close', () => {
          const c = [...clients.values()].find((x) => x.conn === conn);
          if (!c) return;
          if (c.seat === null) clients.delete(c.clientId);
          else toast(`${c.name} desconectou. A mesa espera a volta ou você pode colocar um bot no lugar.`);
          broadcastLobby();
        });
      });
      netHooks.broadcast = broadcastState;
      set({ status: 'lobby' });
      broadcastLobby();
    },

    startGame: () => {
      if (get().role !== 'host' || !hostSetup) return;
      const remotes = [...clients.values()].filter((c) => c.seat !== null).map((c) => ({ seat: c.seat!, name: c.name, avatar: c.avatar }));
      set({ status: 'playing' });
      useGame.getState().startOnline(hostSetup.profile, hostSetup.rules, hostSetup.difficulty, remotes);
      broadcastLobby();
      useNav.getState().go({ name: 'game' });
    },

    joinRoom: async (rawCode) => {
      const code = rawCode.trim().toUpperCase();
      get().leave();
      leaving = false;
      set({ role: 'guest', status: 'connecting', code, error: null, chat: [], unread: 0, lobby: null, mySeat: null });
      writeJSON('dpb.online.last', { code, at: Date.now() });
      try {
        await guestConnect(code);
      } catch (e) {
        set({ status: 'error', error: `Não foi possível entrar na sala ${code}. ${e instanceof Error ? e.message : ''}` });
      }
    },

    acceptSeat: () => {
      hostConn?.send({ t: 'join' } satisfies GuestToHost);
    },

    sendChat: (text, kind) => {
      const t = text.trim();
      if (!t) return;
      if (get().role === 'guest') {
        hostConn?.send({ t: 'chat', text: t, kind } satisfies GuestToHost);
        return;
      }
      if (get().role === 'host') {
        const me = usePlayer.getState().player;
        const message: ChatMessage = { id: `${Date.now()}-${Math.random()}`, seat: 0, name: me.name, text: t.slice(0, 200), kind, at: Date.now() };
        addChat(message);
        for (const c of clients.values()) sendTo(c, { t: 'chat', message });
      }
    },

    markChatRead: () => set({ unread: 0 }),

    botForSeat: (seat) => {
      if (get().role !== 'host') return;
      useGame.getState().replaceWithBot(seat);
      for (const [id, c] of clients) if (c.seat === seat) clients.delete(id);
      broadcastLobby();
    },

    leave: () => {
      leaving = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (get().role === 'host') for (const c of clients.values()) sendTo(c, { t: 'closed', reason: 'O anfitrião encerrou a sala.' });
      clients.clear();
      hostConn?.close();
      hostConn = null;
      peer?.destroy();
      peer = null;
      hostSetup = null;
      netHooks.broadcast = undefined;
      if (useGame.getState().net !== 'local') useGame.getState().leaveOnline();
      set({ role: null, status: 'idle', code: null, lobby: null, mySeat: null });
    },
  };
});

// Convidado: as ações e pedidos de próxima rodada vão para o anfitrião.
netHooks.sendAction = (action) => hostConn?.send({ t: 'action', action } satisfies GuestToHost);
netHooks.sendNextRound = () => hostConn?.send({ t: 'next-round' } satisfies GuestToHost);

export function lastOnlineRoom(): string | null {
  const r = readJSON<{ code: string; at: number } | null>('dpb.online.last', null);
  return r && Date.now() - r.at < 6 * 3600_000 ? r.code : null;
}
