import { createContext, useContext, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { streamChat as apiStreamChat, listConversations, getConversation, deleteConversation } from '../services/chatApi';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { isLoggedIn } = useAuth();

  // Panel state
  const [isOpen, setIsOpen]           = useState(false);
  const [activeTab, setActiveTab]     = useState('chat'); // 'chat' | 'history' | 'settings'

  // Conversation state
  const [conversationId, setConversationId]   = useState(null);
  const [messages, setMessages]               = useState([]);       // {id, role, content, card, quickReplies, actions, streaming}
  const [isThinking, setIsThinking]           = useState(false);
  const [isStreaming, setIsStreaming]          = useState(false);
  const abortRef = useRef(null);

  // History
  const [conversations, setConversations]     = useState([]);
  const [historyLoaded, setHistoryLoaded]     = useState(false);

  // ── Open / close ──────────────────────────────────────────────────────
  const openChat    = useCallback(() => { setIsOpen(true); setActiveTab('chat'); }, []);
  const openStudio  = useCallback(() => { setIsOpen(true); setActiveTab('chat'); }, []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen(p => !p), []);

  // ── Start new conversation ────────────────────────────────────────────
  const startNew = useCallback(() => {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setIsThinking(false);
    setIsStreaming(false);
  }, []);

  // ── Send message ──────────────────────────────────────────────────────
  const sendMessage = useCallback((text) => {
    if (!text?.trim() || isStreaming) return;

    // Add user bubble immediately
    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    // Placeholder for assistant
    const assistantId = `a-${Date.now()}`;
    const assistantPlaceholder = { id: assistantId, role: 'assistant', content: '', streaming: true };
    setMessages(prev => [...prev, assistantPlaceholder]);

    setIsThinking(true);
    setIsStreaming(true);

    abortRef.current = apiStreamChat({
      conversationId,
      message: text,
      onThinking: () => { setIsThinking(true); },
      onChunk: (chunk) => {
        setIsThinking(false);
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: m.content + chunk } : m
        ));
      },
      onDone: (event) => {
        setIsThinking(false);
        setIsStreaming(false);
        if (event.conversationId) setConversationId(event.conversationId);
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, streaming: false, card: event.card, quickReplies: event.quickReplies, actions: event.actions }
            : m
        ));
        setHistoryLoaded(false); // invalidate history cache
      },
      onError: (msg) => {
        setIsThinking(false);
        setIsStreaming(false);
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, streaming: false, content: m.content || `⚠️ ${msg || 'Đã xảy ra lỗi, vui lòng thử lại.'}` }
            : m
        ));
      },
    });
  }, [conversationId, isStreaming]);

  // ── Load history ──────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const list = await listConversations();
      setConversations(list || []);
      setHistoryLoaded(true);
    } catch (_) { /* silent */ }
  }, [isLoggedIn]);

  // ── Load conversation ──────────────────────────────────────────────────
  const loadConversation = useCallback(async (id) => {
    // Switch to chat tab immediately so the user sees the transition
    setActiveTab('chat');
    try {
      const conv = await getConversation(id);
      if (!conv?.id) throw new Error('Invalid conversation response');
      setConversationId(conv.id);
      setMessages((conv.messages || []).map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        card: m.card,
        quickReplies: m.quickReplies,
        actions: m.actions,
      })));
    } catch (err) {
      console.error('[ChatContext] loadConversation failed', err);
      toast.error('Không thể tải cuộc trò chuyện, vui lòng thử lại.');
    }
  }, []);

  // ── Delete conversation ───────────────────────────────────────────────
  const removeConversation = useCallback(async (id) => {
    await deleteConversation(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (conversationId === id) startNew();
  }, [conversationId, startNew]);

  return (
    <ChatContext.Provider value={{
      isOpen, openChat, openStudio, closeChat, toggleChat,
      activeTab, setActiveTab,
      conversationId, messages, isThinking, isStreaming,
      sendMessage, startNew,
      conversations, historyLoaded, loadHistory, loadConversation, removeConversation,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
