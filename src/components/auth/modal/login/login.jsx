/* короче погнали писать код) фух */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from '@images/logos/logo.png';
import logoIcon from '@images/logos/logo-48.png';
import Footer from '@components/Footer';
import { loginUser, saveSession, saveUser, consumeOAuthTokenFromUrl, OAUTH_URLS, CHECK_BACKEND } from '@utils/authApi';
import { useToast } from '@utils/toast.jsx';

function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isActive = email.trim() !== '' && password.trim() !== '';

  useEffect(() => {
    const oauth = consumeOAuthTokenFromUrl();
    if (oauth.status === 'success') {
      if (oauth.user) saveUser(oauth.user);
      toast.success('Успішний вхід через OAuth');
      navigate('/dashboard', { replace: true });
      return;
    }

    if (oauth.status === 'error') {
      toast.error(oauth.message);
    }
  }, [navigate, toast]);

  const loginWithProvider = (provider) => {
    window.location.href = provider === 'google' ? OAUTH_URLS.google : OAUTH_URLS.discord;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isActive || loading) return;

    // Dev-режим: VITE_CHECK_BACKEND=false → пропускаємо запит до бекенду для авторизации
    if (!CHECK_BACKEND) {
      toast.success('Dev-режим: вхід без бекенду');
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      saveSession(data.token);
      if (data.user) saveUser(data.user);
      toast.success('Вітаємо знову!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Top nav */}
      <nav className="auth-nav">
        <Link to="/" className="logo">
          <img src={logoImg} alt="Code League" className="logo-icon" />
          <span className="logo-text">Code League</span>
        </Link>
      </nav>

      {/* Main content */}
      <div className="auth-body">
        {/* Icon + title */}
        <div className="auth-title-block">
          <img src={logoIcon} alt="App icon" className="auth-app-icon" />
          <h1>Welcome back!</h1>
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Left - form */}
          <div className="auth-form-col">
            <h2>Sign in to access your dashboard</h2>

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="auth-field">
                <label htmlFor="login-email">Email address</label>
                <div className="auth-field-wrap">
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="auth-field" style={{ marginTop: '14px' }}>
                <label htmlFor="login-password">Password</label>
                <div className="auth-field-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    style={{ paddingRight: '64px' }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-pw"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {/* Eye icon */}
                    <svg viewBox="0 0 24 24" strokeWidth="2">
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <p className="auth-note" style={{ marginTop: '10px' }}>
                Don`t have a profile?{' '}
                <Link to="/register">Register now</Link>
              </p>

              <button
                type="submit"
                className={`auth-submit-btn${isActive ? ' active' : ''}`}
                style={{ marginTop: '18px' }}
                disabled={!isActive || loading}
              >
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
          </div>

          {/* Divider */}
          <div className="auth-divider">
            <span>OR</span>
          </div>

          {/* Right - social */}
          <div className="auth-social-col">
            <button type="button" className="auth-social-btn" onClick={() => loginWithProvider('google')}>
              {/* Google icon */}
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <button type="button" className="auth-social-btn" onClick={() => loginWithProvider('github')}>
              {/* GitHub icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.09-.75.08-.74.08-.74 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.48.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013.01-.4c1.02.01 2.05.14 3.01.4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.015 2.89-.015 3.28 0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>

            <button type="button" className="auth-social-btn" onClick={() => loginWithProvider('discord')}>
              {/* Discord icon */}
              <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="#5865F2">
                <path d="M107.7 8.07A105.15 105.15 0 0081.47 0a72.06 72.06 0 00-3.36 6.83 97.68 97.68 0 00-29.11 0A72.37 72.37 0 0045.64 0a105.89 105.89 0 00-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0032.17 16.15 77.7 77.7 0 006.89-11.11 68.42 68.42 0 01-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0064.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 01-10.87 5.19 77 77 0 006.89 11.1 105.25 105.25 0 0032.19-16.14c2.64-27.38-4.51-51.11-19.01-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/>
              </svg>
              Continue with Discord
            </button>

            <a href="/register" type="button" className="auth-social-btn">
              {/* Email icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="3"/>
                <path d="M2 7l10 7 10-7"/>
              </svg>
              Create new account
            </a>
          </div>
        </div>

        {/* Below card */}
        <div className="auth-below-card">
          <Link to="/register">Don`t have a profile?</Link>
          <p>
            Secure login with CODE LEAGUE:&nbsp;
            <a href="/terms">Terms</a>
            <span>&nbsp;|&nbsp;</span>
            <a href="/privacy">Privacy</a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default LoginPage;


