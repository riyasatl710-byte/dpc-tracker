/**
 * StatusBadge.jsx — Pill badge displaying status colors.
 */
import React from 'react';
import { getStatusClass } from '../../utils/formatters';

/**
 * Renders a color-coded status badge with leading dot.
 *
 * @param {Object} props
 * @param {string} props.status - Status name (e.g. 'Not Started', 'In Progress', 'Completed')
 * @param {string} [props.className] - Extra class names
 */
export default function StatusBadge({ status, className = '' }) {
  const statusClass = getStatusClass(status);

  return (
    <span className={`status-badge status-badge--${statusClass} ${className}`}>
      <span className="status-badge__dot" />
      <span className="status-badge__text">{status || 'Not Started'}</span>
    </span>
  );
}
