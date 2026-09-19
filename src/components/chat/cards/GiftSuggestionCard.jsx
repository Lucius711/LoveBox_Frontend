import { Gift, ArrowRight } from 'lucide-react';
import { useChat } from '../../../context/ChatContext';

export default function GiftSuggestionCard({ card }) {
  const { openStudio } = useChat();
  if (!card) return null;
  const { title, description, items = [], budget_range, occasion } = card;

  return (
    <div className="mt-2 rounded-2xl border border-pink-200 bg-pink-50 overflow-hidden text-sm">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-100 to-rose-100 border-b border-pink-200">
        <Gift className="w-4 h-4 text-pink-500" />
        <span className="font-semibold text-pink-700">{title || 'Gợi ý quà tặng'}</span>
        {occasion && <span className="ml-auto text-xs text-pink-400 bg-pink-200 rounded-full px-2 py-0.5">{occasion}</span>}
      </div>
      {description && <p className="px-4 pt-3 text-gray-600">{description}</p>}
      {items.length > 0 && (
        <ul className="px-4 py-3 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-pink-200 text-pink-600 text-xs flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
              <div>
                <p className="font-medium text-gray-800">{item.name}</p>
                {item.reason && <p className="text-gray-500 text-xs">{item.reason}</p>}
                {item.price_range && <p className="text-pink-500 text-xs mt-0.5">💰 {item.price_range}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {budget_range && (
        <div className="px-4 pb-3 text-xs text-gray-500">Ngân sách đề xuất: <span className="text-pink-600 font-medium">{budget_range}</span></div>
      )}
      <div className="px-4 pb-3">
        <button
          onClick={openStudio}
          className="flex items-center gap-1.5 text-xs text-pink-600 font-medium hover:text-pink-700 transition-colors"
        >
          Thiết kế ngay ✨ <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
