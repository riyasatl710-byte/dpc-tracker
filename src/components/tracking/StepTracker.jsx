/**
 * StepTracker.jsx — detailed view of all promotion steps for a cadre.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDepartmentStore } from '../../store/useDepartmentStore';
import { fetchStepLogs, updateStepStatus } from '../../services/dashboardService';
import TimelineView from './TimelineView';
import StepDetail from './StepDetail';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatCadreName } from '../../utils/formatters';

export default function StepTracker() {
  const { cadre } = useParams();
  const { activeYear } = useDepartmentStore();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStepIndex, setExpandedStepIndex] = useState(0);

  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStepLogs(activeYear, cadre);
      // Ensure data is sorted by Step_Order
      const sortedData = Array.isArray(data)
        ? [...data].sort((a, b) => Number(a.Step_Order || 0) - Number(b.Step_Order || 0))
        : [];
      setLogs(sortedData);

      // Default expand the first step that is In Progress, otherwise the first step
      const inProgressIdx = sortedData.findIndex(s => s.Status === 'In Progress');
      if (inProgressIdx !== -1) {
        setExpandedStepIndex(inProgressIdx);
      } else {
        setExpandedStepIndex(0);
      }
    } catch (err) {
      console.error('Failed to load step logs:', err);
      setError(err.message || 'Failed to load step logs.');
    } finally {
      setIsLoading(false);
    }
  }, [activeYear, cadre]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Aggregate status counts
  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    logs.forEach(step => {
      if (step.Status === 'Completed') completed++;
      else if (step.Status === 'In Progress') inProgress++;
      else notStarted++;
    });

    return {
      total: logs.length,
      completed,
      inProgress,
      notStarted
    };
  }, [logs]);

  const handleStatusChange = async (stepName, newStatus, remarks) => {
    try {
      await updateStepStatus(activeYear, cadre, stepName, newStatus, remarks);
      // Reload logs after update
      await fetchLogs();
      return true;
    } catch (err) {
      console.error('Failed to update step status:', err);
      alert(err.message || 'Failed to update status.');
      return false;
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullPage message="Fetching workflow logs..." />;
  }

  return (
    <div className="step-tracker">
      <div className="step-tracker__breadcrumbs">
        <Link to="/dashboard" className="step-tracker__breadcrumb-link">Dashboard</Link>
        <span className="step-tracker__breadcrumb-separator">&gt;</span>
        <span className="step-tracker__breadcrumb-current">{cadre.replace(/_/g, ' ')}</span>
      </div>

      <div className="step-tracker__header">
        <div>
          <h1 className="step-tracker__title">{formatCadreName(cadre)}</h1>
          <p className="step-tracker__subtitle">Step-by-step progress tracking for the {activeYear} cycle</p>
        </div>
        <Link to="/dashboard" className="btn btn-secondary">
          &larr; Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="dashboard__error">
          <span className="dashboard__error-icon">⚠</span>
          <span className="dashboard__error-text">{error}</span>
          <button className="dashboard__error-retry" onClick={fetchLogs}>Retry</button>
        </div>
      )}

      {/* Stats Summary strip */}
      <div className="step-tracker__summary-bar">
        <div className="step-tracker__summary-item">
          <span className="step-tracker__summary-label">Total Steps</span>
          <span className="step-tracker__summary-val">{stats.total}</span>
        </div>
        <div className="step-tracker__summary-item step-tracker__summary-item--completed">
          <span className="step-tracker__summary-label">Completed</span>
          <span className="step-tracker__summary-val">{stats.completed}</span>
        </div>
        <div className="step-tracker__summary-item step-tracker__summary-item--in-progress">
          <span className="step-tracker__summary-label">In Progress</span>
          <span className="step-tracker__summary-val">{stats.inProgress}</span>
        </div>
        <div className="step-tracker__summary-item">
          <span className="step-tracker__summary-label">Not Started</span>
          <span className="step-tracker__summary-val">{stats.notStarted}</span>
        </div>
      </div>

      <div className="step-tracker__content-layout">
        {/* Timeline representation (Left column) */}
        <div className="step-tracker__timeline-col">
          <TimelineView
            steps={logs}
            activeIndex={expandedStepIndex}
            onSelectNode={setExpandedStepIndex}
          />
        </div>

        {/* Detailed step action panel (Right column) */}
        <div className="step-tracker__detail-col">
          {logs.length > 0 ? (
            <StepDetail
              step={logs[expandedStepIndex]}
              cadre={cadre}
              year={activeYear}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <div className="card text-center" style={{ padding: '3rem' }}>
              <p style={{ color: '#94a3b8' }}>No steps configuration found for this cadre.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
