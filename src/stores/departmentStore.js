/**
 * departmentStore.js — Zustand store for department & cadre state
 */
import { create } from 'zustand';
import { dashboardService } from '../services/dashboardService';

/**
 * @typedef {Object} StepData
 * @property {string} name
 * @property {'Not Started'|'In Progress'|'Completed'} status
 * @property {string} [startedDate]
 * @property {string} [completedDate]
 * @property {string} [remarks]
 * @property {Array} [documents]
 */

/**
 * @typedef {Object} CadreData
 * @property {string} cadre - e.g. "AO_to_ADA"
 * @property {string} displayName - e.g. "AO → ADA"
 * @property {number} vacancies
 * @property {string} lastPromotedOfficer
 * @property {string} overallStatus
 * @property {StepData[]} steps
 */

const useDepartmentStore = create((set, get) => ({
  /* ─── State ──────────────────────────────────── */
  departments: [],
  activeDepartment: null,
  cadres: [],
  dashboardData: [],
  activeYear: new Date().getFullYear(),
  isLoading: false,
  error: null,

  // Step tracking state
  stepLogs: [],
  stepLogsLoading: false,
  stepLogsError: null,

  /* ─── Actions ────────────────────────────────── */
  setActiveYear: (year) => {
    set({ activeYear: year });
  },

  setActiveDepartment: (dept) => {
    set({ activeDepartment: dept });
  },

  /**
   * Fetch the master dashboard for the current year
   */
  fetchDashboard: async () => {
    const { activeYear } = get();
    set({ isLoading: true, error: null });
    try {
      const data = await dashboardService.getMasterDashboard({ year: activeYear });
      set({
        dashboardData: Array.isArray(data) ? data : data?.cadres || [],
        isLoading: false,
      });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  /**
   * Fetch step logs for a specific cadre
   */
  fetchStepLogs: async (cadre) => {
    const { activeYear } = get();
    set({ stepLogsLoading: true, stepLogsError: null });
    try {
      const data = await dashboardService.getStepLogs({ cadre, year: activeYear });
      set({
        stepLogs: Array.isArray(data) ? data : data?.steps || [],
        stepLogsLoading: false,
      });
    } catch (err) {
      set({ stepLogsError: err.message, stepLogsLoading: false });
    }
  },

  /**
   * Update a step's status for a given cadre
   */
  updateStepStatus: async (cadre, stepName, status) => {
    const { activeYear } = get();
    const result = await dashboardService.updateStepStatus({
      cadre,
      stepName,
      status,
      year: activeYear,
    });
    // Re-fetch step logs to stay in sync
    await get().fetchStepLogs(cadre);
    return result;
  },

  /**
   * Clear errors
   */
  clearError: () => set({ error: null, stepLogsError: null }),
}));

export default useDepartmentStore;
