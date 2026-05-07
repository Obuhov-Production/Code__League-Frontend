import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoIcon from '@images/logos/logo-48.png';
import {
  forgotPasswordRequest,
  forgotPasswordVerifyCode,
  forgotPasswordReset,
} from '@utils/authApi';
import { useToast } from '@utils/toast.jsx';

const CODE_LENGTH = 6;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState('email'); // email → code → password
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(() => Array(CODE_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [shake, setShake] = useState(false);

  const inputsRef = useRef([]);
  const code = digits.join('');
  const isCodeComplete = code.length === CODE_LENGTH && /^\d{6}$/.test(code);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 'code') inputsRef.current[0]?.focus();
  }, [step]);

  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  const handleRequest = async (e) => {
    e?.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await forgotPasswordRequest(email.trim().toLowerCase());
      setExpiresAt(Date.now() + ((data?.expiresInSec ?? 600) * 1000));
      setResendCooldown(45);
      setStep('code');
      setDigits(Array(CODE_LENGTH).fill(''));
      toast.success('Якщо акаунт існує — код надіслано на пошту');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resending || resendCooldown > 0) return;
    setResending(true);
    try {
      const data = await forgotPasswordRequest(email.trim().toLowerCase());
      setExpiresAt(Date.now() + ((data?.expiresInSec ?? 600) * 1000));
      setResendCooldown(45);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
      toast.success('Новий код надіслано');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!isCodeComplete || submitting) return;
    setSubmitting(true);
    try {
      await forgotPasswordVerifyCode({ email: email.trim().toLowerCase(), code });
      setStep('password');
    } catch (err) {
      toast.error(err.message);
      triggerShake();
      setDigits(Array(CODE_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e?.preventDefault();
    if (newPassword.length < 8) { toast.error('Пароль має містити щонайменше 8 символів'); return; }
    if (newPassword !== confirmPassword) { toast.error('Паролі не співпадають'); return; }
    setSubmitting(true);
    try {
      await forgotPasswordReset({ email: email.trim().toLowerCase(), code, newPassword });
      toast.success('Пароль оновлено! Увійдіть з новим паролем');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.message);
      if (/код/i.test(err.message)) setStep('code');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Code input handlers (как в VerifyEmail) ── */
  const handleCodeChange = (idx, raw) => {
    const onlyDigits = raw.replace(/\D/g, '');
    if (onlyDigits.length > 1) {
      const arr = Array(CODE_LENGTH).fill('');
      onlyDigits.slice(0, CODE_LENGTH).split('').forEach((d, i) => { arr[i] = d; });
      setDigits(arr);
      const lastIdx = Math.min(onlyDigits.length, CODE_LENGTH) - 1;
      inputsRef.current[Math.min(lastIdx + 1, CODE_LENGTH - 1)]?.focus();
      return;
    }
    const next = [...digits];
    next[idx] = onlyDigits.slice(-1);
    setDigits(next);
    if (onlyDigits && idx < CODE_LENGTH - 1) inputsRef.current[idx + 1]?.focus();
  };

  const handleCodeKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        const next = [...digits];
        next[idx - 1] = '';
        setDigits(next);
        inputsRef.current[idx - 1]?.focus();
        e.preventDefault();
      } else if (digits[idx]) {
        const next = [...digits];
        next[idx] = '';
        setDigits(next);
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < CODE_LENGTH - 1) {
      inputsRef.current[idx + 1]?.focus();
    } else if (e.key === 'Enter' && isCodeComplete) {
      handleVerify();
    }
  };

  const handleCodePaste = (e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    const onlyDigits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!onlyDigits) return;
    e.preventDefault();
    const arr = Array(CODE_LENGTH).fill('');
    onlyDigits.split('').forEach((d, i) => { arr[i] = d; });
    setDigits(arr);
    inputsRef.current[Math.min(onlyDigits.length, CODE_LENGTH - 1)]?.focus();
  };

  return (
    <div className="auth-page">
      <div className="auth-body" style={{ paddingTop: 0 }}>
        <div className="verify-card">
          <button
            className="auth-back-btn verify-back"
            type="button"
            onClick={() => {
              if (step === 'email') navigate('/login');
              else if (step === 'code') setStep('email');
              else setStep('code');
            }}
            title="Назад"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="verify-logo">
            <img src={logoIcon} alt="Code League" />
          </div>

          {step === 'email' && (
            <>
              <h1 className="verify-title">Відновлення пароля</h1>
              <p className="verify-subtitle">
                Введіть свій email — ми надішлемо 6-значний код для відновлення.
              </p>
              <form onSubmit={handleRequest} autoComplete="off" style={{ width: '100%' }}>
                <div className="auth-field auth-field--compact" style={{ marginTop: 8 }}>
                  <label htmlFor="fp-email">Email</label>
                  <div className="auth-field-wrap">
                    <input
                      id="fp-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className={`verify-submit${email.trim() ? ' active' : ''}`}
                  disabled={!email.trim() || submitting}
                  style={{ marginTop: 16 }}
                >
                  {submitting ? 'Надсилання...' : 'Надіслати код'}
                </button>
              </form>
              <p className="verify-hint">
                Згадали пароль?{' '}
                <button type="button" className="verify-link" onClick={() => navigate('/login')}>
                  Увійти
                </button>
              </p>
            </>
          )}

          {step === 'code' && (
            <>
              <h1 className="verify-title">Введіть код</h1>
              <p className="verify-subtitle">
                Ми надіслали 6-значний код на<br />
                <strong>{email}</strong>
              </p>

              <div className={`verify-inputs${shake ? ' verify-inputs--shake' : ''}`} onPaste={handleCodePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputsRef.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={d}
                    disabled={submitting}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    className={`verify-input${d ? ' verify-input--filled' : ''}`}
                    aria-label={`Цифра ${i + 1}`}
                  />
                ))}
              </div>

              <button
                className={`verify-submit${isCodeComplete ? ' active' : ''}`}
                onClick={handleVerify}
                disabled={!isCodeComplete || submitting}
                type="button"
              >
                {submitting ? 'Перевірка...' : 'Підтвердити'}
              </button>

              <div className="verify-meta">
                <span className="verify-expires">
                  Код діє {remaining > 0 ? `${mm}:${ss}` : '— прострочено'}
                </span>
                <button
                  type="button"
                  className="verify-resend"
                  onClick={handleResend}
                  disabled={resending || resendCooldown > 0}
                >
                  {resending
                    ? 'Надсилаємо...'
                    : resendCooldown > 0
                      ? `Надіслати знову (${resendCooldown}с)`
                      : 'Надіслати знову'}
                </button>
              </div>
            </>
          )}

          {step === 'password' && (
            <>
              <h1 className="verify-title">Новий пароль</h1>
              <p className="verify-subtitle">Введіть новий пароль (мінімум 8 символів).</p>
              <form onSubmit={handleReset} autoComplete="off" style={{ width: '100%' }}>
                <div className="auth-field auth-field--compact" style={{ marginTop: 8 }}>
                  <label htmlFor="fp-pwd">Новий пароль</label>
                  <div className="auth-field-wrap">
                    <input
                      id="fp-pwd"
                      type={showPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={48}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <div className="auth-field auth-field--compact" style={{ marginTop: 10 }}>
                  <label htmlFor="fp-pwd2">Підтвердження пароля</label>
                  <div className="auth-field-wrap">
                    <input
                      id="fp-pwd2"
                      type={showPwd ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      style={{ paddingRight: 48 }}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-pw"
                      onClick={() => setShowPwd((v) => !v)}
                    >
                      {showPwd ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className={`verify-submit${(newPassword.length >= 8 && newPassword === confirmPassword) ? ' active' : ''}`}
                  disabled={submitting || newPassword.length < 8 || newPassword !== confirmPassword}
                  style={{ marginTop: 16 }}
                >
                  {submitting ? 'Збереження...' : 'Змінити пароль'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
