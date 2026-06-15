/**
 * DashboardPage.jsx — Main lander giving an overview of all cadres.
 */
import React, { useEffect, useMemo } from 'react';
import { useDepartmentStore } from '../../store/useDepartmentStore';
import CadreCard from './CadreCard';
import EmptyState from '../common/EmptyState';
import './DashboardPage.css';

export default function DashboardPage() {
  const {
    cadres,
    activeYear,
    dashboardData,
    isLoading,
    error,
    fetchDashboard
  } = useDepartmentStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard, activeYear]);

  // Compute aggregated stats
  const stats = useMemo(() => {
    let totalVacancies = 0;
    let totalSteps = 0;
    let completedSteps = 0;
    let pendingActions = 0;

    if (dashboardData) {
      Object.keys(dashboardData).forEach((cadreKey) => {
        const cadreData = dashboardData[cadreKey];
        if (cadreData) {
          // Vacancies
          const v = Number(cadreData.Estimated_Vacancies);
          if (!isNaN(v)) totalVacancies += v;

          // Steps
          const steps = cadreData.steps || [];
          totalSteps += steps.length;
          steps.forEach(s => {
            if (s.status === 'Completed') {
              completedSteps++;
            } else if (s.status === 'In Progress') {
              pendingActions++;
            }
          });
        }
      });
    }

    return {
      totalCadres: cadres.length,
      totalVacancies,
      completedSteps,
      totalSteps,
      pendingActions
    };
  }, [dashboardData, cadres]);

  if (isLoading && !dashboardData) {
    return (
      <div className="dashboard">
        <div className="dashboard__header">
          <div className="skeleton-card skeleton-card--stat" style={{ width: '250px', height: '40px' }} />
        </div>
        <div className="skeleton-stats">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-card skeleton-card--stat" />
          ))}
        </div>
        <div className="skeleton-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-card skeleton-card--cadre" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1 className="dashboard__title">
          Departmental Promotion Committee <span className="dashboard__title-accent">Overview</span>
        </h1>
        <div className="dashboard__year-badge">
          Calendar Year: <strong>{activeYear}</strong>
        </div>
      </div>

      {error && (
        <div className="dashboard__error">
          <span className="dashboard__error-icon">⚠</span>
          <span className="dashboard__error-text">Failed to sync: {error}</span>
          <button className="dashboard__error-retry" onClick={fetchDashboard}>Retry</button>
        </div>
      )}

      {/* Stats Summary cards */}
      <div className="dashboard__stats-row">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--cadres">📊</div>
          <div className="stat-card__info">
            <span className="stat-card__value">{stats.totalCadres}</span>
            <span className="stat-card__label">Active Cadres</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--vacancies">👤</div>
          <div className="stat-card__info">
            <span className="stat-card__value">{stats.totalVacancies}</span>
            <span className="stat-card__label">Est. Vacancies</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--completed">✓</div>
          <div className="stat-card__info">
            <span className="stat-card__value">{stats.completedSteps}</span>
            <span className="stat-card__label">Completed Steps</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--pending">⚡</div>
          <div className="stat-card__info">
            <span className="stat-card__value">{stats.pendingActions}</span>
            <span className="stat-card__label">In Progress Steps</span>
          </div>
        </div>
      </div>

      {/* Cadre Cards Grid */}
      <h2 className="dashboard__grid-header">Cadre Tracking</h2>
      {cadres.length === 0 ? (
        <EmptyState
          title="No Cadres Configured"
          description="Go to Workflow Configuration or check with your Department Administrator to set up cadres."
        />
      ) : (
        <div className="dashboard__grid">
          {cadres.map((cadreKey) => {
            const cadreData = dashboardData ? dashboardData[cadreKey] : null;
            return (
              <CadreCard
                key={cadreKey}
                cadre={cadreKey}
                year={activeYear}
                data={cadreData}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
