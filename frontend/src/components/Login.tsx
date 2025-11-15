import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildPath } from "./Path";
import { storeToken } from "../tokenStorage";
import { jwtDecode } from "jwt-decode";
import { APP_NAME } from "../config";
import ThemeToggle from "./ThemeToggle";

function Login() {
  const [message, setMessage] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const inactiveTabIndex = showModal ? undefined : -1;

  // Close modal on ESC key
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setShowModal(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  async function doLogin(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    const obj = { login: loginName, password: loginPassword };
    const js = JSON.stringify(obj);

    try {
      const response = await fetch(buildPath("api/login"), {
        method: "POST",
        body: js,
        headers: { "Content-Type": "application/json" },
      });

      const res = await response.json();

      if (res.error) {
        setMessage(res.error);
        return;
      }

      const accessToken =
        res.accessToken || res.jwtToken || res.token || res.access_token;

      if (!accessToken) {
        setMessage("Invalid server response: no access token found.");
        return;
      }

      storeToken(res);

      const decoded: any = jwtDecode(accessToken);
      const userId = decoded.id;
      const firstName = decoded.firstName;
      const lastName = decoded.lastName;

      if (!userId || userId <= 0) {
        setMessage("User/Password combination incorrect");
      } else {
        const user = { firstName, lastName, id: userId };
        localStorage.setItem("user_data", JSON.stringify(user));
        navigate("/todo");
      }
    } catch (error: any) {
      setMessage("A network or server error occurred.");
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
          <span className="brand">{APP_NAME}</span>
          <div className="topbar__actions">
            <ThemeToggle />
            <button className="btn-topbar" onClick={() => setShowModal(true)}>
              Sign in
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <h1 className="hero__title">{APP_NAME}</h1>
        <p className="hero__sub">Organize your day, achieve your goals</p>
        <ul className="hero-list">
          <li>
            <span className="checkmark">✓</span>
            Plan your tasks
          </li>
          <li>
            <span className="checkmark">✓</span>
            Track deadlines
          </li>
        </ul>
      </section>

      {/* Feature Cards */}
      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">📋</div>
          <h3 className="feature-title">Easy Organization</h3>
          <p className="feature-desc">
            Simple task management to keep everything in one place
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3 className="feature-title">Status Tracking</h3>
          <p className="feature-desc">
            Monitor task status from upcoming to overdue automatically
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3 className="feature-title">Timeline View</h3>
          <p className="feature-desc">
            Visual hourly schedule to see your entire day
          </p>
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
      <div
        className={`login-modal glass ${showModal ? "show" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Login form"
        aria-hidden={!showModal}
      >
        <button
          className="modal-close"
          onClick={() => setShowModal(false)}
          aria-label="Close"
          tabIndex={inactiveTabIndex}
        >
          ×
        </button>
        <h2 className="glass__title">Welcome back 👋</h2>

        <form className="form" onSubmit={doLogin} noValidate>
          <label className="label" htmlFor="loginName">
            Username
          </label>
          <div className="input">
            <input
              id="loginName"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              required
              tabIndex={inactiveTabIndex}
            />
          </div>

          <label className="label" htmlFor="loginPassword">
            Password
          </label>
          <div className="input">
            <input
              id="loginPassword"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setPassword(e.target.value)}
              required
              tabIndex={inactiveTabIndex}
            />
          </div>
          <div style={{ textAlign: 'left', marginTop: '-12px', marginBottom: '16px' }}>
            <a className="muted small" href="/forgot-password" tabIndex={inactiveTabIndex}>
              Forgot password?
            </a>
          </div>

          {message && <div className="error">{message}</div>}

          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading}
            tabIndex={inactiveTabIndex}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="helper">
            Don't have an account?{" "}
            <a className="link" href="/register" tabIndex={inactiveTabIndex}>
              Register
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
