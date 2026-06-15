/**
 * Admin API service for DPC Promotion Tracker.
 * Handles department management and user administration.
 * These endpoints require super-admin or admin role.
 */

import { apiGet, apiPost } from './api';

// ─── Department Management ──────────────────────────────────────────────────────

/**
 * Fetch all registered departments.
 *
 * @returns {Promise<Object>} Array of department records with id, name, status
 */
export function fetchDepartments() {
  return apiGet('getDepartments');
}

/**
 * Add a new department to the system.
 *
 * @param {string} name - Display name for the department
 * @returns {Promise<Object>} The created department record
 */
export function addDepartment(name) {
  return apiPost('addDepartment', { name });
}

/**
 * Toggle a department's active/inactive status.
 *
 * @param {string} deptId - The department identifier to toggle
 * @returns {Promise<Object>} Updated department record with new status
 */
export function toggleDepartment(deptId) {
  return apiPost('toggleDepartment', { deptId });
}

// ─── User Management ────────────────────────────────────────────────────────────

/**
 * Fetch all users for a specific department.
 *
 * @param {string} deptId - The department identifier
 * @returns {Promise<Object>} Array of user records with email, name, role
 */
export function fetchUsers(deptId) {
  return apiGet('getUsers', { deptId });
}

/**
 * Add a new user to the system.
 *
 * @param {string} email - User's email address (must be Google account)
 * @param {string} name - User's display name
 * @param {string} role - User role: 'viewer', 'editor', 'admin', 'super_admin'
 * @param {string} [deptId] - Optional department to assign the user to
 * @returns {Promise<Object>} The created user record
 */
export function addUser(email, name, role, deptId, password) {
  const payload = { email, name, role, password };
  if (deptId) payload.deptId = deptId;
  return apiPost('addUser', payload);
}

/**
 * Update an existing user's role.
 *
 * @param {string} email - The user's email address
 * @param {string} newRole - The new role to assign: 'viewer', 'editor', 'admin', 'super_admin'
 * @returns {Promise<Object>} Updated user record
 */
export function updateUserRole(email, newRole) {
  return apiPost('updateUserRole', { email, newRole });
}

/**
 * Remove a user from the system.
 *
 * @param {string} email - The email address of the user to remove
 * @returns {Promise<Object>} Deletion confirmation
 */
export function removeUser(email) {
  return apiPost('removeUser', { email });
}

const adminService = {
  fetchDepartments,
  addDepartment,
  toggleDepartment,
  fetchUsers,
  addUser,
  updateUserRole,
  removeUser
};

export default adminService;
