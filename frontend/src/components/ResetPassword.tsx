import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildPath } from './Path';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get parameters from URL
  const login = searchParams.get('login');
  const token = searchParams.get('token');
  const verified = searchParams.get('verified');

  useEffect(() => {
    // If no login parameter, redirect to forgot password page
    if (!login) {
      navigate('/forgot-password');
    }
  }, [login, navigate]);

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      let response;
      
      if (verified === 'true' && token) {
        // User came from ForgotPassword page (code was already verified)
        // Use the token for password reset with email
        response = await fetch(buildPath('api/reset-password-with-token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: login, // login contains the email in this case
            token: token, 
            newPassword: newPassword 
          }),
        });
      } else if (token) {
        // User came from email link
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
          position: 'sticky',
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
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              marginBottom: '1.5rem', 
              color: '#000000',
              margin: '0 0 1.5rem 0'
            }}>
              Set New Password
            </h2>
            
            <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              {/* New Password Field */}
              <div style={{ textAlign: 'left', width: '100%' }}>
                <label htmlFor="newPassword" style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#000000', 
                  marginBottom: '0.5rem' 
                }}>
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

              {/* Confirm Password Field */}
              <div style={{ textAlign: 'left', width: '100%' }}>
                <label htmlFor="confirmPassword" style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#000000', 
                  marginBottom: '0.5rem' 
                }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

                {/* Reset Password Button */}
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
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>

              {/* Error/Success Message */}
              {message && (
                <div style={{ 
                  color: message.includes('successfully') ? '#16a34a' : '#dc2626', 
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

export default ResetPassword;
