/**
 * ProtectedRoute.jsx — Route guard component for DPC Tracker.
 */
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Route guard wrapper that redirects to /login if unauthenticated.
 * Optionally restricts access to specific roles.
 *
 * @param {Object} props
 * @param {string} [props.minRole] - Minimum role required
 * @param {React.ReactNode} [props.children] - Children to render if authorized
 */
export default function ProtectedRoute({ minRole, children }) {
  const { isAuthenticated, isLoading, role } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner fullPage message="Authenticating session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Optional role checking
  if (minRole) {
    const roleHierarchy = ['viewer', 'editor', 'admin', 'super_admin'];
    const userRoleIndex = roleHierarchy.indexOf(role || 'viewer');
    const minRoleIndex = roleHierarchy.indexOf(minRole);

    if (userRoleIndex < minRoleIndex) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '80vh',
          color: '#ef4444',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h2>Access Denied</h2>
          <p style={{ color: '#94a3b8' }}>You do not have the required permissions to view this page.</p>
        </div>
      );
    }
  }

  return children ? children : <Outlet />;
}
