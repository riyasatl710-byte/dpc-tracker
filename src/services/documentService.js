/**
 * Document management API service for DPC Promotion Tracker.
 * Handles file uploads, listing, and deletion of supporting documents.
 */

import { apiGet, apiPost, fileToBase64 } from './api';

/**
 * Maximum file size allowed for upload (10 MB).
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed MIME types for document uploads.
 */
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

/**
 * Validate a file before upload.
 *
 * @param {File} file - The file to validate
 * @throws {Error} If validation fails
 */
function validateFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File size (${sizeMB} MB) exceeds the maximum allowed size of 10 MB`);
  }

  if (ALLOWED_TYPES.length > 0 && !ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `File type "${file.type || 'unknown'}" is not supported. ` +
      'Allowed types: PDF, JPEG, PNG, GIF, DOC, DOCX, XLS, XLSX, TXT'
    );
  }
}

/**
 * Upload a document to the backend.
 * Converts the file to base64 and sends it as part of the POST body.
 *
 * @param {File} file - The File object to upload
 * @param {number} year - The promotion year
 * @param {string} cadre - The cadre identifier
 * @param {string} stepName - The step this document belongs to
 * @returns {Promise<Object>} Upload result with file ID and metadata
 * @throws {Error} If file validation or upload fails
 */
export async function uploadDocument(file, year, cadre, stepName) {
  validateFile(file);

  const base64Data = await fileToBase64(file);

  return apiPost('uploadDocument', {
    year,
    cadre,
    stepName,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    fileData: base64Data,
  });
}

/**
 * List all documents for a given year, cadre, and optionally a specific step.
 *
 * @param {number} year - The promotion year
 * @param {string} cadre - The cadre identifier
 * @param {string} [stepName] - Optional step name to filter documents
 * @returns {Promise<Object>} Array of document records with metadata
 */
export function listDocuments(year, cadre, stepName) {
  const params = { year, cadre };
  if (stepName) {
    params.stepName = stepName;
  }
  return apiGet('listDocuments', params);
}

/**
 * Delete a document by its file ID.
 *
 * @param {string} fileId - The unique identifier of the file to delete
 * @returns {Promise<Object>} Deletion confirmation
 */
export function deleteDocument(fileId) {
  return apiPost('deleteDocument', { fileId });
}

const documentService = {
  uploadDocument,
  listDocuments,
  deleteDocument
};

export default documentService;
