/**
 * authStore.js — Zustand store for authentication state
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,          // 'SuperAdmin' | 'Admin' | 'Editor' | 'ReadOnly'
      departmentId: null,
      departmentName: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: ({ user, token, role, departmentId, departmentName }) =>
        set({
          user,
          token,
          role,
          departmentId,
          departmentName,
          isAuthenticated: true,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () =>
        set({
          user: null,
          token: null,
          role: null,
          departmentId: null,
          departmentName: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: 'dpc-auth-storage',
    }
  )
);

export default useAuthStore;
