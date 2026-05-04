/* короче погнали писать код кст пишу на клаві без укр розкладки (тут тіки з англ) це всьо ваше Temu віновате */
import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from '@images/logos/logo.png';
import logoIcon from '@images/logos/logo-48.png';
import matrixFrame from '@images/decorations/matrix_biger.png';
import { getTournaments, loginUser, saveSession, saveUser, consumeOAuthTokenFromUrl, OAUTH_URLS, CHECK_BACKEND } from '@utils/authApi';
import { useToast } from '@utils/toast.jsx';

function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tournamentPreview, setTournamentPreview] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);

  const isActive = email.trim() !== '' && password.trim() !== '';

  const previewData = useMemo(() => {
    if (!tournamentPreview) return null;
    const targetDate = tournamentPreview.status === 'registration'
      ? tournamentPreview.registration_end || tournamentPreview.end_date
      : tournamentPreview.end_date || tournamentPreview.registration_end;
    const ms = targetDate ? new Date(targetDate) - new Date() : 0;
    const daysLeft = ms > 0 ? Math.max(1, Math.ceil(ms / 86400000)) : 0;
    return {
      ...tournamentPreview,
      daysLeft,
      teamCount: tournamentPreview.teams_count ?? tournamentPreview.team_count ?? 0,
      description: tournamentPreview.description || 'Join the next Code League event and battle for the top prize.',
    };
  }, [tournamentPreview]);

  useEffect(() => {
    const oauth = consumeOAuthTokenFromUrl();
    if (oauth.status === 'success') {
      if (oauth.user) saveUser(oauth.user);
      toast.success('Успішний вхід через провайдера!');
      navigate('/dashboard', { replace: true });
      return;
    }

    if (oauth.status === 'error') {
      toast.error(oauth.message);
    }
  }, [navigate, toast]);

  useEffect(() => {
    const fallbackTournament = {
      id: 0,
      name: 'Local tournament 2026',
      description: 'this is local example tournament for preview purposes. Join the next Code League event and battle for the top prize.',
      status: 'running',
      end_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      teams_count: 67, /* о май гад 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 */
    };

    const loadPreview = async () => {
      if (!CHECK_BACKEND) {
        setTournamentPreview(fallbackTournament);
        return;
      }

      try {
        const tournaments = await getTournaments();
        const candidates = Array.isArray(tournaments)
          ? tournaments.filter((t) => ['registration', 'running'].includes(t.status))
          : [];
        const list = candidates.length ? candidates : Array.isArray(tournaments) ? tournaments : [];

        if (list.length > 0) {
          setTournamentPreview(list[Math.floor(Math.random() * list.length)]);
        } else {
          setTournamentPreview(fallbackTournament);
        }
      } catch {
        setTournamentPreview(fallbackTournament);
      }
    };

    loadPreview();
  }, []);

  const loginWithProvider = (provider) => {
    const url = OAUTH_URLS[provider];
    if (url) {
      window.location.href = url;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isActive || loading) return;

    // Dev-режим: VITE_CHECK_BACKEND=false → пропускаємо запит до бекенду для авторизации
    if (!CHECK_BACKEND) {
      toast.success('Dev-mode: вхід без бекенду!');
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      saveSession(data.token);
      if (data.user) saveUser(data.user);
      toast.success('Вітаємо знову у системі!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-body" style={{paddingTop: 0}}>
        <div className="auth-card auth-card--compact">
          {/* Left — form */}
          <div className="auth-form-col auth-form-col--compact">
            <button className="auth-back-btn" type="button" onClick={() => navigate('/')} title="На головну">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button className="auth-logo-top" type="button" onClick={() => navigate('/')} title="На головну">
              <img src={logoIcon} alt="Code League" />
            </button>
            <h2 className="auth-title-main">Welcome Back!</h2>
            <p className="auth-subtitle-main">Sign in to continue accessing your dashboard</p>
            <div className="auth-social-group">
              <button type="button" className="auth-social-btn" onClick={() => loginWithProvider('google')}>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign in with Google
              </button>
              <button type="button" className="auth-social-btn" onClick={() => loginWithProvider('github')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.09-.75.08-.74.08-.74 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.48.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013.01-.4c1.02.01 2.05.14 3.01.4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.015 2.89-.015 3.28 0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                Sign in with GitHub
              </button>
              <button type="button" className="auth-social-btn" onClick={() => loginWithProvider('discord')}>
                <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="#5865F2">
                  <path d="M107.7 8.07A105.15 105.15 0 0081.47 0a72.06 72.06 0 00-3.36 6.83 97.68 97.68 0 00-29.11 0A72.37 72.37 0 0045.64 0a105.89 105.89 0 00-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0032.17 16.15 77.7 77.7 0 006.89-11.11 68.42 68.42 0 01-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0064.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 01-10.87 5.19 77 77 0 006.89 11.1 105.25 105.25 0 0032.19-16.14c2.64-27.38-4.51-51.11-19.01-72.14zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/>
                </svg>
                Sign in with Discord
              </button>
            </div>
            <div className="auth-form-separator"><span>OR</span></div>
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="auth-field auth-field--compact">
                <label htmlFor="login-email">Email address</label>
                <div className="auth-field-wrap">
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                    minLength="6"
                  />
                </div>
              </div>
              <div className="auth-field auth-field--compact" style={{ marginTop: '10px' }}>
                <label htmlFor="login-password">Password</label>
                <div className="auth-field-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    style={{ paddingRight: '48px' }}
                    disabled={loading}
                    minLength="8"
                    maxLength="48"
                  />
                  <button
                    type="button"
                    className="toggle-pw"
                    onClick={() => setShowPassword((v) => !v)}
                  >
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
              <div className="auth-form-actions" style={{marginTop: '8px'}}>
                <label className="auth-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" className="auth-forgot-link">
                  Forgot password?
                </Link>
              </div>
              <br></br>
              <p className="auth-note" style={{ marginTop: '8px' }}>
                Don`t have a profile?{' '}
                <Link to="/register">Register now</Link>
              </p>
              <button
                type="submit"
                className={`auth-submit-btn auth-submit-btn--compact${isActive ? ' active' : ''}`}
                disabled={!isActive || loading}
              >
                {loading ? 'Logging in...' : 'Sign in'}
              </button>
            </form>
          </div>
          {/* Right — preview */}
          <div className="auth-preview-col auth-preview-col--compact">
            <div
              className="auth-preview auth-preview--compact"
              style={{ backgroundImage: `url(${matrixFrame})`, backgroundPosition: 'center center', backgroundSize: 'cover', minHeight: 340, maxHeight: 340 }}
            >
              <div className="auth-preview-top">Secure Connection</div>
              <div className="auth-preview-card auth-preview-card--compact">
                <span className="auth-preview-tag">TOURNAMENTS</span>
                <h3>{previewData?.name || 'Live tournament preview'}</h3>
                <p>{previewData?.description}</p>
                <div className="auth-preview-meta">
                  <span>{previewData?.daysLeft ?? '—'} Days Left</span>
                  <span>{previewData?.teamCount ?? 0} Teams</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;


