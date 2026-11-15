/** Registra o service worker (cache offline do app). Só em produção. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* PWA é um extra: falha silenciosa não impede o jogo */
    });
  });
}
