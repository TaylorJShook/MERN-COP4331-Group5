import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPath } from './Path';
import { storeToken } from '../tokenStorage';
import { jwtDecode } from 'jwt-decode';

function Login() {
  const [message, setMessage] = useState('');
  const [loginName, setLoginName] = React.useState('');
  const [loginPassword, setPassword] = React.useState('');
  const navigate = useNavigate();

  async function doLogin(event: any): Promise<void> {
    event.preventDefault();

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
      const userId = decoded.iat;
      const firstName = decoded.firstName;
      const lastName = decoded.lastName;

      if (!userId || userId <= 0) {
        setMessage('User/Password combination incorrect');
      } else {
        const user = { firstName, lastName, id: userId };
        localStorage.setItem('user_data', JSON.stringify(user));
        navigate('/todo'); // instead of window.location.href
      }
    } catch (error: any) {
      alert(error.toString());
    }
  }

  return (
    <div id="loginDiv">
      <span id="inner-title">PLEASE LOG IN</span>
      <br />
      Login:{' '}
      <input
        type="text"
        id="loginName"
        placeholder="Username"
        onChange={(e) => setLoginName(e.target.value)}
      />
      <br />
      Password:{' '}
      <input
        type="password"
        id="loginPassword"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="submit"
        id="loginButton"
        className="buttons"
        value="Do It"
        onClick={doLogin}
      />
      <span id="loginResult">{message}</span>
    </div>
  );
}

export default Login;
