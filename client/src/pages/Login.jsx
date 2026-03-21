import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const result = await forgotPassword(resetEmail, newPassword);
    setLoading(false);

    if (result.success) {
      setResetMessage(result.message || 'Password reset successful. Please login.');
      setShowForgotPassword(false);
      setResetEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(result.message || 'Password reset failed');
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-70px)] items-center justify-center overflow-hidden bg-[radial-gradient(640px_380px_at_20%_16%,rgba(47,245,168,0.26),transparent_72%),linear-gradient(145deg,#27332e_0%,#1f2925_100%)] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(rgba(35,248,170,0.85)_0.7px,transparent_0.7px)] [background-size:8px_8px]" />
      <div className="relative z-10 w-full max-w-112.5 rounded-2xl border border-[#2ff5a838] bg-white/10 p-8 text-[#e8f2ed] shadow-2xl backdrop-blur">
        <h1 className="mb-2 text-center text-3xl font-bold text-[#e8f2ed]">TraceHub</h1>
        <h2 className="mb-8 text-center text-2xl font-bold text-[#e8f2ed]">Login</h2>
        
        {error && <div className="mb-4 flex items-center justify-between rounded-lg border-l-4 border-red-500 bg-red-100 px-4 py-3 font-medium text-red-900">{error}</div>}
        {resetMessage && <div className="mb-4 rounded-lg border-l-4 border-emerald-500 bg-emerald-100 px-4 py-3 font-medium text-emerald-900">{resetMessage}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6 flex flex-col">
            <label htmlFor="email" className="mb-3 text-sm font-semibold text-[#d8ebe3]">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] outline-none transition placeholder:text-[#9ec0b2] focus:border-[#2ff5a8] focus:ring-2 focus:ring-[#2ff5a866]"
            />
          </div>

          <div className="mb-6 flex flex-col">
            <label htmlFor="password" className="mb-3 text-sm font-semibold text-[#d8ebe3]">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] outline-none transition placeholder:text-[#9ec0b2] focus:border-[#2ff5a8] focus:ring-2 focus:ring-[#2ff5a866]"
            />
          </div>

          <button type="submit" disabled={loading} className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-[#2ff5a8] bg-[#2ff5a8] px-4 py-3 text-sm font-bold uppercase tracking-wide text-[#142019] transition hover:-translate-y-0.5 hover:bg-[#24d993] disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <button
          type="button"
          className="mt-3 inline-flex w-full items-center justify-center py-2 text-sm font-semibold text-[#cde1d9] transition hover:text-white"
          onClick={() => {
            setShowForgotPassword((prev) => !prev);
            setError('');
          }}
        >
          {showForgotPassword ? 'Close reset form' : 'Forgot Password?'}
        </button>

        {showForgotPassword && (
          <form onSubmit={handleResetPassword} className="mt-4 rounded-xl border border-[#2ff5a838] bg-[#1f2925b3] p-4">
            <div className="mb-5 flex flex-col">
              <label htmlFor="resetEmail" className="mb-3 text-sm font-semibold text-[#d8ebe3]">Registered Email</label>
              <input
                id="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] outline-none transition placeholder:text-[#9ec0b2] focus:border-[#2ff5a8] focus:ring-2 focus:ring-[#2ff5a866]"
              />
            </div>

            <div className="mb-5 flex flex-col">
              <label htmlFor="newPassword" className="mb-3 text-sm font-semibold text-[#d8ebe3]">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] outline-none transition placeholder:text-[#9ec0b2] focus:border-[#2ff5a8] focus:ring-2 focus:ring-[#2ff5a866]"
              />
            </div>

            <div className="mb-5 flex flex-col">
              <label htmlFor="confirmPassword" className="mb-3 text-sm font-semibold text-[#d8ebe3]">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter new password"
                className="w-full rounded-lg border border-[#2ff5a838] bg-[#1f2925cc] px-4 py-3 text-[#e8f2ed] outline-none transition placeholder:text-[#9ec0b2] focus:border-[#2ff5a8] focus:ring-2 focus:ring-[#2ff5a866]"
              />
            </div>

            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-[#e8f2ed] transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="mt-8 border-t border-[#2ff5a838] pt-6 text-center text-sm text-[#bcd2c9]">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
