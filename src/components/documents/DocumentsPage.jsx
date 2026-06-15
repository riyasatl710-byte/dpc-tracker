/**
 * DocumentsPage.jsx — Container page to search and manage documents across cadres.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useDepartmentStore } from '../../store/useDepartmentStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUiStore } from '../../store/useUiStore';
import DocumentList from './DocumentList';
import DocumentUpload from './DocumentUpload';
import { fetchStepLogs } from '../../services/dashboardService';
import { formatCadreName } from '../../utils/formatters';
import LoadingSpinner from '../common/LoadingSpinner';

export default function DocumentsPage() {
  const { cadres, activeYear } = useDepartmentStore();
  const { role } = useAuthStore();
  const { showToast } = useUiStore();

  const [activeCadre, setActiveCadre] = useState('');
  const [steps, setSteps] = useState([]);
  const [activeStep, setActiveStep] = useState('');
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Set initial active cadre
  useEffect(() => {
    if (cadres.length > 0 && !activeCadre) {
      setActiveCadre(cadres[0]);
    }
  }, [cadres, activeCadre]);

  const loadSteps = useCallback(async () => {
    if (!activeCadre) return;
    setLoadingSteps(true);
    try {
      const logs = await fetchStepLogs(activeYear, activeCadre);
      if (Array.isArray(logs)) {
        setSteps(logs);
        if (logs.length > 0) {
          setActiveStep(logs[0].Step_Name);
        } else {
          setActiveStep('');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load steps.');
    } finally {
      setLoadingSteps(false);
    }
  }, [activeCadre, activeYear, showToast]);

  // Load steps when active cadre changes
  useEffect(() => {
    loadSteps();
  }, [loadSteps]);

  const handleUploadComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
    showToast('success', 'Document uploaded successfully.');
  };

  if (cadres.length === 0) {
    return (
      <div className="container" style={{ padding: '3rem 2rem' }}>
        <h2>Documents Repository</h2>
        <p style={{ color: '#94a3b8' }}>No cadres configured. Please configure cadres first.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <div className="dashboard__header">
        <h1 className="dashboard__title">
          Supporting <span className="dashboard__title-accent">Documents</span>
        </h1>
        <p className="dashboard__title-subtitle">Manage files uploaded to Google Drive folder hierarchy</p>
      </div>

      {/* Cadre Tabs */}
      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        {cadres.map((cadreKey) => (
          <button
            key={cadreKey}
            className={`tab-btn ${activeCadre === cadreKey ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveCadre(cadreKey)}
          >
            {formatCadreName(cadreKey).split(' to ')[0].replace(/.*\(|\)/g, '') || cadreKey}
          </button>
        ))}
      </div>

      <div className="card">
        {loadingSteps ? (
          <LoadingSpinner message="Loading cadre steps..." />
        ) : (
          <div>
            <div className="form-group" style={{ marginBottom: '2rem', maxWidth: '400px' }}>
              <label className="form-label" htmlFor="step-select">Select Promotion Step:</label>
              <select
                id="step-select"
                className="select"
                value={activeStep}
                onChange={(e) => setActiveStep(e.target.value)}
                disabled={steps.length === 0}
              >
                {steps.map((s) => (
                  <option key={s.Step_Name} value={s.Step_Name}>
                    Step {s.Step_Order}: {s.Step_Name}
                  </option>
                ))}
                {steps.length === 0 && <option value="">No steps configured</option>}
              </select>
            </div>

            {activeStep ? (
              <div className="grid grid--2-col" style={{ gap: '2rem', alignItems: 'start' }}>
                <div>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Uploaded Documents</h3>
                  <DocumentList
                    year={activeYear}
                    cadre={activeCadre}
                    stepName={activeStep}
                    refreshTrigger={refreshTrigger}
                  />
                </div>

                {role !== 'viewer' && (
                  <div>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Upload New File</h3>
                    <DocumentUpload
                      year={activeYear}
                      cadre={activeCadre}
                      stepName={activeStep}
                      onUploadComplete={handleUploadComplete}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
                Select a cadre and step to manage documents.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
