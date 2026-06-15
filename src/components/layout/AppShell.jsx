/**
 * AppShell.jsx — Master layout shell wrapping dashboard views.
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import ToastContainer from '../common/Toast';
import { useUiStore } from '../../store/useUiStore';

export default function AppShell() {
  const { sidebarOpen } = useUiStore();

  return (
    <div className={`app-shell ${sidebarOpen ? 'app-shell--sidebar-open' : 'app-shell--sidebar-closed'}`}>
      <Sidebar />

      <div className="app-shell__container">
        <Header />

        <main className="app-shell__content">
          <Outlet />
        </main>

        <Footer />
      </div>

      <ToastContainer />
    </div>
  );
}
