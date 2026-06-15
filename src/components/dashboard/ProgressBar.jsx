/**
 * ProgressBar.jsx — Segmented progress indicator for promotional workflow steps.
 */
import React from 'react';
import { getStatusClass } from '../../utils/formatters';

/**
 * Renders a segmented progress bar.
 *
 * @param {Object} props
 * @param {Array<Object>} props.steps - Array of steps: [{ name, status }]
 */
export default function ProgressBar({ steps = [] }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="progress-bar-placeholder">
        No steps configured
      </div>
    );
  }

  const completedCount = steps.filter(s => s.status === 'Completed').length;
  const percentage = Math.round((completedCount / steps.length) * 100) || 0;

  return (
    <div className="progress-bar-wrapper">
      <div className="progress-bar-meta">
        <span className="progress-bar-label">Workflow Progress</span>
        <span className="progress-bar-percentage">{completedCount}/{steps.length} Steps ({percentage}%)</span>
      </div>

      <div className="progress-bar-track">
        {steps.map((step, index) => {
          const statusClass = getStatusClass(step.status);
          return (
            <div
              key={index}
              className={`progress-bar-segment progress-bar-segment--${statusClass}`}
              title={`${index + 1}. ${step.name}: ${step.status}`}
            >
              {/* Pulse effect for In Progress step */}
              {step.status === 'In Progress' && <div className="progress-bar-pulse" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
