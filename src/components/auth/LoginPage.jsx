/**
 * LoginPage.jsx — Full-page email/password sign-in for DPC Promotion Tracker
 */
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import './LoginPage.css';

export default function LoginPage() {
  const { isAuthenticated, login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  /* Already logged in → redirect */
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError('');
    setVerifying(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-page__bg">
        <div className="login-page__bg-orb login-page__bg-orb--1" />
        <div className="login-page__bg-orb login-page__bg-orb--2" />
        <div className="login-page__bg-orb login-page__bg-orb--3" />
      </div>

      <div className="login-page__card">
        {/* Government emblem — CSS only */}
        <div className="login-page__emblem">
          <div className="login-page__emblem-shield">
            <div className="login-page__emblem-inner">
              <span className="login-page__emblem-icon">⚖</span>
            </div>
          </div>
          <div className="login-page__emblem-rays">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="login-page__emblem-ray" style={{ '--ray-index': i }} />
            ))}
          </div>
        </div>

        {/* Branding */}
        <h1 className="login-page__title">DPC Tracker</h1>
        <p className="login-page__subtitle">
          Departmental Promotion Committee System
        </p>

        <div className="login-page__divider" />

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-page__form">
          <div className="login-page__form-group">
            <label className="login-page__label" htmlFor="email">Email Address</label>
            <div className="login-page__input-wrapper">
              <span className="login-page__input-icon">✉</span>
              <input
                id="email"
                type="email"
                className="login-page__input"
                placeholder="registered@dept.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={verifying || isLoading}
                required
              />
            </div>
          </div>

          <div className="login-page__form-group">
            <label className="login-page__label" htmlFor="password">Password</label>
            <div className="login-page__input-wrapper">
              <span className="login-page__input-icon">🔒</span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="login-page__input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={verifying || isLoading}
                required
              />
              <button
                type="button"
                className="login-page__toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-page__error">
              <span className="login-page__error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-page__submit-btn"
            disabled={verifying || isLoading}
          >
            {verifying || isLoading ? (
              <div className="login-page__btn-loading">
                <div className="login-page__spinner" />
                <span>Verifying...</span>
              </div>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-page__footer">
          <span>DPC Tracker v1.0</span>
        </div>
      </div>
    </div>
  );
}
