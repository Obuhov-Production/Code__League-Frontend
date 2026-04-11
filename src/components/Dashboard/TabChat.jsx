import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

import IconChat from '@images/dashboard_components/icon_chat.svg?react';

import {
  getMyTeams, getCustomChatRooms, getChatHistory, getChatReactions,
  getPinnedMessages, uploadChatFile, getUserProfile,
  getMutedChatUsers, toggleChatMute,
  pinChatMessage, unpinChatMessage,
  API_BASE,
} from '@utils/authApi';
import {
  BASE_ROOMS, EMOJI_QUICK, EMOJI_REACT,
  isEmojiOnly, compressImage, parseFileUrls,
  getSocket, playMsgSound,
  UserProfileModal,
} from './db.shared.jsx';

export default function TabChat({ user, toast, userId, onUnreadChange, setTab }) {
  const [myTeams,     setMyTeams]     = useState([]);
  const [room,        setRoom]        = useState('general');
  const [messages,    setMessages]    = useState([]);
  const [reactions,   setReactions]   = useState({});
  const [text,        setText]        = useState('');
  const [loading,     setLoading]     = useState(true);
  const [online,      setOnline]      = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmoji,   setShowEmoji]   = useState(false);
  const [replyTo,     setReplyTo]     = useState(null);
  const [editingId,   setEditingId]   = useState(null);
  const [editText,    setEditText]    = useState('');
  const [ctxMenu,     setCtxMenu]     = useState(null);
  const [soundOn,     setSoundOn]     = useState(true);
  const [imgFiles,    setImgFiles]    = useState([]);
  const [uploading,   setUploading]   = useState(false);
  const [unreadCounts,setUnreadCounts]= useState({});
  const [deletePending,setDeletePending]=useState(null);
  const [chatProfile, setChatProfile] = useState(null);
  const [hoveredMsg,  setHoveredMsg]  = useState(null);
  const [viewProfile, setViewProfile] = useState(null);
  const [mutedUsers,  setMutedUsers]  = useState(new Set());
  const [lightboxImg, setLightboxImg] = useState(null);
  const [pinnedMsgs,  setPinnedMsgs]  = useState([]);
  const [roomLocked,  setRoomLocked]  = useState(false);
  const [chatError,   setChatError]   = useState('');
  const [customRooms, setCustomRooms] = useState([]);
  const [roomsOpen,   setRoomsOpen]   = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  async function openChatProfile(basic) {
    setChatProfile({ ...basic, loading: true });
    try {
      const full = await getUserProfile(basic.user_id);
      setChatProfile({ ...basic, ...full, user_id: full.id, loading: false });
    } catch { setChatProfile({ ...basic, loading: false }); }
  }

  useEffect(() => {
    onUnreadChange?.(Object.values(unreadCounts).some(v => v > 0));
  }, [unreadCounts, onUnreadChange]);

  const bottomRef      = useRef(null);
  const typingTimer    = useRef(null);
  const typingRmTimers = useRef({});
  const socket         = getSocket();
  const fileRef        = useRef(null);
  const inputRef       = useRef(null);
  const ctxRef         = useRef(null);
  const meId        = user?.id ?? userId;
  const isAdmin     = user?.role === 'admin';

  useEffect(() => {
    getMyTeams().then(setMyTeams).catch(() => {});
    getCustomChatRooms().then(setCustomRooms).catch(() => {});
  }, []);

  const ROOMS = useMemo(() => [
    ...BASE_ROOMS,
    ...customRooms.map(r => ({ id: r.name, label: `# ${r.label}`, locked: false, customId: r.id })),
    ...myTeams.map(t => ({ id: `team_${t.id}`, label: `🔒 ${t.name}`, locked: true })),
  ], [myTeams, customRooms]);

  useEffect(() => {
    setLoading(true);
    setMessages([]); setReactions({}); setTypingUsers([]);
    setReplyTo(null); setEditingId(null); setCtxMenu(null); setImgFiles([]);
    setDeletePending(null); setPinnedMsgs([]); setChatError(''); setRoomLocked(false);
    setUnreadCounts(prev => { const n = { ...prev }; delete n[room]; return n; });
    getChatHistory(room)
      .then(setMessages)
      .catch(() => toast.error('Не вдалось завантажити чат'))
      .finally(() => setLoading(false));
    getChatReactions(room).then(setReactions).catch(() => {});
    getPinnedMessages(room).then(setPinnedMsgs).catch(() => {});
    socket?.emit('get_room_settings', { room });
  }, [room, toast]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_room', room);
    const onMsg = msg => {
      if (msg.room !== room) {
        setUnreadCounts(prev => ({ ...prev, [msg.room]: (prev[msg.room] || 0) + 1 }));
        if (soundOn) playMsgSound();
        return;
      }
      setMessages(prev => [...prev, msg]);
      if (msg.user_id !== meId && soundOn) playMsgSound();
    };
    const onEdited  = ({ messageId, newText }) =>
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: newText, edited_at: 1 } : m));
    const onDeleted = ({ messageId }) =>
      setMessages(prev => prev.filter(m => m.id !== messageId));
    const onCleared = () => { setMessages([]); setReactions({}); };
    const onConn    = () => setOnline(true);
    const onDisconn = () => setOnline(false);
    const onOnline  = ({ room: r, count }) => { if (r === room) setOnlineCount(count); };
    const onTyping  = ({ username: u }) => {
      setTypingUsers(p => p.includes(u) ? p : [...p, u]);
      clearTimeout(typingRmTimers.current[u]);
      typingRmTimers.current[u] = setTimeout(() => {
        setTypingUsers(p => p.filter(x => x !== u));
        delete typingRmTimers.current[u];
      }, 3500);
    };
    const onStopTyping = ({ username: u }) => setTypingUsers(p => p.filter(x => x !== u));
    const onReaction   = ({ messageId, emoji, username: u }) => {
      setReactions(prev => {
        const key = `${messageId}_${emoji}`;
        const cur = prev[key] || { emoji, count: 0, users: [] };
        const has = cur.users.includes(u);
        return { ...prev, [key]: { emoji, count: has ? cur.count - 1 : cur.count + 1, users: has ? cur.users.filter(x => x !== u) : [...cur.users, u] } };
      });
    };
    const onSettings = ({ room: r, locked: lk }) => { if (r === room) setRoomLocked(!!lk); };
    const onChatError = ({ message: msg }) => { setChatError(msg); setTimeout(() => setChatError(''), 4000); };
    const onPinned    = ({ room: r }) => {
      if (r === room) getPinnedMessages(room).then(setPinnedMsgs).catch(() => {});
    };
    const onUnpinned  = ({ room: r, messageId }) => {
      if (r === room) setPinnedMsgs(prev => prev.filter(m => m.id !== messageId));
    };
    const onMuteChanged = ({ userId: uid, isMuted }) => {
      setMutedUsers(prev => {
        const next = new Set(prev);
        isMuted ? next.add(uid) : next.delete(uid);
        return next;
      });
    };
    socket.on('new_message',          onMsg);
    socket.on('message_edited',       onEdited);
    socket.on('message_deleted',      onDeleted);
    socket.on('chat_cleared',         onCleared);
    socket.on('connect',              onConn);
    socket.on('disconnect',           onDisconn);
    socket.on('room_online',          onOnline);
    socket.on('user_typing',          onTyping);
    socket.on('user_stop_typing',     onStopTyping);
    socket.on('reaction',             onReaction);
    socket.on('room_settings_changed',onSettings);
    socket.on('chat_error',           onChatError);
    socket.on('message_pinned',       onPinned);
    socket.on('message_unpinned',     onUnpinned);
    socket.on('user_mute_changed',    onMuteChanged);
    if (socket.connected) setOnline(true);
    return () => {
      socket.emit('leave_room', room);
      socket.off('new_message', onMsg); socket.off('message_edited', onEdited);
      socket.off('message_deleted', onDeleted); socket.off('chat_cleared', onCleared);
      socket.off('connect', onConn); socket.off('disconnect', onDisconn);
      socket.off('room_online', onOnline); socket.off('user_typing', onTyping);
      socket.off('user_stop_typing', onStopTyping); socket.off('reaction', onReaction);
      socket.off('room_settings_changed', onSettings); socket.off('chat_error', onChatError);
      socket.off('message_pinned', onPinned); socket.off('message_unpinned', onUnpinned);
      socket.off('user_mute_changed', onMuteChanged);
    };
  }, [room, socket, soundOn, meId]);

  const msgsRef = useRef(null);

  // Auto-scroll to bottom on new messages (only if already near bottom)
  useEffect(() => {
    const el = msgsRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    else setShowScrollBtn(true);
  }, [messages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  };

  const handleMsgsScroll = () => {
    const el = msgsRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollBtn(!nearBottom);
  };

  useEffect(() => {
    if (!lightboxImg) return;
    const onEsc = e => { if (e.key === 'Escape') setLightboxImg(null); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [lightboxImg]);

  useEffect(() => {
    if (!isAdmin) return;
    getMutedChatUsers()
      .then(rows => setMutedUsers(new Set(rows.map(r => r.id))))
      .catch(() => {});
  }, [isAdmin]);

  const handleMuteToggle = async (targetUserId) => {
    setCtxMenu(null);
    try {
      const res = await toggleChatMute(targetUserId);
      setMutedUsers(prev => {
        const next = new Set(prev);
        res.isMuted ? next.add(targetUserId) : next.delete(targetUserId);
        return next;
      });
      toast.success(res.isMuted ? '🔇 Користувача вимкнуто в чаті' : '🔊 Користувача увімкнуто в чаті');
    } catch (e) { toast.error(e.message); }
  };

  useEffect(() => {
    if (!ctxMenu) return;
    const fn = e => { if (ctxRef.current && !ctxRef.current.contains(e.target)) setCtxMenu(null); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ctxMenu]);

  const send = async e => {
    e.preventDefault();
    if ((!text.trim() && !imgFiles.length) || !online) return;
    let fileUrls = [];
    if (imgFiles.length > 0) {
      setUploading(true);
      try { fileUrls = await Promise.all(imgFiles.map(f => uploadChatFile(f.file))); }
      catch { toast.error('Не вдалось завантажити файл'); setUploading(false); return; }
      finally { setUploading(false); }
    }
    socket.emit('send_message', { room, text: text.trim(), replyToId: replyTo?.id || null, fileUrls });
    socket.emit('stop_typing', { room });
    clearTimeout(typingTimer.current);
    setText(''); setReplyTo(null); setShowEmoji(false); setImgFiles([]);
  };

  const handleInput = e => {
    setText(e.target.value);
    if (!online) return;
    socket.emit('typing', { room });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('stop_typing', { room }), 2500);
  };

  const addEmoji = emoji => { setText(t => t + emoji); setShowEmoji(false); inputRef.current?.focus(); };
  const sendReaction = (messageId, emoji) => { if (online) socket.emit('react', { room, messageId, emoji }); };
  const startEdit = msg => { setEditingId(msg.id); setEditText(msg.text); setCtxMenu(null); };
  const submitEdit = () => {
    if (!editText.trim() || !online) return;
    socket.emit('edit_message', { messageId: editingId, newText: editText.trim() });
    setEditingId(null); setEditText('');
  };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };
  const deleteMsg = msg => { setDeletePending(msg); setCtxMenu(null); };
  const confirmDelete = () => { if (!deletePending) return; socket.emit('delete_message', { messageId: deletePending.id }); setDeletePending(null); };
  const cancelDelete = () => setDeletePending(null);
  const pinMsg = msg => { socket.emit('pin_message', { messageId: msg.id }); setCtxMenu(null); };
  const unpinMsg = msgId => { socket.emit('unpin_message', { messageId: msgId }); };

  const handleFileChange = async e => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (!selected.length) return;
    const remaining = 4 - imgFiles.length;
    if (remaining <= 0) { toast.error('Максимум 4 зображення'); return; }
    const toAdd = selected.slice(0, remaining);
    const compressed = await Promise.all(
      toAdd.map(f => f.type.startsWith('image/') ? compressImage(f) : Promise.resolve(f))
    );
    const totalSize = [...imgFiles.map(f => f.file.size), ...compressed.map(f => f.size)].reduce((a, b) => a + b, 0);
    if (totalSize > 40 * 1024 * 1024) { toast.error('Загальний розмір перевищує 40 МБ'); return; }
    const newItems = compressed.map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
    setImgFiles(prev => [...prev, ...newItems]);
  };

  const handleMsgContextMenu = (e, msg) => { e.preventDefault(); setCtxMenu({ msg, x: e.clientX, y: e.clientY }); };
  const currentRoom = ROOMS.find(r => r.id === room);

  /* ── Inner ChatMsg component ─────────────────── */
  function ChatMsg({ msg }) {
    const isMe  = msg.user_id === meId;
    const time  = new Date(msg.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const msgReactions = EMOJI_REACT
      .map(emoji => ({ emoji, ...(reactions[`${msg.id}_${emoji}`] || { count: 0, users: [] }) }))
      .filter(r => r.count > 0);
    const isEditing  = editingId === msg.id;
    const fileUrls   = parseFileUrls(msg.file_url);
    const bigEmoji   = !fileUrls.length && isEmojiOnly(msg.text);

    if (msg.msg_type === 'announcement') {
      return (
        <div className="db-chat-announcement" onContextMenu={e => isAdmin && handleMsgContextMenu(e, msg)}>
          <span className="db-chat-ann-icon">📣</span>
          <div className="db-chat-ann-body">
            <span className="db-chat-ann-label">Оголошення від {msg.username}</span>
            <p className="db-chat-ann-text">{msg.text}</p>
          </div>
          <span className="db-chat-time">{time}</span>
        </div>
      );
    }

    return (
      <div className={`db-chat-msg${isMe ? ' me' : ''}${msg.role === 'admin' ? ' from-admin' : ''}`}
        onMouseEnter={() => setHoveredMsg(msg.id)}
        onMouseLeave={() => setHoveredMsg(null)}
        onContextMenu={e => handleMsgContextMenu(e, msg)}>
        {!isMe && (
          <div className="db-chat-msg-avatar-wrap"
            title={`Профіль ${msg.username}`}
            onClick={() => openChatProfile({ user_id: msg.user_id, username: msg.username, user_avatar_url: msg.user_avatar_url, role: msg.role })}>
            {msg.user_avatar_url ? (
              <img src={API_BASE + msg.user_avatar_url} alt={msg.username}
                className={`db-chat-msg-avatar db-chat-msg-avatar--img${msg.role === 'admin' ? ' admin' : ''}`} />
            ) : (
              <div className={`db-chat-msg-avatar${msg.role === 'admin' ? ' admin' : ''}`}>
                {(msg.username || '?').slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        )}
        <div className="db-chat-msg-body">
          {!isMe && (
            <span className={`db-chat-msg-name db-chat-msg-name-link${msg.role === 'admin' ? ' admin-name' : ''}`}
              onClick={() => openChatProfile({ user_id: msg.user_id, username: msg.username, user_avatar_url: msg.user_avatar_url, role: msg.role })}>
              {msg.username || 'Anonymous'}
              {msg.role === 'admin' && <span className="db-chat-admin-badge" title="Адміністратор">👑</span>}
            </span>
          )}
          {msg.reply_to_id && (
            <div className="db-chat-reply-preview">
              <span className="db-crp-name">{msg.reply_username || '…'}</span>
              <span className="db-crp-text">{(msg.reply_text || '').slice(0, 80)}{(msg.reply_text?.length > 80) ? '…' : ''}</span>
            </div>
          )}
          {isEditing ? (
            <div className="db-chat-edit-wrap">
              <input autoFocus className="db-chat-edit-input" value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') cancelEdit(); }} />
              <div className="db-chat-edit-btns">
                <button className="db-btn db-btn-sm db-btn-primary" onClick={submitEdit}>Зберегти</button>
                <button className="db-btn db-btn-sm db-btn-ghost"   onClick={cancelEdit}>Скас.</button>
              </div>
            </div>
          ) : (
            <div className={`db-chat-bubble${bigEmoji ? ' big-emoji' : ''}${hoveredMsg === msg.id && ctxMenu?.msg?.id !== msg.id ? ' show-react' : ''}`}>
              {fileUrls.length > 0 && (
                <div className={`db-chat-imgs${fileUrls.length > 1 ? ' db-chat-imgs--grid' : ''}`}>
                  {fileUrls.map((url, i) => (
                    <button key={i} type="button" className="db-chat-img-link"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setLightboxImg(API_BASE + url); }}
                      aria-label="Переглянути зображення">
                      <img src={API_BASE + url} className="db-chat-img" alt="файл"
                        onError={e => { e.target.style.display = 'none'; }} />
                    </button>
                  ))}
                </div>
              )}
              {msg.text && <span className="db-chat-text">{msg.text}</span>}
              {msg.edited_at && !bigEmoji && <span className="db-chat-edited"> (ред.)</span>}
              {!bigEmoji && (
                <div className="db-chat-react-row">
                  {EMOJI_REACT.map(emoji => (
                    <button key={emoji} className="db-react-btn" onClick={() => sendReaction(msg.id, emoji)}>{emoji}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          {msgReactions.length > 0 && (
            <div className="db-reactions">
              {msgReactions.map(r => (
                <span key={r.emoji} className="db-reaction-pill"
                  onClick={() => sendReaction(msg.id, r.emoji)} title={r.users.join(', ')}>{r.emoji} {r.count}</span>
              ))}
            </div>
          )}
          <span className="db-chat-time">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="db-tab db-chat-layout" onClick={() => setCtxMenu(null)}>

      {ctxMenu && (
        <div ref={ctxRef} className="db-ctx-menu"
          style={{ top: ctxMenu.y, left: Math.min(ctxMenu.x, window.innerWidth - 200) }}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => { setReplyTo({ id: ctxMenu.msg.id, text: ctxMenu.msg.text, username: ctxMenu.msg.username }); setCtxMenu(null); inputRef.current?.focus(); }}>↩ Відповісти</button>
          <button onClick={() => { navigator.clipboard?.writeText(ctxMenu.msg.text); setCtxMenu(null); toast.success('Скопійовано'); }}>📋 Копіювати</button>
          {(ctxMenu.msg.user_id === meId) && (
            <button onClick={() => startEdit(ctxMenu.msg)}>✏️ Редагувати</button>
          )}
          {isAdmin && (
            <>
              {pinnedMsgs.some(p => p.id === ctxMenu.msg.id)
                ? <button onClick={() => { unpinMsg(ctxMenu.msg.id); setCtxMenu(null); }}>📌 Відкріпити</button>
                : <button onClick={() => pinMsg(ctxMenu.msg)}>📌 Закріпити</button>
              }
              {ctxMenu.msg.user_id !== meId && (
                mutedUsers.has(ctxMenu.msg.user_id)
                  ? <button onClick={() => handleMuteToggle(ctxMenu.msg.user_id)}>🔊 Розблокувати чат</button>
                  : <button className="danger" onClick={() => handleMuteToggle(ctxMenu.msg.user_id)}>🔇 Вимкнути чат</button>
              )}
            </>
          )}
          {(ctxMenu.msg.user_id === meId || isAdmin) && (
            <button className="danger" onClick={() => deleteMsg(ctxMenu.msg)}>🗑 Видалити</button>
          )}
          <div className="db-ctx-sep" />
          <div className="db-ctx-react-row">
            {EMOJI_REACT.map(e => (
              <button key={e} className="db-ctx-emoji"
                onClick={() => { sendReaction(ctxMenu.msg.id, e); setCtxMenu(null); }}>{e}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Mobile rooms drawer ── */}
      {roomsOpen && (
        <>
          <div className="db-rooms-drawer-backdrop" onClick={() => setRoomsOpen(false)} />
          <div className="db-rooms-drawer" onClick={e => e.stopPropagation()}>
            <div className="db-rooms-drawer-header">
              <span className="db-rooms-drawer-title">💬 Кімнати чату</span>
              <button className="db-rooms-drawer-close" onClick={() => setRoomsOpen(false)}>✕</button>
            </div>
            <div className="db-rooms-drawer-body">
              <div className="db-chat-rooms-group">
                <div className="db-chat-rooms-group-label">Загальні</div>
                {BASE_ROOMS.map(r => (
                  <button key={r.id}
                    className={`db-chat-room-btn${room === r.id ? ' active' : ''}${unreadCounts[r.id] > 0 && room !== r.id ? ' has-unread' : ''}`}
                    onClick={() => { setRoom(r.id); setRoomsOpen(false); }}>
                    <span>{r.label}</span>
                    {unreadCounts[r.id] > 0 && room !== r.id && (
                      <span className="db-room-unread">{unreadCounts[r.id] > 99 ? '99+' : unreadCounts[r.id]}</span>
                    )}
                  </button>
                ))}
              </div>
              {customRooms.length > 0 && (
                <div className="db-chat-rooms-group">
                  <div className="db-chat-rooms-group-label">Категорії</div>
                  {customRooms.map(r => (
                    <button key={r.id}
                      className={`db-chat-room-btn${room === r.name ? ' active' : ''}${unreadCounts[r.name] > 0 && room !== r.name ? ' has-unread' : ''}`}
                      onClick={() => { setRoom(r.name); setRoomsOpen(false); }}>
                      <span># {r.label}</span>
                      {unreadCounts[r.name] > 0 && room !== r.name && (
                        <span className="db-room-unread">{unreadCounts[r.name] > 99 ? '99+' : unreadCounts[r.name]}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {myTeams.length > 0 && (
                <div className="db-chat-rooms-group">
                  <div className="db-chat-rooms-group-label">Команди</div>
                  {myTeams.map(t => (
                    <button key={t.id}
                      className={`db-chat-room-btn team${room === `team_${t.id}` ? ' active' : ''}${unreadCounts[`team_${t.id}`] > 0 && room !== `team_${t.id}` ? ' has-unread' : ''}`}
                      onClick={() => { setRoom(`team_${t.id}`); setRoomsOpen(false); }}>
                      <span>🔒 {t.name}</span>
                      {unreadCounts[`team_${t.id}`] > 0 && room !== `team_${t.id}` && (
                        <span className="db-room-unread">{unreadCounts[`team_${t.id}`] > 99 ? '99+' : unreadCounts[`team_${t.id}`]}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="db-rooms-drawer-footer">
              <button className="db-chat-sound-btn" onClick={() => setSoundOn(p => !p)}
                title={soundOn ? 'Вимкнути звук' : 'Увімкнути звук'}>{soundOn ? '🔔' : '🔕'}</button>
              <div className={`db-chat-status${online ? ' online' : ''}`}>
                <span className="db-chat-dot" />{online ? 'Онлайн' : 'Офлайн'}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rooms Sidebar / Pill Bar */}
      <div className="db-chat-rooms">        <div className="db-chat-rooms-title">Кімнати</div>

        {/* General rooms */}
        <div className="db-chat-rooms-group">
          <div className="db-chat-rooms-group-label">Загальні</div>
          {BASE_ROOMS.map(r => (
            <button key={r.id} className={`db-chat-room-btn${room === r.id ? ' active' : ''}${unreadCounts[r.id] > 0 && room !== r.id ? ' has-unread' : ''}`}
              onClick={() => setRoom(r.id)}>
              <span>{r.label}</span>
              {unreadCounts[r.id] > 0 && room !== r.id && (
                <span className="db-room-unread">{unreadCounts[r.id] > 99 ? '99+' : unreadCounts[r.id]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Custom rooms */}
        {customRooms.length > 0 && (
          <div className="db-chat-rooms-group">
            <div className="db-chat-rooms-group-label">Категорії</div>
            {customRooms.map(r => (
              <button key={r.id} className={`db-chat-room-btn${room === r.name ? ' active' : ''}${unreadCounts[r.name] > 0 && room !== r.name ? ' has-unread' : ''}`}
                onClick={() => setRoom(r.name)}>
                <span># {r.label}</span>
                {unreadCounts[r.name] > 0 && room !== r.name && (
                  <span className="db-room-unread">{unreadCounts[r.name] > 99 ? '99+' : unreadCounts[r.name]}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Team rooms */}
        {myTeams.length > 0 && (
          <div className="db-chat-rooms-group">
            <div className="db-chat-rooms-group-label">Команди</div>
            {myTeams.map(t => (
              <button key={t.id} className={`db-chat-room-btn team${room === `team_${t.id}` ? ' active' : ''}${unreadCounts[`team_${t.id}`] > 0 && room !== `team_${t.id}` ? ' has-unread' : ''}`}
                onClick={() => setRoom(`team_${t.id}`)}>
                <span>🔒 {t.name}</span>
                {unreadCounts[`team_${t.id}`] > 0 && room !== `team_${t.id}` && (
                  <span className="db-room-unread">{unreadCounts[`team_${t.id}`] > 99 ? '99+' : unreadCounts[`team_${t.id}`]}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Sound + status (desktop only — hidden on mobile via CSS) */}
        <div style={{ flex: 1 }} />
        <div className="db-chat-rooms-footer">
          <button className="db-chat-sound-btn" onClick={() => setSoundOn(p => !p)}
            title={soundOn ? 'Вимкнути звук' : 'Увімкнути звук'}>{soundOn ? '🔔' : '🔕'}</button>
          <div className={`db-chat-status${online ? ' online' : ''}`}>
            <span className="db-chat-dot" />{online ? 'Онлайн' : 'Офлайн'}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="db-chat-main">
        <div className="db-chat-header">
          <button className="db-chat-rooms-toggle"
            onClick={e => { e.stopPropagation(); setRoomsOpen(true); }}
            title="Кімнати чату" aria-label="Відкрити список кімнат">
            ☰
            {Object.values(unreadCounts).some(v => v > 0) && <span className="db-rooms-toggle-badge" />}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{currentRoom?.label ?? room}</strong>
            {currentRoom?.locked && <span className="db-chat-locked-tag">приватна</span>}
            {roomLocked && <span className="db-chat-locked-tag locked">🔒 заблоковано</span>}
          </div>
          {online && onlineCount > 0 && <span className="db-chat-online-count">⚫ {onlineCount} онлайн</span>}
        </div>

        {pinnedMsgs.length > 0 && (
          <div className="db-chat-pinned-bar">
            <span className="db-chat-pinned-icon">📌</span>
            <div className="db-chat-pinned-content">
              {pinnedMsgs.map(p => (
                <div key={p.id} className="db-chat-pinned-item">
                  <span className="db-chat-pinned-author">{p.username}:</span>
                  <span className="db-chat-pinned-text">{(p.text || '').slice(0, 100)}{p.text?.length > 100 ? '…' : ''}</span>
                  {isAdmin && (
                    <button className="db-chat-pinned-unpin" onClick={() => unpinMsg(p.id)} title="Відкріпити">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="db-chat-messages" ref={msgsRef} onScroll={handleMsgsScroll}>
          {loading
            ? <div className="db-loading"><div className="db-spinner" /></div>
            : messages.length === 0
              ? <div className="db-empty" style={{ marginTop: 48 }}><IconChat /><p>Поки немає повідомлень. Будьте першим!</p></div>
              : messages.map(m => <ChatMsg key={m.id} msg={m} />)
          }
          {typingUsers.length > 0 && (
            <div className="db-typing-indicator">
              <span className="db-typing-dots"><span /><span /><span /></span>
              <span className="db-typing-text">{typingUsers.slice(0, 3).join(', ')} пише...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {showScrollBtn && (
          <button className="db-scroll-bottom-btn" onClick={scrollToBottom} title="Прокрутити вниз" aria-label="Прокрутити вниз">
            ↓
            {Object.values(unreadCounts).some(v => v > 0) && <span className="db-scroll-btn-dot" />}
          </button>
        )}

        <div className="db-chat-bottom">
          {replyTo && (
            <div className="db-chat-reply-bar">
              <span>↩ <strong>{replyTo.username}</strong>: {(replyTo.text || '').slice(0, 60)}{replyTo.text?.length > 60 ? '…' : ''}</span>
              <button className="db-chat-reply-cancel" onClick={() => setReplyTo(null)}>✕</button>
            </div>
          )}
          {imgFiles.length > 0 && (
            <div className="db-chat-img-preview db-chat-img-preview--multi">
              {imgFiles.map((f, i) => (
                <div key={i} className="db-chat-img-preview-item">
                  <img src={f.previewUrl} alt="preview" />
                  <button type="button" onClick={() => setImgFiles(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              {imgFiles.length < 4 && (
                <button type="button" className="db-chat-img-preview-add" onClick={() => fileRef.current?.click()} title="Додати ще">+</button>
              )}
            </div>
          )}
          {showEmoji && (
            <div className="db-emoji-picker">
              {EMOJI_QUICK.map(e => <button key={e} className="db-emoji-btn" onClick={() => addEmoji(e)}>{e}</button>)}
            </div>
          )}
          <form className="db-chat-input-row" onSubmit={send}>
            <button type="button" className="db-emoji-toggle" onClick={() => setShowEmoji(p => !p)} title="Емодзі">😊</button>
            <button type="button" className="db-emoji-toggle" onClick={() => fileRef.current?.click()} title="Прикріпити зображення">📎</button>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
            {roomLocked && !isAdmin ? (
              <div className="db-chat-locked-input">🔒 Чат заблоковано адміністратором</div>
            ) : (
              <>
                <input ref={inputRef} type="text" value={text} onChange={handleInput}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
                  placeholder={chatError || (online ? 'Написати повідомлення...' : 'Підключення...')}
                  disabled={!online || uploading} className={`db-chat-input${chatError ? ' error' : ''}`}
                  maxLength={500} />
                {text.length > 300 && (
                  <span className={`db-chat-char-count${text.length >= 480 ? ' danger' : text.length >= 400 ? ' warn' : ''}`}>
                    {text.length}/500
                  </span>
                )}
                <button type="submit" className="db-btn db-btn-primary db-btn-sm db-send-btn"
                  disabled={!online || (!text.trim() && !imgFiles.length) || uploading}>
                  {uploading ? (
                    '⏳'
                  ) : (
                    <>
                      <svg className="db-send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="db-send-label">Надіслати</span>
                    </>
                  )}
                </button>
              </>
            )}
          </form>
        </div>
      </div>

      {/* Mini-profile overlay */}
      {chatProfile && (
        <div className="db-chat-profile-overlay" onClick={() => setChatProfile(null)}>
          <div className="db-chat-profile-card" onClick={e => e.stopPropagation()}>
            <div className="db-cp-header"
              style={chatProfile.banner_url
                ? { backgroundImage: `url(${API_BASE + chatProfile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: chatProfile.banner_color || '#191A23' }
              }>
              <button className="db-chat-profile-close" onClick={() => setChatProfile(null)}>✕</button>
            </div>
            <div className="db-cp-avatar-wrap">
              {chatProfile.user_avatar_url ? (
                <img src={API_BASE + chatProfile.user_avatar_url} alt={chatProfile.username}
                  className={`db-cp-avatar db-cp-avatar--img${chatProfile.role === 'admin' ? ' admin' : ''}`} />
              ) : (
                <div className={`db-cp-avatar${chatProfile.role === 'admin' ? ' admin' : ''}`}>
                  {(chatProfile.username || '?').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="db-cp-body">
              <div className="db-cp-name">{chatProfile.username || 'Anonymous'}</div>
              {chatProfile.role && chatProfile.role !== 'user' && (
                <div className="db-cp-role-badge">{chatProfile.role === 'admin' ? '⚙ Admin' : chatProfile.role}</div>
              )}
              {chatProfile.user_description && !chatProfile.loading && (
                <p className="db-cp-desc">{chatProfile.user_description}</p>
              )}
              <div className="db-cp-meta">
                {chatProfile.loading
                  ? <span className="db-cp-date">Завантаження...</span>
                  : chatProfile.created_at && (
                    <span className="db-cp-date">Реєстрація: {new Date(chatProfile.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )
                }
              </div>
              <div className="db-cp-actions">
                {chatProfile.user_id === meId
                  ? <button className="db-cp-btn" onClick={() => { setChatProfile(null); setTab('profile'); }}>Редагувати профіль</button>
                  : <button className="db-cp-btn" onClick={() => { setViewProfile(chatProfile); setChatProfile(null); }}>Профіль →</button>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {viewProfile && (
        <UserProfileModal
          profile={viewProfile}
          meId={meId}
          onClose={() => setViewProfile(null)}
          onGoOwnProfile={() => { setViewProfile(null); setTab('profile'); }}
        />
      )}

      {deletePending && createPortal(
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={cancelDelete}>
          <div className="db-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="db-confirm-icon">🗑️</div>
            <p className="db-confirm-message">Видалити повідомлення від <strong>{deletePending.username}</strong>?</p>
            {deletePending.text && (
              <p className="db-delete-msg-preview">"{(deletePending.text).slice(0, 100)}{deletePending.text.length > 100 ? '…' : ''}"</p>
            )}
            <div className="db-confirm-actions">
              <button className="db-btn db-btn-ghost" onClick={cancelDelete}>Скасувати</button>
              <button className="db-btn db-btn-danger" onClick={confirmDelete}>Видалити</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {lightboxImg && createPortal(
        <div className="db-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <button className="db-lightbox-close" onClick={() => setLightboxImg(null)} aria-label="Закрити перегляд">✕</button>
          <a href={lightboxImg} target="_blank" rel="noreferrer" className="db-lightbox-open" onClick={e => e.stopPropagation()}>
            Відкрити оригінал
          </a>
          <img src={lightboxImg} alt="Попередній перегляд" className="db-lightbox-img" onClick={e => e.stopPropagation()} />
        </div>,
        document.body
      )}
    </div>
  );
}
