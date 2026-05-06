import { useState, useEffect, useRef, useMemo } from 'react';

import badge1Img from '@images/pin/bage1.png';
import badge2Img from '@images/pin/bage2.png';

import { getMe, getMyTeams, updateMe, uploadAvatar, uploadBanner, deleteBanner,
  submitOrganizerApplication, getMyOrganizerApplication, getMyBadges,
  deleteMyAccount, clearSession,
  requestPasswordChange, confirmPasswordChange } from '@utils/authApi';
import { BANNER_PRESETS, StatusBadge, UserAvatar, formatDate, formatDateTime, hasRole, displayName, resolveAvatarUrl, PresenceBadge } from './db.shared.jsx';
import IconUser     from '@images/dashboard_components/icon_user_cube.svg?react';
import IconMedal    from '@images/dashboard_components/icon_medal.svg?react';
import IconTrophy   from '@images/dashboard_components/icon_trophy_award.svg?react';
import IconLock     from '@images/dashboard_components/icon_lock_shield.svg?react';
import IconScale    from '@images/dashboard_components/icon_scale.svg?react';
import IconFolder   from '@images/dashboard_components/icon_folder_panel.svg?react';
import IconAdmin    from '@images/dashboard_components/icon_admin_badge.svg?react';
import IconRefresh  from '@images/dashboard_components/icon_refresh_cycle.svg?react';
import IconStar     from '@images/dashboard_components/icon_star_badge.svg?react';
import IconCalendar from '@images/dashboard_components/icon_calendar_card.svg?react';
import IconTrash    from '@images/dashboard_components/icon_trash_bin.svg?react';
import IconMail     from '@images/dashboard_components/icon_mail_envelope.svg?react';
import IconCheck    from '@images/dashboard_components/icon_check_diamond.svg?react';
import IconWarning  from '@images/dashboard_components/icon_warning_triangle.svg?react';
import IconPin      from '@images/dashboard_components/icon_pin_marker.svg?react';
import IconEye      from '@images/dashboard_components/icon_eye_open.svg?react';
import IconEyeOff   from '@images/dashboard_components/icon_eye_closed.svg?react';
import IconLogout   from '@images/dashboard_components/icon_logout_exit.svg?react';
import IconClock    from '@images/dashboard_components/icon_clock_diamond.svg?react';

/** Return every role the user has, in priority order, with label + icon. */
function userRoleChips(user) {
  const chips = [];
  if (hasRole(user, 'admin'))     chips.push({ key: 'admin',     label: 'Адмін',        emoji: '🛡️' });
  if (hasRole(user, 'organizer')) chips.push({ key: 'organizer', label: 'Організатор', emoji: '🗂️' });
  if (hasRole(user, 'jury'))      chips.push({ key: 'jury',      label: 'Журі',         emoji: '⚖' });
  if (chips.length === 0)         chips.push({ key: 'user',      label: 'Учасник',     emoji: '👤' });
  return chips;
}

/* Ukrainian "last seen" formatter — frontend version (backend last_seen_text is English). */
function lastSeenUk(dateStr) {
  if (!dateStr) return 'ніколи';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diffSec < 60) return 'щойно';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} хв тому`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} год тому`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} дн тому`;
  return formatDateTime(dateStr);
}

/* ── Badge definitions ────────────────────────── */
export const ALL_BADGES = [
  {
    id: 'identity_confirmed',
    image: badge1Img,
    name: 'Підтвердив особу',
    description: 'Ви заповнили своє ПІБ у профілі.',
    color: '#7c5ff5',
    condition: 'Заповніть Прізвище, Ім\'я та По батькові в профілі',
    secret: false,
  },
  {
    id: 'team_member',
    image: badge2Img,
    name: 'Командний гравець',
    description: 'Ви вступили до своєї першої команди на турнірі.',
    color: '#16a34a',
    condition: 'Вступіть до будь-якої команди',
    secret: false,
  },
];

/* ── Badge Modal ──────────────────────────────── */
function BadgeModal({ badge, pinnedBadge, onPin, onClose }) {
  const isPinned = pinnedBadge === badge.id;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--light db-badge-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="db-badge-modal-img-wrap">
          {badge.earned && <span className="db-badge-modal-glow" style={{ background: `radial-gradient(circle, ${badge.color}55 0%, transparent 70%)` }} />}
          <img src={badge.image} alt={badge.name}
            style={{ filter: badge.earned ? 'none' : 'grayscale(1) opacity(0.4)' }} />
        </div>
        <h3 className="db-badge-modal-name">{badge.name}</h3>
        <span className="db-badge-modal-status"
          style={{ background: badge.color + '22', color: badge.color }}>
          {badge.earned ? '✓ Отримано' : '🔒 Не отримано'}
        </span>
        <p className="db-badge-modal-desc">{badge.description}</p>
        {!badge.secret
          ? <p className="db-badge-modal-cond">📋 {badge.condition}</p>
          : <p className="db-badge-modal-cond">🔐 Секретне досягнення</p>
        }
        {badge.earned && onPin && (
          <button
            className="db-badge-modal-pin-btn"
            onClick={() => { onPin(badge.id); onClose(); }}>
            {isPinned ? '📌 Відкріпити з профілю' : '📌 Закріпити в профілі'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Self-Destruct Account Confirm Modal ─────────── */
function DeleteAccountModal({ user, onClose, onConfirm }) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const required = user?.username || user?.email || 'DELETE';
  const canDelete = confirmText.trim() === required && !deleting;

  const handleClick = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try { await onConfirm(); }
    finally { setDeleting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--light db-delete-account-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} disabled={deleting}>✕</button>

        <div className="db-da-icon-wrap">
          <div className="db-da-icon-circle">
            <IconWarning style={{ width: 42, height: 42 }} />
          </div>
        </div>
        <h3 className="db-da-title">Видалення акаунту</h3>
        <p className="db-da-sub">
          Цю дію <b>неможливо скасувати</b>. Будуть видалені:
        </p>
        <ul className="db-da-list">
          <li>Профіль, аватар та банер</li>
          <li>Усі бейджі та досягнення</li>
          <li>Повідомлення в чатах і реакції</li>
          <li>Заявки організатора та оцінки журі</li>
        </ul>

        <div className="db-da-confirm-field">
          <label className="db-da-confirm-label">
            Для підтвердження введіть: <b>{required}</b>
          </label>
          <input
            className="db-input"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={required}
            autoComplete="off"
            disabled={deleting}
          />
        </div>

        <div className="db-edit-actions">
          <button type="button" className="db-btn db-btn-ghost" onClick={onClose} disabled={deleting}>
            Скасувати
          </button>
          <button
            type="button"
            className="db-btn db-btn-danger"
            onClick={handleClick}
            disabled={!canDelete}
          >
            {deleting ? '⏳ Видалення...' : (<><IconTrash style={{ width: 16, height: 16, verticalAlign: -3, marginRight: 6 }} /> Видалити назавжди</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Change Password Modal (3-step: request → code → new password) ── */
function ChangePasswordModal({ user, toast, onClose, setUser }) {
  const [step, setStep] = useState('idle'); // idle → code → password → done
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  const handleSendCode = async () => {
    setSending(true);
    try {
      const res = await requestPasswordChange();
      setMaskedEmail(res.email || user?.email || '');
      setExpiresAt(Date.now() + (res.expiresInSec || 600) * 1000);
      setStep('code');
      toast.success('Код надіслано на пошту');
    } catch (err) {
      toast.error(err.message);
    } finally { setSending(false); }
  };

  const handleVerifyCode = (e) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('Введіть 6-значний код');
      return;
    }
    setStep('password');
  };

  const handleSubmitNewPassword = async (e) => {
    e?.preventDefault();
    if (newPassword.length < 8) { toast.error('Пароль має містити щонайменше 8 символів'); return; }
    if (newPassword !== confirmPassword) { toast.error('Паролі не співпадають'); return; }
    setSubmitting(true);
    try {
      await confirmPasswordChange({ code: code.trim(), newPassword });
      try {
        const fresh = await getMe();
        if (setUser) setUser(fresh);
      } catch { /* ignore — UI will update on next reload */ }
      setStep('done');
      toast.success('Пароль успішно змінено');
    } catch (err) {
      toast.error(err.message);
      if (/код/i.test(err.message) && /(невір|простроч|спроб)/i.test(err.message)) {
        setStep('code');
      }
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--light db-pwd-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="db-pwd-icon-wrap">
          <div className="db-pwd-icon-circle">
            <IconLock style={{ width: 26, height: 26 }} />
          </div>
        </div>
        <h3 className="db-pwd-title">Зміна пароля</h3>

        {step === 'idle' && (
          <>
            <p className="db-pwd-sub">
              Ми надішлемо одноразовий 6-значний код на вашу пошту <b>{user?.email}</b>.
              Введіть його, щоб підтвердити зміну пароля.
            </p>
            <div className="db-edit-actions">
              <button type="button" className="db-btn db-btn-ghost" onClick={onClose}>Скасувати</button>
              <button type="button" className="db-btn db-btn-primary db-btn-with-icon" onClick={handleSendCode} disabled={sending}>
                {sending ? 'Надсилання...' : (<><IconMail /> Надіслати код</>)}
              </button>
            </div>
          </>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyCode}>
            <p className="db-pwd-sub">
              Код надіслано на <b>{maskedEmail || user?.email}</b>.
              Він діє ще <span className="db-pwd-timer">{mm}:{ss}</span>.
            </p>
            <div className="db-pwd-code-wrap">
              <input
                className="db-input db-pwd-code-input"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="● ● ● ● ● ●"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
              />
            </div>
            <div className="db-pwd-resend-row">
              <button type="button" className="db-pwd-link" onClick={handleSendCode} disabled={sending}>
                Надіслати ще раз
              </button>
            </div>
            <div className="db-edit-actions">
              <button type="button" className="db-btn db-btn-ghost" onClick={onClose}>Скасувати</button>
              <button type="submit" className="db-btn db-btn-primary" disabled={code.length !== 6}>
                Далі →
              </button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleSubmitNewPassword}>
            <p className="db-pwd-sub">Введіть новий пароль (мінімум 8 символів).</p>
            <div className="db-pwd-field">
              <label className="db-edit-label">Новий пароль</label>
              <div className="db-pwd-input-row">
                <input
                  className="db-input"
                  type={showPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
            </div>
            <div className="db-pwd-field">
              <label className="db-edit-label">Підтвердження пароля</label>
              <div className="db-pwd-input-row">
                <input
                  className="db-input"
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="db-pwd-eye"
                  onClick={() => setShowPwd(s => !s)}
                  aria-label={showPwd ? 'Сховати' : 'Показати'}
                  title={showPwd ? 'Сховати' : 'Показати'}
                >
                  {showPwd ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>
            <PasswordStrength value={newPassword} />
            <div className="db-edit-actions">
              <button type="button" className="db-btn db-btn-ghost" onClick={() => setStep('code')} disabled={submitting}>
                ← Назад
              </button>
              <button type="submit" className="db-btn db-btn-primary"
                disabled={submitting || newPassword.length < 8 || newPassword !== confirmPassword}>
                {submitting ? '⏳ Збереження...' : '✓ Змінити пароль'}
              </button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <>
            <div className="db-pwd-success">
              <div className="db-pwd-success-circle">✓</div>
              <p>Пароль успішно змінено!</p>
            </div>
            <div className="db-edit-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="db-btn db-btn-primary" onClick={onClose}>Готово</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PasswordStrength({ value }) {
  const score = (() => {
    let s = 0;
    if (value.length >= 8)  s++;
    if (value.length >= 12) s++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s++;
    if (/\d/.test(value))   s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return Math.min(s, 4);
  })();
  const labels = ['—', 'Слабкий', 'Нормальний', 'Хороший', 'Сильний'];
  const colors = ['#e5e7eb', '#ef4444', '#f59e0b', '#22c55e', '#16a34a'];
  return (
    <div className="db-pwd-strength">
      <div className="db-pwd-strength-bar">
        {[0, 1, 2, 3].map(i => (
          <span key={i} style={{ background: i < score ? colors[score] : '#e5e7eb' }} />
        ))}
      </div>
      <span className="db-pwd-strength-label" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

/* ── Organizer Application Modal ─────────────────── */
function OrganizerApplyModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ motivation: '', experience: '', contact_email: '', contact_telegram: '', contact_phone: '' });
  const [saving, setSaving] = useState(false);

  const hasContact = form.contact_email.trim() || form.contact_telegram.trim() || form.contact_phone.trim();

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.motivation.trim()) return;
    if (!hasContact) return;
    setSaving(true);
    try { await onSubmit(form); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--light db-tournament-modal" onClick={e => e.stopPropagation()}>
        <button className="db-tm-close" onClick={onClose}>✕</button>
        <div className="db-modal-scroll-body">
          <form className="db-edit-tournament-form" onSubmit={handleSubmit}>
            <div className="db-edit-header">
              <div className="db-app-header-row">
                <span className="db-app-header-icon">🗂️</span>
                <div>
                  <h3 className="db-edit-title">Заявка на організатора</h3>
                  <p className="db-app-header-sub">Розкажіть про себе, свою мотивацію та як з вами зв'язатися</p>
                </div>
              </div>
            </div>

            <div className="db-edit-field">
              <label className="db-edit-label">Мотивація <span className="db-required">*</span></label>
              <textarea
                className="db-input db-textarea"
                rows={5}
                value={form.motivation}
                onChange={e => setForm(f => ({ ...f, motivation: e.target.value }))}
                placeholder="Чому ви хочете стати організатором? Які заходи плануєте провести? Яка ваша ціль?"
                maxLength={1000}
                required
              />
              <div className="db-app-char-count">{form.motivation.length} / 1000</div>
            </div>

            <div className="db-edit-field">
              <label className="db-edit-label">Досвід та навички</label>
              <textarea
                className="db-input db-textarea"
                rows={3}
                value={form.experience}
                onChange={e => setForm(f => ({ ...f, experience: e.target.value }))}
                placeholder="Попередній досвід у організації заходів, хакатонів, олімпіад..."
                maxLength={500}
              />
            </div>

            <div className="db-app-contacts-card">
              <label className="db-edit-label">Контактні дані <span className="db-required">*</span></label>
              <p className="db-app-contacts-hint">Вкажіть хоча б один спосіб зв'язку</p>
              <div className="db-app-contact-fields">
                <div className="db-app-contact-row">
                  <span className="db-app-contact-icon">📧</span>
                  <input className="db-input" type="email" value={form.contact_email}
                    onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    placeholder="email@example.com" />
                </div>
                <div className="db-app-contact-row">
                  <span className="db-app-contact-icon">💬</span>
                  <input className="db-input" value={form.contact_telegram}
                    onChange={e => setForm(f => ({ ...f, contact_telegram: e.target.value }))}
                    placeholder="@telegram_username" />
                </div>
                <div className="db-app-contact-row">
                  <span className="db-app-contact-icon">📱</span>
                  <input className="db-input" type="tel" value={form.contact_phone}
                    onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                    placeholder="+380 XX XXX XX XX" />
                </div>
              </div>
            </div>

            <div className="db-edit-actions">
              <button type="button" className="db-btn db-btn-ghost" onClick={onClose}>Скасувати</button>
              <button type="submit" className="db-btn db-btn-primary db-btn-submit" disabled={saving || !form.motivation.trim() || !hasContact}>
                {saving ? '⏳ Надсилання...' : '📤 Подати заявку'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function TabProfile({ user, setUser, toast, onLogout, setTab }) {
  const [myTeams,   setMyTeams]  = useState([]);
  const [myBadges,  setMyBadges] = useState([]);
  const [editing,   setEditing]  = useState(false);
  const [saving,    setSaving]   = useState(false);
  const [savingPib, setSavingPib] = useState(false);
  const [form,      setForm]     = useState({ username: '', user_description: '', banner_color: '' });
  const [pibForm,   setPibForm]  = useState({ first_name: '', last_name: '', middle_name: '' });
  const [pinnedBadge, setPinnedBadge] = useState(null);
  const [bannerMode, setBannerMode] = useState('color');
  const [hexInput,  setHexInput]  = useState('#1e1b2e');
  const [applyModal, setApplyModal] = useState(false);
  const [myApplication, setMyApplication] = useState(undefined);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [pwdModal, setPwdModal] = useState(false);
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const pibConfirmed = !!(user?.first_name?.trim() && user?.last_name?.trim() && user?.middle_name?.trim());

  const earnedBadges = ALL_BADGES.map(b => ({
    ...b,
    earned: b.id === 'identity_confirmed'
      ? pibConfirmed || myBadges.some(mb => mb.badge_id === b.id)
      : b.id === 'team_member'
        ? myTeams.length > 0 || myBadges.some(mb => mb.badge_id === b.id)
        : myBadges.some(mb => mb.badge_id === b.id),
  }));

  const pinnedBadgeDef = pinnedBadge ? ALL_BADGES.find(b => b.id === pinnedBadge) : null;

  useEffect(() => {
    getMyTeams().then(setMyTeams).catch(() => {});
    getMyBadges().then(setMyBadges).catch(() => {});
  }, []);

  useEffect(() => {
    if (user && user.role === 'user') {
      getMyOrganizerApplication().then(setMyApplication).catch(() => setMyApplication(null));
    }
  }, [user]);

  useEffect(() => {
    // Не скидаємо форму під час редагування — інакше збереження ПІБ затирає введений опис
    if (user && !editing) {
      const bc = user.banner_color || '#1e1b2e';
      setForm({ username: user.username || '', user_description: user.user_description || '', banner_color: bc });
      setHexInput(bc);
      setPibForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        middle_name: user.middle_name || '',
      });
      setPinnedBadge(user.pinned_badge || null);
    }
  }, [user, editing]);

  const handleSavePib = async () => {
    setSavingPib(true);
    try {
      const hadConfirmed = pibConfirmed;
      const updated = await updateMe({
        first_name: pibForm.first_name.trim(),
        last_name: pibForm.last_name.trim(),
        middle_name: pibForm.middle_name.trim(),
      });
      setUser(updated);
      getMyBadges().then(setMyBadges).catch(() => {});
      const allFilled = pibForm.first_name.trim() && pibForm.last_name.trim() && pibForm.middle_name.trim();
      if (allFilled && !hadConfirmed) {
        toast.success('🏅 Отримано нове досягнення: «Підтвердив особу»!');
      } else {
        toast.success('Зміни збережено!');
      }
    } catch (err) { toast.error(err.message); }
    finally { setSavingPib(false); }
  };

  const handlePinBadge = async (badgeId) => {
    const newPin = pinnedBadge === badgeId ? null : badgeId;
    try {
      const updated = await updateMe({ pinned_badge: newPin });
      setUser(updated);
      setPinnedBadge(newPin);
      toast.success(newPin ? '📌 Бейдж закріплено!' : 'Бейдж відкріплено');
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteMyAccount();
      toast.success('Акаунт видалено');
      try { clearSession(); } catch {}
      if (onLogout) onLogout();
      else window.location.href = '/';
    } catch (err) {
      toast.error(err.message || 'Не вдалося видалити акаунт');
    }
  };

  const handleApply = async (data) => {
    try {
      const result = await submitOrganizerApplication(data);
      setMyApplication(result);
      setApplyModal(false);
      toast.success('Заявку подано! Очікуйте розгляду адміністратором.');
    } catch (err) { toast.error(err.message); }
  };

  if (!user) return null;

  const canChangeUsername = () => {
    if (!user.username_updated_at) return true;
    return (Date.now() - new Date(user.username_updated_at).getTime()) >= 7 * 86400000;
  };
  const daysUntilChange = () => {
    if (!user.username_updated_at) return 0;
    return Math.ceil(7 - (Date.now() - new Date(user.username_updated_at).getTime()) / 86400000);
  };

  const bannerHasPhoto = !!user.banner_url;
  const bannerStyle = user.banner_url
    ? { backgroundImage: `url(${resolveAvatarUrl(user.banner_url)})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
    : { background: `linear-gradient(135deg, ${form.banner_color || user.banner_color || '#1e1b2e'} 0%, #191A23 100%)` };

  const dotPositions = useMemo(() =>
    [...Array(22)].map(() => ({
      left:  `${Math.random() * 100}%`,
      top:   `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      size:  `${2 + Math.random() * 4}px`,
    })), []);

  const handleDeleteBanner = async () => {
    try { await deleteBanner(); setUser(u => ({ ...u, banner_url: null })); toast.success('Банер видалено'); }
    catch (err) { toast.error(err.message); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { user_description: form.user_description, banner_color: form.banner_color };
      if (form.username !== user.username) {
        if (!canChangeUsername()) { toast.error(`Змінити ім'я можна через ${daysUntilChange()} дн.`); setSaving(false); return; }
        payload.username = form.username;
      }
      const updated = await updateMe(payload);
      setUser(updated);
      toast.success('Профіль оновлено!');
      setEditing(false);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleAvatarPick = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const { url } = await uploadAvatar(file); setUser(u => ({ ...u, user_avatar_url: url })); toast.success('Аватар оновлено!'); }
    catch (err) { toast.error(err.message); }
  };

  const handleBannerPick = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const { url } = await uploadBanner(file); setUser(u => ({ ...u, banner_url: url })); toast.success('Банер оновлено!'); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div className="db-tab">

      {/* Hidden file inputs — referenced from multiple places */}
      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarPick} />
      <input ref={bannerInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleBannerPick} />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━ BANNER ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className={`db-profile-banner${bannerHasPhoto ? ' has-photo' : ''}${editing ? ' is-editing' : ''}`} style={bannerStyle}>

        {/* ── Animated effects (тільки для кольорового банера) ── */}
        {!bannerHasPhoto && (
          <div className="db-profile-banner-effects">
            <div className="db-welcome-dots">
              {dotPositions.map((dot, i) => (
                <span key={i} className="db-welcome-dot" style={{
                  left: dot.left, top: dot.top,
                  width: dot.size, height: dot.size,
                  animationDelay: dot.delay,
                }} />
              ))}
            </div>
            <div className="db-welcome-bg-effects">
              <div className="db-welcome-glow" />
              <div className="db-welcome-glow db-welcome-glow-2" />
            </div>
          </div>
        )}

        {/* ─── Banner editor — inside banner, absolute bottom-right on desktop ─── */}
        {editing && (
          <div className="db-bep">
            <span className="db-bep-label">Банер</span>

            <div className="db-bep-tabs">
              <button className={`db-bep-tab${bannerMode === 'color' ? ' active' : ''}`}
                onClick={() => setBannerMode('color')}>🎨 Колір</button>
              <button className={`db-bep-tab${bannerMode === 'image' ? ' active' : ''}`}
                onClick={() => setBannerMode('image')}>🖼 Фото</button>
            </div>

            {bannerMode === 'color' && (
              <div className="db-bep-color">
                <div className="db-bep-swatches">
                  {BANNER_PRESETS.map(c => (
                    <button key={c} className={`db-bep-dot${form.banner_color === c ? ' sel' : ''}`}
                      style={{ background: c }}
                      onClick={() => { setForm(f => ({ ...f, banner_color: c })); setHexInput(c); }} />
                  ))}
                </div>
                <div className="db-bep-custom">
                  <label className="db-bep-preview" style={{ background: form.banner_color }}>
                    <input type="color" value={form.banner_color}
                      onChange={e => { const c = e.target.value; setForm(f => ({ ...f, banner_color: c })); setHexInput(c); }} />
                  </label>
                  <div className="db-bep-hex">
                    <span>#</span>
                    <input value={hexInput.replace(/^#/, '')} maxLength={6} spellCheck={false} placeholder="1e1b2e"
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                        setHexInput('#' + raw);
                        if (raw.length === 6) setForm(f => ({ ...f, banner_color: '#' + raw }));
                      }} />
                  </div>
                </div>
              </div>
            )}

            {bannerMode === 'image' && (
              <div className="db-bep-photo">
                <button className="db-bep-upload" onClick={() => bannerInputRef.current?.click()}>
                  📤 Завантажити <span>до 10 МБ</span>
                </button>
                {user.banner_url && (
                  <button className="db-bep-del" onClick={handleDeleteBanner}>🗑 Видалити</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ▼ Mobile-only: avatar + username float over banner ▼ */}
        <div className="db-profile-banner-overlay">
          <div className="db-profile-banner-avatar-wrap" onClick={editing ? () => avatarInputRef.current?.click() : undefined}
            style={{ cursor: editing ? 'pointer' : 'default' }} title={editing ? 'Змінити аватар' : undefined}>
            <UserAvatar user={user} size={60} />
            {editing && <span className="db-profile-banner-avatar-edit">📷</span>}
          </div>
          <div className="db-profile-banner-nameblock">
            <h2 className="db-profile-banner-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {displayName(user)}
              {pinnedBadgeDef && <img src={pinnedBadgeDef.image} alt={pinnedBadgeDef.name} title={pinnedBadgeDef.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />}
            </h2>
            <span className="db-role-chips db-role-chips--banner">
              {userRoleChips(user).map(c => (
                <span key={c.key} className={`db-role-badge db-role-badge--banner role-${c.key}`}>
                  {c.emoji} {c.label}
                </span>
              ))}
            </span>
          </div>
        </div>
        {/* ▲ Mobile-only end ▲ */}
      </div>

      {/* ━━━━━━━━━━━━ DESKTOP: avatar row below banner ━━━━━━━━━━━━ */}
      <div className="db-profile-avatar-row">
        <div className="db-profile-avatar-wrap">
          <UserAvatar user={user} size={88} />
          {editing && (
            <button className="db-avatar-edit-btn" onClick={() => avatarInputRef.current?.click()} title="Змінити аватар">📷</button>
          )}
        </div>
        <div className="db-profile-headings">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {displayName(user)}
            {pinnedBadgeDef && <img src={pinnedBadgeDef.image} alt={pinnedBadgeDef.name} title={pinnedBadgeDef.name} style={{ width: 22, height: 22, objectFit: 'contain' }} />}
            {displayName(user) !== (user.username || user.email) && <span style={{ fontSize: 13, color: '#aaa', fontWeight: 400 }}>@{user.username}</span>}
          </h2>
          <div className="db-profile-chips">
            <span className="db-role-chips">
              {userRoleChips(user).map(c => (
                <span key={c.key} className={`db-role-badge role-${c.key}`}>{c.emoji} {c.label}</span>
              ))}
            </span>
            <span className="db-chip db-chip-elo"><IconStar className="db-chip-svg" /> ELO: {user?.elo ?? user?.exp ?? 0}</span>
            <span className="db-chip"><IconTrophy className="db-chip-svg" /> Команд: {myTeams.length}</span>
            <span className="db-chip"><IconCalendar className="db-chip-svg" /> Зареєстровано: {formatDate(user.created_at)}</span>
          </div>
        </div>
        {/* Desktop action buttons */}
        <div className="db-profile-actions db-profile-actions--desktop">
          {!editing ? (
            <button className="db-btn db-btn-primary" onClick={() => setEditing(true)}>✏️ Редагувати</button>
          ) : (
            <>
              <button className="db-btn db-btn-ghost" onClick={() => setEditing(false)} disabled={saving}>Скасувати</button>
              <button className="db-btn db-btn-primary" onClick={handleSave} disabled={saving}>{saving ? '⏳...' : '✓ Зберегти'}</button>
            </>
          )}
        </div>
      </div>

      {/* Mobile chips row (shown below banner on mobile, hidden on desktop) */}
      <div className="db-profile-mobile-chips">
        <span className="db-chip db-chip-elo"><IconStar className="db-chip-svg" /> ELO: {user?.elo ?? user?.exp ?? 0}</span>
        <span className="db-chip"><IconTrophy className="db-chip-svg" /> Команд: {myTeams.length}</span>
        <span className="db-chip"><IconCalendar className="db-chip-svg" /> {formatDate(user.created_at)}</span>
      </div>

      {/* ━━━━━━ STICKY ACTION BUTTONS (mobile only) ━━━━━━ */}
      <div className="db-profile-sticky-actions">
        {!editing ? (
          <button className="db-btn db-btn-primary" style={{ flex: 1 }} onClick={() => setEditing(true)}>✏️ Редагувати профіль</button>
        ) : (
          <>
            <button className="db-btn db-btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)} disabled={saving}>Скасувати</button>
            <button className="db-btn db-btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>{saving ? '⏳ Збереження...' : '✓ Зберегти'}</button>
          </>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━ PROFILE CARDS ━━━━━━━━━━━━━━━━━ */}
      <div className="db-profile-cards">
        <div className="db-profile-cards-left">
        <div className="db-info-card db-info-card--personal">
          <h3><span className="db-card-icon db-card-icon--svg"><IconUser /></span> Особиста інформація</h3>
          {editing ? (
            <>
              <div className="db-field-row">
                <label>
                  Нікнейм
                  {!canChangeUsername() && <span className="db-field-hint">🔒 через {daysUntilChange()} дн.</span>}
                </label>
                <div className={!canChangeUsername() ? 'db-field-locked' : undefined}>
                  <input className="db-field-input" value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    disabled={!canChangeUsername()} placeholder="Ваш нікнейм" />
                  {!canChangeUsername() && <span className="db-field-locked-badge">🔒 Заблоковано</span>}
                </div>
              </div>

              <div className="db-field-row">
                <label>Про себе</label>
                <textarea className="db-field-input" rows={3} value={form.user_description}
                  onChange={e => setForm(f => ({ ...f, user_description: e.target.value.slice(0, 256) }))}
                  placeholder="Розкажіть про себе..."
                  maxLength={256}
                  style={{ minHeight: 80, maxHeight: 80 }} />
                <div className="db-char-counter">
                  <div className="db-char-bar-wrap">
                    <div className="db-char-bar" style={{
                      width: `${(form.user_description.length / 256) * 100}%`,
                      background: form.user_description.length >= 240 ? '#f87171' : '#AC9EF8',
                    }} />
                  </div>
                  <span className="db-char-count" style={{ color: form.user_description.length >= 240 ? '#f87171' : undefined }}>
                    {form.user_description.length} / 256
                  </span>
                </div>
              </div>

              {/* ── ПІБ ── */}
              <div className="db-pib-section">
                <div className="db-pib-header">
                  <span>ПІБ</span>
                  <span className="db-pib-hint">потрібно для заявок на турніри</span>
                </div>
                <div className="db-pib-grid">
                  <div className="db-field-row">
                    <label>Прізвище</label>
                    <input className="db-field-input" value={pibForm.last_name}
                      onChange={e => setPibForm(f => ({ ...f, last_name: e.target.value }))}
                      placeholder="Іванов" />
                  </div>
                  <div className="db-field-row">
                    <label>Ім'я</label>
                    <input className="db-field-input" value={pibForm.first_name}
                      onChange={e => setPibForm(f => ({ ...f, first_name: e.target.value }))}
                      placeholder="Іван" />
                  </div>
                  <div className="db-field-row">
                    <label>По батькові</label>
                    <input className="db-field-input" value={pibForm.middle_name}
                      onChange={e => setPibForm(f => ({ ...f, middle_name: e.target.value }))}
                      placeholder="Іванович" />
                  </div>
                </div>
                <div className="db-pib-save">
                  <button className="db-btn db-btn-primary db-btn-sm"
                    onClick={handleSavePib} disabled={savingPib}>
                    {savingPib ? '⏳ Збереження...' : '💾 Зберегти ПІБ'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="db-field-list">
              <div className="db-field-row"><label>Нікнейм</label><span>{user.username || '—'}</span></div>
              <div className="db-field-row"><label>Email</label><span>{user.email}</span></div>
              <div className="db-field-row">
                <label>ПІБ</label>
                <span style={{ color: (user.last_name || user.first_name) ? undefined : '#aaa' }}>
                  {[user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ') || 'Не вказано'}
                </span>
              </div>
              <div className="db-field-row"><label>Про себе</label><span>{user.user_description || '—'}</span></div>
              <div className="db-field-row"><label>ID акаунту</label><span style={{ fontFamily: 'monospace' }}>#{user.id}</span></div>
              <div className="db-field-row"><label>Роль</label><span style={{ textTransform: 'capitalize' }}>{user.role || 'user'}</span></div>
              <div className="db-field-row">
                <label>ELO рейтинг</label>
                <span className="db-inline-icon"><IconStar /> {user.elo ?? user.exp ?? 0}</span>
              </div>
              <div className="db-field-row">
                <label>Команд</label>
                <span className="db-inline-icon"><IconTrophy /> {myTeams.length}</span>
              </div>
              <div className="db-field-row">
                <label>Бейджів отримано</label>
                <span className="db-inline-icon"><IconMedal /> {earnedBadges.filter(b => b.earned).length} / {earnedBadges.length}</span>
              </div>
              <div className="db-field-row">
                <label>Реєстрація</label>
                <span className="db-inline-icon"><IconCalendar /> {formatDate(user.created_at)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Badges card — sits in left column right under Personal ─── */}
        <div className="db-info-card db-info-card--badges">
          <div className="db-badges-header">
            <h3><span className="db-card-icon db-card-icon--svg"><IconMedal /></span> Досягнення</h3>
            <span className="db-badges-progress">
              {earnedBadges.filter(b => b.earned).length} / {earnedBadges.length}
            </span>
          </div>
          <div className="db-badges-grid">
            {earnedBadges.map(b => (
              <button key={b.id}
                className={`db-badge-row${b.earned ? ' earned' : ' locked'}${pinnedBadge === b.id ? ' pinned' : ''}`}
                onClick={() => setSelectedBadge(b)}>
                <div className="db-badge-row-icon">
                  <img src={b.image} alt={b.name}
                    style={{ filter: b.earned ? 'none' : 'grayscale(1) opacity(0.3)' }} />
                  {b.earned && <span className="db-badge-row-glow" style={{ background: b.color + '28' }} />}
                </div>
                <div className="db-badge-row-info">
                  <span className="db-badge-row-name">{b.name}</span>
                  <span className="db-badge-row-desc">{b.description}</span>
                </div>
                <div className="db-badge-row-right">
                  {b.earned
                    ? pinnedBadge === b.id
                      ? <span className="db-badge-row-tag pinned"><IconPin /></span>
                      : <span className="db-badge-row-tag earned"><IconCheck /></span>
                    : <span className="db-badge-row-tag locked"><IconLock /></span>
                  }
                </div>
              </button>
            ))}
          </div>
        </div>
        </div>{/* end db-profile-cards-left */}

        {/* ── Right column — не залежить від висоти лівої картки ── */}
        <div className="db-profile-cards-right">

        <div className="db-info-card db-info-card--teams">
          <h3><span className="db-card-icon db-card-icon--svg"><IconTrophy /></span> Мої команди</h3>
          {myTeams.length === 0 ? <p style={{ color:'#aaa', fontSize:14 }}>Ще немає команд</p>
            : (
              <div className="db-field-list">
                {myTeams.slice(0,5).map(t => (
                  <div key={t.id} className="db-field-row">
                    <label>{t.tournament_name}</label>
                    <span style={{ display:'flex', alignItems:'center', gap:8 }}>{t.name} <StatusBadge status={t.tournament_status} /></span>
                  </div>
                ))}
              </div>
            )}
        </div>

        <div className="db-info-card db-info-card--security">
          <h3><span className="db-card-icon db-card-icon--svg"><IconLock /></span> Безпека</h3>          <div className="db-field-list">
            <div className="db-field-row"><label>Статус</label><span><PresenceBadge user={user} /></span></div>
            <div className="db-field-row">
              <label>Email підтверджено</label>
              <span className="db-inline-icon" style={{ color: user.is_email_verified ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>
                {user.is_email_verified ? <><IconCheck /> Так</> : <><IconWarning /> Ні</>}
              </span>
            </div>
            <div className="db-field-row">
              <label>Метод входу</label>
              <span style={{ textTransform: 'capitalize' }}>{user.auth_provider || 'email'}</span>
            </div>
            {user.github_username && (
              <div className="db-field-row"><label>GitHub</label><span>@{user.github_username}</span></div>
            )}
            <div className="db-field-row">
              <label>Останній вхід</label>
              <span className="db-inline-icon"><IconClock /> {lastSeenUk(user.last_seen_at)}</span>
            </div>
            <div className="db-field-row db-pwd-row">
              <label>Пароль</label>
              <span className="db-pwd-row-right">
                <span className="db-pwd-mask">••••••••</span>
                <button type="button" className="db-btn db-btn-sm db-btn-primary" onClick={() => setPwdModal(true)}>
                  Оновити
                </button>
              </span>
            </div>
            {user.password_changed_at && (
              <div className="db-field-row">
                <label>Пароль оновлено</label>
                <span className="db-inline-icon"><IconCalendar /> {formatDateTime(user.password_changed_at)}</span>
              </div>
            )}
          </div>

          {/* Panel access buttons (always visible - useful on mobile, convenient on desktop) */}
          {setTab && (hasRole(user, 'admin') || hasRole(user, 'jury') || hasRole(user, 'organizer')) && (
            <div className="db-profile-panel-access">
              <h4 className="db-profile-panel-label">Панелі управління</h4>
              {(hasRole(user, 'admin') || hasRole(user, 'jury')) && (
                <button className="db-panel-access-btn db-panel-access-btn--jury" onClick={() => setTab('jury')}>
                  <span className="db-pab-icon db-pab-icon--svg"><IconScale /></span>
                  <div className="db-pab-text">
                    <strong>Журі Панель</strong>
                    <span>Оцінювання і результати</span>
                  </div>
                  <span className="db-pab-arrow">→</span>
                </button>
              )}
              {(hasRole(user, 'admin') || hasRole(user, 'organizer')) && (
                <button className="db-panel-access-btn" style={{ borderColor: '#7c5ff5' }} onClick={() => setTab(hasRole(user, 'admin') ? 'admin' : 'organizer')}>
                  <span className="db-pab-icon db-pab-icon--svg">{hasRole(user, 'admin') ? <IconAdmin /> : <IconFolder />}</span>
                  <div className="db-pab-text">
                    <strong>{hasRole(user, 'admin') ? 'Адмін Панель' : 'Панель Організатора'}</strong>
                    <span>{hasRole(user, 'admin') ? 'Повне управління системою' : 'Турніри та команди'}</span>
                  </div>
                  <span className="db-pab-arrow">→</span>
                </button>
              )}
            </div>
          )}

          {/* Organizer application — only for plain users without organizer/admin role */}
          {!hasRole(user, 'organizer') && !hasRole(user, 'admin') && (
            <div className="db-profile-panel-access" style={{ marginTop: 12 }}>
              <h4 className="db-profile-panel-label">📄 Заявка на організатора</h4>
              {myApplication === undefined && (
                <div style={{ fontSize: 13, color: '#888', padding: '6px 0' }}>Завантаження...</div>
              )}
              {(myApplication === null || myApplication?.hasApplication === false) && (
                <button className="db-panel-access-btn" style={{ borderColor: '#4ade80' }} onClick={() => setApplyModal(true)}>
                  <span className="db-pab-icon db-pab-icon--svg"><IconFolder /></span>
                  <div className="db-pab-text">
                    <strong>Стати організатором</strong>
                    <span>Подайте заявку — адмін розгляне і надасть доступ</span>
                  </div>
                  <span className="db-pab-arrow">→</span>
                </button>
              )}
              {myApplication?.status === 'pending' && !myApplication?.hasApplication && (
                <div className="db-admin-tip" style={{ margin: 0 }}>
                  ⏳ Заявка на розгляді — чекайте рішення адміністратора
                </div>
              )}
              {myApplication?.status === 'rejected' && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div className="db-admin-tip" style={{ margin: 0, color: '#f87171', background: 'rgba(248,113,113,.1)' }}>
                    ❌ Заявку відхилено
                  </div>
                  <button className="db-panel-access-btn" style={{ borderColor: '#4ade80' }} onClick={() => setApplyModal(true)}>
                    <span className="db-pab-icon db-pab-icon--svg"><IconRefresh /></span>
                    <div className="db-pab-text"><strong>Подати нову заявку</strong><span>Можна заповнити знову</span></div>
                    <span className="db-pab-arrow">→</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button className="db-btn db-btn-danger db-btn-full db-btn-with-icon" style={{ marginTop: 16 }} onClick={onLogout}>
            <IconLogout /> Вийти з акаунту
          </button>

          <div className="db-danger-zone">
            <div className="db-danger-zone-header">
              <span className="db-danger-zone-stripes" aria-hidden="true" />
              <h4 className="db-danger-zone-title">Danger zone</h4>
              <span className="db-danger-zone-stripes" aria-hidden="true" />
            </div>
            <p className="db-danger-zone-text">
              Небезпечні дії, які можуть призвести до втрати даних або доступу до акаунту. Будьте обережні!
            </p>
            <div className="db-danger-zone-btn-wrap">
              <button
                type="button"
                className="db-danger-btn"
                onClick={() => setDeleteAccountModal(true)}
              >
                <span>Видалити акаунт</span>
              </button>
            </div>
          </div>
        </div>

        </div>{/* end db-profile-cards-right */}
      </div>

      {selectedBadge && <BadgeModal badge={selectedBadge} pinnedBadge={pinnedBadge} onPin={handlePinBadge} onClose={() => setSelectedBadge(null)} />}

      {applyModal && (
        <OrganizerApplyModal
          onClose={() => setApplyModal(false)}
          onSubmit={handleApply}
        />
      )}

      {deleteAccountModal && (
        <DeleteAccountModal
          user={user}
          onClose={() => setDeleteAccountModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}

      {pwdModal && (
        <ChangePasswordModal
          user={user}
          setUser={setUser}
          toast={toast}
          onClose={() => setPwdModal(false)}
        />
      )}
    </div>
  );
}
