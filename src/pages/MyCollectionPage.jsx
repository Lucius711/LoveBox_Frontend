import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import { getMyGiftDesigns } from '../services/aiApi'
import { formatCurrency } from '../utils/format'
import { Sparkles, ShoppingBag, PackageOpen } from 'lucide-react'

export default function MyCollectionPage() {
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyGiftDesigns()
      .then(setDesigns)
      .catch(() => setDesigns([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="text-pink-500 w-6 h-6" />
            Bộ sưu tập của tôi
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Các thiết kế hộp quà bạn đã tạo từ AI Chat
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-pink-50 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && designs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <PackageOpen className="w-16 h-16 text-pink-200 mb-4" />
            <p className="text-gray-500 font-medium mb-1">Chưa có thiết kế nào</p>
            <p className="text-sm text-gray-400 mb-6">
              Hãy tạo hộp quà đầu tiên của bạn với trợ lý AI 💝
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition"
            >
              <Sparkles size={14} /> Tạo thiết kế ngay
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && designs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {designs.map((d, i) => (
              <DesignCard key={d.id ?? i} design={d} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}

function DesignCard({ design }) {
  return (
    <div className="bg-white rounded-2xl border border-pink-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      {/* Image */}
      <div className="h-48 bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-5xl">
        {design.imageUrl
          ? <img src={design.imageUrl} alt={design.name} className="w-full h-full object-cover" />
          : (design.emoji || '🎁')}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-gray-800 text-sm line-clamp-1">
          {design.name || 'Hộp quà của tôi'}
        </p>
        {design.style && (
          <p className="text-xs text-pink-400 mt-0.5 line-clamp-1">{design.style}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          {design.price
            ? <span className="text-sm font-bold text-pink-600">{formatCurrency(design.price)}</span>
            : <span className="text-xs text-gray-400">Thiết kế AI</span>}
          <Link
            to="/cart"
            className="flex items-center gap-1 bg-pink-500 text-white text-xs px-3 py-1.5 rounded-full hover:bg-pink-600 transition"
          >
            <ShoppingBag size={11} /> Đặt hàng
          </Link>
        </div>
      </div>
    </div>
  )
}
