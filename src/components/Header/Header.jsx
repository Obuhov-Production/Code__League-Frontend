import { useState } from 'react';
import { Link } from 'react-router-dom';
import logoImg from '@images/logos/logo.png';
import { isLoggedIn, clearSession } from '@utils/authApi';
import { useToast } from '@utils/toast.jsx';

function Header() {
  const toast = useToast();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  const handleLogout = () => {
    clearSession();
    setLoggedIn(false);
    toast.info('Ви вийшли з акаунту');
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logoImg} alt="Code League" className="logo-icon" />
            <span className="logo-text">Code League</span>
          </Link>

          <nav className="navigation">
            <a href="#home" className="nav-link">Головна</a>
            <a href="#services" className="nav-link">Сервіси</a>
            <a href="#about" className="nav-link">Про нас</a>
            <a href="#reviews" className="nav-link">Відгуки</a>
            <a href="#contacts" className="nav-link">Контакти</a>
          </nav>

          {loggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link to="/dashboard" className="cta-button" style={{ textDecoration: 'none' }}>
                Кабінет
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e0e0e0',
                  background: 'transparent', fontFamily: 'Poppins, sans-serif',
                  fontSize: 14, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Вийти
              </button>
            </div>
          ) : (
            <Link to="/login" className="cta-button" style={{ textDecoration: 'none' }}>
              Почати зараз
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;