import { beforeEach, describe, expect, it, vi } from 'vitest';

// PeerJS simulado: abre sozinho e deixa o teste "conectar" convidados.
const peers: FakePeer[] = [];
class FakePeer {
  h: Record<string, ((a?: unknown) => void)[]> = {};
  destroyed = false;
  open = true;
  disconnected = false;
  constructor() {
    peers.push(this);
    setTimeout(() => this.emit('open'), 0);
  }
  on(e: string, f: (a?: unknown) => void) {
    (this.h[e] ??= []).push(f);
    return this;
  }
  once(e: string, f: (a?: unknown) => void) {
    return this.on(e, f);
  }
  off() {}
  emit(e: string, a?: unknown) {
    (this.h[e] ?? []).forEach((f) => f(a));
  }
  destroy() {
    this.destroyed = true;
  }
}
vi.mock('peerjs', () => ({ Peer: FakePeer }));

let useOnline: typeof import('./onlineStore').useOnline;
let BUILTIN_PROFILES: typeof import('../engine/rules/profiles').BUILTIN_PROFILES;
// Cada teste começa com módulos novos (o store guarda estado fora do React).
beforeEach(async () => {
  vi.resetModules();
  peers.length = 0;
  ({ useOnline } = await import('./onlineStore'));
  ({ BUILTIN_PROFILES } = await import('../engine/rules/profiles'));
});

function guest(name: string) {
  const sent: any[] = [];
  const h: Record<string, ((a?: unknown) => void)[]> = {};
  const conn = {
    open: true,
    send: (m: unknown) => sent.push(m),
    close() {},
    on: (e: string, f: (a?: unknown) => void) => ((h[e] ??= []).push(f), conn),
  };
  peers[peers.length - 1]!.emit('connection', conn);
  const say = (m: unknown) => (h.data ?? []).forEach((f) => f(m));
  say({ t: 'hello', clientId: `c-${name}`, name, avatar: '🙂' });
  say({ t: 'join' });
  return { sent, say };
}

async function room(players: 2 | 3 | 4, teams: boolean, maxGuests: number) {
  const profile = BUILTIN_PROFILES.find((p) => p.mode === 'passe-bate')!;
  await useOnline.getState().createRoom(profile, { ...profile.rules, players, teams }, 'normal', maxGuests);
}
const seatOf = (name: string) => useOnline.getState().lobby!.seats.find((s) => s.name === name)?.seat;

describe('lugares e lados no lobby online', () => {
  it('respeita o limite de convidados pelo link', async () => {
    await room(4, false, 2);
    guest('Ana');
    guest('Beto');
    const c = guest('Caio');
    expect(c.sent.some((m) => m.t === 'error' && /cheia/.test(m.message))).toBe(true);
    expect(seatOf('Caio')).toBeUndefined();
    useOnline.getState().leave();
  });

  it('em duplas: a favor vai para o lugar 3, contra para 2 ou 4', async () => {
    await room(4, true, 3);
    guest('Ana'); // lugar 1 (índice 1)
    guest('Beto'); // índice 2
    guest('Caio'); // índice 3
    const { setSide } = useOnline.getState();
    expect(seatOf('Beto')! % 2).toBe(0); // já é parceiro
    setSide(seatOf('Ana')!, 'ally'); // troca com o Beto
    expect(seatOf('Ana')).toBe(2);
    expect(seatOf('Beto')).toBe(1);
    setSide(seatOf('Ana')!, 'rival'); // volta para o lado contrário
    expect(seatOf('Ana')! % 2).toBe(1);
    useOnline.getState().leave();
  });

  it('move para lugar livre e troca quando ocupado', async () => {
    await room(4, false, 3);
    guest('Ana');
    guest('Beto');
    const { moveGuest } = useOnline.getState();
    moveGuest(seatOf('Ana')!, 3);
    expect(seatOf('Ana')).toBe(3);
    moveGuest(3, 2); // Beto está no 2: troca
    expect(seatOf('Ana')).toBe(2);
    expect(seatOf('Beto')).toBe(3);
    moveGuest(2, 0); // lugar do anfitrião é proibido
    expect(seatOf('Ana')).toBe(2);
    useOnline.getState().leave();
  });
});
