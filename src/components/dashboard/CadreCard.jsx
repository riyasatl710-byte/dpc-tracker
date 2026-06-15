/**
 * CadreCard.jsx — Summary view for a single cadre.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressBar from './ProgressBar';
import StatusBadge from '../common/StatusBadge';
import { formatCadreName } from '../../utils/formatters';

export default function CadreCard({ cadre, year, data }) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/tracking/${cadre}`);
  };

  // Extract variables with defaults
  const vacancies = data?.Estimated_Vacancies !== undefined ? data.Estimated_Vacancies : 'Not Set';
  const lastPromotedName = data?.Last_Promoted_Name || 'None';
  const lastPromotedNo = data?.Last_Promoted_SerialNo || data?.Last_Promoted_No || 'N/A';
  const overallStatus = data?.Overall_Status || 'Not Started';
  const currentStepName = data?.Current_Step_Name || data?.Current_Step_ID || 'None';
  const steps = data?.steps || [];

  return (
    <div className="cadre-card hover-lift" onClick={handleCardClick}>
      <div className="cadre-card__header">
        <div>
          <h3 className="cadre-card__title">{formatCadreName(cadre)}</h3>
          <p className="cadre-card__cycle">Cycle Year: {year}</p>
        </div>
        <StatusBadge status={overallStatus} />
      </div>

      <div className="cadre-card__body">
        <div className="cadre-card__meta-grid">
          <div className="cadre-card__meta-item">
            <span className="cadre-card__meta-label">Est. Vacancies</span>
            <span className="cadre-card__meta-val cadre-card__meta-val--accent">{vacancies}</span>
          </div>
          <div className="cadre-card__meta-item">
            <span className="cadre-card__meta-label">Last Promoted Officer</span>
            <span className="cadre-card__meta-val" title={lastPromotedName}>
              {lastPromotedName} {lastPromotedNo !== 'N/A' ? `(#${lastPromotedNo})` : ''}
            </span>
          </div>
        </div>

        <div className="cadre-card__step-info">
          <span className="cadre-card__step-label">Current Phase:</span>
          <span className="cadre-card__step-val">{currentStepName}</span>
        </div>

        <ProgressBar steps={steps} />
      </div>

      <div className="cadre-card__footer">
        <span className="cadre-card__action">Open Detailed Steps &rarr;</span>
      </div>
    </div>
  );
}
