/**
 * uiStore.js — Zustand store for UI state (sidebar, toasts, modals)
 */
import { create } from 'zustand';

let toastIdCounter = 0;

const useUiStore = create((set, get) => ({
  sidebarOpen: true,
  toasts: [],
  activeModal: null,
  modalData: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  /**
   * Show a toast notification
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} message
   * @param {number} [duration=4000]
   */
  showToast: (type, message, duration = 4000) => {
    const id = ++toastIdCounter;
    set((s) => ({
      toasts: [...s.toasts, { id, type, message }],
    }));
    setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  dismissToast: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),

  openModal: (modalName, data = null) =>
    set({ activeModal: modalName, modalData: data }),

  closeModal: () => set({ activeModal: null, modalData: null }),
}));

export default useUiStore;
