import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

import IconChat    from '@images/dashboard_components/icon_chat.svg?react';
import IconEmoji   from '@images/dashboard_components/icon_emoji.svg?react';
import IconAttach  from '@images/dashboard_components/icon_attach.svg?react';
import IconSticker from '@images/dashboard_components/icon_sticker.svg?react';

import {
  getMyTeams, getCustomChatRooms, getChatHistory, getChatReactions,
  getPinnedMessages, uploadChatFile, getUserProfile,
  getMutedChatUsers, toggleChatMute,
  pinChatMessage, unpinChatMessage,
  searchUsers, addTeamChatMember,
  API_BASE,
} from '@utils/authApi';
import {
  BASE_ROOMS, EMOJI_QUICK, EMOJI_REACT,
  isEmojiOnly, compressImage, parseFileUrls,
  getSocket,
  UserProfileModal,
  resolveAvatarUrl,
  STICKERS, STICKER_PREFIX,
  ALL_BADGES, displayName,
  playMsgSound, playReplySound, playReactionSound, playDeleteSound,
} from './db.shared.jsx';

/** Backend `getPinnedMessages` returns `ChatPinned[]` with the actual message
 *  nested under `.message`. Flatten to a message-shaped object the UI can read. */
function normalizePinned(record) {
  if (!record) return null;
  const msg = record.message || record; // tolerate either shape
  if (!msg) return null;
  return {
    ...msg,
    id: msg.id ?? record.message_id ?? record.id,
    text: msg.text ?? '',
    file_url: msg.file_url ?? null,
    username: msg.username ?? msg.user?.username ?? record.user?.username ?? 'Anonymous',
    user_avatar_url: msg.user_avatar_url ?? msg.user?.user_avatar_url ?? null,
    pinnedRecordId: record.id,
    pinned_at: record.pinned_at ?? null,
  };
}

export default function TabChat({
  user, toast, userId, setTab, isMuted, isActive = true,
  chatUnreadByRoom, setChatUnreadByRoom,
  setActiveChatRoom,
  soundOn, setSoundOn,
}) {
  const [myTeams,     setMyTeams]     = useState([]);
  const [room,        setRoom]        = useState('general');
  const [messages,    setMessages]    = useState([]);
  const [reactions,   setReactions]   = useState({});
  const [text,        setText]        = useState('');
  const [loading,     setLoading]     = useState(true);
  const [online,      setOnline]      = useState(() => {
    const s = getSocket();
    return !!s?.connected;
  });
  const [hasEverConnected, setHasEverConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmoji,   setShowEmoji]   = useState(false);
  const [emojiTab,    setEmojiTab]    = useState('emoji'); // 'emoji' | 'stickers'
  const [replyTo,     setReplyTo]     = useState(null);
  const [editingId,   setEditingId]   = useState(null);
  const [editText,    setEditText]    = useState('');
  const [ctxMenu,     setCtxMenu]     = useState(null);
  const [imgFiles,    setImgFiles]    = useState([]);
  const [uploading,   setUploading]   = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const unreadCounts = chatUnreadByRoom || {};
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
  const [showScrollBtn,    setShowScrollBtn]    = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [addMemberResult, setAddMemberResult] = useState(null);
  const [addMemberSearching, setAddMemberSearching] = useState(false);
  const [addMemberAdding, setAddMemberAdding] = useState(false);
  const addMemberTimer = useRef(null);

  async function openChatProfile(basic) {
    setChatProfile({ ...basic, loading: true });
    try {
      const full = await getUserProfile(basic.user_id);
      setChatProfile({ ...basic, ...full, user_id: full.id, loading: false });
    } catch { setChatProfile({ ...basic, loading: false }); }
  }

  // Tell Dashboard which room is currently active so it can suppress unread/sound for it
  useEffect(() => {
    if (isActive) {
      setActiveChatRoom?.(room);
      // Clear any unread that arrived while hidden — user is now actively viewing
      setChatUnreadByRoom?.(prev => { if (!prev[room]) return prev; const n = { ...prev }; delete n[room]; return n; });
    } else {
      setActiveChatRoom?.(null);
    }
    return () => setActiveChatRoom?.(null);
  }, [room, isActive, setActiveChatRoom, setChatUnreadByRoom]);

  const bottomRef      = useRef(null);
  const typingTimer    = useRef(null);
  const typingRmTimers = useRef({});
  const socket         = getSocket();
  const fileRef        = useRef(null);
  const inputRef       = useRef(null);
  const ctxRef        = useRef(null);
  const lastUsedEmoji = useRef('❤️');
  const justLoadedRef = useRef(true);
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
    setHasMoreOlder(true);
    setChatUnreadByRoom?.(prev => { const n = { ...prev }; delete n[room]; return n; });
    justLoadedRef.current = true;
    getChatHistory(room, { limit: 50 })
      .then(msgs => {
        const arr = Array.isArray(msgs) ? msgs : [];
        if (arr.length < 50) setHasMoreOlder(false);
        if (arr.length) setMessages(arr.map(m => ({
          ...m,
          username:        m.username        ?? m.user?.username        ?? 'Anonymous',
          first_name:      m.first_name      ?? m.user?.first_name      ?? null,
          last_name:       m.last_name       ?? m.user?.last_name       ?? null,
          pinned_badge:    m.pinned_badge    ?? m.user?.pinned_badge    ?? null,
          role:            m.role            ?? m.user?.role            ?? 'user',
          user_avatar_url: m.user_avatar_url ?? m.user?.user_avatar_url ?? null,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // reactions and pinned via REST
    getChatReactions(room).then(setReactions).catch(() => {});
    getPinnedMessages(room)
      .then(records => setPinnedMsgs((records || []).map(normalizePinned).filter(Boolean)))
      .catch(() => {
        // fallback: не очищати pinnedMsgs при помилці
        setChatError('Не вдалося завантажити закріплені повідомлення');
      });
    // room:history from WebSocket will override when it arrives
  }, [room, toast]);

  useEffect(() => {
    if (!socket) return;
    // Emit room:join after socket is connected (backend event name)
    const doJoin = () => socket.emit('room:join', { room });
    if (socket.connected) {
      doJoin();
    } else {
      socket.once('connect', doJoin);
    }

    // room:history — backend sends full history after room:join
    const normalizeMsg = msg => ({
      ...msg,
      username:        msg.username        ?? msg.user?.username        ?? 'Anonymous',          first_name:      msg.first_name      ?? msg.user?.first_name      ?? null,
          last_name:       msg.last_name       ?? msg.user?.last_name       ?? null,
          pinned_badge:    msg.pinned_badge    ?? msg.user?.pinned_badge    ?? null,      role:            msg.role            ?? msg.user?.role            ?? 'user',
      user_avatar_url: msg.user_avatar_url ?? msg.user?.user_avatar_url ?? null,
    });
    const onHistory = ({ room: r, messages: msgs }) => {
      if (r === room) { setMessages((msgs || []).map(normalizeMsg)); setLoading(false); }
    };
    // message:new — backend event name. Unread for OTHER rooms is handled
    // globally by Dashboard. Here we append to the currently-viewed room
    // and play receive sound for messages from other users.
    const onMsg = msg => {
      const m = normalizeMsg(msg);
      if (m.room !== room) return;
      setMessages(prev => [...prev, m]);
      if (m.user_id !== meId && soundOn) playMsgSound();
    };
    const onConn    = () => { setOnline(true); setHasEverConnected(true); doJoin(); };
    const onDisconn = () => setOnline(false);
    // user:typing — backend sends { userId, username, isTyping }
    const onTyping  = ({ username: u, isTyping }) => {
      if (isTyping) {
        setTypingUsers(p => p.includes(u) ? p : [...p, u]);
        clearTimeout(typingRmTimers.current[u]);
        typingRmTimers.current[u] = setTimeout(() => {
          setTypingUsers(p => p.filter(x => x !== u));
          delete typingRmTimers.current[u];
        }, 3500);
      } else {
        clearTimeout(typingRmTimers.current[u]);
        setTypingUsers(p => p.filter(x => x !== u));
      }
    };
    const onError = ({ message: msg }) => setChatError(msg);
    const onReactionUpdate = ({ messageId, emoji, count, users }) => {
      setReactions(prev => {
        const prevEntry = prev[`${messageId}_${emoji}`] || { count: 0, users: [] };
        const isFromOther = !(users || []).includes(user?.username) || count < prevEntry.count;
        const isAdded = count > prevEntry.count;
        if (isAdded && isFromOther && soundOn) playReactionSound();
        return {
          ...prev,
          [`${messageId}_${emoji}`]: { count, users: users || [] },
        };
      });
    };

    socket.on('room:history',  onHistory);
    socket.on('message:new',   onMsg);
    socket.on('connect',       onConn);
    socket.on('disconnect',    onDisconn);
    socket.on('user:typing',   onTyping);
    socket.on('reaction:update', onReactionUpdate);
    socket.on('message:deleted', ({ messageId }) => {
      setMessages(prev => {
        const existed = prev.some(m => m.id === messageId);
        if (existed && soundOn) playDeleteSound();
        return prev.filter(m => m.id !== messageId);
      });
    });
    socket.on('message:edited', ({ messageId, newText, edited_at }) =>
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: newText, edited_at } : m))
    );
    const onPinned   = (payload) => {
      const msg = normalizePinned(payload?.message ? { message: payload.message } : payload);
      if (!msg) return;
      setPinnedMsgs(prev => prev.some(p => p.id === msg.id) ? prev : [...prev, msg]);
    };
    const onUnpinned = ({ messageId }) => setPinnedMsgs(prev => prev.filter(p => p.id !== messageId));
    socket.on('message:pinned',   onPinned);
    socket.on('message:unpinned', onUnpinned);
    if (socket.connected) { setOnline(true); setHasEverConnected(true); }
    return () => {
      socket.emit('room:leave', { room });
      socket.off('room:history',  onHistory);
      socket.off('message:new',   onMsg);
      socket.off('connect',       onConn);
      socket.off('disconnect',    onDisconn);
      socket.off('user:typing',   onTyping);
      socket.off('error',         onError);
      socket.off('reaction:update', onReactionUpdate);
      socket.off('message:deleted');
      socket.off('message:edited');
      socket.off('message:pinned',   onPinned);
      socket.off('message:unpinned', onUnpinned);
    };
  }, [room, socket, soundOn, meId]);

  const msgsRef = useRef(null);

  // Instant scroll to bottom when initial room load completes
  useEffect(() => {
    if (!loading && justLoadedRef.current && msgsRef.current) {
      justLoadedRef.current = false;
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
      setShowScrollBtn(false);
    }
  }, [loading]);

  // Auto-scroll to bottom on new messages (only if already near bottom)
  useEffect(() => {
    if (justLoadedRef.current) return;
    const el = msgsRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    } else {
      setShowScrollBtn(true);
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    setShowScrollBtn(false);
  };

  const scrollToMsg = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMsgId(msgId);
    setTimeout(() => setHighlightedMsgId(null), 2000);
  };

  const handleMsgsScroll = () => {
    const el = msgsRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollBtn(!nearBottom);
    // Trigger pagination when user scrolls near the top
    if (el.scrollTop < 80 && hasMoreOlder && !loadingOlder && messages.length > 0) {
      loadOlderMessages();
    }
  };

  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreOlder || messages.length === 0) return;
    const el = msgsRef.current;
    if (!el) return;
    setLoadingOlder(true);
    const oldestId = messages[0]?.id;
    const prevHeight = el.scrollHeight;
    const prevTop = el.scrollTop;
    try {
      const older = await getChatHistory(room, { limit: 50, before: oldestId });
      const arr = Array.isArray(older) ? older : [];
      if (arr.length < 50) setHasMoreOlder(false);
      if (arr.length > 0) {
        const normalized = arr.map(m => ({
          ...m,
          username:        m.username        ?? m.user?.username        ?? 'Anonymous',
          first_name:      m.first_name      ?? m.user?.first_name      ?? null,
          last_name:       m.last_name       ?? m.user?.last_name       ?? null,
          pinned_badge:    m.pinned_badge    ?? m.user?.pinned_badge    ?? null,
          role:            m.role            ?? m.user?.role            ?? 'user',
          user_avatar_url: m.user_avatar_url ?? m.user?.user_avatar_url ?? null,
        }));
        setMessages(prev => [...normalized, ...prev]);
        // Preserve scroll position so user doesn't jump while older messages prepend
        requestAnimationFrame(() => {
          if (msgsRef.current) {
            msgsRef.current.scrollTop = prevTop + (msgsRef.current.scrollHeight - prevHeight);
          }
        });
      }
    } catch {}
    finally { setLoadingOlder(false); }
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
    let file_url;
    if (imgFiles.length > 0) {
      setUploading(true);
      try {
        const urls = await Promise.all(imgFiles.map(f => uploadChatFile(f.file)));
        file_url = urls[0]; // backend accepts single file_url
      }
      catch { toast.error('Не вдалось завантажити файл'); setUploading(false); return; }
      finally { setUploading(false); }
    }
    // backend event: message:send, payload uses snake_case
    socket.emit('message:send', {
      room,
      text: text.trim(),
      reply_to_id: replyTo?.id || undefined,
      file_url,
    });
    if (replyTo && soundOn) playReplySound();
    socket.emit('message:typing', { room, isTyping: false });
    clearTimeout(typingTimer.current);
    setText(''); setReplyTo(null); setShowEmoji(false); setImgFiles([]);
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
  };

  const handleInput = e => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
    if (!online) return;
    socket.emit('message:typing', { room, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('message:typing', { room, isTyping: false }), 2500);
  };

  const addEmoji = emoji => { setText(t => t + emoji); setShowEmoji(false); inputRef.current?.focus(); };
  const sendSticker = stickerUrl => {
    if (!online) return;
    socket.emit('message:send', {
      room,
      text: STICKER_PREFIX + stickerUrl,
      reply_to_id: replyTo?.id || undefined,
    });
    setShowEmoji(false);
    setReplyTo(null);
  };
  const sendReaction = (messageId, emoji) => {
    if (!online) return;
    socket.emit('react', { room, messageId, emoji });
    lastUsedEmoji.current = emoji;
    if (soundOn) playReactionSound();
  };
  const startEdit = msg => {
    setEditingId(msg.id);
    setEditText(msg.text);
    setCtxMenu(null);
    setReplyTo(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const submitEdit = () => {
    if (!editText.trim() || !online) return;
    const original = messages.find(m => m.id === editingId);
    const newText = editText.trim();
    // No actual change — just close edit mode without emitting / marking as edited
    if (original && (original.text || '').trim() === newText) {
      setEditingId(null); setEditText('');
      return;
    }
    socket.emit('message:edit', { messageId: editingId, room, newText });
    // optimistic update — mark as edited only because text actually changed
    setMessages(prev => prev.map(m => m.id === editingId ? { ...m, text: newText, edited_at: Date.now() } : m));
    setEditingId(null); setEditText('');
  };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };
  const deleteMsg = msg => { setDeletePending(msg); setCtxMenu(null); };
  const confirmDelete = async () => {
    if (!deletePending) return;
    try {
      socket.emit('message:delete', { messageId: deletePending.id, room });
      if (soundOn) playDeleteSound();
      // optimistic: remove locally immediately
      setMessages(prev => prev.filter(m => m.id !== deletePending.id));
    } catch {}
    setDeletePending(null);
  };
  const cancelDelete = () => setDeletePending(null);
  const MAX_PINNED = 3;
  const isMsgPinnable = (msg) => {
    if (!msg) return false;
    const text = (msg.text || '').trim();
    const isSticker = text.startsWith(STICKER_PREFIX);
    const fileUrls = parseFileUrls(msg.file_url);
    if (isSticker) return true;
    if (fileUrls.length > 0) return true;
    if (text.length > 0) return true;
    return false;
  };
  const pinMsg = msg => {
    if (!isMsgPinnable(msg)) {
      toast?.error?.('Не можна закріпити порожнє повідомлення');
      setCtxMenu(null);
      return;
    }
    if (pinnedMsgs.length >= MAX_PINNED && !pinnedMsgs.some(p => p.id === msg.id)) {
      toast?.error?.(`Можна закріпити максимум ${MAX_PINNED} повідомлень`);
      setCtxMenu(null);
      return;
    }
    socket.emit('pin_message', { messageId: msg.id });
    setCtxMenu(null);
    setPinnedMsgs(prev => prev.some(p => p.id === msg.id) ? prev : [...prev, msg]);
  };
  const unpinMsg = msgId => {
    socket.emit('unpin_message', { messageId: msgId });
    setPinnedMsgs(prev => prev.filter(p => p.id !== msgId));
  };

  /* Auto-cleanup: drop pinned messages that became empty (text wiped, no media). */
  useEffect(() => {
    const stale = pinnedMsgs.filter(p => !isMsgPinnable(p));
    if (stale.length === 0) return;
    setPinnedMsgs(prev => prev.filter(p => isMsgPinnable(p)));
    stale.forEach(p => { try { socket?.emit?.('unpin_message', { messageId: p.id }); } catch {} });
  }, [pinnedMsgs]);

  const [activePinIdx, setActivePinIdx] = useState(0);
  useEffect(() => {
    if (activePinIdx >= pinnedMsgs.length) setActivePinIdx(0);
  }, [pinnedMsgs.length, activePinIdx]);

  // Auto-switch pinned bar based on viewport: when the currently shown pinned
  // message becomes visible, rotate the bar to show a different (not-visible) pin.
  // Mirrors Telegram behaviour — the bar always points to a pin you haven't seen yet.
  useEffect(() => {
    if (pinnedMsgs.length < 2 || !msgsRef.current) return;
    const visibleIds = new Set();
    const els = pinnedMsgs
      .map(p => document.getElementById(`msg-${p.id}`))
      .filter(Boolean);
    if (els.length === 0) return;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const id = parseInt(e.target.id.replace('msg-', ''), 10);
        if (e.isIntersecting) visibleIds.add(id);
        else visibleIds.delete(id);
      });
      setActivePinIdx(curIdx => {
        const cur = pinnedMsgs[curIdx];
        if (!cur || !visibleIds.has(cur.id)) return curIdx;
        for (let i = 1; i <= pinnedMsgs.length; i++) {
          const tryIdx = (curIdx + i) % pinnedMsgs.length;
          if (!visibleIds.has(pinnedMsgs[tryIdx].id)) return tryIdx;
        }
        return curIdx;
      });
    }, { root: msgsRef.current, threshold: 0.4 });

    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [pinnedMsgs, messages.length]);

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

  const handleMsgContextMenu = (e, msg) => {
    e.preventDefault();
    const MENU_W = 232, MENU_H = 320;
    const x = e.clientX + MENU_W > window.innerWidth  ? e.clientX - MENU_W : e.clientX;
    const y = e.clientY + MENU_H > window.innerHeight ? e.clientY - MENU_H : e.clientY;
    setCtxMenu({ msg, x: Math.max(4, x), y: Math.max(4, y) });
  };
  const currentRoom = ROOMS.find(r => r.id === room);
  const currentTeam = room.startsWith('team_') ? myTeams.find(t => `team_${t.id}` === room) : null;

  const handleAddMemberSearch = (q) => {
    setAddMemberQuery(q);
    setAddMemberResult(null);
    clearTimeout(addMemberTimer.current);
    if (q.trim().length < 2) return;
    addMemberTimer.current = setTimeout(async () => {
      setAddMemberSearching(true);
      try {
        const results = await searchUsers(q.trim());
        setAddMemberResult(results[0] || null);
      } catch { /* ignore */ }
      finally { setAddMemberSearching(false); }
    }, 400);
  };

  const handleAddMemberConfirm = async () => {
    if (!addMemberResult || !currentTeam) return;
    setAddMemberAdding(true);
    try {
      await addTeamChatMember(currentTeam.id, addMemberResult.id);
      toast.success(`${addMemberResult.username} додано до чату команди!`);
      setAddMemberOpen(false);
      setAddMemberQuery('');
      setAddMemberResult(null);
    } catch (err) { toast.error(err.message || 'Помилка додавання'); }
    finally { setAddMemberAdding(false); }
  };

  /* ── Inner ChatMsg component ─────────────────── */
  function ChatMsg({ msg }) {
    const isMe  = msg.user_id === meId;
    const time  = new Date(msg.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const msgReactions = EMOJI_REACT
      .map(emoji => ({ emoji, ...(reactions[`${msg.id}_${emoji}`] || { count: 0, users: [] }) }))
      .filter(r => r.count > 0);
    const isEditing  = editingId === msg.id;
    const fileUrls   = parseFileUrls(msg.file_url);
    const isSticker  = msg.text && msg.text.startsWith(STICKER_PREFIX);
    const stickerSrc = isSticker ? msg.text.slice(STICKER_PREFIX.length) : null;
    const bigEmoji   = !fileUrls.length && !isSticker && isEmojiOnly(msg.text);

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
      <div id={`msg-${msg.id}`}
        className={`db-chat-msg${isMe ? ' me' : ''}${msg.role === 'admin' ? ' from-admin' : ''}${highlightedMsgId === msg.id ? ' db-chat-msg--highlighted' : ''}`}
        onMouseEnter={() => setHoveredMsg(msg.id)}
        onMouseLeave={() => setHoveredMsg(null)}
        onContextMenu={e => handleMsgContextMenu(e, msg)}
        onDoubleClick={() => sendReaction(msg.id, lastUsedEmoji.current)}>
        {!isMe && (
          <div className="db-chat-msg-avatar-wrap"
            title={`Профіль ${msg.username}`}
            onClick={() => openChatProfile({ user_id: msg.user_id, username: msg.username, user_avatar_url: msg.user_avatar_url, role: msg.role })}>
            <img src={resolveAvatarUrl(msg.user_avatar_url)}
              alt={msg.username}
              className={`db-chat-msg-avatar db-chat-msg-avatar--img${msg.role === 'admin' ? ' admin' : ''}`}
              style={{ display: msg.user_avatar_url ? undefined : 'none' }}
              onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling && (e.currentTarget.nextElementSibling.style.removeProperty('display')); }}
            />
            <div className={`db-chat-msg-avatar${msg.role === 'admin' ? ' admin' : ''}`}
              style={{ display: msg.user_avatar_url ? 'none' : undefined }}>
              {(msg.username || '?').slice(0, 2).toUpperCase()}
            </div>
          </div>
        )}
        <div className="db-chat-msg-body">
          {!isMe && (
            <span className={`db-chat-msg-name db-chat-msg-name-link${msg.role === 'admin' ? ' admin-name' : ''}`}
              onClick={() => openChatProfile({ user_id: msg.user_id, username: msg.username, user_avatar_url: msg.user_avatar_url, role: msg.role })}>
              {displayName(msg)}
              {msg.role === 'admin' && <span className="db-chat-admin-badge" title="Адміністратор">👑</span>}
              {msg.pinned_badge && (() => {
                const bd = ALL_BADGES.find(b => b.id === msg.pinned_badge);
                return bd ? <img src={bd.image} alt={bd.name} title={bd.name} className="db-chat-badge-pin" /> : null;
              })()}
            </span>
          )}
          {msg.reply_to_id && (() => {
            const rText = msg.reply_text || '';
            const rIsSticker = rText.startsWith(STICKER_PREFIX);
            const rFiles = parseFileUrls(msg.reply_file_url);
            const rPreview = rIsSticker
              ? '🖼 Стікер'
              : rFiles.length > 0 && !rText
                ? `📎 Зображення${rFiles.length > 1 ? ` ×${rFiles.length}` : ''}`
                : rText;
            return (
              <div className="db-chat-reply-preview" onClick={e => { e.stopPropagation(); scrollToMsg(msg.reply_to_id); }} style={{ cursor: 'pointer' }}>
                <span className="db-crp-name">{msg.reply_username || '…'}</span>
                <span className="db-crp-text">{rPreview.slice(0, 80)}{rPreview.length > 80 ? '…' : ''}</span>
              </div>
            );
          })()}
          {(
            <div className={`db-chat-bubble${bigEmoji ? ' big-emoji' : ''}${isSticker ? ' sticker-bubble' : ''}${isEditing ? ' db-chat-bubble--editing' : ''}`}>
              {isSticker ? (
                <img src={stickerSrc} alt="sticker" className="db-chat-sticker"
                  loading="lazy" decoding="async" />
              ) : (
                <>
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
                </>
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
          <span className="db-chat-time">
            {time}
            {isMe && (
              <span className={`db-chat-read-status${msg.is_read ? ' read' : ''}`} title={msg.is_read ? 'Прочитано' : 'Надіслано'}>
                {msg.is_read ? '✓✓' : '✓'}
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="db-tab db-chat-layout" onClick={() => setCtxMenu(null)}>

      {ctxMenu && (
        <div ref={ctxRef} className="db-ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={e => e.stopPropagation()}>

          {/* ── Quick reactions row (top) ── */}
          <div className="db-ctx-react-row">
            {EMOJI_REACT.map(e => {
              const already = reactions[`${ctxMenu.msg.id}_${e}`]?.users?.includes(meId);
              return (
                <button key={e}
                  className={`db-ctx-emoji${already ? ' active' : ''}`}
                  title={already ? 'Зняти реакцію' : 'Поставити реакцію'}
                  onClick={() => { sendReaction(ctxMenu.msg.id, e); setCtxMenu(null); }}>
                  {e}
                </button>
              );
            })}
          </div>

          <div className="db-ctx-sep" />

          {/* ── Actions ── */}
          <button className="db-ctx-btn" onClick={() => { setReplyTo({ id: ctxMenu.msg.id, text: ctxMenu.msg.text, username: ctxMenu.msg.username }); setCtxMenu(null); inputRef.current?.focus(); }}>
            <span className="db-ctx-icon">↩</span> Відповісти
          </button>
          <button className="db-ctx-btn" onClick={() => { navigator.clipboard?.writeText(ctxMenu.msg.text); setCtxMenu(null); toast.success('Скопійовано'); }}>
            <span className="db-ctx-icon">📋</span> Копіювати
          </button>
          {ctxMenu.msg.user_id === meId && !(ctxMenu.msg.text || '').startsWith(STICKER_PREFIX) && (
            <button className="db-ctx-btn" onClick={() => startEdit(ctxMenu.msg)}>
              <span className="db-ctx-icon">✏️</span> Редагувати
            </button>
          )}
          {isAdmin && (
            <>
              {pinnedMsgs.some(p => p.id === ctxMenu.msg.id)
                ? <button className="db-ctx-btn" onClick={() => { unpinMsg(ctxMenu.msg.id); setCtxMenu(null); }}><span className="db-ctx-icon">📌</span> Відкріпити</button>
                : <button className="db-ctx-btn" onClick={() => pinMsg(ctxMenu.msg)}><span className="db-ctx-icon">📌</span> Закріпити</button>
              }
              {ctxMenu.msg.user_id !== meId && (
                mutedUsers.has(ctxMenu.msg.user_id)
                  ? <button className="db-ctx-btn" onClick={() => handleMuteToggle(ctxMenu.msg.user_id)}><span className="db-ctx-icon">🔊</span> Розблокувати чат</button>
                  : <button className="db-ctx-btn danger" onClick={() => handleMuteToggle(ctxMenu.msg.user_id)}><span className="db-ctx-icon">🔇</span> Вимкнути чат</button>
              )}
            </>
          )}
          {(ctxMenu.msg.user_id === meId || isAdmin) && (
            <>
              <div className="db-ctx-sep" />
              <button className="db-ctx-btn danger" onClick={() => deleteMsg(ctxMenu.msg)}>
                <span className="db-ctx-icon">🗑</span> Видалити
              </button>
            </>
          )}
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
              <div className={`db-chat-status${online ? ' online' : ''}${!online && !hasEverConnected ? ' connecting' : ''}`}>
                <span className="db-chat-dot" />
                {online ? 'Онлайн' : (hasEverConnected ? 'Офлайн' : 'Підключення...')}
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
          {currentTeam && (
            <button className="db-chat-add-member-btn" onClick={() => setAddMemberOpen(true)} title="Додати учасника до чату">
              ➕
            </button>
          )}
        </div>

        {/* Add member modal for team rooms */}
        {addMemberOpen && currentTeam && (
          <div className="modal-overlay" onClick={() => setAddMemberOpen(false)}>
            <div className="modal-box modal-box--light" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <button className="modal-close" onClick={() => setAddMemberOpen(false)}>✕</button>
              <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>Додати учасника до чату</h3>
              <p style={{ fontSize: 13, color: '#aaa', margin: '0 0 12px' }}>
                Тільки учасники, яких подавали у складі команди, можуть бути додані.
              </p>
              <input
                className="db-input"
                placeholder="🔍 Пошук по нікнейму"
                value={addMemberQuery}
                onChange={e => handleAddMemberSearch(e.target.value)}
                autoFocus
              />
              {addMemberSearching && <p style={{ fontSize: 13, color: '#aaa', marginTop: 8 }}>Пошук...</p>}
              {addMemberResult && !addMemberSearching && (
                <div className="db-platform-suggestion" style={{ marginTop: 10 }}
                  onClick={handleAddMemberConfirm}>
                  <span className="db-ps-avatar">{addMemberResult.username.slice(0,2).toUpperCase()}</span>
                  <div style={{ flex: 1 }}>
                    <span className="db-ps-name">{addMemberResult.username}</span>
                    {!addMemberResult.identity_confirmed && (
                      <span style={{ display: 'block', fontSize: 11, color: '#e05fa0' }}>⚠️ ПІБ не підтверджено</span>
                    )}
                  </div>
                  <span className="db-ps-add">{addMemberAdding ? '...' : '+ Додати'}</span>
                </div>
              )}
              {addMemberQuery.length >= 2 && !addMemberResult && !addMemberSearching && (
                <p style={{ fontSize: 13, color: '#bbb', marginTop: 8 }}>Користувача не знайдено</p>
              )}
            </div>
          </div>
        )}

        {pinnedMsgs.length > 0 && (() => {
          const current = pinnedMsgs[Math.min(activePinIdx, pinnedMsgs.length - 1)];
          const text = (current.text || '');
          const isSticker = text.startsWith(STICKER_PREFIX);
          const stickerSrc = isSticker ? text.slice(STICKER_PREFIX.length) : null;
          const fileUrls = parseFileUrls(current.file_url);
          const hasFiles = fileUrls.length > 0;
          const previewText = isSticker
            ? 'Стікер'
            : hasFiles && !text
              ? `Зображення${fileUrls.length > 1 ? ` ×${fileUrls.length}` : ''}`
              : text;
          const cycle = () => setActivePinIdx(i => (i + 1) % pinnedMsgs.length);
          return (
            <div className="db-chat-pinned-bar db-chat-pinned-bar--compact" onClick={() => { scrollToMsg(current.id); cycle(); }}>
              {/* left accent stripes — one per pinned message, current one highlighted */}
              <div className="db-chat-pinned-stripes">
                {pinnedMsgs.map((_, i) => (
                  <span key={i} className={`db-chat-pinned-stripe${i === activePinIdx ? ' active' : ''}`} />
                ))}
              </div>
              {(isSticker || hasFiles) && (
                <div className="db-chat-pinned-thumb">
                  {isSticker
                    ? <img src={stickerSrc} alt="" loading="lazy" />
                    : <img src={resolveAvatarUrl(fileUrls[0])} alt="" loading="lazy" />}
                </div>
              )}
              <div className="db-chat-pinned-content">
                <div className="db-chat-pinned-title">
                  Закріплене повідомлення
                  {pinnedMsgs.length > 1 && (
                    <span className="db-chat-pinned-count">{activePinIdx + 1}/{pinnedMsgs.length}</span>
                  )}
                </div>
                <div className="db-chat-pinned-row">
                  <span className="db-chat-pinned-counter-inline">{activePinIdx + 1}</span>
                  <span className="db-chat-pinned-text">{previewText || '—'}</span>
                </div>
              </div>
              <div className="db-chat-pinned-actions" onClick={e => e.stopPropagation()}>
                {pinnedMsgs.length > 1 && (
                  <button className="db-chat-pinned-iconbtn" onClick={cycle} title="Наступне">⇅</button>
                )}
                {isAdmin && (
                  <button className="db-chat-pinned-iconbtn" onClick={() => unpinMsg(current.id)} title="Відкріпити">✕</button>
                )}
              </div>
            </div>
          );
        })()}

        <div className={`db-chat-messages${loading ? ' db-chat-messages--fading' : ''}`} ref={msgsRef} onScroll={handleMsgsScroll}>
          {loadingOlder && (
            <div className="db-chat-load-older"><div className="db-spinner db-spinner--sm" /></div>
          )}
          {loading
            ? <div className="db-loading"><div className="db-spinner" /></div>
            : messages.length === 0
              ? <div className="db-empty" style={{ marginTop: 48 }}><IconChat /><p>Поки немає повідомлень. Будьте першим!</p></div>
              : (() => {
                  const fmtDay = iso => {
                    if (!iso) return '';
                    const d = new Date(iso);
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    const isSameDay = (a, b) =>
                      a.getFullYear() === b.getFullYear() &&
                      a.getMonth() === b.getMonth() &&
                      a.getDate() === b.getDate();
                    if (isSameDay(d, today)) return 'Сьогодні';
                    if (isSameDay(d, yesterday)) return 'Вчора';
                    return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
                  };
                  const getDay = iso => iso ? new Date(iso).toDateString() : '';
                  const items = [];
                  let lastDay = null;
                  messages.forEach(m => {
                    const day = getDay(m.created_at);
                    if (day !== lastDay) {
                      lastDay = day;
                      items.push(<div key={`sep-${day}`} className="db-chat-date-sep"><span>{fmtDay(m.created_at)}</span></div>);
                    }
                    items.push(<ChatMsg key={m.id} msg={m} />);
                  });
                  return items;
                })()
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
          {editingId && (() => {
            const orig = messages.find(m => m.id === editingId);
            const oText = orig?.text || '';
            const oIsSticker = oText.startsWith(STICKER_PREFIX);
            const oFiles = parseFileUrls(orig?.file_url);
            const oPreview = oIsSticker
              ? '🖼 Стікер'
              : oFiles.length > 0 && !oText
                ? `📎 Зображення${oFiles.length > 1 ? ` ×${oFiles.length}` : ''}`
                : oText;
            return (
              <div className="db-chat-reply-bar db-chat-edit-bar">
                <span>✏️ <strong>Змінити повідомлення</strong>: {oPreview.slice(0, 60)}{oPreview.length > 60 ? '…' : ''}</span>
                <button className="db-chat-reply-cancel" onClick={cancelEdit} title="Скасувати редагування">✕</button>
              </div>
            );
          })()}
          {replyTo && !editingId && (() => {
            const rText = replyTo.text || '';
            const rIsSticker = rText.startsWith(STICKER_PREFIX);
            const rFiles = parseFileUrls(replyTo.file_url);
            const rPreview = rIsSticker
              ? '🖼 Стікер'
              : rFiles.length > 0 && !rText
                ? `📎 Зображення${rFiles.length > 1 ? ` ×${rFiles.length}` : ''}`
                : rText;
            return (
            <div className="db-chat-reply-bar">
              <span>↩ <strong>{replyTo.username}</strong>: {rPreview.slice(0, 60)}{rPreview.length > 60 ? '…' : ''}</span>
              <button className="db-chat-reply-cancel" onClick={() => setReplyTo(null)}>✕</button>
            </div>
            );
          })()}
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
            <div className="db-emoji-picker db-emoji-picker--tabbed">
              <div className="db-emoji-picker-tabs">
                <button className={`db-emoji-picker-tab${emojiTab === 'emoji' ? ' active' : ''}`}
                  onClick={() => setEmojiTab('emoji')}>
                  <IconEmoji className="db-emoji-picker-tab-icon" />
                  <span>Емодзі</span>
                </button>
                <button className={`db-emoji-picker-tab${emojiTab === 'stickers' ? ' active' : ''}`}
                  onClick={() => setEmojiTab('stickers')}>
                  <IconSticker className="db-emoji-picker-tab-icon" />
                  <span>Стікери</span>
                </button>
              </div>
              {emojiTab === 'emoji' ? (
                <div className="db-emoji-picker-grid">
                  {EMOJI_QUICK.map(e => <button key={e} className="db-emoji-btn" onClick={() => addEmoji(e)}>{e}</button>)}
                </div>
              ) : (
                <div className="db-sticker-grid">
                  {STICKERS.map((src, i) => (
                    <button key={i} className="db-sticker-btn" onClick={() => sendSticker(src)}>
                      <img src={src} alt={`sticker-${i + 1}`}
                        loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <form className="db-chat-input-row" onSubmit={e => { e.preventDefault(); if (editingId) submitEdit(); else send(e); }}>
            <div className="db-chat-input-tools">
              <button type="button"
                className={`db-emoji-toggle${showEmoji ? ' active' : ''}`}
                onClick={() => setShowEmoji(p => !p)} title="Емодзі та стікери">
                <IconEmoji />
              </button>
              <button type="button" className="db-emoji-toggle"
                onClick={() => fileRef.current?.click()} title="Прикріпити зображення">
                <IconAttach />
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
            {isMuted ? (
              <div className="db-chat-muted-input">
                <span className="db-chat-muted-icon">🔇</span>
                <span>Вам відключено можливість писати повідомлення в даний момент</span>
              </div>
            ) : roomLocked && !isAdmin ? (
              <div className="db-chat-locked-input">🔒 Чат заблоковано адміністратором</div>
            ) : (
              <>
                <textarea ref={inputRef}
                  value={editingId ? editText : text}
                  onChange={e => {
                    if (editingId) {
                      if (e.target.value.length <= 500) setEditText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
                    } else {
                      handleInput(e);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Escape' && editingId) { e.preventDefault(); cancelEdit(); return; }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (editingId) submitEdit();
                      else send(e);
                    }
                  }}
                  placeholder={editingId ? 'Редагування...' : (chatError || (online ? 'Написати повідомлення...' : 'Підключення...'))}
                  disabled={!online || uploading} className={`db-chat-input${chatError ? ' error' : ''}`}
                  maxLength={500} rows={1} />
                {(editingId ? editText : text).length > 300 && (
                  <span className={`db-chat-char-count${(editingId ? editText : text).length >= 480 ? ' danger' : (editingId ? editText : text).length >= 400 ? ' warn' : ''}`}>
                    {(editingId ? editText : text).length}/500
                  </span>
                )}
                <button type="submit" className="db-btn db-btn-primary db-btn-sm db-send-btn"
                  disabled={!online || (editingId ? !editText.trim() : (!text.trim() && !imgFiles.length)) || uploading}>
                  {uploading ? (
                    '⏳'
                  ) : editingId ? (
                    <>
                      <svg className="db-send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="db-send-label">Зберегти</span>
                    </>
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
              <img src={resolveAvatarUrl(chatProfile.user_avatar_url)}
                alt={chatProfile.username}
                className={`db-cp-avatar db-cp-avatar--img${chatProfile.role === 'admin' ? ' admin' : ''}`}
                style={{ display: chatProfile.user_avatar_url ? undefined : 'none' }}
                onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling && (e.currentTarget.nextElementSibling.style.removeProperty('display')); }}
              />
              <div className={`db-cp-avatar${chatProfile.role === 'admin' ? ' admin' : ''}`}
                style={{ display: chatProfile.user_avatar_url ? 'none' : undefined }}>
                {(chatProfile.username || '?').slice(0, 2).toUpperCase()}
              </div>
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


      {lightboxImg && createPortal(        <div className="db-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <button className="db-lightbox-close" onClick={() => setLightboxImg(null)} aria-label="Закрити перегляд">✕</button>
          <a href={lightboxImg} target="_blank" rel="noreferrer" className="db-lightbox-open" onClick={e => e.stopPropagation()}>
            Відкрити в браузері
          </a>
          <img src={lightboxImg} alt="Попередній перегляд" className="db-lightbox-img" onClick={e => e.stopPropagation()} />
        </div>,
        document.body
      )}
    </div>
  );
}
