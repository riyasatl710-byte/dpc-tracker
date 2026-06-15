/**
 * AdminPage.jsx — Container tab page for Super Admins / Admins to manage users and departments.
 */
import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import DepartmentPanel from './DepartmentPanel';
import UserManager from './UserManager';

export default function AdminPage() {
  const { role } = useAuthStore();
  const isSuper = role === 'super_admin';
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <div className="dashboard__header">
        <h1 className="dashboard__title">
          System <span className="dashboard__title-accent">Administration</span>
        </h1>
        <p className="dashboard__title-subtitle">Manage user access permissions and tenant departments</p>
      </div>

      {/* Tabs */}
      {isSuper && (
        <div className="tabs" style={{ marginBottom: '2rem' }}>
          <button
            className={`tab-btn ${activeTab === 'users' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Personnel Access
          </button>
          <button
            className={`tab-btn ${activeTab === 'departments' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('departments')}
          >
            🏢 Departments Registry
          </button>
        </div>
      )}

      {/* Tab Panels */}
      <div className="admin-tab-content">
        {activeTab === 'users' ? (
          <UserManager />
        ) : (
          isSuper && <DepartmentPanel />
        )}
      </div>
    </div>
  );
}
