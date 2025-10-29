import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path';
import { storeToken } from '../tokenStorage';
import { jwtDecode } from 'jwt-decode';

function Login() {
  const [message, setMessage] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
          Daily Task Planner
        </h1>

        {/* Subtitle */}
        <p style={{ 
          color: '#000000', 
          margin: 0,
          fontSize: '1.125rem',
          textAlign: 'center'
        }}>
          Use our app to track your tasks!
        </p>

        {/* Login Form */}
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
            Log In
          </h2>
          
          <form onSubmit={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            {/* Username Field */}
            <div style={{ textAlign: 'left', width: '100%' }}>
              <label htmlFor="loginName" style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#000000', 
                marginBottom: '0.5rem' 
              }}>
                Username
              </label>
              <input
                type="text"
                id="loginName"
                placeholder="Value"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
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

            {/* Password Field */}
            <div style={{ textAlign: 'left', width: '100%' }}>
              <label htmlFor="loginPassword" style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#000000', 
                marginBottom: '0.5rem' 
              }}>
                Password
              </label>
              <input
                type="password"
                id="loginPassword"
                placeholder="Value"
                value={loginPassword}
                onChange={(e) => setPassword(e.target.value)}
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

            {/* Forgot Password Link */}
            <div style={{ textAlign: 'left', marginBottom: '0.5rem', width: '100%' }}>
              <a 
                href="/forgot-password" 
                style={{ 
                  color: '#666666', 
                  fontSize: '0.875rem',
                  textDecoration: 'none'
                }}
              >
                Forgot password?
              </a>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '0.375rem',
                fontWeight: '500',
                fontSize: '0.875rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                backgroundColor: loading ? '#9ca3af' : '#343a40',
                color: 'white',
                marginBottom: '1rem',
                boxSizing: 'border-box'
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Error Message */}
            {message && (
              <div style={{ 
                color: '#dc2626', 
                fontSize: '0.875rem', 
                textAlign: 'center', 
                marginBottom: '1rem',
                width: '100%'
              }}>
                {message}
              </div>
            )}
          </form>

          {/* Register Button */}
          <div style={{ width: '100%' }}>
            <a 
              href="/register" 
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
              Register
            </a>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Login;
