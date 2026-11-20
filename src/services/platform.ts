/**
 * Diferenças entre o jogo no navegador e dentro do app Android (Capacitor).
 * No app, o Capacitor injeta `window.Capacitor` antes do nosso código rodar.
 */
type CapacitorGlobal = { isNativePlatform?: () => boolean };

export function isNativeApp(): boolean {
  const cap = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * Endereço público do jogo na web (ex.: https://meu-jogo.vercel.app/), usado nos links de convite.
 * No navegador é o próprio site; no app vem de VITE_PUBLIC_URL, ou fica vazio (convite só com o código).
 */
export function publicBaseUrl(): string | null {
  const configured = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim();
  if (configured) return configured.endsWith('/') ? configured : `${configured}/`;
  if (isNativeApp()) return null;
  return `${location.origin}${import.meta.env.BASE_URL}`;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled';

/**
 * Abre o menu de compartilhar do sistema (WhatsApp etc.). No app usa o plugin nativo,
 * porque o WebView do Android não tem `navigator.share`. Sem menu, copia o texto.
 */
export async function shareText(opts: { title: string; text: string; url?: string }): Promise<ShareResult> {
  if (isNativeApp()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  if (navigator.share) {
    try {
      await navigator.share(opts);
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(opts.url ? `${opts.text}\n${opts.url}` : opts.text);
  return 'copied';
}
