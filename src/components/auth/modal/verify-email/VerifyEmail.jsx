import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoIcon from '@images/logos/logo-48.png';
import {
  verifyEmailCode,
  resendEmailCode,
  saveSession,
  saveUser,
  loadPendingVerification,
  savePendingVerification,
  clearPendingVerification,
} from '@utils/authApi';
import { useToast } from '@utils/toast.jsx';

const CODE_LENGTH = 6;

function VerifyEmailPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [pending, setPending] = useState(() => loadPendingVerification());
  const [digits, setDigits] = useState(() => Array(CODE_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + ((pending?.expiresInSec ?? 600) * 1000));
  const [now, setNow] = useState(Date.now());
  const [shake, setShake] = useState(false);

  const inputsRef = useRef([]);

  const code = digits.join('');
  const isComplete = code.length === CODE_LENGTH && /^\d{6}$/.test(code);

  /* ── Якщо немає pending у sessionStorage — повертаємо на /login ── */
  useEffect(() => {
    if (!pending?.pendingToken) {
      navigate('/login', { replace: true });
    }
  }, [pending, navigate]);

  /* ── Auto-focus перший пустий інпут ── */
  useEffect(() => {
    const idx = digits.findIndex((d) => d === '');
    const target = inputsRef.current[idx === -1 ? CODE_LENGTH - 1 : idx];
    target?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Тікер для countdown коду + cooldown resend ── */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  /* ── Авто-сабміт коли всі 6 цифр введено ── */
  useEffect(() => {
    if (isComplete && !submitting) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const expiresInSec = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const expiresMin   = Math.floor(expiresInSec / 60);
  const expiresRem   = expiresInSec % 60;
  const expiredDisplay = `${expiresMin}:${String(expiresRem).padStart(2, '0')}`;

  const maskedEmail = useMemo(() => {
    const e = pending?.email || '';
    const [local, domain] = e.split('@');
    if (!domain) return e;
    const masked = local.length <= 2 ? local[0] + '*' : local[0] + '*'.repeat(local.length - 2) + local.slice(-1);
    return `${masked}@${domain}`;
  }, [pending]);

  const handleChange = (idx, raw) => {
    const onlyDigits = raw.replace(/\D/g, '');

    // Підтримка вставки 6 цифр одразу (paste)
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

    if (onlyDigits && idx < CODE_LENGTH - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        // Перейти на попередній інпут і очистити
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
    } else if (e.key === 'Enter' && isComplete) {
      handleSubmit();
    }
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    const onlyDigits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!onlyDigits) return;
    e.preventDefault();
    const arr = Array(CODE_LENGTH).fill('');
    onlyDigits.split('').forEach((d, i) => { arr[i] = d; });
    setDigits(arr);
    inputsRef.current[Math.min(onlyDigits.length, CODE_LENGTH - 1)]?.focus();
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  const handleSubmit = async () => {
    if (!isComplete || submitting || !pending?.pendingToken) return;
    setSubmitting(true);
    try {
      const data = await verifyEmailCode({ pendingToken: pending.pendingToken, code });
      saveSession(data.token || data.accessToken);
      if (data.user) saveUser(data.user);
      clearPendingVerification();
      toast.success('Пошту підтверджено! Вітаємо');
      localStorage.setItem('db_tab', 'overview');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Невірний код');
      triggerShake();
      setDigits(Array(CODE_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resending || resendCooldown > 0 || !pending?.pendingToken) return;
    setResending(true);
    try {
      const data = await resendEmailCode({ pendingToken: pending.pendingToken });
      const next = {
        ...pending,
        pendingToken: data.pendingToken,
        expiresInSec: data.expiresInSec,
      };
      setPending(next);
      savePendingVerification(next);
      setExpiresAt(Date.now() + (data.expiresInSec * 1000));
      setResendCooldown(45);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
      toast.success('Новий код надіслано');
    } catch (err) {
      toast.error(err.message || 'Не вдалося надіслати код');
    } finally {
      setResending(false);
    }
  };

  if (!pending?.pendingToken) return null;

  return (
    <div className="auth-page">
      <div className="auth-body" style={{ paddingTop: 0 }}>
        <div className="verify-card">
          <button
            className="auth-back-btn verify-back"
            type="button"
            onClick={() => { clearPendingVerification(); navigate('/login'); }}
            title="Назад"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="verify-logo">
            <img src={logoIcon} alt="Code League" />
          </div>

          <h1 className="verify-title">Підтвердіть пошту</h1>
          <p className="verify-subtitle">
            Ми надіслали 6-значний код на<br />
            <strong>{maskedEmail}</strong>
          </p>

          <div className={`verify-inputs${shake ? ' verify-inputs--shake' : ''}`} onPaste={handlePaste}>
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
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className={`verify-input${d ? ' verify-input--filled' : ''}`}
                aria-label={`Цифра ${i + 1}`}
              />
            ))}
          </div>

          <button
            className={`verify-submit${isComplete ? ' active' : ''}`}
            onClick={handleSubmit}
            disabled={!isComplete || submitting}
            type="button"
          >
            {submitting ? 'Перевірка...' : 'Підтвердити'}
          </button>

          <div className="verify-meta">
            <span className="verify-expires">
              Код діє {expiresInSec > 0 ? expiredDisplay : '— прострочено'}
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

          <p className="verify-hint">
            Не отримали лист? Перевірте папку «Спам» або
            {' '}<button type="button" className="verify-link" onClick={() => { clearPendingVerification(); navigate('/login'); }}>увійдіть з іншою поштою</button>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
