import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu, X, LogOut, User, ChevronDown, Bookmark } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ROUTES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 hover:bg-pink-50 rounded-full px-3 py-1.5 transition-colors"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold">
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 hidden lg:block max-w-[120px] truncate">
          {user?.name || user?.email}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-pink-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-pink-50">
            <p className="text-xs font-medium text-gray-700 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <Link
            to="/my-collection"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-pink-50 hover:text-pink-500 transition-colors"
          >
            <Bookmark size={14} />
            Bộ sưu tập của tôi
          </Link>
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-rose-50 hover:text-rose-500 transition-colors"
          >
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

export default function MainLayout({ children }) {
  const { isLoggedIn, user, logout } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-pink-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to={ROUTES.HOME} className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            <span className="font-bold text-xl bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
              Love Box
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === l.to ? 'text-pink-500' : 'text-gray-600 hover:text-pink-500'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">

            {/* Cart */}
            {isLoggedIn && (
              <Link to={ROUTES.CART} className="relative p-2 text-pink-400 hover:text-pink-500 transition-colors">
                <ShoppingBag size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-pink-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
            )}

            {/* Auth */}
            {isLoggedIn ? (
              <UserMenu user={user} onLogout={logout} />
            ) : (
              <button
                onClick={() => navigate(ROUTES.LOGIN)}
                className="hidden md:flex items-center gap-1.5 text-pink-500 hover:text-pink-600 border border-pink-200 hover:border-pink-300 px-4 py-2 rounded-full text-sm font-medium transition-colors"
              >
                <User size={14} />
                Đăng nhập
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden p-2 text-pink-400 hover:text-pink-500 transition-colors"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-pink-100 px-4 py-4 space-y-3">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-gray-600 hover:text-pink-500 py-2"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-pink-50 space-y-2">
              {isLoggedIn ? (
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-rose-500 py-2"
                >
                  <LogOut size={14} />
                  Đăng xuất
                </button>
              ) : (
                <button
                  onClick={() => { navigate(ROUTES.LOGIN); setMenuOpen(false); }}
                  className="flex items-center gap-2 text-sm text-pink-500 py-2"
                >
                  <User size={14} />
                  Đăng nhập
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      {/* Footer — Florlen 4-column style */}
      <footer className="bg-white border-t border-pink-100 mt-20">
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-10">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 md:gap-8">

            {/* Col 1: Logo + tagline */}
            <div className="flex flex-col gap-3">
              <Link to={ROUTES.HOME} className="flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                <span className="font-bold text-xl bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">Love Box</span>
              </Link>
              <p className="text-sm text-gray-500 leading-relaxed max-w-[200px]">
                Tạo hộp quà cá nhân hoá bằng AI — tặng đi yêu thương ✨
              </p>
            </div>

            {/* Col 2: Khám phá */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-5 text-sm">Khám phá</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Trang chủ', to: ROUTES.HOME },
                  { label: 'Sản phẩm', to: ROUTES.PRODUCTS },
                ].map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-gray-500 hover:text-pink-500 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Mạng xã hội */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-5 text-sm">Mạng xã hội</h4>
              <ul className="space-y-4">
                {[
                  { label: 'Facebook', href: 'https://facebook.com', svgPath: 'M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.532-4.697 1.313 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z' },
                  { label: 'Instagram', href: 'https://instagram.com', svgPath: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                  { label: 'TikTok', href: 'https://tiktok.com', svgPath: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
                  { label: 'YouTube', href: 'https://youtube.com', svgPath: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
                ].map(({ label, href, svgPath }) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-500 hover:text-pink-500 transition-colors">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400 shrink-0">
                        <path d={svgPath} />
                      </svg>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Hỗ trợ */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-5 text-sm">Hỗ trợ</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Thông tin giao hàng', to: '/shipping' },
                  { label: 'Chính sách bảo mật', to: '/privacy' },
                  { label: 'Điều khoản dịch vụ', to: '/terms' },
                ].map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-gray-500 hover:text-pink-500 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 border-t border-pink-100 pt-6 flex flex-col-reverse md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} Love Box. All rights reserved.</p>
            <div className="flex gap-2">
              {['🌸', '💝', '🎀', '✨', '💌'].map((e, i) => <span key={i} className="text-lg">{e}</span>)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
