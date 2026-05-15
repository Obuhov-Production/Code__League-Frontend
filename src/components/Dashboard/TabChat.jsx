import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PublicProfileModal } from './PublicProfilePage.jsx';

import IconChat       from '@images/dashboard_components/icon_chat.svg?react';
import IconEmoji      from '@images/dashboard_components/icon_emoji.svg?react';
import IconAttach     from '@images/dashboard_components/icon_attach.svg?react';
import IconSticker    from '@images/dashboard_components/icon_sticker.svg?react';
import IconPensil     from '@images/dashboard_components/pensil.svg?react';
import IconChatBubble from '@images/dashboard_components/chat.svg?react';
import IconAdd        from '@images/dashboard_components/add.svg?react';
import IconTime       from '@images/dashboard_components/time.svg?react';
import IconLock       from '@images/dashboard_components/icon_lock_shield.svg?react';
import IconTrash      from '@images/dashboard_components/icon_trash_bin.svg?react';

import {
  getMyTeams, getCustomChatRooms, getChatHistory, getChatReactions,
  getPinnedMessages, uploadChatFile, getUserProfile,
  getMutedChatUsers, toggleChatMute,
  pinChatMessage, unpinChatMessage,
  searchUsers, addTeamChatMember, getTeamChatMembers, getAllChatUsers,
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
  const [chatProfile,    setChatProfile]    = useState(null);
  const [hoveredMsg,     setHoveredMsg]     = useState(null);
  const [viewProfile,    setViewProfile]    = useState(null);
  const [publicProfile,  setPublicProfile]  = useState(null);
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
  const [membersPanelOpen, setMembersPanelOpen] = useState(() => window.innerWidth >= 768);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [allUsersLoading, setAllUsersLoading] = useState(false);

  // ── @mention autocomplete ────────────────────
  const [mentionQuery, setMentionQuery]       = useState(null);   // null = closed, '' or 'abc' = open
  const [mentionResults, setMentionResults]   = useState([]);
  const [mentionIdx, setMentionIdx]           = useState(0);
  const mentionRef = useRef(null);

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
    const refreshTeams = () => getMyTeams().then(setMyTeams).catch(() => {});
    refreshTeams();
    getCustomChatRooms().then(setCustomRooms).catch(() => {});
    window.addEventListener('cl:teams:changed', refreshTeams);
    return () => window.removeEventListener('cl:teams:changed', refreshTeams);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refreshTeams = notif => {
      if (!notif || ['team_invite', 'team_member_joined', 'team_invite_rejected'].includes(notif.icon)) {
        getMyTeams().then(setMyTeams).catch(() => {});
      }
    };
    socket.on('notification:new', refreshTeams);
    return () => socket.off('notification:new', refreshTeams);
  }, [socket]);

  const ROOMS = useMemo(() => [
    ...BASE_ROOMS,
    ...customRooms.map(r => ({ id: r.name, label: `# ${r.label}`, locked: false, customId: r.id })),
    ...myTeams.map(t => ({ id: `team_${t.id}`, label: t.name, locked: true })),
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
      if (r === room) {
        setMessages((msgs || []).map(normalizeMsg));
        setLoading(false);
        // Room opened → mark every incoming unread message as read for the sender.
        if (isActive) socket.emit('chat:markRead', { room });
      }
    };
    // message:new — backend event name. Unread for OTHER rooms is handled
    // globally by Dashboard. Here we append to the currently-viewed room
    // and play receive sound for messages from other users.
    const onMsg = msg => {
      const m = normalizeMsg(msg);
      if (m.room !== room) return;
      setMessages(prev => [...prev, m]);
      if (m.user_id !== meId) {
        if (soundOn) playMsgSound();
        // Active room is being viewed → mark this message as read immediately.
        if (isActive) socket.emit('chat:markRead', { room });
      }
    };
    // message:read — sender side: flip ✓ → ✓✓ for the listed message ids.
    const onRead = ({ room: r, message_ids }) => {
      if (r !== room || !Array.isArray(message_ids) || message_ids.length === 0) return;
      const idSet = new Set(message_ids);
      setMessages(prev => prev.map(m => idSet.has(m.id) ? { ...m, is_read: true } : m));
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
    socket.on('message:read',     onRead);
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
      socket.off('message:read',     onRead);
    };
  }, [room, socket, soundOn, meId, isActive]);

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

  // Close mention dropdown on outside click (unless clicking inside the textarea or dropdown itself)
  useEffect(() => {
    if (mentionQuery === null) return;
    const fn = e => {
      const inDropdown = mentionRef.current && mentionRef.current.contains(e.target);
      const inTextarea = inputRef.current && inputRef.current.contains(e.target);
      if (!inDropdown && !inTextarea) { setMentionQuery(null); setMentionResults([]); }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [mentionQuery]);

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
    setMentionQuery(null); setMentionResults([]);
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
  };

  const handleInput = e => {
    const val = e.target.value;
    setText(val);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
    if (!online) return;
    socket.emit('message:typing', { room, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('message:typing', { room, isTyping: false }), 2500);

    // ── Detect @mention trigger ──
    const el = e.target;
    const cursor = el.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w{0,30})$/);
    if (match) {
      const q = match[1].toLowerCase();
      setMentionQuery(q);
      setMentionIdx(0);
      // Filter from allUsers + messages authors as fallback
      const seen = new Set();
      const pool = [];
      const addUser = u => { if (!seen.has(u.id ?? u.user_id)) { seen.add(u.id ?? u.user_id); pool.push(u); } };
      allUsers.forEach(addUser);
      messages.forEach(m => addUser({ id: m.user_id, username: m.username, user_avatar_url: m.user_avatar_url }));
      const filtered = q
        ? pool.filter(u => u.username && u.username.toLowerCase().includes(q)).slice(0, 8)
        : pool.slice(0, 8);
      setMentionResults(filtered);
    } else {
      if (mentionQuery !== null) { setMentionQuery(null); setMentionResults([]); }
    }
  };

  // Insert selected @mention into text
  const insertMention = (username) => {
    const el = inputRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const replaced = before.replace(/@\w{0,30}$/, `@${username} `);
    const newText = replaced + after;
    setText(newText);
    setMentionQuery(null);
    setMentionResults([]);
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = replaced.length;
        inputRef.current.selectionStart = pos;
        inputRef.current.selectionEnd = pos;
        inputRef.current.focus();
      }
    });
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

  // Load team chat members when panel opens or active team changes
  useEffect(() => {
    if (!membersPanelOpen || !currentTeam) return;
    let alive = true;
    setTeamMembersLoading(true);
    getTeamChatMembers(currentTeam.id)
      .then(list => { if (alive) setTeamMembers(Array.isArray(list) ? list : []); })
      .catch(() => { if (alive) setTeamMembers([]); })
      .finally(() => { if (alive) setTeamMembersLoading(false); });
    return () => { alive = false; };
  }, [membersPanelOpen, currentTeam?.id]);

  // For non-team rooms: fetch ALL platform users for the members panel.
  useEffect(() => {
    if (!membersPanelOpen || currentTeam) return;
    let alive = true;
    setAllUsersLoading(true);
    getAllChatUsers()
      .then(list => { if (alive) setAllUsers(Array.isArray(list) ? list : []); })
      .catch(() => { if (alive) setAllUsers([]); })
      .finally(() => { if (alive) setAllUsersLoading(false); });
    return () => { alive = false; };
  }, [membersPanelOpen, currentTeam?.id]);

  const AWAY_MS    =  5 * 60 * 1000;
  const OFFLINE_MS = 20 * 60 * 1000;
  const computeEffectivePresence = (m) => {
    if (m.id === meId) return online ? 'online' : 'offline';
    if (!m.status) return 'offline';
    if (m.status === 'offline') return 'offline';
    if (m.last_seen_at) {
      const seenAgo = Date.now() - new Date(m.last_seen_at).getTime();
      if (seenAgo > OFFLINE_MS) return 'offline';
      if (seenAgo > AWAY_MS)    return 'away';
    }
    return m.status;
  };

  const groupedTeamMembers = useMemo(() => {
    const source = currentTeam ? teamMembers : allUsers;
    const onlineList = [];
    const offlineList = [];
    for (const m of source) {
      const ep = computeEffectivePresence(m);
      const decorated = { ...m, effective_status: ep };
      const isOnline = ep === 'online' || ep === 'do_not_disturb' || ep === 'away';
      (isOnline ? onlineList : offlineList).push(decorated);
    }
    const byName = (a, b) => {
      if (a.is_captain !== b.is_captain) return a.is_captain ? -1 : 1;
      return (a.username || '').localeCompare(b.username || '');
    };
    onlineList.sort(byName);
    offlineList.sort(byName);
    return { online: onlineList, offline: offlineList };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMembers, allUsers, currentTeam, meId, online]);

  const visibleMembersList = currentTeam ? teamMembers : allUsers;
  const isMembersLoading = currentTeam ? teamMembersLoading : allUsersLoading;

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

  // Render @mentions as highlighted clickable spans
  const renderTextWithMentions = (text) => {
    if (!text) return null;
    const MENTION_RE = /@(\w+)/g;
    const parts = [];
    let last = 0;
    let match;
    while ((match = MENTION_RE.exec(text)) !== null) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      const uname = match[1];
      parts.push(
        <span
          key={`m-${match.index}`}
          className={`db-chat-mention${uname === user?.username ? ' db-chat-mention--me' : ''}`}
          onClick={e => {
            e.stopPropagation();
            const found = allUsers.find(u => u.username === uname)
              || messages.find(m => m.username === uname);
            if (found) openChatProfile({ user_id: found.id ?? found.user_id, username: uname, user_avatar_url: found.user_avatar_url });
          }}
          title={`@${uname}`}
        >@{uname}</span>
      );
      last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length > 0 ? parts : text;
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
              referrerPolicy="no-referrer"
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
                  {msg.text && <span className="db-chat-text">{renderTextWithMentions(msg.text)}</span>}
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
                {msg.is_read ? '✓' : '✕'}
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
              <span className="db-ctx-icon"><IconPensil style={{ width: 14, height: 14 }} /></span> Редагувати
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
                <span className="db-ctx-icon"><IconTrash style={{ width: 14, height: 14 }} /></span> Видалити
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
              <span className="db-rooms-drawer-title"><IconChatBubble style={{ width: 16, height: 16, verticalAlign: -3, marginRight: 6 }} /> Кімнати чату</span>
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
                      <span><IconLock style={{ width: 12, height: 12, verticalAlign: -1, marginRight: 4 }} />{t.name}</span>
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
            <div className="db-chat-rooms-group-label">Чати команд</div>
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
            <div className="db-chat-rooms-group-label">Ваші Команди</div>
            {myTeams.map(t => (
              <button key={t.id} className={`db-chat-room-btn team${room === `team_${t.id}` ? ' active' : ''}${unreadCounts[`team_${t.id}`] > 0 && room !== `team_${t.id}` ? ' has-unread' : ''}`}
                onClick={() => setRoom(`team_${t.id}`)}>
                <span><IconLock style={{ width: 12, height: 12, verticalAlign: -1, marginRight: 4 }} />{t.name}</span>
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

          {/* Header room: desktop = static label, mobile = ☰ button opens drawer */}
          <div className="db-chat-header-room">
            {/* ☰ burger — mobile only via CSS display:none on desktop */}
            <button className="db-chat-rooms-toggle"
              onClick={e => { e.stopPropagation(); setRoomsOpen(true); }}
              aria-label="Відкрити список кімнат">
              ☰
              {Object.values(unreadCounts).some(v => v > 0) && <span className="db-rooms-toggle-badge" />}
            </button>
            <div className="db-chat-header-room-title">
              <strong>{currentRoom?.label ?? room}</strong>
              {currentRoom?.locked && <span className="db-chat-locked-tag">приватна</span>}
              {roomLocked && <span className="db-chat-locked-tag locked"><IconLock style={{ width: 11, height: 11, verticalAlign: -1, marginRight: 3 }} /> заблоковано</span>}
            </div>
          </div>
          {online && onlineCount > 0 && <span className="db-chat-online-count">⚫ {onlineCount} онлайн</span>}
          <div className="db-chat-header-actions">
            <button
              className={`db-chat-members-toggle${membersPanelOpen ? ' active' : ''}`}
              onClick={() => setMembersPanelOpen(p => !p)}
              title="Список учасників"
              aria-label="Список учасників"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </button>
            {currentTeam && (
              <button className="db-chat-add-member-btn" onClick={() => setAddMemberOpen(true)} title="Додати учасника до чату">
                <IconAdd style={{ width: 18, height: 18 }} />
              </button>
            )}
          </div>
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
            ? (
              <div className="db-chat-skeleton">
                {[1, 2, 3, 4, 5].map(i => (
                  <div className={`db-chat-skeleton-row${i % 2 === 0 ? ' right' : ''}`} key={i}>
                    <div className="db-card-skeleton db-skeleton-avatar" />
                    <div className="db-card-skeleton db-chat-skeleton-bubble" />
                  </div>
                ))}
              </div>
            )
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
                <span><IconPensil style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 4 }} /> <strong>Змінити повідомлення</strong>: {oPreview.slice(0, 60)}{oPreview.length > 60 ? '…' : ''}</span>
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
          {/* ── @mention autocomplete dropdown ── */}
          {mentionQuery !== null && mentionResults.length > 0 && (
            <div className="db-mention-dropdown" ref={mentionRef}>
              {mentionResults.map((u, i) => (
                <button
                  key={u.id ?? u.user_id}
                  type="button"
                  className={`db-mention-item${i === mentionIdx ? ' active' : ''}`}
                  onMouseEnter={() => setMentionIdx(i)}
                  onMouseDown={e => { e.preventDefault(); insertMention(u.username); }}
                >
                  <div className="db-mention-avatar-wrap">
                    {u.user_avatar_url ? (
                      <img
                        src={u.user_avatar_url.startsWith('http') ? u.user_avatar_url : `${API_BASE}${u.user_avatar_url}`}
                        alt={u.username}
                        referrerPolicy="no-referrer"
                        className="db-mention-avatar"
                        onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling && (e.currentTarget.nextSibling.style.removeProperty('display')); }}
                      />
                    ) : null}
                    <div className="db-mention-avatar db-mention-avatar--initials"
                      style={{ display: u.user_avatar_url ? 'none' : undefined }}>
                      {(u.username || '?').slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <span className="db-mention-username">@{u.username}</span>
                </button>
              ))}
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
              <div className="db-chat-locked-input"><IconLock style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 5 }} /> Чат заблоковано адміністратором</div>
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
                    // ── @mention keyboard navigation ──
                    if (mentionQuery !== null && mentionResults.length > 0) {
                      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => (i + 1) % mentionResults.length); return; }
                      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIdx(i => (i - 1 + mentionResults.length) % mentionResults.length); return; }
                      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionResults[mentionIdx].username); return; }
                      if (e.key === 'Escape') { e.preventDefault(); setMentionQuery(null); setMentionResults([]); return; }
                    }
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
                    <IconTime style={{ width: 16, height: 16 }} />
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

      {/* Members panel */}
      {membersPanelOpen && (
        <>
          <div className="db-chat-members-backdrop" onClick={() => setMembersPanelOpen(false)} />
          <aside className="db-chat-members-panel" onClick={e => e.stopPropagation()}>
            <div className="db-chat-members-header">
              <span className="db-chat-members-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {currentTeam ? 'Учасники команди' : 'Учасники чату'}
              </span>
              <button className="db-chat-members-close" onClick={() => setMembersPanelOpen(false)} aria-label="Закрити">✕</button>
            </div>

            <div className="db-chat-members-body">
              {isMembersLoading && <div className="db-chat-members-loading">Завантаження…</div>}

              {!isMembersLoading && visibleMembersList.length === 0 && (
                <div className="db-chat-members-empty">
                  {currentTeam ? 'Учасників ще немає' : 'Не вдалося завантажити список'}
                </div>
              )}

              {!isMembersLoading && groupedTeamMembers.online.length > 0 && (
                <div className="db-chat-members-group">
                  <div className="db-chat-members-group-label">
                    В мережі — {groupedTeamMembers.online.length}
                  </div>
                  {groupedTeamMembers.online.map(m => (
                    <div key={m.id} className="db-chat-members-row"
                         onClick={() => openChatProfile({
                           user_id: m.id, username: m.username,
                           avatar_url: m.user_avatar_url,
                         })}>
                      <div className="db-chat-members-avatar-wrap">
                        {m.user_avatar_url ? (
                          <img src={m.user_avatar_url.startsWith('http') ? m.user_avatar_url : `${API_BASE}${m.user_avatar_url}`}
                               alt={m.username || 'user'}
                               referrerPolicy="no-referrer"
                               className="db-chat-members-avatar" />
                        ) : (
                          <div className="db-chat-members-avatar db-chat-members-avatar--initials">
                            {(m.username || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className={`db-chat-members-dot db-chat-members-dot--${m.effective_status || 'online'}`} />
                      </div>
                      <div className="db-chat-members-info">
                        <span className="db-chat-members-name">{m.username || `user#${m.id}`}</span>
                        {m.is_captain && <span className="db-chat-members-tag">👑 Капітан</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isMembersLoading && groupedTeamMembers.offline.length > 0 && (
                <div className="db-chat-members-group">
                  <div className="db-chat-members-group-label">
                    Не в мережі — {groupedTeamMembers.offline.length}
                  </div>
                  {groupedTeamMembers.offline.map(m => (
                    <div key={m.id} className="db-chat-members-row db-chat-members-row--offline"
                         onClick={() => openChatProfile({
                           user_id: m.id, username: m.username,
                           avatar_url: m.user_avatar_url,
                         })}>
                      <div className="db-chat-members-avatar-wrap">
                        {m.user_avatar_url ? (
                          <img src={m.user_avatar_url.startsWith('http') ? m.user_avatar_url : `${API_BASE}${m.user_avatar_url}`}
                               alt={m.username || 'user'}
                               referrerPolicy="no-referrer"
                               className="db-chat-members-avatar" />
                        ) : (
                          <div className="db-chat-members-avatar db-chat-members-avatar--initials">
                            {(m.username || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="db-chat-members-dot db-chat-members-dot--offline" />
                      </div>
                      <div className="db-chat-members-info">
                        <span className="db-chat-members-name">{m.username || `user#${m.id}`}</span>
                        {m.is_captain && <span className="db-chat-members-tag">👑 Капітан</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Mini-profile popover (Discord-style) */}
      {chatProfile && (() => {
        const fullName = [chatProfile.first_name, chatProfile.last_name].filter(Boolean).join(' ').trim();
        const displayName = fullName || chatProfile.username || 'Anonymous';
        // Apply same effective-presence rules as panel: trust socket for self,
        // demote stale online/away/dnd statuses if last_seen_at > 3 min ago.
        const presence = (() => {
          if (chatProfile.user_id === meId) return online ? 'online' : 'offline';
          const raw = chatProfile.status;
          if (!raw || raw === 'offline') return raw;
          if (chatProfile.last_seen_at) {
            const seenAgo = Date.now() - new Date(chatProfile.last_seen_at).getTime();
            if (seenAgo > 3 * 60 * 1000) return 'offline';
          }
          return raw;
        })();
        const presenceLabel = presence === 'online' ? 'У мережі'
          : presence === 'away' ? 'Не на місці'
          : presence === 'do_not_disturb' ? 'Не турбувати'
          : presence === 'offline' ? 'Не в мережі'
          : (chatProfile.last_seen_text || '');
        const isAdmin = String(chatProfile.role || '').includes('admin');
        const isOrg   = String(chatProfile.role || '').includes('organizer');
        const isJury  = String(chatProfile.role || '').includes('jury');
        const isSelf  = chatProfile.user_id === meId;
        const regDate = chatProfile.created_at
          ? new Date(chatProfile.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
          : null;
        const pinnedBadgeMeta = chatProfile.pinned_badge
          ? ALL_BADGES.find(b => b.id === chatProfile.pinned_badge)
          : null;
        const roleLabel = chatProfile.role === 'admin' ? '⚙ Адмін'
          : chatProfile.role === 'organizer' ? '🎯 Організатор'
          : chatProfile.role === 'jury' ? '⚖ Журі'
          : chatProfile.role && chatProfile.role !== 'user' ? chatProfile.role
          : null;
        const bannerStyle = chatProfile.banner_url
          ? { backgroundImage: `url(${API_BASE + chatProfile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: chatProfile.banner_color
              ? `linear-gradient(135deg, ${chatProfile.banner_color} 0%, rgba(0,0,0,.4) 100%)`
              : 'linear-gradient(135deg, #2c2540 0%, #191A23 100%)' };

        return (
          <div className="db-chat-profile-overlay" onClick={() => setChatProfile(null)}>
            <div className="db-chat-profile-card db-mp" onClick={e => e.stopPropagation()}>

              {/* ══ BANNER ══ */}
              <div className="db-mp-banner" style={bannerStyle}>
                <div className="db-mp-banner-noise" />
                <div className="db-mp-banner-fade" />
                {roleLabel && <span className="db-mp-role-pill">{roleLabel}</span>}
                <button className="db-mp-close" onClick={() => setChatProfile(null)} aria-label="Закрити">✕</button>
              </div>

              {/* ══ IDENTITY ZONE ══ */}
              <div className="db-mp-identity">

                {/* Avatar */}
                <div className={`db-mp-avatar-wrap db-mp-presence-ring--${presence || 'offline'}`}>
                  {chatProfile.user_avatar_url
                    ? <img src={resolveAvatarUrl(chatProfile.user_avatar_url)}
                        alt={chatProfile.username} referrerPolicy="no-referrer"
                        className="db-mp-avatar"
                        onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling && (e.currentTarget.nextSibling.style.removeProperty('display')); }}
                      />
                    : null}
                  <div className="db-mp-avatar db-mp-avatar--initials"
                    style={{ display: chatProfile.user_avatar_url ? 'none' : undefined }}>
                    {(chatProfile.username || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`db-mp-dot db-mp-dot--${presence || 'offline'}`} title={presenceLabel} />
                </div>

                {/* Name + badges */}
                <div className="db-mp-id-info">
                  <div className="db-mp-id-top">
                    <span className="db-mp-display-name">{displayName}</span>
                    {(isAdmin || isOrg || isJury) && (
                      <span className={`db-mp-role-tag ${isAdmin ? 'admin' : isOrg ? 'org' : 'jury'}`}>
                        {isAdmin ? '⚙ Адмін' : isOrg ? '🎯 Орг.' : '⚖ Журі'}
                      </span>
                    )}
                  </div>
                  {chatProfile.username && (
                    <div className="db-mp-handle">@{chatProfile.username}</div>
                  )}
                  <div className={`db-mp-status-line db-mp-status-line--${presence || 'offline'}`}>
                    <span className="db-mp-status-dot" />
                    {presenceLabel || 'Невідомо'}
                  </div>
                </div>
              </div>

              {/* ══ BODY ══ */}
              <div className="db-mp-body">

                {/* Loading */}
                {chatProfile.loading && (
                  <div className="db-mp-loading">
                    <div className="db-mp-loading-dot" />
                    <div className="db-mp-loading-dot" />
                    <div className="db-mp-loading-dot" />
                  </div>
                )}

                {/* Pinned badge */}
                {pinnedBadgeMeta && (
                  <div className="db-mp-pinned-badge">
                    {pinnedBadgeMeta.image
                      ? <img src={pinnedBadgeMeta.image} alt="" className="db-mp-pinned-ico" />
                      : <span className="db-mp-pinned-ico">🏅</span>}
                    <div>
                      <div className="db-mp-pinned-name">{pinnedBadgeMeta.name}</div>
                      <div className="db-mp-pinned-desc">{pinnedBadgeMeta.description}</div>
                    </div>
                  </div>
                )}

                {/* Bio */}
                {chatProfile.user_description && !chatProfile.loading && (
                  <div className="db-mp-bio">
                    <span className="db-mp-section-label">Про себе</span>
                    <p className="db-mp-bio-text">{chatProfile.user_description}</p>
                  </div>
                )}

                {/* Stats — 3 compact tiles */}
                <div className="db-mp-tiles">
                  {regDate && (
                    <div className="db-mp-tile db-mp-tile--date">
                      <span className="db-mp-tile-ico">📅</span>
                      <div className="db-mp-tile-text">
                        <span className="db-mp-tile-lbl">На платформі з</span>
                        <span className="db-mp-tile-val">{regDate}</span>
                      </div>
                    </div>
                  )}
                  {typeof chatProfile.elo === 'number' && (
                    <div className="db-mp-tile db-mp-tile--elo">
                      <span className="db-mp-tile-ico">⭐</span>
                      <span className="db-mp-tile-lbl">ELO</span>
                      <span className="db-mp-tile-val db-mp-tile-val--big">{chatProfile.elo}</span>
                    </div>
                  )}
                  {presence && (
                    <div className="db-mp-tile db-mp-tile--status">
                      <span className={`db-mp-tile-ico db-mp-tile-status-dot db-mp-dot--${presence}`} />
                      <span className="db-mp-tile-lbl">Статус</span>
                      <span className={`db-mp-tile-val db-mp-tile-status--${presence}`}>{presenceLabel}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="db-mp-actions">
                  {isSelf ? (
                    <button className="db-mp-btn primary" onClick={() => { setChatProfile(null); setTab('profile'); }}>
                      ✏ Мій профіль
                    </button>
                  ) : (
                    <>
                      <button className="db-mp-btn primary"
                        onClick={() => { const u = chatProfile.username; setChatProfile(null); if (u) setPublicProfile(u); }}
                        disabled={!chatProfile.username}
                      >
                        Повний профіль →
                      </button>
                      <button className="db-mp-btn ghost" onClick={() => setChatProfile(null)}>
                        Закрити
                      </button>
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {viewProfile && (
        <UserProfileModal
          profile={viewProfile}
          meId={meId}
          onClose={() => setViewProfile(null)}
          onGoOwnProfile={() => { setViewProfile(null); setTab('profile'); }}
        />
      )}

      {publicProfile && (
        <PublicProfileModal username={publicProfile} onClose={() => setPublicProfile(null)} />
      )}

      {deletePending && createPortal(
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={cancelDelete}>
          <div className="db-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="db-confirm-icon"><IconTrash style={{ width: 32, height: 32 }} /></div>
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
