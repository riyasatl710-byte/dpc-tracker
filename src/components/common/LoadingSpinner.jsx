/**
 * LoadingSpinner.jsx — CSS-only loading spinner component.
 */
import React from 'react';

/**
 * Reusable loading spinner.
 *
 * @param {Object} props
 * @param {boolean} [props.fullPage=false] - If true, centers spinner in viewport
 * @param {string} [props.message] - Optional text message to show below spinner
 */
export default function LoadingSpinner({ fullPage = false, message }) {
  const content = (
    <div className="loading-spinner-container">
      <div className="loading-spinner" />
      {message && <p className="loading-spinner-message">{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="loading-spinner-page">
        {content}
      </div>
    );
  }

  return content;
}
