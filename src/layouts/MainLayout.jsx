import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, ClipboardList, Store, LogOut, Menu, Search, ShoppingBag, Shield, User, X } from 'lucide-react';
import { ROUTES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getNotifications, readNotifications } from '../services/api';

const NAV = [
  { to: ROUTES.HOME, label: 'Trang chủ', end: true },
  { to: ROUTES.PRODUCTS, label: 'Danh mục' },
  { to: ROUTES.ABOUT, label: 'Về chúng tôi' },
];

// Mạng xã hội ở chân trang — icon lấy từ bộ icon footer của igogo-web (lucide bản mới đã bỏ icon thương hiệu)
// TODO: thay link trang chủ mạng xã hội bằng trang của Lentique khi có
const SOCIALS = [
  { label: 'Facebook', href: 'https://www.facebook.com/', paths: ["M24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 17.9895 4.3882 22.954 10.125 23.8542V15.4688H7.07812V12H10.125V9.35625C10.125 6.34875 11.9166 4.6875 14.6576 4.6875C15.9701 4.6875 17.3438 4.92188 17.3438 4.92188V7.875H15.8306C14.34 7.875 13.875 8.80008 13.875 9.75V12H17.2031L16.6711 15.4688H13.875V23.8542C19.6118 22.954 24 17.9895 24 12Z"] },
  { label: 'Instagram', href: 'https://www.instagram.com/', paths: ["M12 2.16094C15.2063 2.16094 15.5859 2.175 16.8469 2.23125C18.0188 2.28281 18.6516 2.47969 19.0734 2.64375C19.6313 2.85938 20.0344 3.12188 20.4516 3.53906C20.8734 3.96094 21.1313 4.35938 21.3469 4.91719C21.5109 5.33906 21.7078 5.97656 21.7594 7.14375C21.8156 8.40937 21.8297 8.78906 21.8297 11.9906C21.8297 15.1969 21.8156 15.5766 21.7594 16.8375C21.7078 18.0094 21.5109 18.6422 21.3469 19.0641C21.1313 19.6219 20.8688 20.025 20.4516 20.4422C20.0297 20.8641 19.6313 21.1219 19.0734 21.3375C18.6516 21.5016 18.0141 21.6984 16.8469 21.75C15.5813 21.8063 15.2016 21.8203 12 21.8203C8.79375 21.8203 8.41406 21.8063 7.15313 21.75C5.98125 21.6984 5.34844 21.5016 4.92656 21.3375C4.36875 21.1219 3.96563 20.8594 3.54844 20.4422C3.12656 20.0203 2.86875 19.6219 2.65313 19.0641C2.48906 18.6422 2.29219 18.0047 2.24063 16.8375C2.18438 15.5719 2.17031 15.1922 2.17031 11.9906C2.17031 8.78438 2.18438 8.40469 2.24063 7.14375C2.29219 5.97187 2.48906 5.33906 2.65313 4.91719C2.86875 4.35938 3.13125 3.95625 3.54844 3.53906C3.97031 3.11719 4.36875 2.85938 4.92656 2.64375C5.34844 2.47969 5.98594 2.28281 7.15313 2.23125C8.41406 2.175 8.79375 2.16094 12 2.16094ZM12 0C8.74219 0 8.33438 0.0140625 7.05469 0.0703125C5.77969 0.126563 4.90313 0.332812 4.14375 0.628125C3.35156 0.9375 2.68125 1.34531 2.01563 2.01562C1.34531 2.68125 0.9375 3.35156 0.628125 4.13906C0.332812 4.90313 0.126563 5.775 0.0703125 7.05C0.0140625 8.33437 0 8.74219 0 12C0 15.2578 0.0140625 15.6656 0.0703125 16.9453C0.126563 18.2203 0.332812 19.0969 0.628125 19.8563C0.9375 20.6484 1.34531 21.3188 2.01563 21.9844C2.68125 22.65 3.35156 23.0625 4.13906 23.3672C4.90313 23.6625 5.775 23.8687 7.05 23.925C8.32969 23.9812 8.7375 23.9953 11.9953 23.9953C15.2531 23.9953 15.6609 23.9812 16.9406 23.925C18.2156 23.8687 19.0922 23.6625 19.8516 23.3672C20.6391 23.0625 21.3094 22.65 21.975 21.9844C22.6406 21.3188 23.0531 20.6484 23.3578 19.8609C23.6531 19.0969 23.8594 18.225 23.9156 16.95C23.9719 15.6703 23.9859 15.2625 23.9859 12.0047C23.9859 8.74688 23.9719 8.33906 23.9156 7.05938C23.8594 5.78438 23.6531 4.90781 23.3578 4.14844C23.0625 3.35156 22.6547 2.68125 21.9844 2.01562C21.3188 1.35 20.6484 0.9375 19.8609 0.632812C19.0969 0.3375 18.225 0.13125 16.95 0.075C15.6656 0.0140625 15.2578 0 12 0Z", "M12 5.83594C8.59688 5.83594 5.83594 8.59688 5.83594 12C5.83594 15.4031 8.59688 18.1641 12 18.1641C15.4031 18.1641 18.1641 15.4031 18.1641 12C18.1641 8.59688 15.4031 5.83594 12 5.83594ZM12 15.9984C9.79219 15.9984 8.00156 14.2078 8.00156 12C8.00156 9.79219 9.79219 8.00156 12 8.00156C14.2078 8.00156 15.9984 9.79219 15.9984 12C15.9984 14.2078 14.2078 15.9984 12 15.9984Z", "M19.8469 5.59214C19.8469 6.38902 19.2 7.0312 18.4078 7.0312C17.6109 7.0312 16.9688 6.38433 16.9688 5.59214C16.9688 4.79526 17.6156 4.15308 18.4078 4.15308C19.2 4.15308 19.8469 4.79995 19.8469 5.59214Z"] },
  { label: 'TikTok', href: 'https://www.tiktok.com/', paths: ["M17.0725 0H13.0278V16.3478C13.0278 18.2957 11.4722 19.8957 9.53626 19.8957C7.60034 19.8957 6.04469 18.2957 6.04469 16.3478C6.04469 14.4348 7.56577 12.8695 9.43257 12.8V8.69567C5.31872 8.7652 2 12.1391 2 16.3478C2 20.5913 5.38786 24 9.57085 24C13.7538 24 17.1416 20.5565 17.1416 16.3478V7.9652C18.6627 9.07827 20.5295 9.73913 22.5 9.77393V5.66957C19.4579 5.56522 17.0725 3.06087 17.0725 0Z"] },
  { label: 'YouTube', href: 'https://www.youtube.com/', paths: ["M23.7609 7.20005C23.7609 7.20005 23.5266 5.54536 22.8047 4.8188C21.8906 3.86255 20.8688 3.85786 20.4 3.80161C17.0438 3.55786 12.0047 3.55786 12.0047 3.55786H11.9953C11.9953 3.55786 6.95625 3.55786 3.6 3.80161C3.13125 3.85786 2.10938 3.86255 1.19531 4.8188C0.473438 5.54536 0.24375 7.20005 0.24375 7.20005C0.24375 7.20005 0 9.14536 0 11.086V12.9047C0 14.8454 0.239062 16.7907 0.239062 16.7907C0.239062 16.7907 0.473437 18.4454 1.19062 19.1719C2.10469 20.1282 3.30469 20.0954 3.83906 20.1985C5.76094 20.3813 12 20.4375 12 20.4375C12 20.4375 17.0438 20.4282 20.4 20.1891C20.8688 20.1329 21.8906 20.1282 22.8047 19.1719C23.5266 18.4454 23.7609 16.7907 23.7609 16.7907C23.7609 16.7907 24 14.85 24 12.9047V11.086C24 9.14536 23.7609 7.20005 23.7609 7.20005ZM9.52031 15.1125V8.36724L16.0031 11.7516L9.52031 15.1125Z"] },
];

/** Logo: móc treo đồ hình chữ L + chữ Lentique. light = nền tối (footer) → icon trắng. */
export function Logo({ light, className = 'text-2xl' }) {
  return (
    <Link to={ROUTES.HOME} aria-label="Lentique — Trang chủ"
      className={`flex items-center gap-2 font-serif font-semibold tracking-tight ${light ? 'text-white' : 'text-ink'} ${className}`}>
      <img src="/logo-mark.png" alt="" className={`h-[1.3em] w-auto ${light ? 'brightness-0 invert' : ''}`} />
      Lentique
    </Link>
  );
}

function SearchBar({ className = '' }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  return (
    <form role="search" className={`relative ${className}`}
      onSubmit={(e) => { e.preventDefault(); navigate(`${ROUTES.PRODUCTS}${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); }}>
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm áo dài, đầm dạ hội, veston..."
        aria-label="Tìm kiếm" className="w-full rounded-full border border-stone-200 bg-stone-100 py-2 pl-10 pr-4 text-sm outline-none focus:border-ink focus:bg-white" />
    </form>
  );
}

const ROLE_LABEL = { ADMIN: 'Quản trị', OWNER: 'Chủ đồ', RENTER: 'Khách thuê' };
const RoleBadge = ({ role }) => (
  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${role === 'ADMIN' ? 'bg-wine-600 text-white' : role === 'OWNER' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'}`}>
    {ROLE_LABEL[role] || 'Khách thuê'}
  </span>
);

/** Chuông thông báo: có người thuê, đồ / đơn Chủ đồ được duyệt… Hỏi lại mỗi 60s; mở ra là đánh dấu đã đọc. */
function NotificationBell() {
  const [inbox, setInbox] = useState({ unread: 0, items: [] });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const load = () => getNotifications().then(setInbox).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => { clearInterval(t); document.removeEventListener('mousedown', close); };
  }, []);
  const toggle = () => {
    setOpen((o) => !o);
    if (!open && inbox.unread) readNotifications().then(() => setInbox((i) => ({ ...i, unread: 0 }))).catch(() => {});
  };
  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label="Thông báo" className="relative rounded-full p-2 hover:bg-stone-100">
        <Bell size={20} />
        {inbox.unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-wine-600 px-1 text-[10px] font-bold text-white">{inbox.unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-xl">
          <p className="border-b border-stone-100 px-4 py-3 text-sm font-semibold">Thông báo</p>
          {inbox.items.length ? inbox.items.map((n) => (
            <Link key={n.id} to={n.link || '#'} onClick={() => setOpen(false)}
              className={`block border-b border-stone-50 px-4 py-3 text-sm hover:bg-stone-50 ${n.read ? 'text-stone-500' : 'font-medium'}`}>
              {n.title}
              <span className="mt-0.5 block text-xs font-normal text-stone-400">{new Date(n.createdAt).toLocaleString('vi-VN')}</span>
            </Link>
          )) : <p className="px-4 py-6 text-center text-sm text-stone-500">Chưa có thông báo nào.</p>}
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Tài khoản" className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-stone-200">
        <span className="hidden sm:inline"><RoleBadge role={user.role} /></span>
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
          : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{(user.name || 'U')[0]}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold"><span className="truncate">{user.name}</span><RoleBadge role={user.role} /></p>
            <p className="truncate text-xs text-stone-500">{user.email}</p>
          </div>
          <Link to={ROUTES.PROFILE} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-stone-50"><User size={15} />Hồ sơ của tôi</Link>
          {user.role !== 'ADMIN' && (   // admin chỉ duyệt, không thuê / cho thuê
            <Link to={ROUTES.ACCOUNT} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-stone-50"><ClipboardList size={15} />{user.role === 'OWNER' ? 'Đơn thuê & cho thuê' : 'Đơn thuê của tôi'}</Link>
          )}
          {user.role === 'RENTER' && (
            <Link to={`${ROUTES.ACCOUNT}?tab=owner`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-stone-50"><Store size={15} />Đăng ký làm Chủ đồ</Link>
          )}
          {user.role === 'ADMIN' && (
            <Link to={ROUTES.ADMIN} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-stone-50"><Shield size={15} />Quản trị</Link>
          )}
          <button onClick={() => { setOpen(false); onLogout(); }} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50"><LogOut size={15} />Đăng xuất</button>
        </div>
      )}
    </div>
  );
}

export default function MainLayout({ children }) {
  const { isLoggedIn, user, logout } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <button onClick={() => setMenuOpen((o) => !o)} className="-ml-2 rounded-full p-2 md:hidden" aria-label="Menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Logo />
          <nav className="ml-4 hidden items-center gap-6 md:flex">
            {NAV.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({ isActive }) => `text-sm font-medium transition ${isActive ? 'text-wine-600' : 'text-stone-600 hover:text-ink'}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <SearchBar className="ml-auto hidden w-64 lg:block" />
          <div className="ml-auto flex items-center gap-1 lg:ml-2">
            <Link to={ROUTES.CART} aria-label="Giỏ hàng" className="relative rounded-full p-2 hover:bg-stone-100">
              <ShoppingBag size={20} />
              {itemCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-wine-600 px-1 text-[10px] font-bold text-white">{itemCount}</span>
              )}
            </Link>
            {isLoggedIn && <NotificationBell />}
            {isLoggedIn
              ? <UserMenu user={user} onLogout={logout} />
              : <button onClick={() => navigate(ROUTES.LOGIN)} className="btn-dark px-4 py-2"><span className="sm:hidden">Đăng nhập</span><span className="hidden sm:inline">Đăng nhập / Đăng ký</span></button>}
          </div>
        </div>
        <div className="px-4 pb-3 lg:hidden"><SearchBar /></div>
        {menuOpen && (
          <nav className="border-t border-stone-200 bg-cream px-4 py-2 md:hidden">
            {NAV.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `block py-3 text-base font-medium ${isActive ? 'text-wine-600' : ''}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main id="main-content" className="flex-1">{children}</main>

      <footer className="mt-20 bg-ink text-stone-400">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Logo light />
            <p className="mt-3 max-w-xs text-sm leading-relaxed">Thuê đồ đẹp cho mọi dịp — trợ lý AI chọn giúp bộ vừa dáng, hợp túi tiền.</p>
          </div>
          <FooterCol title="Khám phá" links={[[ROUTES.PRODUCTS, 'Danh mục'], [ROUTES.ABOUT, 'Về chúng tôi']]} />
          {user?.role === 'ADMIN'   // admin chỉ duyệt, không đăng đồ
            ? <FooterCol title="Quản trị" links={[[ROUTES.ADMIN, 'Duyệt đồ & đơn thuê']]} />
            : <FooterCol title="Cho thuê" links={[[ROUTES.NEW_PRODUCT, 'Đăng đồ cho thuê'], [ROUTES.ACCOUNT, 'Quản lý đơn thuê']]} />}
          <FooterCol title="Hỗ trợ" links={[['/shipping', 'Giao nhận & trả đồ'], ['/privacy', 'Chính sách bảo mật'], ['/terms', 'Điều khoản thuê & cọc']]} />
        </div>
        <div className="border-t border-stone-800">
          <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-4 px-4 py-5 sm:flex-row">
            <p className="text-xs">© {new Date().getFullYear()} Lentique. Made in Vietnam.</p>
            <ul className="flex gap-5">
              {SOCIALS.map(({ label, href, paths }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex transition-colors hover:text-white">
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      {paths.map((d) => <path key={d.slice(0, 16)} d={d} />)}
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-semibold text-white">{title}</h4>
      <ul className="space-y-2.5 text-sm">
        {links.map(([to, label]) => <li key={label}><Link to={to} className="hover:text-white">{label}</Link></li>)}
      </ul>
    </div>
  );
}
