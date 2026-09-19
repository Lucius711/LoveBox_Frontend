import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowRight } from 'lucide-react';
import { getShowcaseDesigns } from '../../services/api';
import { formatCurrency } from '../../utils/format';

const DEMO = [
  { id:1, name:'Love Box Cute Baby', emoji:'🐣', style:'Cute Y2K', price:250000, gradient:'from-indigo-100 via-purple-50 to-pink-100' },
  { id:2, name:'Love Box Thanh Lịch', emoji:'🌸', style:'Elegant Floral', price:250000, gradient:'from-rose-100 via-pink-50 to-fuchsia-100' },
  { id:3, name:'Love Box Ngọt Ngào', emoji:'🍬', style:'Sweet Candy', price:350000, gradient:'from-fuchsia-100 via-pink-50 to-rose-100' },
  { id:4, name:'Love Box Vintage', emoji:'🕊️', style:'Vintage Rose', price:350000, gradient:'from-orange-100 via-rose-50 to-pink-100' },
  { id:5, name:'Love Box Bí Ẩn', emoji:'🌙', style:'Dark Romance', price:450000, gradient:'from-violet-100 via-purple-50 to-pink-100' },
];

export default function ShowcaseSection() {
  const [designs, setDesigns] = useState(DEMO);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    getShowcaseDesigns()
      .then((r) => { const d = r.data; const arr = Array.isArray(d) ? d : d?.data; if (arr?.length) setDesigns(arr); })
      .catch(() => {});
  }, []);

  const prev = () => setIdx((i) => (i - 1 + designs.length) % designs.length);
  const next = () => setIdx((i) => (i + 1) % designs.length);
  const visible = [0, 1, 2].map((offset) => designs[(idx + offset) % designs.length]);

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-pink-50/40 to-white">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold tracking-widest text-pink-400 uppercase mb-2">Bộ sưu tập</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Nổi bật hôm nay</h2>
          </div>
          <Link
            to="/products"
            className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-pink-500 hover:text-rose-500 transition-colors group"
          >
            Xem tất cả
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Cards */}
        <div className="relative">
          {/* Desktop: 3 cards */}
          <div className="hidden md:grid grid-cols-3 gap-6">
            {visible.map((d, i) => (
              <DesignCard key={`${d.id}-${i}`} design={d} featured={i === 1} />
            ))}
          </div>

          {/* Mobile: 1 card */}
          <div className="md:hidden">
            <DesignCard design={designs[idx]} featured />
          </div>

          {/* Nav buttons */}
          <button
            onClick={prev}
            className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-pink-500 hover:bg-pink-50 transition border border-pink-100"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-pink-500 hover:bg-pink-50 transition border border-pink-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {designs.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all duration-300 ${
                i === idx ? 'bg-pink-500 w-6 h-2' : 'bg-pink-200 w-2 h-2'
              }`}
            />
          ))}
        </div>

        {/* Mobile "see all" */}
        <div className="flex justify-center mt-6 md:hidden">
          <Link
            to="/products"
            className="flex items-center gap-1.5 text-sm font-semibold text-pink-500"
          >
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function DesignCard({ design, featured }) {
  return (
    <div
      className={`group relative bg-white rounded-3xl overflow-hidden border border-pink-100
        transition-all duration-300 hover:shadow-xl hover:-translate-y-1
        ${featured ? 'shadow-md' : 'shadow-sm'}`}
    >
      {/* Image area */}
      <div className={`relative h-56 bg-gradient-to-br ${design.gradient || 'from-pink-100 to-rose-100'} overflow-hidden`}>
        {design.thumbnailUrl
          ? <img src={design.thumbnailUrl} alt={design.name} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-7xl drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                {design.emoji || '🎁'}
              </span>
            </div>
          )
        }

        {/* Style badge */}
        {design.style && (
          <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm text-pink-500 text-[10px] font-semibold px-2.5 py-1 rounded-full">
            {design.style}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <p className="font-bold text-gray-800 text-base mb-3">{design.name}</p>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
            {formatCurrency(design.price || 250000)}
          </span>
          <button className="flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-full hover:opacity-90 hover:shadow-md transition-all">
            <ShoppingBag size={12} />
            Chọn
          </button>
        </div>
      </div>
    </div>
  );
}
