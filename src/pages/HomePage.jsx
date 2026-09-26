import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, ShieldCheck, Sparkles } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import ProductCard from '../components/ProductCard';
import { ROUTES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { forYou, getMeta, searchProducts } from '../services/api';
import { missingProfile, useChat } from '../components/Chat';

export default function HomePage() {
  const [fresh, setFresh] = useState(null);
  const [popular, setPopular] = useState(null);
  const [categories, setCategories] = useState([]);
  const [mine, setMine] = useState(null);
  const { user } = useAuth();
  const { setOpen } = useChat();

  useEffect(() => {
    searchProducts({ sort: 'new', pageSize: 8 }).then((r) => setFresh(r.items)).catch(() => setFresh([]));
    searchProducts({ sort: 'popular', pageSize: 8 }).then((r) => setPopular(r.items)).catch(() => setPopular([]));
    getMeta().then((m) => setCategories(m.categories)).catch(() => {});
  }, []);
  useEffect(() => {
    if (user?.onboarded) forYou().then((r) => setMine(r.map((m) => m.product))).catch(() => setMine([]));
  }, [user?.onboarded]);

  const collage = (fresh || []).slice(0, 3);
  const missing = user ? missingProfile(user) : [];

  return (
    <MainLayout>
      {missing.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 text-amber-800">
          <p className="mx-auto max-w-6xl px-4 py-2.5 text-sm">
            Hồ sơ của bạn còn thiếu {missing.join(', ')}. <Link to={ROUTES.PROFILE} className="font-semibold underline">Cập nhật hồ sơ</Link> để
            trợ lý AI chọn đồ vừa người hơn và không phải hỏi lại mỗi lần.
          </p>
        </div>
      )}
      {/* ── Banner ── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-stone-300">
              <Sparkles size={13} /> Trợ lý AI chọn đồ theo dịp, số đo & ngân sách
            </p>
            <h1 className="font-serif text-4xl leading-tight md:text-6xl">
              Thích là diện,<br /><em className="text-wine-300">thuê là tiện.</em>
            </h1>
            <p className="mt-5 max-w-md text-stone-300">
              Prom, kỷ yếu, đám cưới hay buổi thuyết trình — kể cho AI nghe, nhận ngay 3-5 bộ vừa dáng để thuê theo ngày.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => setOpen(true)} className="btn bg-white px-6 py-3 text-ink hover:bg-wine-50">
                <Sparkles size={16} /> Tìm đồ cùng AI ngay
              </button>
              <Link to={ROUTES.PRODUCTS} className="btn border border-white/30 px-6 py-3 hover:bg-white/10">Xem kho đồ</Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`aspect-[3/4] overflow-hidden rounded-2xl bg-stone-800 ${i === 1 ? 'translate-y-6' : ''}`}>
                {collage[i]?.image && <img src={collage[i].image} alt="" className="h-full w-full object-cover" fetchPriority={i === 0 ? 'high' : 'auto'} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Loại trang phục ── */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-10">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {categories.map((c) => (
              <Link key={c} to={`${ROUTES.PRODUCTS}?category=${encodeURIComponent(c)}`} className="chip-off shrink-0 px-4 py-2 text-sm">{c}</Link>
            ))}
          </div>
        </section>
      )}

      {mine?.length > 0 && <Shelf title="Gợi ý cho bạn" subtitle="Theo hồ sơ của bạn" items={mine} more={ROUTES.PRODUCTS} />}
      <Shelf title="Đồ mới lên kệ" subtitle="New arrivals" items={fresh} more={`${ROUTES.PRODUCTS}?sort=new`} />
      <Shelf title="Đồ được thuê nhiều nhất" subtitle="Best sellers" items={popular} more={`${ROUTES.PRODUCTS}?sort=popular`} badge />

      {/* ── Quy trình ── */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [Sparkles, 'Kể cho AI', 'Chọn dịp, nhập chiều cao/cân nặng và mô tả phong cách bạn muốn.'],
            [CalendarCheck, 'Chọn ngày thuê', 'Lịch hiển thị ngày trống. Tiền thuê = giá/ngày × số ngày + tiền cọc.'],
            [ShieldCheck, 'Trả đồ, nhận lại cọc', 'Đồ được kiểm tra không hư hỏng → hoàn cọc vào tài khoản của bạn.'],
          ].map(([Icon, t, d]) => (
            <div key={t} className="card p-6">
              <Icon className="text-wine-600" size={22} />
              <h3 className="mt-4 font-semibold">{t}</h3>
              <p className="mt-1.5 text-sm text-stone-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="flex flex-col items-start gap-5 rounded-3xl bg-wine-700 p-8 text-white md:flex-row md:items-center md:justify-between md:p-12">
          <div>
            <h2 className="font-serif text-3xl">Tủ đồ đang nằm im?</h2>
            <p className="mt-2 text-wine-100">Đăng đồ cho thuê, admin duyệt trong 24h, nhận tiền mỗi lượt thuê.</p>
          </div>
          <Link to={ROUTES.NEW_PRODUCT} className="btn bg-white px-6 py-3 text-wine-800 hover:bg-wine-50">Đăng đồ cho thuê <ArrowRight size={16} /></Link>
        </div>
      </section>
    </MainLayout>
  );
}

function Shelf({ title, subtitle, items, more, badge }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-wine-600">{subtitle}</p>
          <h2 className="font-serif text-2xl md:text-3xl">{title}</h2>
        </div>
        <Link to={more} className="text-sm font-medium text-stone-600 hover:text-ink">Xem tất cả →</Link>
      </div>
      {items === null ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-stone-200" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">Chưa có sản phẩm.</p>
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {items.map((p, i) => (
            <div key={p.id} className="w-[46%] shrink-0 snap-start md:w-auto">
              <ProductCard p={p} badge={badge && i < 3 ? `Top ${i + 1}` : null} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
