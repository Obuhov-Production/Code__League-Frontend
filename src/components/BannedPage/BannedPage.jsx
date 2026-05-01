import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, clearSession, isLoggedIn } from '@utils/authApi';
import { hasRole } from '@components/Dashboard/db.shared.jsx';
import '@assets/styles/components/banned-page.css';

export default function BannedPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    getMe()
      .then(user => {
        if (!hasRole(user, 'banned')) {
          navigate('/dashboard');
        }
        setChecked(true);
      })
      .catch(() => {
        clearSession();
        navigate('/login');
      });
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  if (!checked) {
    return (
      <div className="banned-loading">
        <div className="banned-spinner" />
      </div>
    );
  }

  return (
    <div className="banned-page">
      <div className="banned-card">
        <span className="banned-kicker">🔒 Акаунт обмежено</span>
        <div className="banned-icon">🚫</div>
        <h1 className="banned-title">Акаунт заблоковано</h1>
        <p className="banned-desc">
          Ваш акаунт було заблоковано адміністратором платформи.<br />
          Доступ до дашборду та будь-яких функцій обмежено.
        </p>
        <p className="banned-sub">
          💬 Якщо ви вважаєте, що це помилка — зверніться до підтримки.
        </p>
        <button className="banned-logout-btn" onClick={handleLogout}>
          Вийти з акаунту
        </button>
      </div>
    </div>
  );
}
