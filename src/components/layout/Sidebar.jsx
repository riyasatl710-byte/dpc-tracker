/**
 * Sidebar.jsx — Navigation links, user badge, and collapse controls.
 */
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useDepartmentStore } from '../../store/useDepartmentStore';
import { useUiStore } from '../../store/useUiStore';
import { formatCadreName } from '../../utils/formatters';

export default function Sidebar() {
  const { role } = useAuthStore();
  const { cadres } = useDepartmentStore();
  const { sidebarOpen, toggleSidebar } = useUiStore();

  const isConfigVisible = role === 'admin' || role === 'super_admin';
  const isAdminVisible = role === 'admin' || role === 'super_admin';

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
      <div className="sidebar__brand">
        <Link to="/dashboard" className="sidebar__brand-link">
          <span className="sidebar__brand-emblem">⚙</span>
          <span className="sidebar__brand-text">DPC TRACKER</span>
        </Link>
        <button className="sidebar__toggle" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          ◀
        </button>
      </div>

      <nav className="sidebar__nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
        >
          <span className="sidebar__link-icon">📊</span>
          <span className="sidebar__link-text">Dashboard</span>
        </NavLink>

        {/* Cadre Step Tracking Sub-menu */}
        <div className="sidebar__section">
          <p className="sidebar__section-title">Cadres</p>
          <div className="sidebar__section-links">
            {cadres.map((cadre) => (
              <NavLink
                key={cadre}
                to={`/tracking/${cadre}`}
                className={({ isActive }) => `sidebar__link sidebar__link--sub ${isActive ? 'sidebar__link--active' : ''}`}
                title={formatCadreName(cadre)}
              >
                <span className="sidebar__link-icon">📋</span>
                <span className="sidebar__link-text">{cadre.replace(/_/g, ' ')}</span>
              </NavLink>
            ))}
            {cadres.length === 0 && (
              <p className="sidebar__nav-empty">No cadres loaded</p>
            )}
          </div>
        </div>

        <div className="sidebar__section-divider" />

        <NavLink
          to="/data-entry"
          className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
        >
          <span className="sidebar__link-icon">📝</span>
          <span className="sidebar__link-text">Base Data Entry</span>
        </NavLink>

        <NavLink
          to="/documents"
          className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
        >
          <span className="sidebar__link-icon">📁</span>
          <span className="sidebar__link-text">Documents</span>
        </NavLink>

        {isConfigVisible && (
          <NavLink
            to="/config"
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
          >
            <span className="sidebar__link-icon">⚙</span>
            <span className="sidebar__link-text">Workflow Config</span>
          </NavLink>
        )}

        {isAdminVisible && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
          >
            <span className="sidebar__link-icon">👥</span>
            <span className="sidebar__link-text">Administration</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar__footer">
        <span className="sidebar__version">v1.0.0</span>
      </div>
    </aside>
  );
}
