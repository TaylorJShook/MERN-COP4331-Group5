import React, { useState} from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path';

const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const pendingLogin = localStorage.getItem('pendingLogin') || '';

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
        navigate('/login');
      }
    } catch (err) {
      console.error(err);
      setMessage('A network or server error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="verifyDiv" style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
      <div style={{ width: 420, background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Verify Your Email</h2>
        <p style={{ textAlign: 'center', marginBottom: 12 }}>A verification code was sent to the email associated with <strong>{pendingLogin}</strong>.</p>
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="text" placeholder="Enter code" value={code} onChange={e => setCode(e.target.value)} required />
          <button type="submit" disabled={loading} style={{ padding: '10px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4 }}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
        {message && <div style={{ marginTop: 12, color: 'crimson' }}>{message}</div>}
      </div>
    </div>
  );
};

export default VerifyEmail;
