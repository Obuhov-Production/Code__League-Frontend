import { useMemo, useState } from 'react'
import logoImg from '@images/logos/logo.png'

export default function CertificateGenerator({
  teamName,
  tournamentName,
  tournamentIcon,
  place,
  score,
  date,
  members = [],
}) {
  const [show, setShow] = useState(false)

  const certificateDate = date || new Date().toLocaleDateString('uk-UA')

  const certificateId = useMemo(() => {
    const raw = `${teamName || 'team'}-${tournamentName || 'tournament'}-${certificateDate}`
    let hash = 0

    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i)
      hash |= 0
    }

    return `CL-${Math.abs(hash).toString().slice(0, 8).padStart(8, '0')}`
  }, [teamName, tournamentName, certificateDate])

  const placeText = place ? `${place} місце` : 'учасник турніру'
  const scoreText = score !== undefined && score !== null ? Number(score).toFixed(1) : null

  const handleOpen = () => {
    setShow(true)
  }

  const handlePrint = () => {
    window.print()
  }

  if (!show) {
    return (
      <button
        className="db-btn db-btn-ghost db-btn-sm cert-btn"
        onClick={handleOpen}
        title="Сертифікат"
      >
        <span className="cert-btn-icon">🏆</span>
        <span className="cert-btn-text">Сертифікат</span>
      </button>
    )
  }

  return (
    <div className="cert-overlay" onClick={() => setShow(false)}>
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 297mm;
            height: 210mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden;
          }

          .cert-overlay,
          .cert-overlay * {
            visibility: visible;
          }

          .cert-overlay {
            position: fixed !important;
            inset: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            display: block !important;
          }

          .cert-card {
            width: 297mm !important;
            height: 210mm !important;
            max-width: none !important;
            max-height: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
          }

          .cert-no-print {
            display: none !important;
          }
        }

        .cert-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          padding: 24px;
          background:
            radial-gradient(circle at top left, rgba(124, 95, 245, 0.22), transparent 34%),
            radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.18), transparent 34%),
            linear-gradient(135deg, #f5f3ff 0%, #ffffff 52%, #fff7ed 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
        }

        .cert-card {
          position: relative;
          width: min(1120px, 96vw);
          min-height: 760px;
          padding: 44px 58px;
          background:
            linear-gradient(#ffffff, #ffffff) padding-box,
            linear-gradient(135deg, #7c5ff5, #f59e0b, #1e1b2e) border-box;
          border: 10px solid transparent;
          border-radius: 28px;
          box-shadow:
            0 28px 80px rgba(30, 27, 46, 0.20),
            inset 0 0 0 2px rgba(30, 27, 46, 0.08),
            inset 0 0 0 12px rgba(124, 95, 245, 0.06);
          color: #1e1b2e;
          text-align: center;
          font-family: Georgia, 'Times New Roman', serif;
          overflow: hidden;
        }

        .cert-card::before,
        .cert-card::after {
          content: "";
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          pointer-events: none;
          opacity: 0.22;
        }

        .cert-card::before {
          top: -110px;
          left: -110px;
          background: repeating-linear-gradient(
            45deg,
            #7c5ff5 0 8px,
            transparent 8px 18px
          );
        }

        .cert-card::after {
          right: -120px;
          bottom: -120px;
          background: repeating-linear-gradient(
            -45deg,
            #f59e0b 0 8px,
            transparent 8px 18px
          );
        }

        .cert-inner-border {
          position: absolute;
          inset: 24px;
          border: 2px solid rgba(30, 27, 46, 0.18);
          border-radius: 18px;
          pointer-events: none;
        }

        .cert-corner {
          position: absolute;
          width: 72px;
          height: 72px;
          border-color: rgba(124, 95, 245, 0.55);
          pointer-events: none;
        }

        .cert-corner-tl {
          top: 34px;
          left: 34px;
          border-top: 4px solid;
          border-left: 4px solid;
          border-radius: 14px 0 0 0;
        }

        .cert-corner-tr {
          top: 34px;
          right: 34px;
          border-top: 4px solid;
          border-right: 4px solid;
          border-radius: 0 14px 0 0;
        }

        .cert-corner-bl {
          bottom: 34px;
          left: 34px;
          border-bottom: 4px solid;
          border-left: 4px solid;
          border-radius: 0 0 0 14px;
        }

        .cert-corner-br {
          bottom: 34px;
          right: 34px;
          border-bottom: 4px solid;
          border-right: 4px solid;
          border-radius: 0 0 14px 0;
        }

        .cert-top {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 20px;
          margin-bottom: 22px;
        }

        .cert-meta {
          font-family: Inter, Arial, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #6b647c;
          text-align: left;
          letter-spacing: 0.03em;
        }

        .cert-meta-right {
          text-align: right;
        }

        .cert-logo-wrap {
          width: 108px;
          height: 108px;
          margin: 0 auto;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(#ffffff, #ffffff) padding-box,
            linear-gradient(135deg, #7c5ff5, #f59e0b) border-box;
          border: 4px solid transparent;
          box-shadow: 0 12px 34px rgba(124, 95, 245, 0.20);
        }

        .cert-logo {
          width: 72px;
          height: 72px;
          object-fit: contain;
        }

        .cert-badge {
          position: relative;
          z-index: 2;
          width: fit-content;
          margin: 0 auto 10px;
          padding: 7px 18px;
          border-radius: 999px;
          background: rgba(124, 95, 245, 0.10);
          color: #6d55d9;
          font-family: Inter, Arial, sans-serif;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .cert-title {
          position: relative;
          z-index: 2;
          margin: 0;
          font-size: 58px;
          line-height: 1;
          font-weight: 900;
          color: #1e1b2e;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .cert-title-accent {
          display: block;
          margin-top: 8px;
          font-size: 19px;
          font-family: Inter, Arial, sans-serif;
          font-weight: 700;
          color: #7c5ff5;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        .cert-divider {
          position: relative;
          z-index: 2;
          width: 74%;
          height: 1px;
          margin: 24px auto 22px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(30, 27, 46, 0.32),
            transparent
          );
        }

        .cert-divider::before {
          content: "◆";
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          padding: 0 18px;
          background: #ffffff;
          color: #f59e0b;
          font-size: 18px;
        }

        .cert-sub {
          position: relative;
          z-index: 2;
          max-width: 760px;
          margin: 0 auto 18px;
          color: #514b63;
          font-family: Inter, Arial, sans-serif;
          font-size: 17px;
          line-height: 1.7;
        }

        .cert-tournament {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          max-width: 850px;
          margin: 0 auto 18px;
          padding: 12px 22px;
          border-radius: 999px;
          background: #f7f5ff;
          color: #372f57;
          font-family: Inter, Arial, sans-serif;
          font-size: 18px;
          font-weight: 800;
          border: 1px solid rgba(124, 95, 245, 0.22);
        }

        .cert-team-label {
          position: relative;
          z-index: 2;
          margin-top: 14px;
          color: #7a728d;
          font-family: Inter, Arial, sans-serif;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .cert-team {
          position: relative;
          z-index: 2;
          margin: 8px auto 14px;
          max-width: 880px;
          color: #7c5ff5;
          font-size: 44px;
          line-height: 1.15;
          font-weight: 900;
          word-break: break-word;
        }

        .cert-achievement {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          max-width: 850px;
          margin: 24px auto 26px;
          font-family: Inter, Arial, sans-serif;
        }

        .cert-stat {
          padding: 16px 14px;
          border-radius: 18px;
          background:
            linear-gradient(180deg, #ffffff 0%, #faf9ff 100%);
          border: 1px solid rgba(30, 27, 46, 0.10);
          box-shadow: 0 10px 24px rgba(30, 27, 46, 0.06);
        }

        .cert-stat-icon {
          display: block;
          margin-bottom: 6px;
          font-size: 26px;
        }

        .cert-stat-label {
          margin-bottom: 5px;
          color: #7a728d;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .cert-stat-value {
          color: #1e1b2e;
          font-size: 18px;
          font-weight: 900;
        }

        .cert-text {
          position: relative;
          z-index: 2;
          max-width: 860px;
          margin: 0 auto 22px;
          color: #514b63;
          font-family: Inter, Arial, sans-serif;
          font-size: 15px;
          line-height: 1.75;
        }

        .cert-members {
          position: relative;
          z-index: 2;
          max-width: 850px;
          margin: 16px auto 24px;
          padding: 16px 20px;
          border-radius: 20px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.18);
          font-family: Inter, Arial, sans-serif;
        }

        .cert-members-title {
          margin-bottom: 10px;
          color: #9a6100;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .cert-members-list {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
        }

        .cert-member {
          padding: 7px 12px;
          border-radius: 999px;
          background: #ffffff;
          color: #514b63;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid rgba(245, 158, 11, 0.22);
        }

        .cert-bottom {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 28px;
          align-items: end;
          margin-top: 28px;
        }

        .cert-signature {
          min-height: 78px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          font-family: Inter, Arial, sans-serif;
          color: #514b63;
        }

        .cert-sign-line {
          height: 1px;
          margin-bottom: 8px;
          background: rgba(30, 27, 46, 0.35);
        }

        .cert-sign-name {
          font-size: 13px;
          font-weight: 900;
          color: #1e1b2e;
        }

        .cert-sign-role {
          margin-top: 3px;
          font-size: 11px;
          color: #7a728d;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .cert-seal {
          width: 112px;
          height: 112px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle, #fff 0 45%, transparent 46%),
            conic-gradient(from 0deg, #7c5ff5, #f59e0b, #7c5ff5);
          box-shadow:
            0 12px 30px rgba(124, 95, 245, 0.22),
            inset 0 0 0 8px rgba(255, 255, 255, 0.6);
        }

        .cert-seal-inner {
          width: 78px;
          height: 78px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          color: #1e1b2e;
          font-family: Inter, Arial, sans-serif;
          border: 2px solid rgba(30, 27, 46, 0.10);
        }

        .cert-seal-icon {
          font-size: 28px;
          line-height: 1;
        }

        .cert-seal-text {
          margin-top: 4px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .cert-footer {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 24px;
          padding-top: 14px;
          border-top: 1px solid rgba(30, 27, 46, 0.10);
          color: #8b849c;
          font-family: Inter, Arial, sans-serif;
          font-size: 11px;
        }

        .cert-qr {
          width: 54px;
          height: 54px;
          border-radius: 8px;
          background:
            linear-gradient(90deg, #1e1b2e 8px, transparent 8px) 0 0 / 18px 18px,
            linear-gradient(#1e1b2e 8px, transparent 8px) 0 0 / 18px 18px,
            #ffffff;
          border: 1px solid rgba(30, 27, 46, 0.18);
        }

        .cert-actions {
          position: fixed;
          left: 50%;
          bottom: 22px;
          transform: translateX(-50%);
          z-index: 10000;
          display: flex;
          gap: 12px;
          padding: 10px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(14px);
          box-shadow: 0 16px 40px rgba(30, 27, 46, 0.20);
        }

        .cert-action-btn {
          border: 0;
          border-radius: 13px;
          padding: 12px 18px;
          cursor: pointer;
          font-family: Inter, Arial, sans-serif;
          font-size: 14px;
          font-weight: 900;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
        }

        .cert-action-btn:hover {
          transform: translateY(-1px);
        }

        .cert-action-primary {
          color: #ffffff;
          background: linear-gradient(135deg, #7c5ff5, #5d42dd);
          box-shadow: 0 10px 22px rgba(124, 95, 245, 0.32);
        }

        .cert-action-ghost {
          color: #1e1b2e;
          background: #f3f1fb;
        }

        @media (max-width: 900px) {
          .cert-card {
            min-height: auto;
            padding: 34px 26px;
          }

          .cert-top,
          .cert-bottom {
            grid-template-columns: 1fr;
          }

          .cert-meta,
          .cert-meta-right {
            text-align: center;
          }

          .cert-title {
            font-size: 40px;
          }

          .cert-team {
            font-size: 32px;
          }

          .cert-achievement {
            grid-template-columns: 1fr;
          }

          .cert-seal {
            margin: 0 auto;
          }
        }
      `}</style>

      <div className="cert-card" onClick={e => e.stopPropagation()}>
        <div className="cert-inner-border" />
        <div className="cert-corner cert-corner-tl" />
        <div className="cert-corner cert-corner-tr" />
        <div className="cert-corner cert-corner-bl" />
        <div className="cert-corner cert-corner-br" />

        <div className="cert-top">
          <div className="cert-meta">
            <div>Certificate ID</div>
            <strong>{certificateId}</strong>
          </div>

          <div className="cert-logo-wrap">
            <img src={logoImg} alt="CodeLeague" className="cert-logo" />
          </div>

          <div className="cert-meta cert-meta-right">
            <div>Дата видачі</div>
            <strong>{certificateDate}</strong>
          </div>
        </div>

        <div className="cert-badge">Official CodeLeague Award</div>

        <h1 className="cert-title">
          Сертифікат
          <span className="cert-title-accent">про досягнення</span>
        </h1>

        <div className="cert-divider" />

        <p className="cert-sub">
          Цим сертифікатом підтверджується, що команда успішно взяла участь
          у турнірі з програмування, продемонструвала командну роботу,
          швидкість прийняття рішень та високий рівень технічної підготовки.
        </p>

        <div className="cert-tournament">
            <span>🏁</span>
          <span>{tournamentName || 'Code League Tournament'}</span>
        </div>

        <div className="cert-team-label">Нагороджується команда</div>

        <div className="cert-team">
          {teamName || 'Команда'}
        </div>

        <div className="cert-achievement">
          <div className="cert-stat">
            <span className="cert-stat-icon">🏆</span>
            <div className="cert-stat-label">Результат</div>
            <div className="cert-stat-value">{placeText}</div>
          </div>

          <div className="cert-stat">
            <span className="cert-stat-icon">⚡</span>
            <div className="cert-stat-label">Формат</div>
            <div className="cert-stat-value">Programming Battle</div>
          </div>

          <div className="cert-stat">
            <span className="cert-stat-icon">⭐</span>
            <div className="cert-stat-label">Бали</div>
            <div className="cert-stat-value">{scoreText ? scoreText : '—'}</div>
          </div>
        </div>

        <p className="cert-text">
          Команда показала наполегливість, уважність до деталей та здатність
          ефективно працювати з кодом в умовах обмеженого часу. Цей документ
          засвідчує участь, досягнення та внесок команди у розвиток
          інтелектуального змагання CodeLeague.
        </p>

        {members.length > 0 && (
          <div className="cert-members">
            <div className="cert-members-title">Склад команди</div>
            <div className="cert-members-list">
              {members.map((member, index) => (
                <span className="cert-member" key={`${member}-${index}`}>
                  {member}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="cert-bottom">
          <div className="cert-signature">
            <div className="cert-sign-line" />
            <div className="cert-sign-name">Організаційний комітет</div>
            <div className="cert-sign-role">CodeLeague</div>
          </div>

          <div className="cert-seal">
            <div className="cert-seal-inner">
              <div className="cert-seal-icon">🏅</div>
              <div className="cert-seal-text">Award</div>
            </div>
          </div>

          <div className="cert-signature">
            <div className="cert-sign-line" />
            <div className="cert-sign-name">Керівник турніру</div>
            <div className="cert-sign-role">Підпис / Signature</div>
          </div>
        </div>

        <div className="cert-footer">
          <div>
            Експортовано з платформи CodeLeague · Документ сформовано автоматично
          </div>

          <div className="cert-qr" title={certificateId} />

          <div>
            Перевірочний код: <strong>{certificateId}</strong>
          </div>
        </div>
      </div>

      <div className="cert-actions cert-no-print">
        <button className="cert-action-btn cert-action-primary" onClick={handlePrint}>
          🖨 Друк / PDF
        </button>

        <button className="cert-action-btn cert-action-ghost" onClick={() => setShow(false)}>
          ✕ Закрити
        </button>
      </div>
    </div>
  )
}