import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import { Row } from '../components/ui';
import RangeCalendar from '../components/RangeCalendar';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../components/Chat';
import { ROUTES } from '../constants';
import { getBlockedDates, getProduct } from '../services/api';
import { formatCurrency, formatDate, rentalDays } from '../utils/format';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { setOpen } = useChat();
  const [p, setP] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const [active, setActive] = useState(0);
  const [range, setRange] = useState({ start: null, end: null });

  useEffect(() => {
    setP(null); setActive(0); setRange({ start: null, end: null });
    getProduct(id).then(setP).catch(() => setP(false));
    getBlockedDates(id).then(setBlocked).catch(() => {});
  }, [id]);

  if (p === false) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <p className="text-stone-500">Không tìm thấy sản phẩm.</p>
          <Link to={ROUTES.PRODUCTS} className="btn-dark mt-6">Xem kho đồ</Link>
        </div>
      </MainLayout>
    );
  }
  if (!p) return <MainLayout><DetailSkeleton /></MainLayout>;

  const days = rentalDays(range.start, range.end);
  const isMine = user?.id === p.owner.id;
  const add = (go) => {
    if (!range.end) return toast.error('Chọn ngày nhận và ngày trả đồ trên lịch nhé');
    addItem({ ...p, image: p.images[0] }, range.start, range.end);
    if (go) navigate(ROUTES.CART);
  };
  const tagGroups = [['Màu sắc', p.colors], ['Phong cách', p.styles], ['Dịp phù hợp', p.occasions], ['Kiểu dáng', p.features]]
    .filter(([, list]) => list?.length);

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 md:pt-8">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-stone-500">
          <Link to={ROUTES.PRODUCTS} className="hover:text-ink">Danh mục</Link>
          <ChevronRight size={12} />
          <Link to={`${ROUTES.PRODUCTS}?category=${encodeURIComponent(p.category)}`} className="hover:text-ink">{p.category}</Link>
        </nav>

        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
          {/* ── Ảnh: dính khi cuộn trên desktop, vuốt ngang trên điện thoại ── */}
          <div className="md:sticky md:top-24 md:self-start">
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto md:mx-0 md:block md:overflow-visible"
              onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
              {p.images.map((src, i) => (
                <img key={src} src={src} alt={`${p.name} ${i + 1}`} loading={i ? 'lazy' : 'eager'} decoding="async"
                  className={`aspect-[4/5] w-full shrink-0 snap-center bg-stone-200 object-cover md:max-h-[calc(100dvh-9rem)] md:rounded-2xl ${i === active ? 'md:block' : 'md:hidden'}`} />
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-1.5 md:hidden">
              {p.images.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-ink' : 'w-1.5 bg-stone-300'}`} />)}
            </div>
            <div className="mt-3 hidden gap-2 md:flex">
              {p.images.map((src, i) => (
                <button key={src} onClick={() => setActive(i)} aria-label={`Ảnh ${i + 1}`}
                  className={`h-20 w-16 overflow-hidden rounded-lg ring-2 transition ${i === active ? 'ring-ink' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* ── Thông tin + đặt thuê ── */}
          <div className="min-w-0">
            <h1 className="font-serif text-3xl leading-tight md:text-4xl">{p.name}</h1>
            {p.reviews.length > 0 && (
              <p className="mt-2 flex items-center gap-1 text-sm text-stone-600">
                <Star size={14} className="fill-amber-400 text-amber-400" /> {p.avgRating.toFixed(1)} · {p.reviews.length} đánh giá · {p.rentCount} lượt thuê
              </p>
            )}

            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight">{formatCurrency(p.rentPricePerDay)}</span>
              <span className="text-stone-500">/ ngày</span>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              Cọc {formatCurrency(p.deposit)} ({p.depositPercent}% giá niêm yết), hoàn lại sau khi trả đồ
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-stone-200 py-5 text-sm sm:grid-cols-4">
              <Spec k="Size" v={p.size} />
              <Spec k="Độ mới" v={p.itemCondition} />
              <Spec k="Ngực-Eo-Mông tối đa" v={`${p.bustMax}-${p.waistMax}-${p.hipMax}`} />
              <Spec k="Giá niêm yết" v={formatCurrency(p.retailPrice)} />
            </dl>

            <div className="mt-5 space-y-3">
              {tagGroups.map(([label, list]) => (
                <div key={label} className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-sm">
                  <span className="w-24 shrink-0 text-xs text-stone-500">{label}</span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {list.map((t) => <span key={t} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700">{t}</span>)}
                  </div>
                </div>
              ))}
            </div>

            {/* Đặt thuê */}
            <section aria-label="Chọn ngày thuê" className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold">Chọn ngày nhận và trả đồ</h2>
              <RangeCalendar blocked={blocked} start={range.start} end={range.end} onChange={(start, end) => setRange({ start, end })} />
              {days > 0 && (
                <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-4 text-sm">
                  <Row k={`Nhận ${formatDate(range.start)} → trả ${formatDate(range.end)}`} v={`${days} ngày`} />
                  <Row k={`Tiền thuê (${formatCurrency(p.rentPricePerDay)} × ${days})`} v={formatCurrency(p.rentPricePerDay * days)} />
                  <Row k="Tiền cọc (hoàn lại)" v={formatCurrency(p.deposit)} />
                  <div className="border-t border-stone-100 pt-2 text-base"><Row k={<b>Tạm tính</b>} v={<b>{formatCurrency(p.rentPricePerDay * days + p.deposit)}</b>} /></div>
                </div>
              )}
              {isMine ? (
                <Link to={ROUTES.EDIT_PRODUCT(p.id)} className="btn-ghost mt-5 w-full py-3">Đây là đồ của bạn. Sửa thông tin</Link>
              ) : (
                <div className="sticky bottom-3 z-10 mt-5 grid grid-cols-2 gap-3 md:static">
                  <button onClick={() => add(false)} className="btn-ghost py-3 shadow-sm">Thêm vào giỏ</button>
                  <button onClick={() => add(true)} className="btn-wine py-3 shadow-sm">Thuê ngay</button>
                </div>
              )}
            </section>

            <ul className="mt-4 grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
              <li className="flex items-center gap-2"><ShieldCheck size={15} className="text-wine-600" /> Admin duyệt, giặt hấp trước mỗi lượt thuê</li>
              <li className="flex items-center gap-2"><Truck size={15} className="text-wine-600" /> Tự đến lấy hoặc ship hoả tốc</li>
            </ul>

            <button onClick={() => setOpen(true)} className="mt-6 flex w-full items-center gap-3 rounded-2xl bg-stone-100 p-4 text-left text-sm transition hover:bg-stone-200">
              <Sparkles size={18} className="shrink-0 text-wine-600" />
              <span><b>Chưa chắc vừa?</b> <span className="text-stone-600">Hỏi trợ lý AI theo số đo của bạn</span></span>
            </button>
          </div>
        </div>

        {/* ── Mô tả, chủ đồ, đánh giá ── */}
        <div className="mt-14 grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <h2 className="font-serif text-2xl">Mô tả</h2>
            <p className="mt-3 max-w-[65ch] whitespace-pre-line text-sm leading-relaxed text-stone-600">{p.description}</p>

            <h2 className="mt-10 font-serif text-2xl">Đánh giá</h2>
            {p.reviews.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">Chưa có đánh giá. Hãy là người đầu tiên thuê món này.</p>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {p.reviews.map((r, i) => (
                  <li key={i} className="rounded-2xl bg-white p-4 text-sm ring-1 ring-stone-200">
                    <p className="flex items-center justify-between gap-2 font-medium">{r.userName}<span className="text-amber-500">{'★'.repeat(r.rating)}</span></p>
                    {r.comment && <p className="mt-2 text-stone-600">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="h-fit rounded-2xl bg-white p-5 ring-1 ring-stone-200">
            <p className="text-xs text-stone-500">Chủ đồ</p>
            <div className="mt-3 flex items-center gap-3 text-sm">
              {p.owner.avatarUrl
                ? <img src={p.owner.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-11 w-11 rounded-full object-cover" />
                : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white">{p.owner.name[0]}</span>}
              <div><p className="font-medium">{p.owner.name}</p><p className="text-stone-500">Điểm uy tín {p.owner.trustScore}/100</p></div>
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}

const Spec = ({ k, v }) => (
  <div><dt className="text-xs text-stone-500">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
);

/** Khung chờ cùng bố cục với trang thật → không giật layout khi dữ liệu về. */
function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl animate-pulse gap-8 px-4 pt-12 md:grid-cols-2 lg:gap-12">
      <div className="aspect-[4/5] rounded-2xl bg-stone-200" />
      <div className="space-y-4">
        <div className="h-9 w-3/4 rounded-lg bg-stone-200" />
        <div className="h-8 w-1/3 rounded-lg bg-stone-200" />
        <div className="h-20 rounded-lg bg-stone-200" />
        <div className="h-72 rounded-2xl bg-stone-200" />
      </div>
    </div>
  );
}
