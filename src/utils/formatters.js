/**
 * formatters.js — Utility helpers for formatting strings, dates, and statuses.
 */

import { STATUS, CADRE_DISPLAY_NAMES } from './constants';

/**
 * Format date string into readable local format.
 * @param {string|Date} dateVal - Date value to format
 * @returns {string} Formatted date (e.g., "12 Dec 2026")
 */
export function formatDate(dateVal) {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return 'N/A';
  }
}

/**
 * Format date-time into readable format.
 * @param {string|Date} dateVal - Date value to format
 * @returns {string} Formatted date-time (e.g., "12 Dec 2026, 04:30 PM")
 */
export function formatDateTime(dateVal) {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return 'N/A';
  }
}

/**
 * Format raw cadre key (e.g. "AO_to_ADA") to human-readable.
 * @param {string} cadreKey - The raw key
 * @returns {string} Formatted string
 */
export function formatCadreName(cadreKey) {
  if (!cadreKey) return '';
  if (CADRE_DISPLAY_NAMES[cadreKey]) {
    return CADRE_DISPLAY_NAMES[cadreKey];
  }
  // Fallback: replace underscores with spaces/arrows
  return cadreKey.replace(/_/g, ' ').replace(/\bto\b/gi, '→');
}

/**
 * Get CSS-class or color mapping for statuses.
 * @param {string} status - Step status
 * @returns {string} class modifier
 */
export function getStatusClass(status) {
  switch (status) {
    case STATUS.COMPLETED:
      return 'completed';
    case STATUS.IN_PROGRESS:
      return 'in-progress';
    case STATUS.NOT_STARTED:
    default:
      return 'not-started';
  }
}

/**
 * Truncate long text strings.
 * @param {string} text - String to truncate
 * @param {number} maxLen - Maximum characters
 * @returns {string} Truncated string
 */
export function truncateText(text, maxLen = 60) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}

/**
 * Generate a random short ID.
 * @returns {string} Unique ID string
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}
