/**
 * api.js — Core API service for DPC Tracker
 * Wraps fetch calls to the Google Apps Script Web App backend.
 */

const API_BASE_URL = import.meta.env.VITE_GAS_URL || import.meta.env.VITE_API_URL || '';

/**
 * Get the auth token from localStorage.
 */
function getToken() {
  return localStorage.getItem('dpc-auth-token') || '';
}

/**
 * Perform a GET request to the Apps Script backend.
 * @param {string} action - The action name (routed in doGet).
 * @param {Object} [params={}] - Additional query parameters.
 * @returns {Promise<Object>} Parsed response data.
 */
export async function apiGet(action, params = {}) {
  if (!API_BASE_URL) {
    throw new Error('API Base URL is not configured. Please set VITE_GAS_URL in your .env file.');
  }

  const token = getToken();
  const query = new URLSearchParams({ action, token, ...params });
  const url = `${API_BASE_URL}?${query.toString()}`;

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });
  } catch (netErr) {
    console.error('Network Error:', netErr);
    throw new Error('Network connection error. Please verify your internet connection and that the API server is reachable.');
  }

  let text;
  try {
    text = await res.text();
  } catch (err) {
    throw new Error('Failed to read response from backend.');
  }

  let json;
  try {
    if (!text) {
      throw new Error('Empty response');
    }
    json = JSON.parse(text);
  } catch (err) {
    console.error('API Parse Error. Raw response:', text);
    throw new Error('Failed to parse response from backend. This usually indicates your Google Apps Script is not deployed correctly or permission is denied. Please ensure the Web App is deployed with "Execute as: Me" and "Who has access: Anyone".');
  }

  if (!json.success) {
    throw new Error(json.error || 'API request failed');
  }

  return json.data;
}

/**
 * Perform a POST request to the Apps Script backend.
 * @param {string} action - The action name (routed in doPost).
 * @param {Object} [body={}] - Request body fields.
 * @returns {Promise<Object>} Parsed response data.
 */
export async function apiPost(action, body = {}) {
  if (!API_BASE_URL) {
    throw new Error('API Base URL is not configured. Please set VITE_GAS_URL in your .env file.');
  }

  const token = getToken();

  let res;
  try {
    res = await fetch(API_BASE_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, token, ...body }),
    });
  } catch (netErr) {
    console.error('Network Error:', netErr);
    throw new Error('Network connection error. Please verify your internet connection and that the API server is reachable.');
  }

  let text;
  try {
    text = await res.text();
  } catch (err) {
    throw new Error('Failed to read response from backend.');
  }

  let json;
  try {
    if (!text) {
      throw new Error('Empty response');
    }
    json = JSON.parse(text);
  } catch (err) {
    console.error('API Parse Error. Raw response:', text);
    throw new Error('Failed to parse response from backend. This usually indicates your Google Apps Script is not deployed correctly or permission is denied. Please ensure the Web App is deployed with "Execute as: Me" and "Who has access: Anyone".');
  }

  if (!json.success) {
    throw new Error(json.error || 'API request failed');
  }

  return json.data;
}

/**
 * Convert a File object to a Base64 data URL string.
 * @param {File} file - File to convert
 * @returns {Promise<string>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });
}
