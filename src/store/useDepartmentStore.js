/**
 * useDepartmentStore.js — Department & Cadre state (Zustand)
 */
import { create } from 'zustand';
import { fetchDepartments as apiFetchDepartments } from '../services/adminService';
import { fetchCadres as apiFetchCadres } from '../services/workflowService';
import { fetchDashboard as apiFetchDashboard } from '../services/dashboardService';

function getCurrentYear() {
  return new Date().getFullYear();
}

export const useDepartmentStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────────────────────────────────
  departments: [],          // All available departments
  activeDepartment: null,   // Currently selected department { id, name, status }
  cadres: [],               // Available cadres for the active department (strings)
  activeYear: getCurrentYear(), // Selected promotion year
  dashboardData: null,      // Dashboard data for the active year (object keyed by cadre)
  isLoading: false,         // Loading state for async operations
  error: null,              // Last error message

  // ─── Actions ────────────────────────────────────────────────────────────────

  setDepartments: (departments) => set({ departments }),

  setCadres: (cadres) => set({ cadres }),

  fetchDepartments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetchDepartments();
      const departments = response || [];
      set({
        departments: Array.isArray(departments) ? departments : [],
        isLoading: false,
      });
      return departments;
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  setActiveDepartment: (dept) => {
    set({ activeDepartment: dept, dashboardData: null });
    if (dept) {
      get().fetchCadres();
    }
  },

  fetchCadres: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetchCadres();
      const cadres = response || [];
      set({
        cadres: Array.isArray(cadres) ? cadres : [],
        isLoading: false,
      });
      return cadres;
    } catch (err) {
      console.error('Failed to fetch cadres:', err);
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  setActiveYear: (year) => {
    const numYear = Number(year);
    if (isNaN(numYear) || numYear < 2000 || numYear > 2100) {
      console.warn('Invalid year:', year);
      return;
    }
    set({ activeYear: numYear, dashboardData: null });
    get().fetchDashboard();
  },

  fetchDashboard: async () => {
    const { activeYear } = get();
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetchDashboard(activeYear);
      const rows = response || [];

      // Map rows (array of cadre summaries) into an object keyed by Cadre
      const dashboardData = {};
      if (Array.isArray(rows)) {
        rows.forEach((row) => {
          if (row.Cadre) {
            dashboardData[row.Cadre] = row;
          }
        });
      }

      set({
        dashboardData,
        isLoading: false,
      });
      return dashboardData;
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  reset: () => {
    set({
      departments: [],
      activeDepartment: null,
      cadres: [],
      activeYear: getCurrentYear(),
      dashboardData: null,
      isLoading: false,
      error: null,
    });
  },
}));
