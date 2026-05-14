import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import useAuth from '../hooks/useAuth';

const VerifyOtp = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post('/api/auth/verify-otp', { email, otp });
      if (response.data.success) {
        login(response.data.user);
        // Redirect back to the page user was trying to access or dashboard
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Verification failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 space-y-8 animate-scale-in">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-success-500 to-success-600 shadow-lg mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-text-primary">Verify OTP</h2>
          <p className="text-text-tertiary mt-2 font-medium">Sent to: <span className="text-text-primary font-bold">{email}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="otp" className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">
              6-Digit Code
            </label>
            <input
              id="otp"
              type="text"
              required
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="block w-full px-5 py-4 rounded-2xl bg-bg-secondary border border-border-primary text-text-primary focus:ring-2 focus:ring-success-500 focus:border-transparent transition-all outline-none text-3xl font-black tracking-[1rem] text-center"
              placeholder="000000"
            />
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-sm font-bold ${message.type === 'error' ? 'bg-danger-50 text-danger-600 border border-danger-100' : 'bg-success-50 text-success-600 border border-success-100'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full flex justify-center items-center py-4 px-6 rounded-2xl text-white font-bold bg-text-primary hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              'Verify & Login'
            )}
          </button>
        </form>

        <div className="text-center">
          <button 
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm font-bold text-primary-600 hover:text-primary-700 underline underline-offset-4"
          >
            Wrong email? Go back
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
