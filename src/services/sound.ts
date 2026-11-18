/**
 * Efeitos sonoros sintetizados com Web Audio — sem arquivos (leve, offline, sem licença).
 * O navegador só libera áudio após um gesto do usuário; `unlockAudio` é chamado no primeiro toque.
 */
export type SoundName = 'select' | 'place' | 'draw' | 'pass' | 'score' | 'turn' | 'win' | 'lose' | 'round';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.7;
let hapticsOn = true;

/** Vibração curta (Android). Ignorada onde não existe. */
export function haptic(pattern: number | number[]): void {
  if (!hapticsOn) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* sem suporte */
  }
}

export function configureHaptics(on: boolean): void {
  hapticsOn = on;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function configureSound(opts: { enabled: boolean; volume: number }): void {
  enabled = opts.enabled;
  volume = opts.volume;
  if (master) master.gain.value = volume;
}

export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

let noiseBuffer: AudioBuffer | null = null;
function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** Estalo curto de ruído filtrado (o "toc" da pedra). */
function click(c: AudioContext, t: number, freq: number, q: number, dur: number, gain: number) {
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(master!);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function tone(c: AudioContext, t: number, freq: number, dur: number, gain: number, type: OscillatorType = 'sine', endFreq?: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function playSound(name: SoundName): void {
  if (!enabled || volume <= 0) return;
  const c = getCtx();
  if (!c || !master || c.state !== 'running') return;
  const t = c.currentTime + 0.005;
  switch (name) {
    case 'select':
      click(c, t, 3800, 6, 0.035, 0.25);
      break;
    case 'place':
      // Pedra batendo na mesa: estalo agudo + corpo grave.
      click(c, t, 2600, 2.5, 0.07, 0.9);
      click(c, t + 0.012, 1400, 3, 0.05, 0.4);
      tone(c, t, 190, 0.09, 0.35, 'sine', 90);
      break;
    case 'draw':
      // Pedra arrastada do dorme.
      click(c, t, 1800, 0.8, 0.18, 0.25);
      click(c, t + 0.1, 2400, 4, 0.04, 0.35);
      break;
    case 'pass':
      // Duas batidinhas na mesa ("toc-toc").
      tone(c, t, 160, 0.08, 0.5, 'sine', 110);
      click(c, t, 900, 2, 0.05, 0.3);
      tone(c, t + 0.14, 160, 0.08, 0.45, 'sine', 110);
      click(c, t + 0.14, 900, 2, 0.05, 0.25);
      break;
    case 'score':
      tone(c, t, 880, 0.18, 0.18, 'triangle');
      tone(c, t + 0.08, 1320, 0.28, 0.16, 'triangle');
      break;
    case 'turn':
      tone(c, t, 660, 0.14, 0.1, 'sine');
      break;
    case 'round':
      tone(c, t, 523, 0.2, 0.14, 'triangle');
      tone(c, t + 0.12, 659, 0.3, 0.14, 'triangle');
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(c, t + i * 0.11, f, 0.35, 0.16, 'triangle'));
      break;
    case 'lose':
      tone(c, t, 392, 0.3, 0.14, 'triangle');
      tone(c, t + 0.18, 311, 0.45, 0.14, 'triangle');
      break;
  }
}
