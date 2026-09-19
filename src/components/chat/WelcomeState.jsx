import { Gift, Sparkles, Calendar, HelpCircle } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';

const QUICK_STARTERS = [
  { icon: Gift, label: 'Gợi ý quà sinh nhật', text: 'Bạn ơi, gợi ý cho mình quà sinh nhật phù hợp cho bạn gái nhé, ngân sách khoảng 500k-1 triệu.' },
  { icon: Sparkles, label: 'Ý tưởng thiết kế hộp', text: 'Mình muốn thiết kế hộp quà cute và thanh lịch cho các dịp lễ. Bạn có thể gợi ý prompt thiết kế không?' },
  { icon: Calendar, label: 'Quà 8/3 cho mẹ', text: 'Mình muốn tặng quà ngày 8/3 cho mẹ, mẹ thích hoa và đồ handmade. Gợi ý cho mình nhé!' },
  { icon: HelpCircle, label: 'Hộp nào phù hợp nhất?', text: 'Cho mình biết các loại hộp Love Box có gì khác nhau và loại nào phù hợp với quà nhỏ gọn?' },
];

export default function WelcomeState({ recentConversations }) {
  const { sendMessage, loadConversation } = useChat();
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-6">
      {/* Hero */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-200">
          <span className="text-3xl">🎀</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800">
          Xin chào{user?.name ? `, ${user.name.split(' ').at(-1)}` : ''}! Tôi là Linh 👋
        </h2>
        <p className="text-sm text-gray-500 mt-1">Trợ lý tư vấn quà tặng cá nhân hoá của Love Box.</p>
      </div>

      {/* Quick starters */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Bắt đầu nhanh</p>
      <div className="grid grid-cols-1 gap-2 mb-6">
        {QUICK_STARTERS.map(({ icon: Icon, label, text }) => (
          <button
            key={label}
            onClick={() => sendMessage(text)}
            className="flex items-center gap-3 text-left bg-white hover:bg-pink-50 border border-pink-100 hover:border-pink-300 rounded-xl px-4 py-3 text-sm text-gray-700 transition-all group"
          >
            <span className="w-8 h-8 rounded-full bg-pink-100 group-hover:bg-pink-200 flex items-center justify-center flex-shrink-0 transition-colors">
              <Icon className="w-4 h-4 text-pink-500" />
            </span>
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Recent conversations */}
      {recentConversations?.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cuộc trò chuyện gần đây</p>
          <div className="space-y-1.5">
            {recentConversations.slice(0, 3).map(conv => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-pink-50 border border-transparent hover:border-pink-100 transition-all"
              >
                <p className="text-sm text-gray-700 font-medium line-clamp-1">{conv.title || 'Cuộc trò chuyện'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(conv.createdAt || conv.created_at).toLocaleDateString('vi-VN')}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
