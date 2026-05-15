import laptopImage from '@images/apps/laptop.png'
import phoneImage from '@images/apps/phone.png'

const MOBILE_LINK = '/download_mobile'
const DESKTOP_LINK = '/download_pc'

function AppDownloadSection() {
  return (
    <section className="app-download-section" id="apps">
      <div className="container">
        <div className="app-download-shell">
          <div className="app-download-copy">
            <span className="app-download-kicker">Code League Apps</span>
            <h2 className="app-download-title">
              Платформа поруч на телефоні та ПК
            </h2>
            <p className="app-download-text">
              Стеж за турнірами, командою, дедлайнами та результатами у зручному
              застосунку.
            </p>

            <div className="app-download-points" aria-label="Переваги застосунків">
              <span>Турніри</span>
              <span>Команди</span>
              <span>Рейтинги</span>
              <span>Здача робіт</span>
              <span>Чат</span>
            </div>

            <a
              className="app-download-button app-download-button--mobile"
              href={MOBILE_LINK}
              target="_blank"
              rel="noreferrer"
            >
              Встановити мобільний застосунок
            </a>
            <a
              className="app-download-button app-download-button--desktop"
              href={DESKTOP_LINK}
              target="_blank"
              rel="noreferrer"
            >
              Встановити застосунок для ПК
            </a>
          </div>

          <div className="app-download-visual" aria-hidden="true">
            <img
              className="app-download-device app-download-device--desktop"
              src={laptopImage}
              alt=""
            />
            <img
              className="app-download-device app-download-device--mobile"
              src={phoneImage}
              alt=""
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default AppDownloadSection
