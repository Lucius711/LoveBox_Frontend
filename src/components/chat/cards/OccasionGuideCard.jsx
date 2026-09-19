import { Calendar } from 'lucide-react';

export default function OccasionGuideCard({ card }) {
  if (!card) return null;
  const { title, occasion, date_hint, ideas = [], tips = [] } = card;

  return (
    <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 overflow-hidden text-sm">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-100 to-pink-100 border-b border-rose-200">
        <Calendar className="w-4 h-4 text-rose-500" />
        <span className="font-semibold text-rose-700">{title || occasion || 'Hướng dẫn theo dịp'}</span>
        {date_hint && <span className="ml-auto text-xs text-rose-400">{date_hint}</span>}
      </div>
      {ideas.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-rose-600 mb-2 uppercase tracking-wide">Ý tưởng quà</p>
          <ul className="space-y-1">
            {ideas.map((idea, i) => (
              <li key={i} className="flex items-start gap-1.5 text-gray-700">
                <span className="text-rose-400 mt-0.5">•</span>{idea}
              </li>
            ))}
          </ul>
        </div>
      )}
      {tips.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Lưu ý</p>
          <ul className="space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-1.5 text-gray-500 text-xs">
                <span className="text-amber-400 mt-0.5">💡</span>{tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
