import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path';
import { APP_NAME } from '../config';

const Register: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(true);

  const navigate = useNavigate();

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

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    const payload = { firstName, lastName, login, email, password };

    try {
      const response = await fetch(buildPath('api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && !data.error) {
        localStorage.setItem('pendingEmail', email);
        localStorage.setItem('pendingLogin', login);
        navigate('/verify-email');
      } else {
        setMessage(data.error || 'Registration failed.');
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
        <ul className="hero-list">
          <li><span className="checkmark">✓</span> Plan your tasks</li>
          <li><span className="checkmark">✓</span> Set reminders</li>
        </ul>
      </section>

      {/* Feature Cards */}
      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">📋</div>
          <h3>Task Management</h3>
          <p>Create and organize your daily tasks effortlessly</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⏰</div>
          <h3>Smart Reminders</h3>
          <p>Never miss an important deadline again</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Track Progress</h3>
          <p>Monitor your productivity and achievements</p>
      </div>
      </section>

      {/* Registration Modal */}
      {showModal && (
        <>
          <div className="backdrop" onClick={() => setShowModal(false)} />
          <main className="login-modal show" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="glass">
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close registration form"
              >
                ×
              </button>
              <h2 className="glass__title" id="modal-title">Create Account</h2>
              <form className="form" onSubmit={handleRegister} noValidate>
                <div className="form-row">
                  <div>
                    <label className="label" htmlFor="firstName">First Name</label>
                    <div className="input">
                <input
                        id="firstName"
                  type="text"
                        autoComplete="given-name"
                        placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="lastName">Last Name</label>
                    <div className="input">
                <input
                        id="lastName"
                  type="text"
                        autoComplete="family-name"
                        placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                      />
                    </div>
                  </div>
              </div>

                <label className="label" htmlFor="email">Email</label>
                <div className="input">
                <input
                    id="email"
                  type="email"
                    autoComplete="email"
                    placeholder="grace@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

                <label className="label" htmlFor="login">Username</label>
                <div className="input">
                <input
                    id="login"
                  type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                />
              </div>

                <label className="label" htmlFor="password">Password</label>
                <div className="input">
                <input
                    id="password"
                  type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

                {message && <div className="error">{message}</div>}

                <button type="submit" className="btn btn--primary" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create Account'}
              </button>

                <p className="helper">
                  Already have an account?{' '}
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

export default Register;