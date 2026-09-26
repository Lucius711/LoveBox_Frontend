import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import { Row } from '../components/ui';
import RangeCalendar from '../components/RangeCalendar';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants';
import { getBlockedDates, getProduct } from '../services/api';
import { formatCurrency, formatDate, rentalDays } from '../utils/format';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const [active, setActive] = useState(0);
  const [range, setRange] = useState({ start: null, end: null });

  useEffect(() => {
    setP(null); setActive(0); setRange({ start: null, end: null });
    getProduct(id).then(setP).catch(() => setP(false));
    getBlockedDates(id).then(setBlocked).catch(() => {});
  }, [id]);

  if (p === false) return <MainLayout><p className="py-24 text-center text-stone-500">Không tìm thấy sản phẩm.</p></MainLayout>;
  if (!p) return <MainLayout><div className="mx-auto my-10 h-96 max-w-6xl animate-pulse rounded-3xl bg-stone-200" /></MainLayout>;

  const days = rentalDays(range.start, range.end);
  const isMine = user?.id === p.owner.id;
  const add = (go) => {
    if (!range.end) return toast.error('Chọn ngày nhận và ngày trả đồ trên lịch nhé');
    addItem({ ...p, image: p.images[0] }, range.start, range.end);
    if (go) navigate(ROUTES.CART);
  };

  return (
    <MainLayout>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 md:grid-cols-2 md:py-10">
        {/* Ảnh */}
        <div>
          <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-3xl md:block"
            onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
            {p.images.map((src, i) => (
              <img key={src} src={src} alt={`${p.name} ${i + 1}`} loading={i ? 'lazy' : 'eager'} decoding="async"
                className={`aspect-[3/4] w-full shrink-0 snap-center object-cover md:rounded-3xl ${i === active ? 'md:block' : 'md:hidden'}`} />
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-1.5 md:hidden">
            {p.images.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-ink' : 'w-1.5 bg-stone-300'}`} />)}
          </div>
          <div className="mt-3 hidden gap-2 md:flex">
            {p.images.map((src, i) => (
              <button key={src} onClick={() => setActive(i)} className={`h-20 w-16 overflow-hidden rounded-xl border-2 ${i === active ? 'border-ink' : 'border-transparent'}`}>
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Thông tin */}
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500">{p.category}</p>
          <h1 className="mt-1 font-serif text-3xl leading-tight">{p.name}</h1>
          {p.reviews.length > 0 && (
            <p className="mt-2 flex items-center gap-1 text-sm text-stone-600">
              <Star size={14} className="fill-amber-400 text-amber-400" /> {p.avgRating.toFixed(1)} · {p.reviews.length} đánh giá · {p.rentCount} lượt thuê
            </p>
          )}
          <p className="mt-4 text-2xl font-semibold">{formatCurrency(p.rentPricePerDay)}<span className="text-base font-normal text-stone-500"> / ngày</span></p>
          <p className="text-sm text-stone-500">Cọc bảo đảm {formatCurrency(p.deposit)} ({p.depositPercent}% giá niêm yết) — hoàn lại sau khi trả đồ</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Spec k="Size" v={p.size} />
            <Spec k="Độ mới" v={p.itemCondition} />
            <Spec k="Ngực-Eo-Mông tối đa" v={`${p.bustMax}-${p.waistMax}-${p.hipMax}`} />
            <Spec k="Giá niêm yết" v={formatCurrency(p.retailPrice)} />
          </dl>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {[...p.colors, ...p.styles, ...p.occasions, ...p.features].map((t) => (
              <span key={t} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">{t}</span>
            ))}
          </div>

          <div className="card mt-6 p-4">
            <RangeCalendar blocked={blocked} start={range.start} end={range.end} onChange={(start, end) => setRange({ start, end })} />
            {days > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-4 text-sm">
                <Row k={`Nhận ${formatDate(range.start)} → trả ${formatDate(range.end)}`} v={`${days} ngày`} />
                <Row k={`Tiền thuê (${formatCurrency(p.rentPricePerDay)} × ${days})`} v={formatCurrency(p.rentPricePerDay * days)} />
                <Row k="Tiền cọc (hoàn lại)" v={formatCurrency(p.deposit)} />
                <Row k={<b>Tạm tính</b>} v={<b>{formatCurrency(p.rentPricePerDay * days + p.deposit)}</b>} />
              </div>
            )}
          </div>

          {isMine ? (
            <Link to={ROUTES.EDIT_PRODUCT(p.id)} className="btn-ghost mt-5 w-full py-3">Đây là đồ của bạn — Sửa thông tin</Link>
          ) : (
            <div className="sticky bottom-3 z-10 mt-5 flex gap-3 md:static">
              <button onClick={() => add(false)} className="btn-ghost flex-1 py-3 shadow-sm">Thêm vào giỏ</button>
              <button onClick={() => add(true)} className="btn-wine flex-1 py-3 shadow-sm">Thuê ngay</button>
            </div>
          )}

          <div className="mt-8">
            <h2 className="font-semibold">Mô tả</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-600">{p.description}</p>
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-stone-100 p-4 text-sm">
            {p.owner.avatarUrl
              ? <img src={p.owner.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover" />
              : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white">{p.owner.name[0]}</span>}
            <div><p className="font-medium">{p.owner.name}</p><p className="text-stone-500">Điểm uy tín {p.owner.trustScore}/100</p></div>
          </div>

          {p.reviews.length > 0 && (
            <div className="mt-8">
              <h2 className="font-semibold">Đánh giá</h2>
              <ul className="mt-3 space-y-4">
                {p.reviews.map((r, i) => (
                  <li key={i} className="border-b border-stone-100 pb-4 text-sm">
                    <p className="font-medium">{r.userName} <span className="text-amber-500">{'★'.repeat(r.rating)}</span></p>
                    {r.comment && <p className="mt-1 text-stone-600">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

const Spec = ({ k, v }) => (
  <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200"><dt className="text-[11px] text-stone-500">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
);
