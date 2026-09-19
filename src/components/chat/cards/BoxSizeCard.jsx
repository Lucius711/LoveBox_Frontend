import { Package } from 'lucide-react';

export default function BoxSizeCard({ card }) {
  if (!card) return null;
  const { title, sizes = [], recommended } = card;

  return (
    <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden text-sm">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
        <Package className="w-4 h-4 text-amber-600" />
        <span className="font-semibold text-amber-700">{title || 'Kích thước hộp quà'}</span>
      </div>
      <div className="p-4 grid grid-cols-1 gap-2">
        {sizes.map((s, i) => (
          <div key={i} className={`rounded-xl border p-3 ${recommended === s.name ? 'border-amber-400 bg-amber-100' : 'border-amber-200 bg-white'}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">{s.name}</span>
              {recommended === s.name && <span className="text-xs bg-amber-400 text-white rounded-full px-2 py-0.5">Đề xuất</span>}
            </div>
            {s.dimensions && <p className="text-xs text-gray-500 mt-0.5">📐 {s.dimensions}</p>}
            {s.suitable_for && <p className="text-xs text-gray-600 mt-1">{s.suitable_for}</p>}
            {s.price && <p className="text-xs text-amber-600 font-medium mt-1">💰 {s.price}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
