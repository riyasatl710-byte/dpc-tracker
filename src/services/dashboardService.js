/**
 * Dashboard API service for DPC Promotion Tracker.
 * Handles dashboard data, step tracking, vacancies, and baselines.
 */

import { apiGet, apiPost } from './api';

/**
 * Fetch the main dashboard overview for a given year.
 * Returns cadre-wise step completion status, vacancy data, etc.
 *
 * @param {number} year - The promotion year to fetch data for
 * @returns {Promise<Object>} Dashboard data with cadre summaries
 */
export function fetchDashboard(year) {
  return apiGet('getDashboard', { year });
}

/**
 * Fetch detailed step logs for a specific cadre in a given year.
 * Returns the history of status changes, remarks, and timestamps.
 *
 * @param {number} year - The promotion year
 * @param {string} cadre - The cadre identifier (e.g., 'AO_to_ADA')
 * @returns {Promise<Object>} Step logs with status history
 */
export function fetchStepLogs(year, cadre) {
  return apiGet('getStepLogs', { year, cadre });
}

/**
 * Update the status of a specific step for a cadre.
 *
 * @param {number} year - The promotion year
 * @param {string} cadre - The cadre identifier
 * @param {string} stepName - Name of the step to update
 * @param {string} status - New status ('Not Started', 'In Progress', 'Completed', 'Delayed')
 * @param {string} [remarks=''] - Optional remarks for the status update
 * @returns {Promise<Object>} Updated step data
 */
export function updateStepStatus(year, cadre, stepName, status, remarks = '') {
  return apiPost('updateStepStatus', {
    year,
    cadre,
    stepName,
    status,
    remarks,
  });
}

/**
 * Update vacancy data for a cadre.
 * Supports passing either (rowId, estimatedVacancies) or an object with parameters.
 */
export function updateVacancies(rowIdOrObj, estimatedVacancies) {
  if (typeof rowIdOrObj === 'object') {
    return apiPost('updateVacancies', {
      rowId: rowIdOrObj.rowId,
      estimatedVacancies: rowIdOrObj.estimatedVacancies !== undefined ? rowIdOrObj.estimatedVacancies : rowIdOrObj.vacancies,
      cadre: rowIdOrObj.cadre,
      calendarYear: rowIdOrObj.year || rowIdOrObj.calendarYear
    });
  }
  return apiPost('updateVacancies', {
    rowId: rowIdOrObj,
    estimatedVacancies,
  });
}

/**
 * Update baseline data for a cadre.
 * Supports passing either (rowId, data) or an object with parameters.
 */
export function updateBaseline(rowIdOrObj, data) {
  if (typeof rowIdOrObj === 'object') {
    return apiPost('updateBaseline', {
      rowId: rowIdOrObj.rowId,
      cadre: rowIdOrObj.cadre,
      calendarYear: rowIdOrObj.year || rowIdOrObj.calendarYear,
      lastPromotedName: rowIdOrObj.officerName || rowIdOrObj.lastPromotedName,
      lastPromotedEmpID: rowIdOrObj.employeeId || rowIdOrObj.lastPromotedEmpID,
      lastPromotedSerialNo: rowIdOrObj.serialNumber || rowIdOrObj.lastPromotedSerialNo
    });
  }
  return apiPost('updateBaseline', {
    rowId: rowIdOrObj,
    ...data,
  });
}

/**
 * Initialize a new promotion year.
 */
export function initializeYear(year) {
  return apiPost('initializeYear', { year });
}

const dashboardService = {
  fetchDashboard,
  fetchStepLogs,
  updateStepStatus,
  updateVacancies,
  updateBaseline,
  initializeYear
};

export { dashboardService };
export default dashboardService;
