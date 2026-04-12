import logoImg from '@images/logos/logo-white.png';
import iconTelegram from '@images/icons/social-telegram.svg';
import iconInstagram from '@images/icons/social-instagram.svg';
import iconYoutube from '@images/icons/social-youtube.svg';
import { useLocation } from 'react-router-dom';

function Footer({ id }) {
  const location = useLocation();
  const rootPrefix = location.pathname === '/' ? '' : '/';
  const sectionHref = (anchor) => `${rootPrefix}#${anchor}`;

  return (
    <footer id={id} className="footer">
      <div className="container">
        {/* Top row: logo + nav + socials */}
        <div className="footer-top">
          <a href={sectionHref('home')} className="footer-logo">
            <img src={logoImg} alt="Code League" className="footer-logo_icon" />
            <span className="footer-logo_text">Code League</span>
          </a>

          <nav className="footer-nav">
            <a href={sectionHref('home')} className="footer-nav_link">Головна</a>
            <a href={sectionHref('services')} className="footer-nav_link">Переваги</a>
            <a href={sectionHref('reviews')} className="footer-nav_link">Відгуки</a>
            <a href={sectionHref('contacts')} className="footer-nav_link">Контакти</a>
          </nav>

          <div className="footer-socials">
            <a href="https://t.me/codeleague" className="footer-socials_link" aria-label="Telegram">
              <img src={iconTelegram} alt="Telegram" />
            </a>
            <a href="https://www.instagram.com/codeleague" className="footer-socials_link" aria-label="Instagram">
              <img src={iconInstagram} alt="Instagram" />
            </a>
            <a href="https://www.youtube.com/codeleague" className="footer-socials_link" aria-label="YouTube">
              <img src={iconYoutube} alt="YouTube" />
            </a>
          </div>
        </div>

        {/* Middle: contacts + subscribe */}
        <div className="footer-middle">
          <div className="footer-contacts">
            <h4 className="footer-contacts_title">
              <span className="highlight">Контакти:</span>
            </h4>
            <p className="footer-contacts_item">Email: code-league@scam.pro</p>
            <p className="footer-contacts_item">Телефон: 228.322.1888.4</p>
            <p className="footer-contacts_item footer-contacts_address">
              Адреса: Обухівська вулиця будинок 67<br />
              Обухів, Київська область, Україна, 08700
            </p>
          </div>

          <div className="footer-subscribe">
            <form className="footer-subscribe_form" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Email"
                className="footer-subscribe_input"
              />
              <button type="submit" className="footer-subscribe_button">
                Підписатись на новини
              </button>
            </form>
          </div>
        </div>

        {/* Bottom: copyright */}
        <div className="footer-bottom">
          <p className="footer-bottom_copyright">
            © 2026 Obuhov. All Rights Reserved.
          </p>
          <a href="#" className="footer-bottom_policy">Політика конфіденційності</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;