import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildPath } from './Path';
import { APP_NAME } from '../config';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const login = searchParams.get('login');
  const token = searchParams.get('token');
  const verified = searchParams.get('verified');

  useEffect(() => {
    if (!login) {
      navigate('/forgot-password');
    }
  }, [login, navigate]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    if (showModal) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [showModal]);

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      let response;
      
      if (verified === 'true' && token) {
        response = await fetch(buildPath('api/reset-password-with-token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: login,
            token: token, 
            newPassword: newPassword 
          }),
        });
      } else if (token) {
        response = await fetch(buildPath('api/reset-password-with-token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            login: login, 
            token: token, 
            newPassword: newPassword 
          }),
        });
      } else {
        setMessage('Invalid reset session. Please try again.');
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (response.ok && !data.error) {
        setMessage('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setMessage(data.error || 'Failed to reset password.');
      }
    } catch (err) {
      console.error(err);
      setMessage('A network or server error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="login-page">
      {/* Animated background blobs */}
      <div className="blob blob--indigo" aria-hidden="true" />
      <div className="blob blob--mint" aria-hidden="true" />
      <div className="blob blob--pink" aria-hidden="true" />

      {/* Top bar */}
      <header className="topbar">
        <div className="topbar__inner">
          <span className="brand">{APP_NAME}</span>
          <a className="topbar__link" href="/">
            Sign in
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <h1 className="hero__title">{APP_NAME}</h1>
        <p className="hero__sub">Organize your day, achieve your goals</p>
      </section>

      {/* Reset Password Modal */}
      {showModal && (
        <>
          <div className="backdrop" onClick={() => setShowModal(false)} />
          <main className="login-modal show" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
              aria-label="Close reset password form"
            >
              ×
            </button>
            <div className="glass">
              <h2 className="glass__title" id="modal-title">Set New Password</h2>
              <form className="form" onSubmit={handlePasswordReset} noValidate>
                <label className="label" htmlFor="newPassword">New Password</label>
                <div className="input">
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <label className="label" htmlFor="confirmPassword">Confirm Password</label>
                <div className="input">
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {message && (
                  <div className={`error ${message.includes('successfully') ? 'success' : ''}`}>
                    {message}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--space-12)', width: '100%' }}>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn"
                    style={{ 
                      flex: 1,
                      background: 'var(--border)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn--primary" 
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    {loading ? 'Resetting…' : 'Reset Password'}
                  </button>
                </div>

                <p className="helper">
                  Remember your password?{' '}
                  <a className="link" href="/">
                    Sign in
                  </a>
                </p>
              </form>
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default ResetPassword;