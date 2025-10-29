import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: email input, 2: code input
  const navigate = useNavigate();

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(buildPath('api/request-password-reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.sent) {
        setMessage('Password reset email sent! Check your inbox.');
        setStep(2); // Move to code input step
      } else {
        setMessage(data.error || 'Failed to send reset email.');
      }
    } catch (err) {
      console.error(err);
      setMessage('A network or server error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      // Verify the code using the new verification endpoint
      const response = await fetch(buildPath('api/verify-reset-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email,
          code: code
        }),
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        let errorMessage = 'Invalid verification code.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response isn't JSON (e.g., HTML error page), use status info
          errorMessage = `Server error: ${response.status}. Please try again.`;
        }
        setMessage(errorMessage);
        return;
      }

      // Safe to parse JSON - response is OK
      const data = await response.json();

      if (data.verified) {
        // Code is valid, redirect to reset password page with token
        navigate(`/reset-password?login=${encodeURIComponent(email)}&token=${data.resetToken}&verified=true`);
      } else {
        setMessage(data.error || 'Invalid verification code.');
      }
    } catch (err) {
      console.error('Network error:', err);
      setMessage('Unable to connect to server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div style={{ margin: 0, padding: 0 }}>
      {/* Header Banner - Light Green - Full Width */}
      <div
        style={{
          backgroundColor: '#AECEB3',
          padding: '1.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          width: '100%',            
          boxSizing: 'border-box',
          minHeight: '4rem',
          marginTop: 0,
          marginBottom: 0,
          position: 'sticky',       // optional: keep attached to top
          top: 0,
          zIndex: 1000,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%',
            padding: '0 1rem',
          }}
        >
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#000000',
              margin: 0,
            }}
          >
            Daily Task Planner
          </h1>
        </div>
      </div>

      {/* Main Content Container */}
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'white', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        {/* Main Content */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '3rem 1rem',
          gap: '2rem'
        }}>
          {/* Main Title */}
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: 'bold', 
            color: '#000000', 
            margin: 0,
            textAlign: 'center'
          }}>
            Reset Password
          </h1>

          {/* Reset Password Form */}
          <div style={{ 
            backgroundColor: '#BCC7BD', 
            borderRadius: '0.5rem', 
            padding: '2rem', 
            width: '100%', 
            maxWidth: '28rem',
            border: '1px solid #e0e0e0'
          }}>
            <form onSubmit={step === 1 ? handleResetPassword : handleCodeVerification} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              {/* Step 1: Email Field */}
              {step === 1 && (
                <div style={{ textAlign: 'left', width: '100%' }}>
                  <label htmlFor="email" style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#000000', 
                    marginBottom: '0.5rem' 
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    placeholder="Value"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d0d0d0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      backgroundColor: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Step 2: Code Field */}
              {step === 2 && (
                <div style={{ textAlign: 'left', width: '100%' }}>
                  <label htmlFor="code" style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#000000', 
                    marginBottom: '0.5rem' 
                  }}>
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="code"
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    maxLength={6}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d0d0d0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      backgroundColor: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: '#666666', 
                    marginTop: '0.25rem',
                    marginBottom: 0
                  }}>
                    Enter the 6-digit code sent to {email}
                  </p>
                </div>
              )}

              {/* Action Buttons Row */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                width: '100%',
                marginTop: '1rem'
              }}>
                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    borderRadius: '0.375rem',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    border: '1px solid #d0d0d0',
                    cursor: 'pointer',
                    backgroundColor: '#f5f5f5',
                    color: '#000000',
                    boxSizing: 'border-box'
                  }}
                >
                  Cancel
                </button>

                {/* Step-specific Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    borderRadius: '0.375rem',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    backgroundColor: loading ? '#9ca3af' : '#343a40',
                    color: 'white',
                    boxSizing: 'border-box'
                  }}
                >
                  {loading 
                    ? (step === 1 ? 'Sending...' : 'Verifying...') 
                    : (step === 1 ? 'Send Reset Code' : 'Verify Code')
                  }
                </button>
              </div>

              {/* Step 2: Back Button */}
              {step === 2 && (
                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666666',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    ← Back to email input
                  </button>
                </div>
              )}

              {/* Error/Success Message */}
              {message && (
                <div style={{ 
                  color: message.includes('sent') ? '#16a34a' : '#dc2626', 
                  fontSize: '0.875rem', 
                  textAlign: 'center', 
                  marginTop: '1rem',
                  width: '100%'
                }}>
                  {message}
                </div>
              )}
            </form>

            {/* Back to Sign In Button */}
            <div style={{ marginTop: '1rem' }}>
              <a 
                href="/" 
                style={{ 
                  display: 'block',
                  width: '100%',
                  padding: '0.875rem',
                  backgroundColor: '#343a40',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}
              >
                Back to Sign In
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
