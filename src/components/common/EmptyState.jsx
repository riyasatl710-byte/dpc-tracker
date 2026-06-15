/**
 * EmptyState.jsx — Muted empty state display card with customizable icon and title.
 */
import React from 'react';

/**
 * Empty State view helper.
 *
 * @param {Object} props
 * @param {string} [props.title='No Data Found'] - State title
 * @param {string} [props.description='There is no information to display for this selection.'] - Detailed text
 * @param {string} [props.icon='📁'] - Emoji or Unicode icon
 * @param {React.ReactNode} [props.action] - Optional button or action component
 */
export default function EmptyState({ title = 'No Data Found', description = 'There is no information to display for this selection.', icon = '📁', action }) {
  return (
    <div className="empty-state animate-fadeIn">
      <div className="empty-state__icon">{icon}</div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__description">{description}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
