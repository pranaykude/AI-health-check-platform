import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post('/api/auth/request-otp', { email });
      if (response.data.success) {
        navigate('/verify', { state: { email } });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Something went wrong. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 space-y-8 animate-scale-in">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden shadow-lg mb-6 bg-white border border-gray-100">
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTR1QYVDNDThbfYGmujAjzdFQv1ag3BxUxqig&s" 
              alt="HealthCheck Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-3xl font-black text-text-primary">Welcome Back</h2>
          <p className="text-text-tertiary mt-2 font-medium">Enter your email to receive a login OTP</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-5 py-4 rounded-2xl bg-bg-secondary border border-border-primary text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none text-lg font-medium"
              placeholder="name@company.com"
            />
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-sm font-bold ${message.type === 'error' ? 'bg-danger-50 text-danger-600 border border-danger-100' : 'bg-success-50 text-success-600 border border-success-100'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-4 px-6 rounded-2xl text-white font-bold auth-submit-btn transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-lg border-none"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              'Send OTP Code'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-text-tertiary font-medium">
          Protected by HealthCheck AI Security
        </p>
      </div>
    </div>
  );
};

export default Login;
