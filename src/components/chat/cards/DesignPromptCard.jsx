import { Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';

// prompts can be string[] OR {label, text}[] — handle both
const getLabel = (p) => typeof p === 'string' ? p : (p?.label || p?.text || '');
const getText  = (p) => typeof p === 'string' ? p : (p?.text  || p?.label || '');

export default function DesignPromptCard({ card }) {
  const [copiedIdx, setCopiedIdx] = useState(null);
  if (!card) return null;
  const { title, prompts = [], style, color_scheme, theme } = card;

  const handleCopy = async (p, idx) => {
    await navigator.clipboard.writeText(getText(p)).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="mt-2 rounded-2xl border border-purple-200 bg-purple-50 overflow-hidden text-sm">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-100 to-pink-100 border-b border-purple-200">
        <Sparkles className="w-4 h-4 text-purple-500" />
        <span className="font-semibold text-purple-700">{title || 'Ý tưởng thiết kế'}</span>
      </div>

      {(style || color_scheme || theme) && (
        <div className="px-4 pt-3 flex flex-wrap gap-1.5">
          {style        && <span className="text-xs bg-purple-200 text-purple-700 rounded-full px-2 py-0.5">✨ {style}</span>}
          {color_scheme && <span className="text-xs bg-pink-200  text-pink-700  rounded-full px-2 py-0.5">🎨 {color_scheme}</span>}
          {theme        && <span className="text-xs bg-rose-200  text-rose-700  rounded-full px-2 py-0.5">🌸 {theme}</span>}
        </div>
      )}

      <div className="px-4 py-3 space-y-2">
        {prompts.map((p, i) => {
          const label   = getLabel(p);
          const content = getText(p);
          return (
            <div key={i} className="bg-white rounded-xl border border-purple-200 p-3 relative">
              {label && label !== content && (
                <p className="text-xs font-semibold text-purple-600 mb-1">{label}</p>
              )}
              <p className="text-gray-700 text-xs leading-relaxed pr-8">{content}</p>
              <button
                onClick={() => handleCopy(p, i)}
                className="absolute top-2 right-2 p-1 text-purple-400 hover:text-purple-600 transition-colors"
                title="Sao chép prompt"
              >
                {copiedIdx === i
                  ? <Check className="w-3.5 h-3.5 text-green-500" />
                  : <Copy  className="w-3.5 h-3.5" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
