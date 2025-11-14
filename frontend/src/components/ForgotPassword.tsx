import React, { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { buildPath } from "./Path";
import { APP_NAME } from "../config";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: email input, 2: code input
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    if (showModal) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [showModal]);

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(buildPath("api/request-password-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.sent) {
        setMessage("Password reset email sent! Check your inbox.");
        setStep(2); // Move to code input step
      } else {
        setMessage(data.error || "Failed to send reset email.");
      }
    } catch (err) {
      console.error(err);
      setMessage("A network or server error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(buildPath("api/verify-reset-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          code: code,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Invalid verification code.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status}. Please try again.`;
        }
        setMessage(errorMessage);
        return;
      }

      const data = await response.json();

      if (data.verified) {
        navigate(
          `/reset-password?login=${encodeURIComponent(email)}&token=${
            data.resetToken
          }&verified=true`
        );
      } else {
        setMessage(data.error || "Invalid verification code.");
      }
    } catch (err) {
      console.error("Network error:", err);
      setMessage("Unable to connect to server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/");
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
          <main
            className="login-modal show"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
              aria-label="Close reset password form"
            >
              ×
            </button>
            <div className="glass">
              <h2 className="glass__title" id="modal-title">
                {step === 1 ? "Reset Password" : "Verify Code"}
              </h2>
              <form
                className="form"
                onSubmit={
                  step === 1 ? handleResetPassword : handleCodeVerification
                }
                noValidate
              >
                {step === 1 ? (
                  <>
                    <label className="label" htmlFor="email">
                      Email
                    </label>
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
                  </>
                ) : (
                  <>
                    <label className="label" htmlFor="code">
                      Verification Code
                    </label>
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
                    <p
                      style={{
                        fontSize: "var(--font-xs)",
                        color: "var(--muted)",
                        marginTop: "0.5rem",
                        marginBottom: "0",
                        textAlign: "center",
                      }}
                    >
                      Enter the 6-digit code sent to {email}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--muted)",
                        fontSize: "var(--font-sm)",
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: 0,
                        marginTop: "0.5rem",
                        alignSelf: "center",
                      }}
                    >
                      ← Back to email input
                    </button>
                  </>
                )}

                {message && (
                  <div
                    className={`error ${
                      message.includes("sent") ? "success" : ""
                    }`}
                  >
                    {message}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-12)",
                    width: "100%",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn"
                    style={{
                      flex: 1,
                      background: "var(--border)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
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
                    {loading
                      ? step === 1
                        ? "Sending…"
                        : "Verifying…"
                      : step === 1
                      ? "Send Reset Code"
                      : "Verify Code"}
                  </button>
                </div>

                <p className="helper">
                  Remember your password?{" "}
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

export default ForgotPassword;
