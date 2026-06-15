import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout
import AppShell from './components/layout/AppShell';

// Auth
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import DashboardPage from './components/dashboard/DashboardPage';
import StepTracker from './components/tracking/StepTracker';
import DataEntryPage from './components/data-entry/DataEntryPage';
import DocumentsPage from './components/documents/DocumentsPage';
import WorkflowConfig from './components/workflow/WorkflowConfig';
import AdminPage from './components/admin/AdminPage';

import { ROLES } from './utils/constants';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/tracking/:cadre',
            element: <StepTracker />,
          },
          {
            path: '/data-entry',
            element: <DataEntryPage />,
          },
          {
            path: '/documents',
            element: <DocumentsPage />,
          },
          {
            path: '/documents/:cadre',
            element: <DocumentsPage />,
          },
          {
            path: '/documents/:cadre/:step',
            element: <DocumentsPage />,
          },
          {
            path: '/config',
            element: <ProtectedRoute minRole={ROLES.DEPT_ADMIN}><WorkflowConfig /></ProtectedRoute>,
          },
          {
            path: '/admin',
            element: <ProtectedRoute minRole={ROLES.DEPT_ADMIN}><AdminPage /></ProtectedRoute>,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
