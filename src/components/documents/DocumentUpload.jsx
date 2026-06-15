/**
 * DocumentUpload.jsx — Drag-and-drop zone and uploader for supporting DPC documents.
 */
import React, { useState, useRef } from 'react';
import { uploadDocument } from '../../services/documentService';

export default function DocumentUpload({ year, cadre, stepName, onUploadComplete }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      await uploadDocument(file, year, cadre, stepName);
      setFile(null);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="document-upload">
      <input
        ref={fileInputRef}
        type="file"
        className="document-upload__input"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
      />

      <div
        className={`document-upload__drop-zone ${isDragActive ? 'document-upload__drop-zone--active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        {file ? (
          <div className="document-upload__file-info" onClick={(e) => e.stopPropagation()}>
            <span className="document-upload__file-icon">📄</span>
            <div>
              <p className="document-upload__file-name">{file.name}</p>
              <p className="document-upload__file-size">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              className="document-upload__remove-btn"
              onClick={() => setFile(null)}
              disabled={isUploading}
            >
              &times;
            </button>
          </div>
        ) : (
          <div className="document-upload__prompt">
            <span className="document-upload__upload-icon">📤</span>
            <p className="document-upload__text">Drag & drop your file here, or <span className="document-upload__browse-link">browse</span></p>
            <p className="document-upload__formats">Supports PDF, Word, Excel, Images (Max 10MB)</p>
          </div>
        )}
      </div>

      {file && (
        <button
          className="btn btn-primary btn-sm"
          onClick={handleUpload}
          disabled={isUploading}
          style={{ width: '100%', marginTop: '0.75rem' }}
        >
          {isUploading ? 'Uploading to Google Drive...' : 'Upload File'}
        </button>
      )}

      {error && (
        <div className="login-page__error" style={{ marginTop: '0.5rem' }}>
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
