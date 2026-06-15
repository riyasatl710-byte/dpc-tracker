/**
 * Header.jsx — Department-branded navigation and header controls.
 */
import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDepartmentStore } from '../../store/useDepartmentStore';
import { useUiStore } from '../../store/useUiStore';

export default function Header() {
  const { user, role, logout } = useAuthStore();
  const { activeDepartment, activeYear, setActiveYear } = useDepartmentStore();
  const { toggleSidebar } = useUiStore();
  const [profileOpen, setProfileOpen] = useState(false);

  // Fallback brand details if no department is associated yet
  const deptName = activeDepartment?.name || user?.departmentName || 'Agriculture Department';
  const displayRole = role ? role.replace('_', ' ').toUpperCase() : 'OBSERVER';

  // Years option range
  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  return (
    <header className="header">
      <div className="header__left">
        <button className="header__menu-toggle" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          ☰
        </button>
        <div className="header__brand">
          <div className="header__emblem-small">⚖</div>
          <div>
            <h2 className="header__dept-title">{deptName}</h2>
            <p className="header__sub-title">Departmental DPC Tracker</p>
          </div>
        </div>
      </div>

      <div className="header__right">
        {/* Year Cycle selector */}
        <div className="header__year-selector">
          <label htmlFor="year-select" className="header__year-label">Cycle Year:</label>
          <select
            id="year-select"
            className="select select--sm"
            value={activeYear}
            onChange={(e) => setActiveYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* User profile dropdown */}
        <div className="header__user-menu">
          <button
            className="header__profile-trigger"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-haspopup="true"
            aria-expanded={profileOpen}
          >
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="header__avatar" />
            ) : (
              <div className="header__avatar header__avatar--placeholder">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
            )}
            <span className="header__username">{user?.name || 'Officer'}</span>
            <span className="header__arrow">▼</span>
          </button>

          {profileOpen && (
            <>
              <div className="header__dropdown-backdrop" onClick={() => setProfileOpen(false)} />
              <div className="header__dropdown animate-slideDown">
                <div className="header__dropdown-userinfo">
                  <p className="header__dropdown-name">{user?.name}</p>
                  <p className="header__dropdown-email">{user?.email}</p>
                  <span className="header__dropdown-role">{displayRole}</span>
                </div>
                <div className="header__dropdown-divider" />
                <button
                  className="header__dropdown-item header__dropdown-item--logout"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                >
                  🚪 Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
