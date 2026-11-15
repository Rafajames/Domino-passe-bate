import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No GitHub Pages o app fica em /<repo>/; na Vercel, na raiz.
const base = process.env.PAGES_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
} as never);
