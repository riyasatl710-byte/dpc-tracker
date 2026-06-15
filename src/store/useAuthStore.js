/**
 * useAuthStore.js — Unified Authentication store for DPC Tracker.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginWithCredentials, verifyTokenWithBackend, signOut as authSignOut, getStoredSession, persistSession } from '../services/authService';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // ─── State ──────────────────────────────────────────────────────────────────
      user: null,           // { email, name, picture, sub }
      token: '',            // Google ID token
      role: '',             // 'viewer' | 'editor' | 'admin' | 'super_admin'
      departmentId: '',     // Assigned department ID
      departmentName: '',   // Assigned department display name
      isAuthenticated: false,
      isLoading: false,

      // ─── Simple Actions ────────────────────────────────────────────────────────
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

      logout: () => {
        authSignOut();
        set({
          user: null,
          token: '',
          role: '',
          departmentId: '',
          departmentName: '',
          isAuthenticated: false,
          isLoading: false,
        });
      },

      // ─── API Actions ──────────────────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await loginWithCredentials(email, password);
          const { token, user } = response;

          // Persist session
          persistSession(token, user);

          set({
            user: {
              email: user.email,
              name: user.name,
            },
            token: token,
            role: user.role,
            departmentId: user.departmentId,
            departmentName: user.departmentName,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          console.error('Login failed:', err);
          get().logout();
          throw err;
        }
      },

      checkExistingSession: async () => {
        set({ isLoading: true });
        try {
          const session = getStoredSession();
          if (!session) {
            set({ isLoading: false });
            return;
          }

          const { token, user } = session;

          // Re-verify with backend to fetch fresh role/dept
          let profile = user;
          try {
            const backendResponse = await verifyTokenWithBackend(token);
            profile = {
              ...user,
              role: backendResponse.role || user.role || 'viewer',
              departmentId: backendResponse.departmentId || user.departmentId || '',
              departmentName: backendResponse.departmentName || user.departmentName || '',
            };
            persistSession(token, profile);
          } catch (err) {
            console.warn('Backend verification failed during checkExistingSession, using cached session:', err);
          }

          set({
            user: {
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
            },
            token,
            role: profile.role,
            departmentId: profile.departmentId,
            departmentName: profile.departmentName,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          console.error('Session check failed:', err);
          get().logout();
        }
      }
    }),
    { name: 'dpc-auth-storage' }
  )
);
