import { create } from 'zustand';

interface ToastState {
  message: string | null;
  show: (m: string) => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    if (timer) clearTimeout(timer);
    set({ message });
    timer = setTimeout(() => set({ message: null }), 2800);
  },
}));

export const useToast = () => useToastStore((s) => s.show);

export function ToastHost() {
  const message = useToastStore((s) => s.message);
  return (
    <div aria-live="polite" role="status">
      {message && <div className="toast">{message}</div>}
    </div>
  );
}
