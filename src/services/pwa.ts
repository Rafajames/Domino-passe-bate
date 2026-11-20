import { create } from 'zustand';
import { isNativeApp } from './platform';

/**
 * Instalação (PWA) e atualização automática.
 *
 * - Instalar: no Android/Chrome guardamos o evento `beforeinstallprompt` e o
 *   disparamos pelo botão "Instalar o app". No iPhone não há esse evento: o app
 *   mostra o passo a passo do Safari.
 * - Atualizar: cada build publica `version.json`. O app compara com a própria
 *   versão ao abrir, a cada 15 min e ao voltar para a tela. Havendo versão nova,
 *   atualiza o service worker e recarrega — na hora, se não houver partida em
 *   andamento; senão, avisa e aplica quando a partida acabar ou quando o jogador tocar.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  version: string;
  builtAt: string;
  canInstall: boolean;
  installed: boolean;
  isIos: boolean;
  updateReady: boolean;
  checking: boolean;
  install: () => Promise<boolean>;
  checkNow: () => Promise<boolean>;
  applyUpdate: () => void;
}

let deferred: BeforeInstallPromptEvent | null = null;
let registration: ServiceWorkerRegistration | null = null;
/** Diz se é seguro recarregar agora (sem partida em andamento). Definido pelo App. */
let isSafeToReload: () => boolean = () => true;

export function setReloadGuard(fn: () => boolean): void {
  isSafeToReload = fn;
}

const standalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

const UPDATED_KEY = 'dpb.updatedFrom';

export const usePwa = create<PwaState>((set, get) => ({
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
  builtAt: typeof __APP_BUILT_AT__ !== 'undefined' ? __APP_BUILT_AT__ : '',
  canInstall: false,
  installed: standalone() || isNativeApp(),
  isIos: typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent),
  updateReady: false,
  checking: false,

  install: async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    set({ canInstall: false });
    return choice.outcome === 'accepted';
  },

  checkNow: async () => {
    if (!import.meta.env.PROD) return false;
    set({ checking: true });
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return false;
      const { version } = (await res.json()) as { version: string };
      if (version && version !== get().version) {
        await registration?.update().catch(() => undefined);
        set({ updateReady: true });
        if (isSafeToReload()) get().applyUpdate();
        return true;
      }
      return false;
    } catch {
      return false; // offline: tenta de novo depois
    } finally {
      set({ checking: false });
    }
  },

  applyUpdate: () => {
    try {
      sessionStorage.setItem(UPDATED_KEY, get().version);
    } catch {
      /* ignore */
    }
    const waiting = registration?.waiting;
    if (waiting) waiting.postMessage('skip-waiting');
    // Recarrega já com a versão nova (index.html vem da rede; assets têm hash novo).
    location.reload();
  },
}));

/** Versão anterior, se o app acabou de se atualizar (para avisar o jogador). */
export function justUpdatedFrom(): string | null {
  try {
    const v = sessionStorage.getItem(UPDATED_KEY);
    sessionStorage.removeItem(UPDATED_KEY);
    return v && v !== usePwa.getState().version ? v : null;
  } catch {
    return null;
  }
}

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    usePwa.setState({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => usePwa.setState({ installed: true, canInstall: false }));

  // O app Android já traz os arquivos: sem service worker nem atualização pela web.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || isNativeApp()) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        registration = reg;
      })
      .catch(() => {
        /* PWA é um extra: falha silenciosa não impede o jogo */
      });
    const check = () => void usePwa.getState().checkNow();
    check();
    setInterval(check, 15 * 60_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  });
}
