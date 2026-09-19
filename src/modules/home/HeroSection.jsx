import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles } from 'lucide-react'
import { ROUTES } from '../../constants'

export default function HeroSection() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('search', query.trim())
    navigate(`${ROUTES.PRODUCTS}?${params.toString()}`)
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 pt-14 pb-20 px-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-pink-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-rose-300/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-fuchsia-200/10 blur-3xl" />

      {/* Floating emoji accents */}
      <span className="pointer-events-none select-none absolute top-10 left-[8%] text-3xl opacity-40 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>🎀</span>
      <span className="pointer-events-none select-none absolute top-20 right-[10%] text-2xl opacity-30 animate-bounce" style={{ animationDelay: '0.7s', animationDuration: '3.5s' }}>✨</span>
      <span className="pointer-events-none select-none absolute bottom-10 left-[12%] text-2xl opacity-30 animate-bounce" style={{ animationDelay: '1.2s', animationDuration: '4s' }}>💝</span>
      <span className="pointer-events-none select-none absolute bottom-16 right-[8%] text-3xl opacity-30 animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '3.2s' }}>🌸</span>

      {/* Content */}
      <div className="relative max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-pink-100 text-pink-500 text-xs font-semibold px-4 py-2 rounded-full shadow-sm">
          <Sparkles size={12} />
          Hộp quà cá nhân hóa bằng AI · Giao 2h nội thành
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-800 leading-tight">
          Kiến tạo Hộp quà<br />
          <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 bg-clip-text text-transparent">
            Yêu thương của riêng bạn
          </span>
        </h1>

        <p className="text-gray-500 text-base md:text-lg max-w-md leading-relaxed">
          Tìm mẫu ưa thích hoặc để AI tạo riêng một thiết kế độc bản chỉ dành cho bạn 💖
        </p>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-white rounded-full shadow-lg shadow-pink-100 border border-pink-100 px-5 pr-2 py-2.5 w-full max-w-xl">
          <Search size={16} className="text-pink-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Tìm tên mẫu, phong cách, dịp tặng..."
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
          />
          <button
            onClick={handleSearch}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 hover:shadow-md transition-all"
          >
            Tìm kiếm
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap justify-center">
          <span>🔥 Phổ biến:</span>
          {['Sinh nhật', 'Lễ tình nhân', '8/3', 'Kỷ niệm', 'Tốt nghiệp'].map((tag) => (
            <button
              key={tag}
              onClick={() => { setQuery(tag); navigate(`${ROUTES.PRODUCTS}?search=${tag}`) }}
              className="bg-white border border-pink-100 hover:border-pink-300 hover:text-pink-500 text-gray-500 px-3 py-1 rounded-full transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Trust row */}
        <div className="flex items-center divide-x divide-pink-100 gap-0 mt-2">
          {[['500+', 'Hộp quà đã tạo'], ['98%', 'Khách hài lòng'], ['2h', 'Giao siêu tốc']].map(([val, label]) => (
            <div key={label} className="px-6 text-center first:pl-0 last:pr-0">
              <p className="text-xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">{val}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
