import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path';

const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();

  const pendingLogin = localStorage.getItem('pendingLogin') || '';

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

  const handleVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(buildPath('/api/verify-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: pendingLogin, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data?.error || 'Verification failed.');
      } else if (data?.error) {
        setMessage(data.error);
      } else {
        localStorage.removeItem('pendingLogin');
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setMessage('A network or server error occurred.');
    } finally {
      setLoading(false);
    }
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
          <span className="brand">Daily Task Planner</span>
          <a className="topbar__link" href="/">
            Sign in
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <h1 className="hero__title">Daily Task Planner</h1>
        <p className="hero__sub">Organize your day, achieve your goals</p>
      </section>

      {/* Verification Modal */}
      {showModal && (
        <>
          <div className="backdrop" onClick={() => setShowModal(false)} />
          <main className="login-modal show" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
              aria-label="Close verification form"
            >
              ×
            </button>
            <div className="glass">
              <h2 className="glass__title" id="modal-title">Verify Your Email</h2>
              <p style={{ 
                textAlign: 'center', 
                marginBottom: '1.5rem',
                color: 'var(--muted)',
                fontSize: 'var(--font-sm)'
              }}>
                A verification code was sent to the email associated with <strong>{pendingLogin}</strong>.
              </p>
              <form className="form" onSubmit={handleVerify} noValidate>
                <label className="label" htmlFor="code">Verification Code</label>
                <div className="input">
                  <input
                    id="code"
                    type="text"
                    autoComplete="one-time-code"
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>

                {message && <div className="error">{message}</div>}

                <button type="submit" className="btn btn--primary" disabled={loading}>
                  {loading ? 'Verifying…' : 'Verify Email'}
                </button>

                <p className="helper">
                  Didn't receive a code?{' '}
                  <a className="link" href="/register">
                    Try registering again
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

export default VerifyEmail;