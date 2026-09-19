import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { ROUTES } from '../../constants';
import ChatPanel from './ChatPanel';

const HIDDEN_ROUTES = [ROUTES.LOGIN, ROUTES.CHECKOUT, ROUTES.ORDER_SUCCESS];

export default function FloatingChatBubble() {
  const { isOpen, toggleChat } = useChat();
  const location = useLocation();
  const [pulse, setPulse] = useState(false);

  // Pulse on first visit
  useEffect(() => {
    const seen = localStorage.getItem('lb_chat_seen');
    if (!seen) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 6000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleToggle = () => {
    localStorage.setItem('lb_chat_seen', '1');
    setPulse(false);
    toggleChat();
  };

  // Hide on certain routes
  if (HIDDEN_ROUTES.includes(location.pathname)) return null;

  return (
    <>
      <ChatPanel />

      {/* Bubble button */}
      <button
        onClick={handleToggle}
        aria-label="Mở chat với Linh"
        className="fixed bottom-5 right-4 z-50 w-14 h-14 rounded-full
                   bg-gradient-to-br from-pink-500 to-rose-500
                   flex items-center justify-center
                   shadow-lg shadow-pink-300/50
                   hover:shadow-xl hover:shadow-pink-300/60
                   hover:scale-105 active:scale-95
                   transition-all duration-200"
      >
        {/* Pulse ring on first visit */}
        {pulse && !isOpen && (
          <span className="absolute inset-0 rounded-full bg-pink-400 animate-ping opacity-60" />
        )}
        {isOpen
          ? <X className="w-5 h-5 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />
        }
      </button>

      {/* Tooltip on first visit */}
      {pulse && !isOpen && (
        <div className="fixed bottom-[4.75rem] right-[4.5rem] z-50 bg-white border border-pink-200 shadow-lg rounded-xl px-3 py-2 text-sm text-gray-700 whitespace-nowrap pointer-events-none">
          <span className="font-medium text-pink-500">Linh</span> có thể giúp bạn chọn quà! 🎁
          <div className="absolute bottom-2 -right-1.5 w-3 h-3 bg-white border-r border-b border-pink-200 rotate-45" />
        </div>
      )}
    </>
  );
}
