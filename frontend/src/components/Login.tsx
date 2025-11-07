import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path';
import { storeToken } from '../tokenStorage';
import { jwtDecode } from 'jwt-decode';

function Login() {
  const [message, setMessage] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // Close modal on ESC key
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowModal(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  async function doLogin(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    const obj = { login: loginName, password: loginPassword };
    const js = JSON.stringify(obj);

    try {
      const response = await fetch(buildPath('api/login'), {
        method: 'POST',
        body: js,
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await response.json();

      if (res.error) {
        setMessage(res.error);
        return;
      }

      const accessToken =
        res.accessToken || res.jwtToken || res.token || res.access_token;

      if (!accessToken) {
        setMessage('Invalid server response: no access token found.');
        return;
      }

      storeToken(res);

      const decoded: any = jwtDecode(accessToken);
      const userId = decoded.id;
      const firstName = decoded.firstName;
      const lastName = decoded.lastName;

      if (!userId || userId <= 0) {
        setMessage('User/Password combination incorrect');
      } else {
        const user = { firstName, lastName, id: userId };
        localStorage.setItem('user_data', JSON.stringify(user));
        navigate('/todo');
      }
    } catch (error: any) {
      setMessage('A network or server error occurred.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

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
          <button 
            className="btn-topbar" 
            onClick={() => setShowModal(true)}
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <h1 className="hero__title">Daily Task Planner</h1>
        <p className="hero__sub">Organize your day, achieve your goals</p>
        <ul className="hero-list">
          <li>
            <span className="checkmark">✓</span>
            Plan your tasks
          </li>
          <li>
            <span className="checkmark">✓</span>
            Set reminders
          </li>
        </ul>
      </section>

      {/* Feature Cards */}
      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">📋</div>
          <h3 className="feature-title">Easy Organization</h3>
          <p className="feature-desc">Simple task management to keep everything in one place</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⏰</div>
          <h3 className="feature-title">Smart Reminders</h3>
          <p className="feature-desc">Never miss a deadline with timely notifications</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3 className="feature-title">Track Progress</h3>
          <p className="feature-desc">Visualize your achievements and stay motivated</p>
        </div>
      </section>

      {/* Backdrop scrim behind modal */}
      {showModal && (
        <div
          className="backdrop"
          aria-hidden="true"
          onClick={() => setShowModal(false)}
        />
      )}

      {/* Glass Card (floating) - Modal */}
      <div className={`login-modal glass ${showModal ? 'show' : ''}`} role="dialog" aria-modal="true" aria-label="Login form">
        <button 
          className="modal-close" 
          onClick={() => setShowModal(false)}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="glass__title">Welcome back 👋</h2>

        <form className="form" onSubmit={doLogin} noValidate>
          <label className="label" htmlFor="loginName">Username</label>
          <div className="input">
            <input
              id="loginName"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              required
            />
          </div>

          <div className="label-row">
            <label className="label" htmlFor="loginPassword">Password</label>
            <a className="muted small" href="/forgot-password">Forgot?</a>
          </div>
          <div className="input">
            <input
              id="loginPassword"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {message && <div className="error">{message}</div>}

          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="helper">
            Don't have an account? <a className="link" href="/register">Register</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
