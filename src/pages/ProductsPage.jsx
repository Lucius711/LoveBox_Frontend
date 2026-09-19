import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, ShoppingBag, ChevronDown } from 'lucide-react'
import MainLayout from '../layouts/MainLayout'
import { getShowcaseDesigns, getCategories } from '../services/catalogApi'
import { formatCurrency } from '../utils/format'
import { ROUTES } from '../constants'

const PRICE_RANGES = [
  { label: 'Tất cả', min: 0, max: Infinity },
  { label: 'Dưới 200k', min: 0, max: 200000 },
  { label: '200k – 400k', min: 200000, max: 400000 },
  { label: '400k – 700k', min: 400000, max: 700000 },
  { label: 'Trên 700k', min: 700000, max: Infinity },
]

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [designs, setDesigns] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)

  // Filter state — seeded from URL
  const [searchText, setSearchText] = useState(searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  const [selectedStyle, setSelectedStyle] = useState(searchParams.get('style') || '')
  const [priceRange, setPriceRange] = useState(0) // index into PRICE_RANGES

  useEffect(() => {
    Promise.all([
      getShowcaseDesigns().catch(() => ({ data: [] })),
      getCategories().catch(() => ({ data: [] })),
    ]).then(([d, c]) => {
      const rawD = d?.data; setDesigns(Array.isArray(rawD) ? rawD : Array.isArray(rawD?.content) ? rawD.content : [])
      const rawC = c?.data; setCategories(Array.isArray(rawC) ? rawC : Array.isArray(rawC?.content) ? rawC.content : [])
      setLoading(false)
    })
  }, [])

  // All unique styles from data
  const styles = useMemo(() => {
    const set = new Set(designs.map((d) => d.style).filter(Boolean))
    return [...set]
  }, [designs])

  const { min: priceMin, max: priceMax } = PRICE_RANGES[priceRange]

  const filtered = useMemo(() => {
    return designs.filter((d) => {
      const price = d.price ?? 0
      if (price < priceMin || price > priceMax) return false
      if (selectedCategory && d.categoryId != selectedCategory) return false
      if (selectedStyle && d.style !== selectedStyle) return false
      if (searchText) {
        const q = searchText.toLowerCase()
        if (
          !d.name?.toLowerCase().includes(q) &&
          !d.style?.toLowerCase().includes(q) &&
          !d.description?.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [designs, searchText, selectedCategory, selectedStyle, priceMin, priceMax])

  const activeFilters = [
    selectedCategory && { key: 'category', label: categories.find((c) => c.id == selectedCategory)?.name ?? 'Danh mục', clear: () => setSelectedCategory('') },
    selectedStyle && { key: 'style', label: selectedStyle, clear: () => setSelectedStyle('') },
    priceRange > 0 && { key: 'price', label: PRICE_RANGES[priceRange].label, clear: () => setPriceRange(0) },
  ].filter(Boolean)

  const handleSearch = () => {
    const params = {}
    if (searchText) params.search = searchText
    if (selectedCategory) params.category = selectedCategory
    if (selectedStyle) params.style = selectedStyle
    setSearchParams(params)
  }

  // DEMO fallback designs
  const DEMO = [
    { id: 1, name: 'Love Box Cute Baby', emoji: '🐣', style: 'Cute Y2K', price: 250000, gradient: 'from-blue-100 to-pink-100' },
    { id: 2, name: 'Love Box Thanh Lịch', emoji: '🌸', style: 'Elegant Floral', price: 250000, gradient: 'from-pink-100 to-rose-100' },
    { id: 3, name: 'Love Box Ngọt Ngào', emoji: '🍬', style: 'Sweet Candy', price: 350000, gradient: 'from-fuchsia-100 to-pink-100' },
    { id: 4, name: 'Love Box Vintage', emoji: '🕊️', style: 'Vintage Rose', price: 350000, gradient: 'from-rose-100 to-orange-100' },
    { id: 5, name: 'Love Box Mini', emoji: '💌', style: 'Minimal', price: 180000, gradient: 'from-gray-100 to-pink-100' },
    { id: 6, name: 'Love Box Premium', emoji: '👑', style: 'Luxury', price: 700000, gradient: 'from-yellow-100 to-rose-100' },
  ]
  const displayDesigns = loading ? [] : (filtered.length > 0 || designs.length > 0 ? filtered : DEMO)

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-bold text-pink-900">Tất cả sản phẩm</h1>
          <p className="text-pink-500 text-sm">Khám phá {designs.length || '...'} mẫu hộp quà độc đáo</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters (desktop) */}
          <aside className="hidden lg:flex flex-col gap-6 w-64 shrink-0">
            <FilterPanel
              categories={categories}
              styles={styles}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedStyle={selectedStyle}
              setSelectedStyle={setSelectedStyle}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              searchText={searchText}
              setSearchText={setSearchText}
              onSearch={handleSearch}
            />
          </aside>

          {/* Main content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2 flex-1 bg-white border border-pink-100 rounded-full px-4 py-2 shadow-sm">
                <Search size={16} className="text-pink-400 shrink-0" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Tìm tên, phong cách..."
                  className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="lg:hidden flex items-center gap-2 border border-pink-200 text-pink-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-pink-50 transition-colors"
              >
                <SlidersHorizontal size={15} />
                Bộ lọc
                {activeFilters.length > 0 && (
                  <span className="bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFilters.length}</span>
                )}
              </button>
            </div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activeFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={f.clear}
                    className="flex items-center gap-1.5 bg-pink-100 text-pink-700 text-xs px-3 py-1.5 rounded-full font-medium hover:bg-pink-200 transition-colors"
                  >
                    {f.label}
                    <X size={12} />
                  </button>
                ))}
                <button
                  onClick={() => { setSelectedCategory(''); setSelectedStyle(''); setPriceRange(0); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline px-1 py-1.5"
                >
                  Xóa hết
                </button>
              </div>
            )}

            {/* Mobile filter drawer */}
            {filterOpen && (
              <div className="lg:hidden mb-6 p-5 bg-white rounded-2xl border border-pink-100 shadow-sm">
                <FilterPanel
                  categories={categories}
                  styles={styles}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  selectedStyle={selectedStyle}
                  setSelectedStyle={setSelectedStyle}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  searchText={searchText}
                  setSearchText={setSearchText}
                  onSearch={handleSearch}
                />
              </div>
            )}

            {/* Product grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-pink-50 animate-pulse h-64" />
                ))}
              </div>
            ) : displayDesigns.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-5xl mb-4">🎁</p>
                <p className="font-medium">Không tìm thấy sản phẩm phù hợp</p>
                <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khóa</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-4">{displayDesigns.length} sản phẩm</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {displayDesigns.map((d, i) => <ProductCard key={d.id ?? i} design={d} />)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

function FilterPanel({ categories, styles, selectedCategory, setSelectedCategory, selectedStyle, setSelectedStyle, priceRange, setPriceRange, searchText, setSearchText, onSearch }) {
  return (
    <div className="flex flex-col gap-5 bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
      <h3 className="font-semibold text-pink-900 text-sm">Bộ lọc</h3>

      {/* Category */}
      {categories.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Danh mục</p>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="category" checked={selectedCategory === ''} onChange={() => setSelectedCategory('')} className="accent-pink-500" />
              <span className="text-sm text-gray-700">Tất cả</span>
            </label>
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="category" checked={selectedCategory == c.id} onChange={() => setSelectedCategory(c.id)} className="accent-pink-500" />
                <span className="text-sm text-gray-700">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Style */}
      {styles.length > 0 && (
        <div className="border-t border-pink-50 pt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Phong cách</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStyle('')}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${selectedStyle === '' ? 'bg-pink-500 text-white border-pink-500' : 'border-pink-200 text-gray-600 hover:border-pink-300'}`}
            >
              Tất cả
            </button>
            {styles.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStyle(s)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${selectedStyle === s ? 'bg-pink-500 text-white border-pink-500' : 'border-pink-200 text-gray-600 hover:border-pink-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price range */}
      <div className="border-t border-pink-50 pt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Khoảng giá</p>
        <div className="flex flex-col gap-2">
          {PRICE_RANGES.map((range, i) => (
            <label key={range.label} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="price" checked={priceRange === i} onChange={() => setPriceRange(i)} className="accent-pink-500" />
              <span className="text-sm text-gray-700">{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={onSearch}
        className="mt-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold py-2 rounded-full hover:opacity-90 transition-opacity"
      >
        Áp dụng
      </button>
    </div>
  )
}

function ProductCard({ design }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-pink-100 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className={`h-48 bg-gradient-to-br ${design.gradient || 'from-pink-100 to-rose-100'} flex items-center justify-center text-5xl`}>
        {design.thumbnailUrl ? (
          <img src={design.thumbnailUrl} alt={design.name} className="h-full w-full object-cover" />
        ) : (design.emoji || '🎁')}
      </div>
      <div className="p-4">
        <p className="font-semibold text-pink-900 text-sm leading-tight">{design.name}</p>
        <p className="text-xs text-pink-400 mt-0.5">{design.style || 'Thiết kế đặc biệt'}</p>
        {design.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{design.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-pink-600 text-sm">{formatCurrency(design.price || 250000)}</span>
          <Link
            to={ROUTES.AI_STUDIO}
            className="flex items-center gap-1 bg-pink-500 text-white text-xs px-3 py-1.5 rounded-full hover:bg-pink-600 transition-colors"
          >
            <ShoppingBag size={12} /> Chọn
          </Link>
        </div>
      </div>
    </div>
  )
}
