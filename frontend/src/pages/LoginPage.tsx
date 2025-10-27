import React from 'react';
import PageTitle from '../components/PageTitle.tsx';
import Login from '../components/Login.tsx';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <PageTitle />
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <Login />

        <div className="flex items-center justify-center my-4">
          <hr className="w-1/4 border-gray-300" />
          <span className="mx-2 text-gray-500 text-sm">or</span>
          <hr className="w-1/4 border-gray-300" />
        </div>

        <button
          type="button"
          onClick={() => navigate('/register')}
          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
        >
          Create New Account
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
