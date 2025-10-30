import React, { useState} from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path';

const Register: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

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

          {/* Register Form */}
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
              Create Account
            </h2>
            
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              {/* First Name Field */}
              <div style={{ textAlign: 'left', width: '100%' }}>
                <label htmlFor="firstName" style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#000000', 
                  marginBottom: '0.5rem' 
                }}>
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  placeholder="Value"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  style={{
                    color: 'black',
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

              {/* Last Name Field */}
              <div style={{ textAlign: 'left', width: '100%' }}>
                <label htmlFor="lastName" style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#000000', 
                  marginBottom: '0.5rem' 
                }}>
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  placeholder="Value"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  style={{
                    color: 'black',
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

              {/* Email Field */}
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
                    color: 'black',
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

              {/* Username Field */}
              <div style={{ textAlign: 'left', width: '100%' }}>
                <label htmlFor="login" style={{ 
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
                  id="login"
                  placeholder="Value"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  style={{
                    color: 'black',
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
                <label htmlFor="password" style={{ 
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
                  id="password"
                  placeholder="Value"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    color: 'black',
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

              {/* Register Button */}
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
                {loading ? 'Registering...' : 'Register'}
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

            {/* Login Link */}
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <p style={{ 
                color: '#000000', 
                fontSize: '0.875rem', 
                margin: '0 0 0.5rem 0' 
              }}>
                Already have an account?
              </p>
              <a 
                href="/" 
                style={{ 
                  color: '#2563eb', 
                  fontSize: '0.875rem',
                  textDecoration: 'none'
                }}
              >
                Log in
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
