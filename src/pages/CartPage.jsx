import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Trash2 } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Row } from '../components/ui';
import RangeCalendar from '../components/RangeCalendar';
import { useCart } from '../context/CartContext';
import { ROUTES } from '../constants';
import { useChat } from '../components/Chat';
import { getBlockedDates } from '../services/api';
import { cartTotals, formatCurrency, formatDate, itemAmount, rentalDays, todayISO } from '../utils/format';

export default function CartPage() {
  const { setOpen } = useChat();
  const { items, updateItem, removeItem } = useCart();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);   // productId đang mở lịch
  const [blocked, setBlocked] = useState({});

  const openCalendar = (id) => {
    setEditing(editing === id ? null : id);
    if (!blocked[id]) getBlockedDates(id).then((d) => setBlocked((b) => ({ ...b, [id]: d }))).catch(() => {});
  };

  const stale = (i) => i.startDate && i.startDate < todayISO();
  const ready = items.length > 0 && items.every((i) => i.sale || (i.endDate && !stale(i)));
  const { rent, deposit } = cartTotals(items.filter((i) => i.sale || i.endDate));

  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-serif text-3xl">Giỏ đồ</h1>
        {items.length === 0 ? (
          <div className="card mt-6 p-10 text-center">
            <p className="text-stone-500">Giỏ đang trống.</p>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={() => setOpen(true)} className="btn-wine">Tìm đồ cùng AI</button>
              <Link to={ROUTES.PRODUCTS} className="btn-ghost">Xem kho đồ</Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
            <ul className="space-y-4">
              {items.map((i) => {
                const days = rentalDays(i.startDate, i.endDate);
                return (
                  <li key={i.productId} className="card p-4">
                    <div className="flex gap-4">
                      <Link to={ROUTES.PRODUCT(i.productId)} className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                        {i.image && <img src={i.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link to={ROUTES.PRODUCT(i.productId)} className="line-clamp-2 text-sm font-medium">{i.name}</Link>
                          <button onClick={() => removeItem(i.productId)} aria-label="Xoá" className="text-stone-400 hover:text-rose-600"><Trash2 size={16} /></button>
                        </div>
                        {i.sale ? (
                          <>
                            <p className="text-xs text-stone-500">Size {i.size} · <span className="font-semibold text-ink">Mua thanh lý</span>, không cần trả lại</p>
                            <p className="mt-2 text-sm font-semibold">{formatCurrency(i.salePrice)}</p>
                          </>
                        ) : (<>
                        <p className="text-xs text-stone-500">Size {i.size} · {formatCurrency(i.rentPricePerDay)}/ngày · cọc {formatCurrency(i.deposit)}</p>
                        <button onClick={() => openCalendar(i.productId)}
                          className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${i.endDate && !stale(i) ? 'bg-stone-100' : 'bg-amber-100 text-amber-800'}`}>
                          <CalendarDays size={13} />
                          {i.endDate ? `${formatDate(i.startDate)} → ${formatDate(i.endDate)} (${days} ngày)` : 'Chọn ngày nhận & trả đồ'}
                        </button>
                        {stale(i) && <p className="mt-1 text-xs text-rose-600">Ngày nhận đã qua, chọn lại nhé.</p>}
                        {i.endDate && <p className="mt-2 text-sm font-semibold">{formatCurrency(itemAmount(i))}</p>}
                        </>)}
                      </div>
                    </div>
                    {editing === i.productId && (
                      <div className="mt-4 border-t border-stone-100 pt-4">
                        <RangeCalendar blocked={blocked[i.productId] || []} start={i.startDate} end={i.endDate}
                          onChange={(startDate, endDate) => { updateItem(i.productId, { startDate, endDate }); if (endDate) setEditing(null); }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <aside className="card h-fit space-y-2 p-5 text-sm md:sticky md:top-24">
              <Row k="Tiền đồ (thuê / mua)" v={formatCurrency(rent)} />
              {deposit > 0 && <Row k="Tiền cọc bảo đảm" v={formatCurrency(deposit)} />}
              <Row k="Phí vận chuyển" v="Tính ở bước sau" />
              <div className="border-t border-stone-100 pt-2"><Row k={<b>Tạm tính</b>} v={<b>{formatCurrency(rent + deposit)}</b>} /></div>
              {deposit > 0 && <p className="text-xs text-stone-500">Tiền cọc được hệ thống giữ và hoàn lại sau khi bạn trả đồ, kiểm tra không hư hỏng.</p>}
              <button disabled={!ready} onClick={() => navigate(ROUTES.CHECKOUT)} className="btn-wine mt-2 w-full py-3">Tiến hành đặt hàng</button>
              {!ready && <p className="text-center text-xs text-amber-700">Chọn ngày thuê cho tất cả món trước nhé</p>}
            </aside>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

