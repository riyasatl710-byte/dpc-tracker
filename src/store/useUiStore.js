/**
 * useUiStore.js — Unified UI state (Zustand)
 */
import { create } from 'zustand';

let toastId = 0;

export const useUiStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────────────────────────────────
  sidebarOpen: true,
  toasts: [],
  activeModal: null,
  modalData: null,

  // ─── Actions ────────────────────────────────────────────────────────────────
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: Boolean(open) }),

  /**
   * Show a toast notification.
   * Supports both signatures:
   *   1. showToast(type, message, duration)
   *   2. showToast(message, type, duration)
   */
  showToast: (arg1, arg2, duration = 4000) => {
    const types = ['success', 'error', 'warning', 'info'];
    let type = 'info';
    let message = '';

    if (types.includes(arg1)) {
      type = arg1;
      message = arg2;
    } else {
      message = arg1;
      type = arg2 || 'info';
    }

    const id = ++toastId;
    const toast = { id, type, message };

    set((s) => ({ toasts: [...s.toasts, toast] }));

    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }

    return id;
  },

  dismissToast: (id) => {
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    }));
  },

  dismissAllToasts: () => set({ toasts: [] }),

  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),

  closeModal: () => set({ activeModal: null, modalData: null }),
}));
