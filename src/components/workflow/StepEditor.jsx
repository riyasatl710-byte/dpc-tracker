/**
 * StepEditor.jsx — Modal form to create or edit a workflow step.
 */
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

export default function StepEditor({ isOpen, onClose, onSave, existingSteps = [] }) {
  const [stepName, setStepName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStepName('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmed = stepName.trim();
    if (!trimmed) {
      setError('Step name cannot be empty.');
      return;
    }

    // Check uniqueness
    const exists = existingSteps.some(
      (s) => s.Step_Name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setError('A step with this name already exists in this cadre.');
      return;
    }

    onSave(trimmed);
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
      <button className="btn btn-secondary" type="button" onClick={onClose}>
        Cancel
      </button>
      <button className="btn btn-primary" type="button" onClick={handleSubmit}>
        Add Step
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Workflow Step" footer={footer} size="sm">
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="new-step-name">
            Step Name / Milestone Label:
          </label>
          <input
            id="new-step-name"
            className={`input ${error ? 'input--error' : ''}`}
            type="text"
            placeholder="e.g. Integrity Certificate Collection"
            value={stepName}
            onChange={(e) => {
              setStepName(e.target.value);
              setError('');
            }}
            autoFocus
          />
          {error && <span className="form-error">{error}</span>}
        </div>
      </form>
    </Modal>
  );
}
