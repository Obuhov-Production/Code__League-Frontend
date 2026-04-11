import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImg from '@images/logos/logo.png';
import { isLoggedIn, clearSession } from '@utils/authApi';
import { useToast } from '@utils/toast.jsx';

function Header() {
  const toast = useToast();
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [menuOpen, setMenuOpen] = useState(false);
  const rootPrefix = location.pathname === '/' ? '' : '/';

  const sectionHref = (id) => `${rootPrefix}#${id}`;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMenuOpen(false);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleLogout = () => {
    clearSession();
    setLoggedIn(false);
    setMenuOpen(false);
    toast.info('Ви вийшли з акаунту');
  };

  const closeMenu = () => setMenuOpen(false);

  const actions = loggedIn ? (
    <>
      <Link to="/dashboard" className="cta-button" style={{ textDecoration: 'none' }} onClick={closeMenu}>
        Кабінет
      </Link>
      <button
        onClick={handleLogout}
        className="header-logout-btn"
      >
        Вийти
      </button>
    </>
  ) : (
    <Link to="/login" className="cta-button" style={{ textDecoration: 'none' }} onClick={closeMenu}>
      Почати зараз
    </Link>
  );

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logoImg} alt="Code League" className="logo-icon" />
            <span className="logo-text">Code League</span>
          </Link>

          <button
            type="button"
            className={`burger ${menuOpen ? 'burger--open' : ''}`}
            aria-label="Відкрити меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`header-mobile-backdrop ${menuOpen ? 'header-mobile-backdrop--open' : ''}`} onClick={closeMenu} />

          <nav className={`navigation ${menuOpen ? 'navigation--open' : ''}`}>
            <a href={sectionHref('home')} className="nav-link" onClick={closeMenu}>Головна</a>
            <a href={sectionHref('services')} className="nav-link" onClick={closeMenu}>Сервіси</a>
            <a href={sectionHref('about')} className="nav-link" onClick={closeMenu}>Про нас</a>
            <a href={sectionHref('reviews')} className="nav-link" onClick={closeMenu}>Відгуки</a>
            <a href={sectionHref('contacts')} className="nav-link" onClick={closeMenu}>Контакти</a>
            <div className="header-actions header-actions--mobile">
              {actions}
            </div>
          </nav>

          <div className="header-actions header-actions--desktop">
            {actions}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;