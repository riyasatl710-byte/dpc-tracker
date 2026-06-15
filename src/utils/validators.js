/**
 * validators.js — Form validation helpers.
 */

/**
 * Validates if a field value is non-empty.
 * @param {*} value - Field value
 * @param {string} fieldName - Display name of the field
 * @returns {string|null} Error message or null if valid
 */
export function validateRequired(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return `${fieldName} is required.`;
  }
  return null;
}

/**
 * Validates if value is a positive integer.
 * @param {*} value - Field value
 * @param {string} fieldName - Display name of the field
 * @returns {string|null} Error message or null if valid
 */
export function validatePositiveInteger(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num < 0) {
    return `${fieldName} must be a valid positive whole number.`;
  }
  return null;
}

/**
 * Validates email address format.
 * @param {string} email - Email value
 * @returns {string|null} Error message or null if valid
 */
export function validateEmail(email) {
  if (!email) return 'Email is required.';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(String(email).toLowerCase())) {
    return 'Please enter a valid email address.';
  }
  return null;
}

/**
 * Validates year format (4-digit range).
 * @param {number|string} year - Year value
 * @returns {string|null} Error message or null if valid
 */
export function validateYear(year) {
  const y = Number(year);
  if (isNaN(y) || !Number.isInteger(y) || y < 2000 || y > 2100) {
    return 'Year must be a valid calendar year between 2000 and 2100.';
  }
  return null;
}
