import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';

/**
 * Plano B do online: quando a conexão direta (WebRTC) não abre — comum entre
 * redes móveis de cidades diferentes —, as mensagens passam pelo Supabase
 * Realtime (broadcast). Não grava nada no banco.
 *
 * `Link` imita a parte do DataConnection do PeerJS que o jogo usa, para que o
 * resto do código trate P2P e relay do mesmo jeito.
 */

type Handler = (arg?: unknown) => void;

export interface Link {
  readonly open: boolean;
  readonly via: 'p2p' | 'relay';
  send(msg: unknown): void;
  close(): void;
  on(ev: 'open' | 'data' | 'close' | 'error', fn: Handler): void;
}

export const relayAvailable = isSupabaseConfigured;

const HEARTBEAT = 8000;
const SILENCE = 25000;
const channelName = (code: string) => `dpb-room-${code.toUpperCase()}`;

class RelayLink implements Link {
  readonly via = 'relay' as const;
  open = false;
  lastSeen = Date.now();
  private handlers: Record<string, Handler[]> = {};
  constructor(private sendRaw: (msg: unknown) => void, private onClose?: () => void) {}
  on(ev: string, fn: Handler) {
    (this.handlers[ev] ??= []).push(fn);
  }
  emit(ev: string, arg?: unknown) {
    for (const fn of this.handlers[ev] ?? []) fn(arg);
  }
  markOpen() {
    if (this.open) return;
    this.open = true;
    this.emit('open');
  }
  send(msg: unknown) {
    if (this.open) this.sendRaw(msg);
  }
  private closed = false;
  close() {
    this.closeQuiet();
  }
  closeQuiet(notify = true) {
    if (this.closed) return;
    this.closed = true;
    this.open = false;
    this.onClose?.();
    if (notify) this.emit('close');
  }
}

async function subscribe(code: string): Promise<RealtimeChannel> {
  const sb = await getSupabase();
  if (!sb) throw new Error('Servidor reserva não configurado.');
  const ch = sb.channel(channelName(code), { config: { broadcast: { self: false, ack: false } } });
  return ch;
}

function waitSubscribed(ch: RealtimeChannel, ms = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Servidor reserva não respondeu.')), ms);
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer);
        reject(new Error('Falha no servidor reserva.'));
      }
    });
  });
}

// ------------------------------------------------------------------ anfitrião

export interface RelayHost {
  close(): void;
}

/** O anfitrião escuta a sala no relay; cada convidado novo vira um Link. */
export async function hostRelay(code: string, onConnection: (link: Link) => void): Promise<RelayHost> {
  const ch = await subscribe(code);
  const links = new Map<string, RelayLink>();
  const sendTo = (to: string, msg: unknown) => void ch.send({ type: 'broadcast', event: 'h2g', payload: { to, msg } });

  ch.on('broadcast', { event: 'g2h' }, ({ payload }) => {
    const { from, msg, ctl } = payload as { from: string; msg?: unknown; ctl?: 'knock' | 'hb' | 'bye' };
    let link = links.get(from);
    if (ctl === 'bye') {
      link?.closeQuiet();
      links.delete(from);
      return;
    }
    if (!link || !link.open) {
      if (ctl !== 'knock') {
        // Convidado que o anfitrião não conhece (ex.: anfitrião reabriu o app): pede para recomeçar.
        void ch.send({ type: 'broadcast', event: 'h2g', payload: { to: from, ctl: 'reset' } });
        return;
      }
      link = new RelayLink((m) => sendTo(from, m), () => links.delete(from));
      links.set(from, link);
      onConnection(link);
      link.markOpen();
    }
    link.lastSeen = Date.now();
    if (ctl === 'knock') void ch.send({ type: 'broadcast', event: 'h2g', payload: { to: from, ctl: 'welcome' } });
    if (msg !== undefined) link.emit('data', msg);
  });

  await waitSubscribed(ch);

  const hb = setInterval(() => {
    void ch.send({ type: 'broadcast', event: 'h2g', payload: { to: '*', ctl: 'hb' } });
    const now = Date.now();
    for (const [id, l] of links) if (now - l.lastSeen > SILENCE) {
      links.delete(id);
      l.closeQuiet();
    }
  }, HEARTBEAT);

  return {
    close() {
      clearInterval(hb);
      for (const l of links.values()) l.closeQuiet(false);
      links.clear();
      void ch.unsubscribe();
    },
  };
}

// ------------------------------------------------------------------ convidado

/** O convidado bate na porta da sala; resolve quando o anfitrião responde. */
export async function guestRelay(code: string, clientId: string, timeoutMs = 10000): Promise<Link> {
  const ch = await subscribe(code);
  let hb: ReturnType<typeof setInterval> | null = null;
  const post = (payload: Record<string, unknown>) => void ch.send({ type: 'broadcast', event: 'g2h', payload: { from: clientId, ...payload } });
  const link = new RelayLink(
    (msg) => post({ msg }),
    () => {
      if (hb) clearInterval(hb);
      post({ ctl: 'bye' });
      setTimeout(() => void ch.unsubscribe(), 300);
    },
  );

  ch.on('broadcast', { event: 'h2g' }, ({ payload }) => {
    const { to, msg, ctl } = payload as { to: string; msg?: unknown; ctl?: 'welcome' | 'hb' | 'reset' };
    if (to !== clientId && to !== '*') return;
    link.lastSeen = Date.now();
    if (ctl === 'welcome') link.markOpen();
    if (ctl === 'reset' && link.open) return link.closeQuiet();
    if (msg !== undefined && link.open) link.emit('data', msg);
  });

  try {
    await waitSubscribed(ch);
  } catch (e) {
    void ch.unsubscribe();
    throw e;
  }

  return new Promise<Link>((resolve, reject) => {
    const knock = setInterval(() => post({ ctl: 'knock' }), 2000);
    post({ ctl: 'knock' });
    const timer = setTimeout(() => {
      clearInterval(knock);
      void ch.unsubscribe();
      reject(new Error('Sala não encontrada. Confira o código e se o anfitrião está com o jogo aberto.'));
    }, timeoutMs);
    link.on('open', () => {
      clearInterval(knock);
      clearTimeout(timer);
      hb = setInterval(() => {
        post({ ctl: 'hb' });
        if (Date.now() - link.lastSeen > SILENCE) link.closeQuiet();
      }, HEARTBEAT);
      resolve(link);
    });
  });
}
