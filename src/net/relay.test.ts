import { describe, expect, it, vi } from 'vitest';

// Canal broadcast em memória que imita o Supabase Realtime (self: false).
type Cb = (m: { payload: unknown }) => void;
const rooms = new Map<string, Set<FakeChannel>>();
class FakeChannel {
  subs: { event: string; cb: Cb }[] = [];
  constructor(public name: string) {}
  on(_t: string, f: { event: string }, cb: Cb) {
    this.subs.push({ event: f.event, cb });
    return this;
  }
  subscribe(cb: (s: string) => void) {
    if (!rooms.has(this.name)) rooms.set(this.name, new Set());
    rooms.get(this.name)!.add(this);
    setTimeout(() => cb('SUBSCRIBED'), 0);
    return this;
  }
  send({ event, payload }: { event: string; payload: unknown }) {
    for (const ch of rooms.get(this.name) ?? []) if (ch !== this) for (const s of ch.subs) if (s.event === event) setTimeout(() => s.cb({ payload }), 0);
    return Promise.resolve('ok');
  }
  unsubscribe() {
    rooms.get(this.name)?.delete(this);
    return Promise.resolve('ok');
  }
}

vi.mock('../services/supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: async () => ({ channel: (name: string) => new FakeChannel(name) }),
}));

const { hostRelay, guestRelay } = await import('./relay');

describe('relay (servidor reserva)', () => {
  it('conecta convidado ao anfitrião e troca mensagens nos dois sentidos', async () => {
    const host = await hostRelay('ABC234', (link) => link.on('data', (m) => link.send({ echo: m })));
    const guest = await guestRelay('abc234', 'c-1');
    expect(guest.open).toBe(true);
    expect(guest.via).toBe('relay');
    const reply = new Promise((r) => guest.on('data', r));
    guest.send({ t: 'hello' });
    expect(await reply).toEqual({ echo: { t: 'hello' } });
    guest.close();
    host.close();
  });

  it('entrega cada mensagem só ao convidado certo', async () => {
    const links: { send: (m: unknown) => void }[] = [];
    const host = await hostRelay('MESA22', (l) => links.push(l));
    const a = await guestRelay('MESA22', 'c-a');
    const b = await guestRelay('MESA22', 'c-b');
    const gotA: unknown[] = [];
    const gotB: unknown[] = [];
    a.on('data', (m) => gotA.push(m));
    b.on('data', (m) => gotB.push(m));
    links[0]!.send('para A');
    links[1]!.send('para B');
    await new Promise((r) => setTimeout(r, 20));
    expect(gotA).toEqual(['para A']);
    expect(gotB).toEqual(['para B']);
    host.close();
  });

  it('avisa quando a sala não existe', async () => {
    await expect(guestRelay('NADA99', 'c-x', 50)).rejects.toThrow(/Sala não encontrada/);
  });

  it('o anfitrião percebe quando o convidado sai', async () => {
    let closed = false;
    const host = await hostRelay('SAIDA2', (l) => l.on('close', () => (closed = true)));
    const g = await guestRelay('SAIDA2', 'c-s');
    g.close();
    await new Promise((r) => setTimeout(r, 20));
    expect(closed).toBe(true);
    host.close();
  });
});
