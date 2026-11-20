import { isNativeApp } from './platform';

/** Registra o service worker (cache offline do app). Só em produção e só na web: o app Android já traz os arquivos. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || isNativeApp()) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* PWA é um extra: falha silenciosa não impede o jogo */
    });
  });
}
