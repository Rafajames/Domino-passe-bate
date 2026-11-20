import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// No GitHub Pages o app fica em /<repo>/; na Vercel, na raiz.
const base = process.env.PAGES_BASE ?? '/';

// Identificação da versão: commit no CI (GitHub Actions/Vercel) ou horário do build.
const builtAt = new Date().toISOString();
const sha = (process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7);
const version = sha || builtAt.replace(/\D/g, '').slice(0, 12);

/** Gera sw.js (com a versão embutida) e version.json, usado para detectar atualizações. */
function pwaVersion(): Plugin {
  return {
    name: 'pwa-version',
    apply: 'build',
    generateBundle() {
      const sw = readFileSync(new URL('./pwa/sw-template.js', import.meta.url), 'utf8').replace(/__BUILD__/g, version);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw });
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version, builtAt }) });
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), pwaVersion()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_BUILT_AT__: JSON.stringify(builtAt),
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
} as never);
