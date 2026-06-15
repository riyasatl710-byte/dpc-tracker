/**
 * TimelineView.jsx — Vertical progress timeline nodes.
 */
import React from 'react';
import { getStatusClass, formatDate } from '../../utils/formatters';

export default function TimelineView({ steps = [], activeIndex = 0, onSelectNode }) {
  return (
    <div className="timeline">
      <div className="timeline__track" />

      {steps.map((step, index) => {
        const isCurrent = index === activeIndex;
        const statusClass = getStatusClass(step.Status);
        const displayDate = step.Completion_Date ? formatDate(step.Completion_Date) : null;

        return (
          <div
            key={index}
            className={`timeline-item ${isCurrent ? 'timeline-item--active' : ''} timeline-item--${statusClass}`}
            onClick={() => onSelectNode(index)}
          >
            {/* Timeline node marker */}
            <div className="timeline-item__node">
              <span className="timeline-item__order">{index + 1}</span>
              {step.Status === 'In Progress' && <div className="timeline-item__pulse" />}
            </div>

            {/* Content text */}
            <div className="timeline-item__content">
              <h4 className="timeline-item__title">{step.Step_Name}</h4>
              <div className="timeline-item__meta">
                <span className={`timeline-item__badge timeline-item__badge--${statusClass}`}>
                  {step.Status}
                </span>
                {displayDate && (
                  <span className="timeline-item__date">
                    Completed: {displayDate}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
