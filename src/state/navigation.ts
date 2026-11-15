import { create } from 'zustand';
import type { GameMode } from '../engine/rules/types';

export type Screen =
  | { name: 'home' }
  | { name: 'mode' }
  | { name: 'profiles'; mode: GameMode }
  | { name: 'editor'; mode: GameMode; profileId: string }
  | { name: 'setup'; profileId: string }
  | { name: 'game' }
  | { name: 'player' }
  | { name: 'online' }
  | { name: 'howto' }
  | { name: 'replay'; round?: number };

interface NavState {
  stack: Screen[];
  current: () => Screen;
  go: (screen: Screen) => void;
  replace: (screen: Screen) => void;
  back: () => void;
  reset: (screen?: Screen) => void;
}

/**
 * Navegação simples por pilha, integrada ao histórico do navegador para que o
 * botão "voltar" do Android funcione como esperado.
 */
export const useNav = create<NavState>((set, get) => ({
  stack: [{ name: 'home' }],
  current: () => get().stack[get().stack.length - 1] ?? { name: 'home' },
  go: (screen) => {
    set({ stack: [...get().stack, screen] });
    try {
      history.pushState({ depth: get().stack.length }, '');
    } catch {
      /* ambiente sem history */
    }
  },
  replace: (screen) => set({ stack: [...get().stack.slice(0, -1), screen] }),
  back: () => {
    if (get().stack.length > 1) history.back();
  },
  reset: (screen = { name: 'home' }) => set({ stack: [screen] }),
}));

export function installBackHandler(): void {
  window.addEventListener('popstate', () => {
    const { stack } = useNav.getState();
    if (stack.length > 1) useNav.setState({ stack: stack.slice(0, -1) });
  });
}
