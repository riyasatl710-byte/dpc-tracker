/**
 * Workflow configuration API service for DPC Promotion Tracker.
 * Handles cadre definitions and step workflow management.
 */

import { apiGet, apiPost } from './api';

/**
 * Fetch the workflow (ordered list of steps) for a specific cadre.
 *
 * @param {string} cadre - The cadre identifier (e.g., 'AO_to_ADA')
 * @returns {Promise<Object>} Workflow steps with order numbers and metadata
 */
export function fetchWorkflow(cadre) {
  return apiGet('getWorkflowConfig', { cadre });
}

/**
 * Fetch the list of all available cadres.
 *
 * @returns {Promise<Object>} Array of cadre definitions with names and identifiers
 */
export function fetchCadres() {
  return apiGet('getCadres');
}

/**
 * Add a new step to a cadre's workflow.
 *
 * @param {string} cadre - The cadre identifier
 * @param {string} stepName - Display name for the new step
 * @param {number} orderNo - Position in the workflow sequence
 * @returns {Promise<Object>} The created step record
 */
export function addStep(cadre, stepName, orderNo) {
  return apiPost('addStep', {
    cadre,
    stepName,
    orderNo,
  });
}

/**
 * Delete a step from a cadre's workflow.
 *
 * @param {string} cadre - The cadre identifier
 * @param {string} stepName - Name of the step to remove
 * @returns {Promise<Object>} Deletion confirmation
 */
export function deleteStep(cadre, stepName) {
  return apiPost('deleteStep', {
    cadre,
    stepName,
  });
}

/**
 * Reorder the steps in a cadre's workflow.
 * Accepts a new ordered list of step names that defines the new sequence.
 *
 * @param {string} cadre - The cadre identifier
 * @param {string[]} newOrder - Array of step names in the desired order
 * @returns {Promise<Object>} Updated workflow
 */
export function reorderSteps(cadre, newOrder) {
  return apiPost('reorderSteps', {
    cadre,
    newOrder,
  });
}

/**
 * Add a new cadre to the system.
 *
 * @param {string} cadreName - Display name for the new cadre (e.g., 'AO to ADA')
 * @returns {Promise<Object>} The created cadre record
 */
export function addCadre(cadreName) {
  return apiPost('addCadre', {
    cadreName,
  });
}

/**
 * Delete a cadre and all its associated workflow steps.
 *
 * @param {string} cadreName - Name of the cadre to remove
 * @returns {Promise<Object>} Deletion confirmation
 */
export function deleteCadre(cadreName) {
  return apiPost('deleteCadre', {
    cadreName,
  });
}

const workflowService = {
  fetchWorkflow,
  fetchCadres,
  addStep,
  deleteStep,
  reorderSteps,
  addCadre,
  deleteCadre
};

export default workflowService;
