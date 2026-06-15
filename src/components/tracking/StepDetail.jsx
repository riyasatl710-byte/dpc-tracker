/**
 * StepDetail.jsx — Action card to modify step state, remarks, and documents.
 */
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUiStore } from '../../store/useUiStore';
import DocumentList from '../documents/DocumentList';
import DocumentUpload from '../documents/DocumentUpload';
import { formatDateTime } from '../../utils/formatters';

export default function StepDetail({ step, cadre, year, onStatusChange }) {
  const { role } = useAuthStore();
  const { showToast } = useUiStore();

  const [remarks, setRemarks] = useState('');
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [docRefreshTrigger, setDocRefreshTrigger] = useState(0);

  // Update remarks state when step changes
  useEffect(() => {
    setRemarks(step?.Remarks || '');
  }, [step]);

  if (!step) return null;

  // Dealing Assistant ('editor'), Admin ('admin'), or Super Admin can edit
  const isReadOnly = role === 'viewer';

  const handleSaveRemarks = async () => {
    setSavingRemarks(true);
    const success = await onStatusChange(step.Step_Name, step.Status, remarks);
    setSavingRemarks(false);
    if (success) {
      showToast('success', 'Remarks updated successfully.');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (newStatus === step.Status) return;

    // Confirm completion
    if (newStatus === 'Completed') {
      const confirm = window.confirm(`Are you sure you want to mark "${step.Step_Name}" as Completed? This will record the current timestamp.`);
      if (!confirm) return;
    }

    setUpdatingStatus(true);
    const success = await onStatusChange(step.Step_Name, newStatus, remarks);
    setUpdatingStatus(false);
    if (success) {
      showToast('success', `Step status updated to "${newStatus}".`);
    }
  };

  const handleUploadComplete = () => {
    setDocRefreshTrigger(prev => prev + 1);
    showToast('success', 'Document uploaded successfully.');
  };

  return (
    <div className="step-detail card animate-fadeIn">
      <div className="step-detail__header">
        <h3 className="step-detail__title">{step.Step_Name}</h3>
        <span className="step-detail__order-badge">Step {step.Step_Order}</span>
      </div>

      <div className="step-detail__section">
        <h4 className="step-detail__section-title">Milestone Status</h4>
        <div className="step-detail__status-actions">
          {['Not Started', 'In Progress', 'Completed'].map((statusOption) => {
            const isActive = step.Status === statusOption;
            let btnClass = 'btn-ghost';
            if (isActive) {
              if (statusOption === 'Completed') btnClass = 'btn-success';
              else if (statusOption === 'In Progress') btnClass = 'btn-warning';
              else btnClass = 'btn-secondary';
            }

            return (
              <button
                key={statusOption}
                className={`btn ${btnClass}`}
                disabled={isReadOnly || updatingStatus}
                onClick={() => handleUpdateStatus(statusOption)}
              >
                {isActive ? '✓ ' : ''}{statusOption}
              </button>
            );
          })}
        </div>

        {step.Completion_Date && (
          <p className="step-detail__timestamp">
            Completed on: <strong>{formatDateTime(step.Completion_Date)}</strong>
          </p>
        )}
      </div>

      <div className="step-detail__section">
        <h4 className="step-detail__section-title">Remarks & Notes</h4>
        <textarea
          className="textarea"
          rows={3}
          placeholder="Enter audit logs, letters sent, official remarks or progress notes here..."
          value={remarks}
          disabled={isReadOnly || savingRemarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
        {!isReadOnly && (
          <button
            className="btn btn-primary btn-sm"
            disabled={savingRemarks || remarks === (step.Remarks || '')}
            onClick={handleSaveRemarks}
            style={{ marginTop: '0.5rem' }}
          >
            {savingRemarks ? 'Saving...' : 'Save Remarks'}
          </button>
        )}
      </div>

      <div className="step-detail__section">
        <h4 className="step-detail__section-title">Associated Files & Documents</h4>
        {/* Drive files list */}
        <DocumentList
          year={year}
          cadre={cadre}
          stepName={step.Step_Name}
          refreshTrigger={docRefreshTrigger}
        />

        {/* Upload tool (hidden for read-only observers) */}
        {!isReadOnly && (
          <div style={{ marginTop: '1.25rem' }}>
            <DocumentUpload
              year={year}
              cadre={cadre}
              stepName={step.Step_Name}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        )}
      </div>
    </div>
  );
}
