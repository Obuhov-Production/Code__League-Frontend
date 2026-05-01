import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, clearSession, isLoggedIn } from '@utils/authApi';
import { hasRole } from '@components/Dashboard/db.shared.jsx';

export default function BannedPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    getMe()
      .then(user => {
        // If user is no longer banned — redirect to dashboard
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0814' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #7c5ff5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="banned-page">
      <div className="banned-card">
        <div className="banned-icon">🚫</div>
        <h1 className="banned-title">Акаунт заблоковано</h1>
        <p className="banned-desc">
          Ваш акаунт було заблоковано адміністратором платформи.<br />
          Доступ до дашборду та будь-яких функцій обмежено.
        </p>
        <p className="banned-sub">
          Якщо ви вважаєте, що це помилка — зверніться до підтримки.
        </p>
        <button className="banned-logout-btn" onClick={handleLogout}>
          Вийти з акаунту
        </button>
      </div>
    </div>
  );
}
