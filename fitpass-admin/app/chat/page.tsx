"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { chatAPI, API_BASE_URL } from "@/lib/api";
import { Reply, Pencil, RotateCcw, Trash2, Paperclip, Smile, Send, Download } from "lucide-react";

const QUICK_EMOJIS = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👏', '🔥', '✅', '💪', '🙏', '🎉', '❤️', '👍', '👀', '😢'];

const getWsUrl = () => {
  if (typeof window === 'undefined') return '';
  // Derive WS URL from the same backend base URL used by the axios API client
  const baseUrl = API_BASE_URL.replace(/\/api$/, '');
  const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
  const host = new URL(baseUrl).host;
  return `${protocol}://${host}/ws`;
};

const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  return API_BASE_URL.replace(/\/api$/, '');
};

export default function AdminChatPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [threadFilter, setThreadFilter] = useState<'ALL' | 'CLASS' | 'CLASS_GROUP' | 'SUPPORT'>('ALL');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const [unreadByThread, setUnreadByThread] = useState<Record<string, number>>({});
  const [readMap, setReadMap] = useState<Record<string, Record<string, string>>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [threadMembers, setThreadMembers] = useState<any[]>([]);
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sioRef = useRef<Socket | null>(null);
  const activeThreadRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsUserIdRef = useRef<string | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const previousMessageCountRef = useRef(0);

  const fetchThreads = async () => {
    setLoadingThreads(true);
    try {
      const res = await chatAPI.listThreads();
      setThreads(Array.isArray(res) ? res : []);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    setLoadingMessages(true);
    try {
      const res = await chatAPI.getMessages(threadId, { limit: 100 });
      setMessages(Array.isArray(res) ? res : []);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    // Load current user ID from localStorage
    try {
      const userStr = localStorage.getItem('fitpass_admin_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.id) {
          setCurrentUserId(user.id);
          currentUserIdRef.current = user.id;
        }
      }
    } catch (error) {
      console.error('Failed to load current user ID:', error);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (!activeThread?.id) return;
    shouldAutoScrollRef.current = true;
    previousMessageCountRef.current = 0;
    fetchMessages(activeThread.id);

    chatAPI.markRead(activeThread.id).catch(() => undefined);
    setUnreadByThread((prev) => ({ ...prev, [activeThread.id]: 0 }));

    if (activeThread.type === 'CLASS_GROUP') {
      chatAPI.listMembers(activeThread.id)
        .then((res) => setThreadMembers(Array.isArray(res) ? res : []))
        .catch(() => setThreadMembers([]));
    } else {
      setThreadMembers([]);
    }

    const previousThread = activeThreadRef.current;
    activeThreadRef.current = activeThread.id;
    setTypingUsers({});

    if (previousThread && previousThread !== activeThread.id) {
      wsRef.current?.send(JSON.stringify({ type: 'chat.leave', threadId: previousThread }));
      sioRef.current?.emit('leave_thread', { threadId: previousThread });
    }

    // Join new thread on both connections
    wsRef.current?.send(JSON.stringify({ type: 'chat.join', threadId: activeThread.id }));
    sioRef.current?.emit('join_thread', { threadId: activeThread.id });
  }, [activeThread?.id]);

  useEffect(() => {
    if (!activeThread?.id) return;

    const hasNewMessage = messages.length > previousMessageCountRef.current;
    previousMessageCountRef.current = messages.length;

    if (!hasNewMessage || !shouldAutoScrollRef.current) return;

    requestAnimationFrame(() => {
      if (!messageListRef.current) return;
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    });
  }, [messages, activeThread?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('fitpass_admin_token');
    if (!token) return;

    // --- Persistent raw WebSocket (reconnects once, stays alive) ---
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🔗 [Admin] WebSocket connected');
      ws.send(JSON.stringify({ type: 'auth', token }));
      if (activeThreadRef.current) {
        ws.send(JSON.stringify({ type: 'chat.join', threadId: activeThreadRef.current }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat.message') {
          setThreads((prev) => {
            const index = prev.findIndex((item) => item.id === data.threadId);
            if (index === -1) return prev;
            const current = prev[index];
            const nextThread = {
              ...current,
              lastMessageAt: data.message?.createdAt || new Date().toISOString(),
              lastMessagePreview: data.message?.content || current.lastMessagePreview,
            };
            const next = [...prev];
            next.splice(index, 1);
            next.unshift(nextThread);
            return next;
          });
          if (activeThreadRef.current && data.threadId === activeThreadRef.current) {
            setMessages((prev) => {
              if (prev.some((msg: any) => msg.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
          }
        }
        if (data.type === 'chat.message_edited') {
          setMessages((prev) => prev.map((msg: any) => (msg.id === data.message.id ? data.message : msg)));
        }
        if (data.type === 'chat.message_revoked') {
          setMessages((prev) => prev.map((msg: any) => (msg.id === data.message.id ? data.message : msg)));
        }
        if (data.type === 'chat.typing') {
          if (!data.threadId || !data.userId) return;
          if (data.threadId !== activeThreadRef.current) return;
          const selfId = wsUserIdRef.current || currentUserIdRef.current;
          if (selfId && data.userId === selfId) return;
          setTypingUsers((prev) => {
            const updated = { ...prev };
            if (data.isTyping) {
              updated[data.userId] = Date.now();
            } else {
              delete updated[data.userId];
            }
            return updated;
          });
        }
        if (data.type === 'chat.read') {
          if (!data.threadId || !data.userId) return;
          setReadMap((prev) => ({
            ...prev,
            [data.threadId]: { ...(prev[data.threadId] || {}), [data.userId]: data.lastReadAt },
          }));
        }
      } catch {
        // ignore
      }
    };

    // --- Persistent Socket.IO connection ---
    const socket = io(getApiBaseUrl(), {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    sioRef.current = socket;
    (window as any).__fitpass_admin_socket = socket;

    // Re-join active thread on reconnect (Railway may drop connections)
    socket.on('connect', () => {
      if (activeThreadRef.current) {
        socket.emit('join_thread', { threadId: activeThreadRef.current });
      }
    });

    socket.on('chat.message', (data: any) => {
      setThreads((prev) => {
        const index = prev.findIndex((item: any) => item.id === data.threadId);
        if (index === -1) return prev;
        const current = prev[index];
        const next = [...prev];
        next.splice(index, 1);
        next.unshift({ ...current, lastMessageAt: data.message?.createdAt || new Date().toISOString(), lastMessagePreview: data.message?.content || current.lastMessagePreview });
        return next;
      });
      if (activeThreadRef.current && data.threadId === activeThreadRef.current) {
        setMessages((prev) => {
          if (prev.some((msg: any) => msg.id === data.message?.id)) return prev;
          return [...prev, data.message];
        });
      } else {
        setUnreadByThread((prev) => ({ ...prev, [data.threadId]: (prev[data.threadId] || 0) + 1 }));
      }
    });

    socket.on('chat.typing', (data: any) => {
      if (!data.threadId || !data.userId) return;
      if (data.threadId !== activeThreadRef.current) return;
      const selfId = wsUserIdRef.current || currentUserIdRef.current;
      if (selfId && data.userId === selfId) return;
      setTypingUsers((prev) => {
        const updated = { ...prev };
        if (data.isTyping) {
          updated[data.userId] = Date.now();
        } else {
          delete updated[data.userId];
        }
        return updated;
      });
    });

    socket.on('chat.read', (data: any) => {
      if (!data.threadId || !data.userId) return;
      setReadMap((prev) => ({
        ...prev,
        [data.threadId]: { ...(prev[data.threadId] || {}), [data.userId]: data.lastReadAt },
      }));
    });

    socket.on('chat.message.edit', (data: any) => {
      setMessages((prev) => prev.map((msg: any) => (msg.id === data.message?.id ? data.message : msg)));
    });

    socket.on('chat.message_revoked', (data: any) => {
      setMessages((prev) => prev.map((msg: any) => (msg.id === data.message?.id ? data.message : msg)));
    });

    return () => {
      ws.close();
      socket.disconnect();
      sioRef.current = null;
      (window as any).__fitpass_admin_socket = null;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const updated: Record<string, number> = {};
        Object.entries(prev).forEach(([userId, ts]) => {
          if (now - ts < 3000) {
            updated[userId] = ts;
          }
        });
        return updated;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (sending) return;
    const trimmedContent = content.trim();
    const hasAttachment = pendingAttachments.length > 0;
    if (!activeThread?.id || (!trimmedContent && !hasAttachment)) return;

    setSendError('');
    setSending(true);

    try {
      if (editingMessageId) {
        if (!trimmedContent) {
          setSendError('Nội dung tin nhắn không được để trống khi chỉnh sửa.');
          return;
        }
        const message = await chatAPI.editMessage(editingMessageId, trimmedContent);
        setMessages((prev) => prev.map((msg) => (msg.id === message.id ? message : msg)));
        setEditingMessageId(null);
        setContent('');
      } else {
        const message = await chatAPI.sendMessage(activeThread.id, trimmedContent, {
          attachments: pendingAttachments,
          mentionUserIds,
          replyToId: replyTo?.id,
        });
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === message.id)) return prev;
          return [...prev, message];
        });
        setContent('');
        setPendingAttachments([]);
        setMentionUserIds([]);
        setReplyTo(null);
      }
    } catch (error: any) {
      const apiMessage = error?.response?.data?.error || error?.response?.data?.message;
      setSendError(apiMessage || error?.message || 'Không gửi được tin nhắn. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setContent(currentContent);
  };

  const handleRevokeMessage = async (messageId: string) => {
    const confirmed = window.confirm('Bạn muốn thu hồi tin nhắn này?');
    if (!confirmed) return;
    const message = await chatAPI.revokeMessage(messageId);
    setMessages((prev) => prev.map((msg) => (msg.id === message.id ? message : msg)));
  };

  const handleSelectMention = (member: any) => {
    const name = member.user?.fullName || 'user';
    const next = content.replace(/@[^\s]*$/, `@${name} `);
    setContent(next);
    if (!mentionUserIds.includes(member.user.id)) {
      setMentionUserIds((prev) => [...prev, member.user.id]);
    }
  };

  const handleTyping = () => {
    if (!activeThread?.id) return;
    // Send typing via Socket.IO so mobile clients receive it
    const sioSocket = (window as any).__fitpass_admin_socket;
    if (sioSocket?.connected) {
      sioSocket.emit('chat.typing', { threadId: activeThread.id, isTyping: true });
    }
    // Also send via raw WS as fallback for other admin clients
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'chat.typing', threadId: activeThread.id, isTyping: true }));
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (sioSocket?.connected) {
        sioSocket.emit('chat.typing', { threadId: activeThread.id, isTyping: false });
      }
      wsRef.current?.send(JSON.stringify({ type: 'chat.typing', threadId: activeThread.id, isTyping: false }));
    }, 1500);
  };

  const handleInsertEmoji = (emoji: string) => {
    setContent((prev) => `${prev}${emoji}`);
    handleTyping();
  };

  const handleUpload = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    setUploading(true);
    try {
      const uploadedAttachments: any[] = [];

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const uploaded = await chatAPI.uploadMedia(formData);
        const type = file.type.startsWith('image')
          ? 'IMAGE'
          : file.type.startsWith('video')
            ? 'VIDEO'
            : 'DOCUMENT';

        uploadedAttachments.push({
          type,
          url: uploaded.url,
          fileName: uploaded.fileName || file.name,
          fileSize: uploaded.fileSize || file.size,
          mimeType: uploaded.mimeType || file.type,
        });
      }

      if (uploadedAttachments.length) {
        setPendingAttachments((prev) => [...prev, ...uploadedAttachments]);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleLockThread = async () => {
    if (!activeThread?.id) return;
    const reason = window.prompt('Lý do khóa chat (tuỳ chọn):') || undefined;
    const thread = await chatAPI.lockThread(activeThread.id, reason);
    setActiveThread(thread);
    setThreads((prev) => prev.map((item) => (item.id === thread.id ? thread : item)));
  };

  const handleUnlockThread = async () => {
    if (!activeThread?.id) return;
    const reason = window.prompt('Lý do mở khóa (tuỳ chọn):') || undefined;
    const thread = await chatAPI.unlockThread(activeThread.id, reason);
    setActiveThread(thread);
    setThreads((prev) => prev.map((item) => (item.id === thread.id ? thread : item)));
  };

  const handleDeleteThread = async (threadId: string) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa toàn bộ cuộc hội thoại này? Hành động này không thể hoàn tác.');
    if (!confirmed) return;
    await chatAPI.deleteThread(threadId);
    setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
    if (activeThread?.id === threadId) {
      setActiveThread(null);
      setMessages([]);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const confirmed = window.confirm('Xóa tin nhắn này khỏi hệ thống? Hành động này không thể hoàn tác.');
    if (!confirmed) return;
    setDeletingMessageId(messageId);
    try {
      await chatAPI.deleteMessage(messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } finally {
      setDeletingMessageId(null);
    }
  };

  const threadTitle = (thread: any) => {
    if (thread.type === 'SUPPORT') return 'Hỗ trợ Admin';
    if (thread.type === 'CLASS_GROUP') return `Nhóm lớp: ${thread.class?.name || 'Lớp học'}`;
    return thread.class?.name || 'Chat lớp học';
  };

  const threadSubtitle = (thread: any) => {
    if (thread.type === 'CLASS_GROUP') return 'Nhắn tin nhóm lớp';
    return thread.student?.fullName ? `Học viên: ${thread.student.fullName}` : '';
  };

  const formatTime = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const filteredThreads = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return threads.filter((thread) => {
      const matchesFilter = threadFilter === 'ALL' || thread.type === threadFilter;
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;
      const title = threadTitle(thread).toLowerCase();
      const subtitle = threadSubtitle(thread).toLowerCase();
      const preview = (thread.lastMessagePreview || '').toLowerCase();
      return title.includes(normalizedQuery) || subtitle.includes(normalizedQuery) || preview.includes(normalizedQuery);
    });
  }, [threads, threadFilter, searchQuery]);

  const typingActive = useMemo(() => {
    const active = Object.keys(typingUsers).length > 0;
    console.log('💬 [Admin] typingActive =', active, 'typingUsers =', typingUsers);
    return active;
  }, [typingUsers]);

  const mentionQuery = useMemo(() => {
    const match = content.match(/@([^\s]*)$/);
    return match ? match[1].toLowerCase() : '';
  }, [content]);

  const mentionSuggestions = useMemo(() => {
    if (!activeThread || activeThread.type !== 'CLASS_GROUP') return [];
    if (!content.includes('@')) return [];
    const list = threadMembers.map((member) => member.user).filter(Boolean);
    if (!mentionQuery) return list;
    return list.filter((user: any) => user.fullName?.toLowerCase().includes(mentionQuery));
  }, [activeThread, content, mentionQuery, threadMembers]);

  const canSend = Boolean(
    activeThread?.id &&
      !uploading &&
      !sending &&
      !activeThread?.isLocked &&
      (content.trim() || pendingAttachments.length > 0)
  );

  const getMessageAttachmentUrl = (attachment: any, forImage: boolean = false) => {
    if (!attachment?.url) return '';
    let fullUrl = '';
    if (attachment.url.startsWith('http')) {
      fullUrl = attachment.url;
    } else {
      const baseUrl = getApiBaseUrl();
      fullUrl = `${baseUrl}${attachment.url}`;
    }
    
    // Use proxy for ngrok images to bypass browser warning
    if (forImage && fullUrl.includes('ngrok')) {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
      console.log('🖼️ Using proxy for image:', { original: fullUrl, proxy: proxyUrl });
      return proxyUrl;
    }
    
    // Add ngrok bypass for direct downloads
    if (fullUrl.includes('ngrok')) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + 'ngrok-skip-browser-warning=true';
    }
    
    console.log('🖼️ Attachment URL:', { original: attachment.url, fullUrl });
    return fullUrl;
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-slate-900 min-h-screen transition-colors">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">💬 Contact Chat</h1>
        <p className="text-gray-600 dark:text-slate-400">Admin có thể theo dõi tất cả cuộc trò chuyện</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">Danh sách hội thoại</h2>
              <span className="text-xs text-gray-400 dark:text-slate-500">{filteredThreads.length} cuộc trò chuyện</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo lớp, học viên..."
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-2">
              {([
                { key: 'ALL', label: 'Tất cả' },
                { key: 'CLASS', label: '1:1 lớp' },
                { key: 'CLASS_GROUP', label: 'Nhóm lớp' },
                { key: 'SUPPORT', label: 'Hỗ trợ' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  className={`px-3 py-1.5 text-xs rounded-full border ${
                    threadFilter === item.key
                      ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                  onClick={() => setThreadFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {loadingThreads ? (
              <div className="p-6 text-gray-500 dark:text-slate-400">Đang tải...</div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-6 text-gray-500 dark:text-slate-400">Chưa có hội thoại nào</div>
            ) : (
              filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 ${
                    activeThread?.id === thread.id ? 'bg-blue-50 dark:bg-slate-700' : ''
                  }`}
                  onClick={() => {
                    setUnreadByThread((prev) => ({ ...prev, [thread.id]: 0 }));
                    setActiveThread(thread);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-900 dark:text-slate-100 flex-1">{threadTitle(thread)}</div>
                    {(unreadByThread[thread.id] || 0) > 0 ? (
                      <span className="text-[10px] min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white inline-flex items-center justify-center font-semibold">
                        {unreadByThread[thread.id] > 99 ? '99+' : unreadByThread[thread.id]}
                      </span>
                    ) : null}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      thread.type === 'SUPPORT'
                        ? 'border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-300'
                        : thread.type === 'CLASS_GROUP'
                          ? 'border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-300'
                          : 'border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300'
                    }`}>
                      {thread.type === 'SUPPORT' ? 'SUPPORT' : thread.type === 'CLASS_GROUP' ? 'GROUP' : 'CLASS'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{threadSubtitle(thread)}</div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-1 truncate">{thread.lastMessagePreview || 'Chưa có tin nhắn'}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">
                {activeThread ? threadTitle(activeThread) : 'Chọn hội thoại'}
              </h2>
              {activeThread && (
                <p className="text-sm text-gray-500 dark:text-slate-400">{threadSubtitle(activeThread)}</p>
              )}
              {activeThread && typingActive && (
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Đang nhập...</p>
              )}
            </div>
            {activeThread && (
              <div className="flex items-center gap-2">
                {activeThread.isLocked ? (
                  <button
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 text-sm"
                    onClick={handleUnlockThread}
                  >
                    Mở khóa
                  </button>
                ) : (
                  <button
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 text-sm"
                    onClick={handleLockThread}
                  >
                    Khóa chat
                  </button>
                )}
                <button
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                  onClick={() => handleDeleteThread(activeThread.id)}
                >
                  Xóa cuộc hội thoại
                </button>
              </div>
            )}
          </div>

          <div
            ref={messageListRef}
            className="flex-1 p-4 overflow-y-auto max-h-[520px]"
            onScroll={(event) => {
              const element = event.currentTarget;
              const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
              shouldAutoScrollRef.current = distanceToBottom < 80;
            }}
          >
            {loadingMessages ? (
              <div className="text-gray-500 dark:text-slate-400">Đang tải tin nhắn...</div>
            ) : messages.length === 0 ? (
              <div className="text-gray-500 dark:text-slate-400">Chưa có tin nhắn</div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`mb-3 ${msg.senderRole === 'ADMIN' ? 'text-right' : ''}`}
                >
                  <div className="flex items-center gap-2 justify-end">
                    {msg.senderRole !== 'ADMIN' && (
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {msg.sender?.fullName || msg.senderRole}
                      </span>
                    )}
                  </div>
                  <div className={`inline-flex items-start gap-2 group ${msg.senderRole === 'ADMIN' ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`inline-block px-4 py-2 rounded-xl max-w-[80%] ${
                        msg.senderRole === 'ADMIN' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100'
                      }`}
                    >
                      {msg.replyTo ? (
                        <div className="mb-2 text-xs opacity-80 border-l-2 border-white/40 pl-2">
                          Trả lời: {msg.replyTo.content || 'Tin nhắn'}
                        </div>
                      ) : null}
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {msg.revokedAt ? 'Tin nhắn đã được thu hồi' : (msg.content || 'Đính kèm')}
                      </div>
                      {msg.attachments?.length ? (
                        <div className="mt-2 grid grid-cols-1 gap-2">
                          {msg.attachments.map((file: any) => {
                            const isImage = file.type === 'IMAGE' || 
                                          file.mimeType?.startsWith('image/') ||
                                          file.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            
                            const imageUrl = getMessageAttachmentUrl(file, true); // Use proxy for images
                            const downloadUrl = getMessageAttachmentUrl(file, false); // Direct for downloads
                            
                            console.log('📎 Attachment:', { 
                              fileName: file.fileName, 
                              type: file.type, 
                              mimeType: file.mimeType, 
                              isImage,
                              imageUrl,
                              downloadUrl
                            });
                            
                            return (
                              <div key={file.id || file.url} className="space-y-1">
                                {/* ALWAYS show image preview if it's an image */}
                                {isImage && imageUrl && (
                                  <div className="mb-2">
                                    <a href={downloadUrl} target="_blank" rel="noreferrer">
                                      <img 
                                        src={imageUrl}
                                        alt={file.fileName || 'Attachment'}
                                        className="max-w-[300px] max-h-[300px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition border-2 border-white/10"
                                        onError={(e) => {
                                          console.error('❌ Image load failed:', imageUrl, file);
                                          const target = e.target as HTMLImageElement;
                                          target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50" fill="red">Error</text></svg>';
                                        }}
                                        onLoad={() => console.log('✅ Image loaded successfully:', imageUrl)}
                                      />
                                    </a>
                                  </div>
                                )}
                                
                                {/* File info */}
                                <div className="flex items-center justify-between gap-2 bg-white/10 rounded px-2 py-1">
                                  <div className="flex-1 min-w-0">
                                    <a
                                      href={downloadUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs underline truncate block hover:text-blue-300"
                                    >
                                      {file.fileName || 'Tệp đính kèm'}
                                    </a>
                                    {file.fileSize ? (
                                      <span className="text-[10px] opacity-70">
                                        {(file.fileSize / 1024).toFixed(1)} KB
                                      </span>
                                    ) : null}
                                  </div>
                                  <a
                                    href={`/api/download-file?url=${encodeURIComponent(downloadUrl)}&name=${encodeURIComponent(file.fileName || 'download')}`}
                                    className="p-1.5 hover:bg-white/20 rounded-lg transition flex items-center"
                                    title="Tải xuống"
                                  >
                                    <Download size={14} />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                      {msg.editedAt ? (
                        <div className="text-[10px] mt-1 opacity-70">(đã chỉnh sửa)</div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
                        title="Trả lời"
                        onClick={() => setReplyTo(msg)}
                      >
                        <Reply size={13} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 disabled:opacity-30"
                        title="Chỉnh sửa"
                        onClick={() => handleEditMessage(msg.id, msg.content || '')}
                        disabled={msg.senderRole !== 'ADMIN'}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 disabled:opacity-30"
                        title="Thu hồi"
                        onClick={() => handleRevokeMessage(msg.id)}
                        disabled={msg.senderRole !== 'ADMIN'}
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 disabled:opacity-30"
                        title="Xóa"
                        onClick={() => handleDeleteMessage(msg.id)}
                        disabled={deletingMessageId === msg.id}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {formatTime(msg.createdAt)}
                    {index === messages.length - 1 && msg.senderRole === 'ADMIN' && readMap[activeThread?.id || ''] ? (
                      <span className="ml-2 text-blue-500 dark:text-blue-400">Đã xem</span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-slate-700">
            {sendError ? (
              <div className="mb-2 text-xs text-red-600 dark:text-red-400">{sendError}</div>
            ) : null}
            {replyTo ? (
              <div className="mb-2 flex items-center justify-between text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg">
                <span>Trả lời: {replyTo.content || 'Tin nhắn'}</span>
                <button className="text-gray-500 dark:text-slate-400" onClick={() => setReplyTo(null)}>Hủy</button>
              </div>
            ) : null}
            {activeThread && typingActive ? (
              <div className="mb-2 inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-end gap-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-2xl">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </span>
                đang soạn...
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40"
                title="Đính kèm tệp"
                disabled={!activeThread?.id || uploading || activeThread?.isLocked}
                onClick={() => {
                  const input = document.getElementById('chat-upload-input');
                  input?.click();
                }}
              >
                <Paperclip size={18} />
              </button>
              <button
                className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40"
                title="Emoji"
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                disabled={!activeThread?.id || activeThread?.isLocked}
              >
                <Smile size={18} />
              </button>
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onInput={handleTyping}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) {
                      handleSend();
                    }
                  }
                }}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500"
                disabled={!activeThread?.id || activeThread?.isLocked || sending}
              />
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send size={15} />
                <span>{sending ? 'Đang gửi...' : 'Gửi'}</span>
              </button>
            </div>
            {showEmojiPicker ? (
              <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm p-2 flex flex-wrap gap-2">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="text-xl leading-none hover:scale-110 transition-transform"
                    onClick={() => handleInsertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
            {mentionSuggestions.length > 0 ? (
              <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm max-h-40 overflow-y-auto">
                {mentionSuggestions.map((user: any) => (
                  <button
                    key={user.id}
                    className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-700"
                    onClick={() => handleSelectMention({ user })}
                  >
                    @{user.fullName}
                  </button>
                ))}
              </div>
            ) : null}
            {editingMessageId ? (
              <div className="mt-2 flex items-center justify-between text-xs text-blue-500 dark:text-blue-400">
                <span>Đang chỉnh sửa tin nhắn...</span>
                <button
                  className="text-gray-500 dark:text-slate-400"
                  onClick={() => { setEditingMessageId(null); setContent(''); }}
                >
                  Hủy
                </button>
              </div>
            ) : null}
            {pendingAttachments.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {pendingAttachments.map((file, index) => (
                  <div key={`${file.url}-${index}`} className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-2 py-1 rounded-full">
                    {file.fileName || 'Tệp'}
                    <button
                      className="ml-2 text-gray-500 dark:text-slate-400"
                      onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== index))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <input
              id="chat-upload-input"
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => {
                const files = event.target.files;
                if (files?.length) {
                  handleUpload(files);
                }
                event.target.value = '';
              }}
            />
            <div className="mt-2 text-xs text-gray-400 dark:text-slate-500">Reply/Edit/Seen/Typing đã kích hoạt ở mức cơ bản.</div>
          </div>
        </div>
      </div>
    </div>
  );
}