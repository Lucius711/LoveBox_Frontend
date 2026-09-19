import { useEffect, useRef, useState } from 'react';
import { X, Plus, Clock, Send, Trash2, Bot } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import ChatMessage from './ChatMessage';
import WelcomeState from './WelcomeState';
import { getPreferences, updatePreferences } from '../../services/chatApi';
import toast from 'react-hot-toast';

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab() {
  const { conversations, historyLoaded, loadHistory, loadConversation, removeConversation } = useChat();
  useEffect(() => { if (!historyLoaded) loadHistory(); }, [historyLoaded, loadHistory]);

  if (!conversations.length) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
      <Clock className="w-10 h-10 text-pink-200" />
      <p className="text-sm">Chưa có cuộc trò chuyện nào</p>
    </div>
  );
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
      {conversations.map(conv => (
        <div key={conv.id} className="flex items-center gap-2 group rounded-xl hover:bg-pink-50 border border-transparent hover:border-pink-100 px-3 py-2.5 transition-all">
          <button className="flex-1 text-left" onClick={() => loadConversation(conv.id)}>
            <p className="text-sm text-gray-700 font-medium line-clamp-1">{conv.title || 'Cuộc trò chuyện'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(conv.createdAt || conv.created_at).toLocaleDateString('vi-VN')}</p>
          </button>
          <button onClick={() => removeConversation(conv.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const { isLoggedIn } = useAuth();
  const [prefs, setPrefs] = useState({ preferredLanguage: 'vi', budgetRange: '' });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!isLoggedIn) return;
    getPreferences().then(p => p && setPrefs(p)).catch(() => {});
  }, [isLoggedIn]);
  const save = async () => {
    setLoading(true);
    try { await updatePreferences(prefs); toast.success('Đã lưu cài đặt!'); }
    catch { toast.error('Lưu thất bại'); }
    finally { setLoading(false); }
  };
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ngôn ngữ trả lời</label>
        <select value={prefs.preferredLanguage} onChange={e => setPrefs(p => ({ ...p, preferredLanguage: e.target.value }))}
          className="w-full border border-pink-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ngân sách thường dùng</label>
        <input type="text" placeholder="VD: 200k - 500k" value={prefs.budgetRange || ''}
          onChange={e => setPrefs(p => ({ ...p, budgetRange: e.target.value }))}
          className="w-full border border-pink-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
      </div>
      <button onClick={save} disabled={loading}
        className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition">
        {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
      </button>
    </div>
  );
}

// ── Main ChatPanel ────────────────────────────────────────────────────────────
export default function ChatPanel() {
  const {
    isOpen, closeChat,
    activeTab, setActiveTab,
    messages, isThinking, isStreaming,
    sendMessage, startNew,
    conversations, historyLoaded, loadHistory,
  } = useChat();
  const { isLoggedIn } = useAuth();

  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (activeTab === 'history' && !historyLoaded) loadHistory();
  }, [activeTab, historyLoaded, loadHistory]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen, activeTab]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    sendMessage(text);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleQuickReply = (text) => { if (!isStreaming) sendMessage(text); };
  const handleAction = (action) => {
    if (isStreaming) return;
    if (action.type === 'send') sendMessage(action.value);
    if (action.type === 'navigate') window.location.href = action.value;
  };

  const showWelcome = messages.length === 0 && activeTab === 'chat';

  if (!isOpen) return null;

  const TABS = [
    { key: 'chat',     label: '💬 Chat' },
    { key: 'history',  label: '🕐 Lịch sử' },
    { key: 'settings', label: '⚙️ Cài đặt' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={closeChat} />

      <div
        className="fixed bottom-24 right-4 z-50 flex flex-col w-[calc(100vw-2rem)] max-w-[420px] h-[min(600px,calc(100dvh-7rem))] rounded-2xl shadow-2xl border border-pink-100 bg-white overflow-hidden"
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        <style>{`
          @keyframes slideUp {
            from { opacity:0; transform:translateY(16px) scale(0.97); }
            to   { opacity:1; transform:translateY(0) scale(1); }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">Linh — Trợ lý Love Box</p>
            <p className="text-xs text-pink-100 leading-tight">Tư vấn & thiết kế quà AI</p>
          </div>
          <button onClick={startNew} title="Cuộc trò chuyện mới" className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={closeChat} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-pink-100 flex-shrink-0">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab.key ? 'text-pink-600 border-b-2 border-pink-500 bg-pink-50' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
              {showWelcome ? (
                <WelcomeState recentConversations={historyLoaded ? conversations : []} />
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <ChatMessage key={msg.id} msg={msg}
                      isThinking={isThinking && i === messages.length - 1 && msg.role === 'assistant' && !msg.content}
                      onQuickReply={handleQuickReply}
                      onAction={handleAction}
                    />
                  ))}
                  {isThinking && messages.at(-1)?.role !== 'assistant' && (
                    <ChatMessage msg={{ id: 'thinking', role: 'assistant', content: '' }} isThinking />
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-pink-50 flex-shrink-0">
              {!isLoggedIn ? (
                <p className="text-center text-xs text-gray-400 py-2">
                  <a href="/login" className="text-pink-500 font-medium hover:underline">Đăng nhập</a> để chat với Linh
                </p>
              ) : (
                <div className="flex items-end gap-2 bg-pink-50 border border-pink-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-pink-300 focus-within:border-pink-300 transition-all">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Nhắn tin với Linh..."
                    disabled={isStreaming}
                    className="flex-1 bg-transparent resize-none text-sm text-gray-700 placeholder-gray-400 focus:outline-none max-h-24 leading-5"
                    style={{ height: 'auto', minHeight: '20px' }}
                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0 mb-0.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'history' ? (
          <HistoryTab />
        ) : (
          <SettingsTab />
        )}
      </div>
    </>
  );
}
