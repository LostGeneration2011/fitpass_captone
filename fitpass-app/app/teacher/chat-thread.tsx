import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { chatAPI } from '../../lib/api';
import { connectSocket, getSocket, disconnectSocket } from '../../lib/socketio';
import { useThemeClasses } from '../../lib/theme';
import { getUser } from '../../lib/auth';

const QUICK_EMOJIS = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👏', '🔥', '✅', '💪', '🙏', '🎉', '❤️', '👍', '👀', '😢'];

// Component hiển thị preview file văn bản
function TextFilePreview({ url, isDark }: { url: string; isDark: boolean }) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchText = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        const text = await response.text();
        setTextContent(text);
      } catch (error) {
        setTextContent('Không thể tải nội dung văn bản');
      } finally {
        setLoading(false);
      }
    };
    fetchText();
  }, [url]);

  if (loading) {
    return (
      <View className="py-2">
        <ActivityIndicator size="small" color="#60A5FA" />
      </View>
    );
  }

  if (!textContent) return null;

  const preview = expanded ? textContent : textContent.slice(0, 200);
  const needsExpansion = textContent.length > 200;

  return (
    <View 
      className={`mt-2 p-2 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
      style={{ maxWidth: '100%' }}
    >
      <Text 
        className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
        style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}
      >
        {preview}
        {!expanded && needsExpansion && '...'}
      </Text>
      {needsExpansion && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} className="mt-1">
          <Text className="text-xs text-blue-400">
            {expanded ? 'Thu gọn' : 'Xem thêm'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function TeacherChatThreadScreen({ route, navigation }: any) {
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();

  const { threadId, title, threadType } = route.params || {};
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [typingActive, setTypingActive] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [readMap, setReadMap] = useState<Record<string, string>>({});
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [threadMembers, setThreadMembers] = useState<any[]>([]);
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<any | null>(null);
  const isJoinedRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const partnerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const initialAutoScrollDoneRef = useRef(false);

  // Helper: Convert relative URL to full URL
  const getFullUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Relative URL - derive base from the same logic used by lib/api.ts
    const { API_URL } = require('../../lib/api');
    const baseUrl = (API_URL as string).replace(/\/api$/, '');
    return `${baseUrl}${url}`;
  }; 

  // Helper: Download file to device
  const handleDownloadFile = async (url: string, fileName: string) => {
    try {
      const fullUrl = getFullUrl(url);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        // Fallback to opening in browser
        await Linking.openURL(fullUrl);
        return;
      }

      Toast.show({
        type: 'info',
        text1: 'Đang tải xuống...',
        text2: fileName,
      });

      // Download file
      const timestamp = Date.now();
      const tempFileName = `download_${timestamp}_${fileName}`;
      const downloadResumable = FileSystem.createDownloadResumable(
        fullUrl,
        `${FileSystem.cacheDirectory}${tempFileName}`,
        {}
      );
      
      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        // Share/Save file
        await Sharing.shareAsync(result.uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Lưu file',
        });
        
        Toast.show({
          type: 'success',
          text1: 'Tải xuống thành công!',
          text2: fileName,
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi tải xuống',
        text2: error?.message || 'Không thể tải file',
      });
    }
  };

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const res = await chatAPI.getMessages(threadId, { limit: 50 });
      const fetched = Array.isArray(res) ? res : [];
      setMessages((prev) => {
        const seen = new Set(prev.map((msg) => msg.id));
        const merged = [...prev];
        fetched.forEach((msg: any) => {
          if (!seen.has(msg.id)) {
            merged.push(msg);
          }
        });
        return merged;
      });
      chatAPI.markRead(threadId).catch(() => undefined);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể tải tin nhắn',
      });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!threadId) return;
    shouldAutoScrollRef.current = true;
    initialAutoScrollDoneRef.current = false;

    // Load current user ID
    getUser().then((user) => {
      if (user?.id) {
        setCurrentUserId(user.id);
        currentUserIdRef.current = user.id;
      }
    });

    loadMessages();
    if (threadType === 'CLASS_GROUP') {
      chatAPI.listMembers(threadId)
        .then((res) => setThreadMembers(Array.isArray(res) ? res : []))
        .catch(() => setThreadMembers([]));
    } else {
      setThreadMembers([]);
    }

    // --- SOCKET.IO CLIENT REALTIME ---
    let socket: any = null;
    let token: string | null = null;
    let removeListeners: (() => void)[] = [];
    let refreshInterval: NodeJS.Timeout | null = null;

    // Get token from user (async)
    (async () => {
      const token = await (await import('../../lib/auth')).getToken();
      if (!token) return;
      socket = connectSocket(token);
      if (!socket) return;
      socket.emit('join_thread', { threadId });
      setIsJoined(true);
      isJoinedRef.current = true;

      // Listen for chat events
      socket.on('chat.message', (data: any) => {
        if (data.threadId === threadId) {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          chatAPI.markRead(threadId).catch(() => undefined);
        }
      });
      socket.on('chat.message_edited', (data: any) => {
        if (data.threadId === threadId) {
          setMessages((prev) => prev.map((msg) => (msg.id === data.message.id ? data.message : msg)));
        }
      });
      socket.on('chat.message_revoked', (data: any) => {
        if (data.threadId === threadId) {
          setMessages((prev) => prev.map((msg) => (msg.id === data.message.id ? data.message : msg)));
        }
      });
      socket.on('chat.typing', (data: any) => {
        if (data.threadId === threadId) {
          const senderId = data.userId || data.senderId || data.user?.id;
          const isSelf = !!senderId && !!currentUserIdRef.current && senderId === currentUserIdRef.current;
          if (!isSelf) {
            if (!!data.isTyping) {
              setTypingActive(true);
              if (partnerTypingTimeoutRef.current) {
                clearTimeout(partnerTypingTimeoutRef.current);
              }
              partnerTypingTimeoutRef.current = setTimeout(() => {
                setTypingActive(false);
                partnerTypingTimeoutRef.current = null;
              }, 2500);
            } else {
              setTypingActive(false);
              if (partnerTypingTimeoutRef.current) {
                clearTimeout(partnerTypingTimeoutRef.current);
                partnerTypingTimeoutRef.current = null;
              }
            }
          }
        }
      });
      socket.on('chat.read', (data: any) => {
        if (data.threadId === threadId) {
          setReadMap((prev) => ({
            ...prev,
            [data.userId]: data.lastReadAt,
          }));
        }
      });
      // Clean up listeners
      removeListeners = [
        () => socket.off('chat.message'),
        () => socket.off('chat.message_edited'),
        () => socket.off('chat.message_revoked'),
        () => socket.off('chat.typing'),
        () => socket.off('chat.read'),
      ];
    })();

    // Refresh messages every 5s (optional, for fallback)
    refreshInterval = setInterval(() => {
      loadMessages(true);
    }, 5000);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
        partnerTypingTimeoutRef.current = null;
      }
      setTypingActive(false);
      // Notify server user left thread
      if (socket) {
        socket.emit('chat.typing', { threadId, isTyping: false });
        socket.emit('leave_thread', { threadId });
        removeListeners.forEach((fn) => fn());
      }
      disconnectSocket();
    };
  }, [threadId]);

  const handleSend = async () => {
    if (!content.trim() && pendingAttachments.length === 0) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    // Notify server user stopped typing
    const socket = getSocket();
    if (socket) {
      socket.emit('chat.typing', { threadId, isTyping: false });
    }

    try {
      setSending(true);
      if (editingMessageId) {
        const message = await chatAPI.editMessage(editingMessageId, content.trim());
        setMessages((prev) => prev.map((msg) => (msg.id === message.id ? message : msg)));
        setEditingMessageId(null);
        setContent('');
      } else {
        const message = await chatAPI.sendMessage(threadId, content.trim(), {
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
        // Emit real-time event to other clients (MUST use backend event name)
        if (socket) {
          socket.emit('chat_message', { threadId, content: message.content });
        }
      }
      chatAPI.markRead(threadId).catch(() => undefined);
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể gửi tin nhắn',
      });
    } finally {
      setSending(false);
    }
  };

  const handleSelectMention = (member: any) => {
    const name = member.user?.fullName || 'user';
    const next = content.replace(/@[^\s]*$/, `@${name} `);
    setContent(next);
    if (!mentionUserIds.includes(member.user.id)) {
      setMentionUserIds((prev) => [...prev, member.user.id]);
    }
  };

  const mentionQuery = content.match(/@([^\s]*)$/)?.[1]?.toLowerCase() || '';
  const mentionSuggestions = threadType === 'CLASS_GROUP' && content.includes('@')
    ? threadMembers.map((member) => member.user).filter(Boolean).filter((user: any) =>
        !mentionQuery || user.fullName?.toLowerCase().includes(mentionQuery)
      )
    : [];

  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setContent(currentContent);
  };

  const handleRevokeMessage = (messageId: string) => {
    Alert.alert('Thu hồi tin nhắn', 'Bạn muốn thu hồi tin nhắn này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Thu hồi',
        style: 'destructive',
        onPress: async () => {
          try {
            const message = await chatAPI.revokeMessage(messageId);
            setMessages((prev) => prev.map((msg) => (msg.id === message.id ? message : msg)));
          } catch (error: any) {
            Toast.show({
              type: 'error',
              text1: 'Lỗi',
              text2: error?.message || 'Không thể thu hồi tin nhắn',
            });
          }
        },
      },
    ]);
  };

  const handlePickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Vui lòng cấp quyền truy cập thư viện ảnh',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    try {
      setUploading(true);
      const uploadedAttachments: any[] = [];
      const warningMessages = new Set<string>();

      for (const asset of result.assets) {
        let uri = asset.uri;
        let fileName = asset.fileName || `chat-${Date.now()}`;
        let mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');

        // Convert HEIC/HEIF (iPhone default) to JPEG before upload
        if (mimeType === 'image/heic' || mimeType === 'image/heif' || fileName.toLowerCase().endsWith('.heic')) {
          const converted = await ImageManipulator.manipulateAsync(
            uri,
            [],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          uri = converted.uri;
          mimeType = 'image/jpeg';
          fileName = fileName.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
        }

        const formData = new FormData();
        formData.append('file', {
          uri,
          name: fileName,
          type: mimeType,
        } as any);

        const uploaded = await chatAPI.uploadMedia(formData);
        if (uploaded?.warning) {
          warningMessages.add(uploaded.warning);
        }
        const attachmentType = mimeType.startsWith('video') ? 'VIDEO' : 'IMAGE';

        uploadedAttachments.push({
          type: attachmentType,
          url: uploaded.url,
          fileName: uploaded.fileName || fileName,
          fileSize: uploaded.fileSize,
          mimeType: uploaded.mimeType || mimeType,
        });
      }

      if (uploadedAttachments.length) {
        setPendingAttachments((prev) => [...prev, ...uploadedAttachments]);
      }

      if (warningMessages.size) {
        Toast.show({
          type: 'info',
          text1: 'Tep dang dung luu tru du phong',
          text2: Array.from(warningMessages).join(' '),
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: error?.message || 'Không thể tải file',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleTyping = () => {
    if (!threadId) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('chat.typing', { threadId, isTyping: true });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('chat.typing', { threadId, isTyping: false });
        typingTimeoutRef.current = null;
      }, 2000);
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setContent((prev) => `${prev}${emoji}`);
    handleTyping();
  };

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert('Xóa tin nhắn', 'Bạn muốn xóa tin nhắn này khỏi hộp thư?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatAPI.deleteMessage(messageId);
            setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
          } catch (error: any) {
            Toast.show({
              type: 'error',
              text1: 'Lỗi',
              text2: error?.message || 'Không thể xóa tin nhắn',
            });
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass}`}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className={`${textSecondary} mt-4`}>Đang tải tin nhắn...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
        className="flex-1"
      >
        <View className={`flex-row items-center justify-between px-4 pt-4 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#94a3b8' : '#475569'} />
          </TouchableOpacity>
          <View className="items-center flex-1">
            <Text className={`${textPrimary} text-lg font-semibold`}>{title || 'Chat'}</Text>
          </View>
          <View className="w-8" />
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const distanceToBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
            shouldAutoScrollRef.current = distanceToBottom < 120;
          }}
          onContentSizeChange={() => {
            if (!initialAutoScrollDoneRef.current) {
              initialAutoScrollDoneRef.current = true;
              requestAnimationFrame(() => {
                scrollRef.current?.scrollToEnd({ animated: false });
              });
              return;
            }
            if (!shouldAutoScrollRef.current) return;
            requestAnimationFrame(() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            });
          }}
        >
          {messages.length === 0 ? (
            <Text className={`${textSecondary} text-center`}>Chưa có tin nhắn</Text>
          ) : (
            messages.map((msg, index) => (
              <TouchableOpacity
                key={msg.id}
                className={`mb-3 ${msg.senderRole === 'TEACHER' ? 'items-end' : 'items-start'}`}
                onLongPress={() => setSelectedMsg(msg)}
                activeOpacity={0.8}
              >
                <View
                  className={`px-4 py-2 rounded-xl max-w-[80%] ${
                    msg.senderRole === 'TEACHER' ? 'bg-blue-600' : cardClass
                  }`}
                >
                  {msg.replyTo ? (
                    <Text className="text-xs text-blue-200 mb-1">Trả lời: {msg.replyTo.content || 'Tin nhắn'}</Text>
                  ) : null}
                  {msg.content && !msg.revokedAt ? (
                    <Text className={`${msg.senderRole === 'TEACHER' ? 'text-white' : textPrimary}`}>
                      {msg.content}
                    </Text>
                  ) : msg.revokedAt ? (
                    <Text className={`${msg.senderRole === 'TEACHER' ? 'text-white' : textPrimary}`}>
                      Tin nhắn đã được thu hồi
                    </Text>
                  ) : null}
                  {msg.attachments?.length ? (
                    <View className="mt-2 space-y-2">
                      {msg.attachments.map((file: any) => {
                        const isImage = file.type === 'IMAGE' || file.mimeType?.startsWith('image/');
                        const isText = file.mimeType?.startsWith('text/');
                        const fullUrl = getFullUrl(file.url);
                        
                        return (
                          <View key={file.id || file.url} className="mt-2">
                            {/* Hiển thị ảnh */}
                            {isImage && fullUrl ? (
                              <TouchableOpacity 
                                onPress={() => Linking.openURL(fullUrl)}
                                activeOpacity={0.9}
                              >
                                <Image
                                  source={{ uri: fullUrl }}
                                  style={{
                                    width: 200,
                                    height: 200,
                                    borderRadius: 8,
                                    marginBottom: 4,
                                  }}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            ) : null}
                            
                            {/* Hiển thị preview văn bản */}
                            {isText && fullUrl && !isImage ? (
                              <TextFilePreview url={fullUrl} isDark={isDark} />
                            ) : null}
                            
                            {/* Thông tin file */}
                            <View className="flex-row items-center justify-between">
                              <View className="flex-1 mr-2">
                                <Text 
                                  className={`text-xs ${
                                    msg.senderRole === 'TEACHER' ? 'text-blue-100' : 'text-slate-600'
                                  }`}
                                  numberOfLines={1}
                                >
                                  {file.fileName || 'Tệp đính kèm'}
                                </Text>
                                {file.fileSize ? (
                                  <Text 
                                    className={`text-[10px] ${
                                      msg.senderRole === 'TEACHER' ? 'text-blue-200' : 'text-slate-500'
                                    }`}
                                  >
                                    {(file.fileSize / 1024).toFixed(1)} KB
                                  </Text>
                                ) : null}
                              </View>
                              
                              {/* Nút tải xuống */}
                              <TouchableOpacity
                                onPress={() => handleDownloadFile(file.url, file.fileName || 'file')}
                                className={`px-2 py-1 rounded ${
                                  msg.senderRole === 'TEACHER' 
                                    ? 'bg-blue-500' 
                                    : (isDark ? 'bg-slate-700' : 'bg-slate-200')
                                }`}
                              >
                                <Ionicons 
                                  name="download-outline" 
                                  size={14} 
                                  color={msg.senderRole === 'TEACHER' ? '#ffffff' : (isDark ? '#e2e8f0' : '#475569')} 
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                  {msg.editedAt ? (
                    <Text className="text-[10px] text-blue-200 mt-1">(đã chỉnh sửa)</Text>
                  ) : null}
                </View>
                <View className="flex-row items-center mt-1">
                  <Text className={`${textSecondary} text-xs`}>
                    {msg.sender?.fullName || msg.senderRole}
                  </Text>
                </View>
                {msg.senderRole === 'TEACHER' && Object.keys(readMap).length > 0 ? (
                  <Text className="text-[10px] text-blue-400 mt-1">✓✓ Đã xem</Text>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <View 
          className={`px-4 pb-4 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}
          style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff' }}
        >
          {replyTo ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#3b82f6',
                backgroundColor: isDark ? '#1e293b' : '#eff6ff',
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 10, color: '#3b82f6', fontWeight: '600', marginBottom: 2 }}>Trả lời</Text>
                <Text className={`text-xs ${textSecondary}`} numberOfLines={1}>
                  {replyTo.sender?.fullName ? `${replyTo.sender.fullName}: ` : ''}{replyTo.content || 'Tệp đính kèm'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyTo(null)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          ) : null}
          {editingMessageId ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#f59e0b',
                backgroundColor: isDark ? '#1e293b' : '#fffbeb',
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: '600', marginBottom: 2 }}>Đang chỉnh sửa</Text>
                <Text className={`text-xs ${textSecondary}`} numberOfLines={1}>{content || '...'}</Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingMessageId(null); setContent(''); }} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          ) : null}
          {pendingAttachments.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 mb-2">
              {pendingAttachments.map((file, index) => (
                <View key={`${file.url}-${index}`} className="bg-slate-800 px-2 py-1 rounded-lg flex-row items-center">
                  <Text className="text-xs text-slate-200">{file.fileName || 'Tệp'}</Text>
                  <TouchableOpacity onPress={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== index))}>
                    <Ionicons name="close" size={12} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
          {typingActive ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isDark ? '#334155' : '#e2e8f0',
                  marginRight: 8,
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#94a3b8' }} />
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#94a3b8', opacity: 0.7 }} />
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#94a3b8', opacity: 0.4 }} />
              </View>
              <Text className={`${textSecondary} text-xs`}>đang soạn...</Text>
            </View>
          ) : null}
          {showEmojiPicker ? (
            <View className="mb-2 flex-row flex-wrap gap-2">
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => handleInsertEmoji(emoji)}
                  className={`px-2 py-1 rounded-lg ${cardClass}`}
                >
                  <Text className="text-lg">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <View className={`flex-row items-center rounded-xl px-3 ${cardClass}`}>
            <TouchableOpacity onPress={handlePickMedia} disabled={uploading} className="mr-2">
              <Ionicons name="attach" size={18} color={uploading ? '#475569' : '#60A5FA'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEmojiPicker((prev) => !prev)} className="mr-2">
              <Ionicons name="happy-outline" size={18} color={isDark ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
            <TextInput
              className={`flex-1 py-3 ${textPrimary}`}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
              value={content}
              onChangeText={(value) => {
                setContent(value);
                handleTyping();
              }}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity onPress={handleSend} disabled={sending}>
              <Ionicons name={editingMessageId ? 'checkmark' : 'send'} size={20} color={sending ? '#64748b' : '#60A5FA'} />
            </TouchableOpacity>
          </View>
          {mentionSuggestions.length > 0 ? (
            <View className="mt-2 bg-slate-800 rounded-lg border border-slate-700">
              {mentionSuggestions.map((user: any) => (
                <TouchableOpacity
                  key={user.id}
                  className="px-3 py-2"
                  onPress={() => handleSelectMention({ user })}
                >
                  <Text className="text-slate-200">@{user.fullName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {/* Context menu modal */}
      <Modal
        transparent
        animationType="slide"
        visible={!!selectedMsg}
        onRequestClose={() => setSelectedMsg(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setSelectedMsg(null)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 36 }}>
              {/* Drag handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? '#475569' : '#cbd5e1' }} />
              </View>
              {/* Message preview */}
              <View style={{ margin: 16, marginBottom: 8, backgroundColor: isDark ? '#334155' : '#f1f5f9', borderRadius: 12, padding: 12 }}>
                <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13 }} numberOfLines={2}>
                  {selectedMsg?.revokedAt ? 'Tin nhắn đã thu hồi' : selectedMsg?.content || 'Tệp đính kèm'}
                </Text>
              </View>
              {/* Reply */}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#f1f5f9' }}
                onPress={() => { setReplyTo(selectedMsg); setSelectedMsg(null); }}
              >
                <Ionicons name="return-down-back-outline" size={20} color="#60A5FA" style={{ marginRight: 14 }} />
                <Text style={{ fontSize: 16, color: isDark ? '#f1f5f9' : '#0f172a' }}>Trả lời</Text>
              </TouchableOpacity>
              {/* Edit */}
              {selectedMsg?.senderRole === 'TEACHER' && !selectedMsg?.revokedAt ? (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#f1f5f9' }}
                  onPress={() => { handleEditMessage(selectedMsg.id, selectedMsg.content || ''); setSelectedMsg(null); }}
                >
                  <Ionicons name="pencil-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginRight: 14 }} />
                  <Text style={{ fontSize: 16, color: isDark ? '#f1f5f9' : '#0f172a' }}>Chỉnh sửa</Text>
                </TouchableOpacity>
              ) : null}
              {/* Revoke */}
              {selectedMsg?.senderRole === 'TEACHER' && !selectedMsg?.revokedAt ? (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#f1f5f9' }}
                  onPress={() => { handleRevokeMessage(selectedMsg.id); setSelectedMsg(null); }}
                >
                  <Ionicons name="arrow-undo-outline" size={20} color="#f87171" style={{ marginRight: 14 }} />
                  <Text style={{ fontSize: 16, color: '#f87171' }}>Thu hồi</Text>
                </TouchableOpacity>
              ) : null}
              {/* Delete */}
              {selectedMsg?.senderRole === 'TEACHER' ? (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14 }}
                  onPress={() => { handleDeleteMessage(selectedMsg.id); setSelectedMsg(null); }}
                >
                  <Ionicons name="trash-outline" size={20} color="#f87171" style={{ marginRight: 14 }} />
                  <Text style={{ fontSize: 16, color: '#f87171' }}>Xóa</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
