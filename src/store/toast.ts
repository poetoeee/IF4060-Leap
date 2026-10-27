import { create } from 'zustand';

export interface Toast {
  id: number;
  title: string;
  message?: string;
  undo?: () => void;
}

interface ToastState {
  toast: Toast | null;
  show: (t: Omit<Toast, 'id'>) => void;
  dismiss: () => void;
}

const DURATION_MS = 5000;
let timer = 0;
let nextId = 0;

export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (t) => {
    clearTimeout(timer);
    set({ toast: { ...t, id: nextId++ } });
    timer = window.setTimeout(() => set({ toast: null }), DURATION_MS);
  },
  dismiss: () => {
    clearTimeout(timer);
    set({ toast: null });
  },
}));
