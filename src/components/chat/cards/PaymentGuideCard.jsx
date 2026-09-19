import { CreditCard } from 'lucide-react';

export default function PaymentGuideCard({ card }) {
  if (!card) return null;
  const { title, steps = [], notes = [] } = card;

  return (
    <div className="mt-2 rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden text-sm">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-blue-200">
        <CreditCard className="w-4 h-4 text-blue-500" />
        <span className="font-semibold text-blue-700">{title || 'Hướng dẫn thanh toán'}</span>
      </div>
      {steps.length > 0 && (
        <ol className="px-4 py-3 space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-700">
              <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 text-xs flex items-center justify-center flex-shrink-0 font-bold mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      )}
      {notes.length > 0 && (
        <div className="px-4 pb-3 space-y-1">
          {notes.map((note, i) => (
            <p key={i} className="text-xs text-gray-500 flex items-start gap-1">
              <span className="text-blue-400">ℹ️</span>{note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
