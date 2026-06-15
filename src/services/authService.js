/**
 * Authentication service for DPC Promotion Tracker.
 * Handles Email/Password sign-in and session verification.
 */

import { apiPost } from './api';

/**
 * Log in with user ID / email and password.
 *
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Response containing token and user profile
 * @throws {Error} If login fails
 */
export async function loginWithCredentials(email, password) {
  const response = await apiPost('login', { email, password });
  return response; // will contain { token, user }
}

/**
 * Verify the session token with the backend.
 * The backend validates the cached session and returns user profile + role info.
 *
 * @param {string} token - The session UUID token to verify
 * @returns {Promise<Object>} User profile from backend: { email, name, role, departmentId, departmentName }
 * @throws {Error} If verification fails
 */
export async function verifyTokenWithBackend(token) {
  const response = await apiPost('verifyUser', { token });
  return response; // returns user profile
}

/**
 * Sign out the user. Clears the session locally.
 */
export function signOut() {
  // Clear persisted auth data
  localStorage.removeItem('dpc-auth-token');
  localStorage.removeItem('dpc-auth-user');
}

/**
 * Check if there's an existing valid session in localStorage.
 *
 * @returns {Object|null} Stored session data or null
 */
export function getStoredSession() {
  try {
    const token = localStorage.getItem('dpc-auth-token');
    const userStr = localStorage.getItem('dpc-auth-user');

    if (!token || !userStr) return null;

    const user = JSON.parse(userStr);
    return { token, user };
  } catch {
    return null;
  }
}

/**
 * Persist session data to localStorage.
 *
 * @param {string} token - The auth token
 * @param {Object} user - The user profile object
 */
export function persistSession(token, user) {
  localStorage.setItem('dpc-auth-token', token);
  localStorage.setItem('dpc-auth-user', JSON.stringify(user));
}
