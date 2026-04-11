import { useState, useEffect, useRef } from 'react';

import { getMyTeams, updateMe, uploadAvatar, uploadBanner, deleteBanner, API_BASE } from '@utils/authApi';
import { BANNER_PRESETS, StatusBadge, UserAvatar, formatDate } from './db.shared.jsx';

export default function TabProfile({ user, setUser, toast, onLogout }) {
  const [myTeams,   setMyTeams]  = useState([]);
  const [editing,   setEditing]  = useState(false);
  const [saving,    setSaving]   = useState(false);
  const [form,      setForm]     = useState({ username: '', user_description: '', banner_color: '' });
  const [bannerMode, setBannerMode] = useState('color');
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    getMyTeams().then(setMyTeams).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setForm({ username: user.username || '', user_description: user.user_description || '', banner_color: user.banner_color || '#1e1b2e' });
    }
  }, [user]);

  if (!user) return null;

  const canChangeUsername = () => {
    if (!user.username_updated_at) return true;
    return (Date.now() - new Date(user.username_updated_at).getTime()) >= 7 * 86400000;
  };
  const daysUntilChange = () => {
    if (!user.username_updated_at) return 0;
    return Math.ceil(7 - (Date.now() - new Date(user.username_updated_at).getTime()) / 86400000);
  };

  const bannerStyle = editing
    ? (
        bannerMode === 'image' && user.banner_url
          ? { backgroundImage: `url(${API_BASE + user.banner_url})`, backgroundSize:'cover', backgroundPosition:'center' }
          : { background: form.banner_color || '#1e1b2e' }
      )
    : (
        user.banner_url
          ? { backgroundImage: `url(${API_BASE + user.banner_url})`, backgroundSize:'cover', backgroundPosition:'center' }
          : { background: user.banner_color || '#1e1b2e' }
      );

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
      <div className="db-profile-banner" style={bannerStyle}>
        {editing && (
          <div className="db-banner-controls">
            <button className={`db-banner-mode-btn${bannerMode === 'color' ? ' active' : ''}`} onClick={() => setBannerMode('color')}>🎨 Колір</button>
            <button className={`db-banner-mode-btn${bannerMode === 'image' ? ' active' : ''}`} onClick={() => setBannerMode('image')}>🖼 Фото</button>
            {user.banner_url && (
              <button className="db-banner-mode-btn db-banner-del-btn" onClick={handleDeleteBanner} title="Видалити банер">❌ Видалити</button>
            )}
          </div>
        )}
        {editing && bannerMode === 'color' && (
          <div className="db-color-presets">
            {BANNER_PRESETS.map(c => (
              <button key={c} className={`db-color-dot${form.banner_color === c ? ' selected' : ''}`}
                style={{ background: c }} onClick={() => setForm(f => ({ ...f, banner_color: c }))} />
            ))}
            <input type="color" value={form.banner_color} onChange={e => setForm(f => ({ ...f, banner_color: e.target.value }))}
              className="db-color-custom" title="Свій колір" />
          </div>
        )}
        {editing && bannerMode === 'image' && (
          <button className="db-banner-upload-btn" onClick={() => bannerInputRef.current?.click()}>
            📤 Завантажити фото (до 10 МБ)
          </button>
        )}
        <input ref={bannerInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleBannerPick} />
      </div>

      <div className="db-profile-avatar-row">
        <div className="db-profile-avatar-wrap">
          <UserAvatar user={user} size={88} />
          {editing && (
            <button className="db-avatar-edit-btn" onClick={() => avatarInputRef.current?.click()} title="Змінити аватар">📷</button>
          )}
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarPick} />
        </div>
        <div className="db-profile-headings">
          <h2>{user.username || user.email}</h2>
          <div className="db-profile-chips">
            <span className="db-role-badge">{user.role === 'admin' ? '⚙ Адмін' : '👤 Учасник'}</span>
            <span className="db-chip">🏆 Команд: {myTeams.length}</span>
            <span className="db-chip">📅 З {formatDate(user.created_at)}</span>
          </div>
        </div>
        <div className="db-profile-actions">
          {!editing ? (
            <button className="db-btn db-btn-primary" onClick={() => setEditing(true)}>Редагувати</button>
          ) : (
            <>
              <button className="db-btn db-btn-ghost" onClick={() => setEditing(false)} disabled={saving}>Скасувати</button>
              <button className="db-btn db-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Збереження...' : 'Зберегти'}</button>
            </>
          )}
        </div>
      </div>

      <div className="db-profile-cards">
        <div className="db-info-card">
          <h3>Особиста інформація</h3>
          {editing ? (
            <>
              <div className="db-field-row">
                <label>Нікнейм
                  {!canChangeUsername() && <span className="db-field-hint"> (через {daysUntilChange()} дн.)</span>}
                </label>
                <input className="db-field-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  disabled={!canChangeUsername()} placeholder="Ваш нікнейм" />
              </div>
              <div className="db-field-row">
                <label>Про себе</label>
                <textarea className="db-field-input" rows={3} value={form.user_description}
                  onChange={e => setForm(f => ({ ...f, user_description: e.target.value }))}
                  placeholder="Розкажіть про себе..." />
              </div>
            </>
          ) : (
            <>
              <div className="db-field-row"><label>Нікнейм</label><span>{user.username || '—'}</span></div>
              <div className="db-field-row"><label>Email</label><span>{user.email}</span></div>
              <div className="db-field-row"><label>Про себе</label><span>{user.user_description || '—'}</span></div>
              <div className="db-field-row"><label>Реєстрація</label><span>{formatDate(user.created_at)}</span></div>
            </>
          )}
        </div>

        <div className="db-info-card">
          <h3>Мої команди</h3>
          {myTeams.length === 0 ? <p style={{ color:'#aaa', fontSize:14 }}>Ще немає команд</p>
            : myTeams.slice(0,5).map(t => (
              <div key={t.id} className="db-field-row">
                <label>{t.tournament_name}</label>
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>{t.name} <StatusBadge status={t.tournament_status} /></span>
              </div>
            ))}
        </div>

        <div className="db-info-card">
          <h3>Безпека</h3>
          <div className="db-field-row"><label>Статус</label><span style={{ color:'#16a34a', fontWeight:600 }}>● Активний</span></div>
          <div className="db-field-row"><label>Пароль</label><span>••••••••</span></div>
          <button className="db-btn db-btn-danger db-btn-full" style={{ marginTop:20 }} onClick={onLogout}>Вийти з акаунту</button>
        </div>
      </div>
    </div>
  );
}
