/**
 * DocumentList.jsx — list of uploaded documents with links and delete actions.
 */
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { listDocuments, deleteDocument } from '../../services/documentService';
import { useUiStore } from '../../store/useUiStore';
import { formatDate } from '../../utils/formatters';

export default function DocumentList({ year, cadre, stepName, refreshTrigger }) {
  const { role } = useAuthStore();
  const { showToast } = useUiStore();
  const [docs, setDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Read-only logic: viewer role cannot delete
  const isReadOnly = role === 'viewer';

  useEffect(() => {
    let active = true;
    const fetchDocs = async () => {
      setIsLoading(true);
      try {
        const data = await listDocuments(year, cadre, stepName);
        if (active) {
          setDocs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to list files:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchDocs();
    return () => {
      active = false;
    };
  }, [year, cadre, stepName, refreshTrigger]);

  const handleDelete = async (fileId, fileName) => {
    const confirm = window.confirm(`Are you sure you want to delete "${fileName}"? This cannot be undone.`);
    if (!confirm) return;

    try {
      await deleteDocument(fileId);
      showToast('success', 'Document deleted.');
      setDocs(prev => prev.filter(d => d.File_ID !== fileId));
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to delete file.');
    }
  };

  if (isLoading) {
    return <div className="document-list__loading">Loading documents...</div>;
  }

  if (docs.length === 0) {
    return (
      <div className="document-list__empty">
        <span className="document-list__empty-icon">📁</span>
        <span className="document-list__empty-text">No documents uploaded yet.</span>
      </div>
    );
  }

  return (
    <div className="document-list">
      {docs.map((doc) => (
        <div key={doc.File_ID || doc.File_Url} className="document-item animate-fadeIn">
          <div className="document-item__info">
            <span className="document-item__icon">📄</span>
            <div className="document-item__details">
              <a
                href={doc.File_Url}
                target="_blank"
                rel="noopener noreferrer"
                className="document-item__name"
              >
                {doc.File_Name}
              </a>
              <span className="document-item__meta">
                Uploaded: {formatDate(doc.Created_Date)} {doc.Uploaded_By ? `by ${doc.Uploaded_By}` : ''}
              </span>
            </div>
          </div>
          <div className="document-item__actions">
            <a
              href={doc.File_Url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ marginRight: '0.5rem' }}
            >
              View
            </a>
            {!isReadOnly && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(doc.File_ID, doc.File_Name)}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
