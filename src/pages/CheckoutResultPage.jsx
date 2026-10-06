import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, ExternalLink, Loader2 } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { ROUTES } from '../constants';
import { getCheckout } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';

/** Trang kết quả: sau COD, sau khi quét QR, hoặc PayOS redirect về (?orderCode=). */
export default function CheckoutResultPage() {
  const [params] = useSearchParams();
  const code = params.get('code') || params.get('orderCode');
  const [data, setData] = useState(null);

  const paid = data?.paymentStatus === 'PAID';
  const cod = data?.paymentMethod === 'COD';
  const waiting = data && !paid && !cod && data.bookings.some((b) => b.status !== 'CANCELLED');

  useEffect(() => { if (code) getCheckout(code).then(setData).catch(() => setData(false)); }, [code]);
  // Đang chờ QR → hỏi lại mỗi 3s cho tới khi webhook PayOS báo đã trả
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => getCheckout(code).then(setData).catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [waiting, code]);

  if (waiting) return (
    <MainLayout>
      <div className="mx-auto max-w-md px-4 py-14 text-center">
        <h1 className="font-serif text-3xl">Quét mã để thanh toán</h1>
        <div className="card mt-6 p-6">
          {data.qrCode
            ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(data.qrCode)}`} alt="Mã QR thanh toán" className="mx-auto h-64 w-64" />
            : <p className="text-sm text-stone-500">Mở trang PayOS để lấy mã QR</p>}
          <p className="mt-4 text-lg font-semibold">{formatCurrency(data.totalAmount)}</p>
          <p className="text-sm text-stone-500">Mã đơn {data.checkoutCode}</p>
          {data.checkoutUrl && (
            <a href={data.checkoutUrl} target="_blank" rel="noreferrer" className="btn-wine mt-4 inline-flex items-center gap-2">
              <ExternalLink size={16} /> Mở trang thanh toán PayOS
            </a>
          )}
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-stone-500"><Loader2 size={16} className="animate-spin" /> Đang chờ thanh toán…</p>
        </div>
        <Link to={ROUTES.ACCOUNT} className="btn-ghost mt-6">Để sau, xem trong Đơn thuê của tôi</Link>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="mx-auto max-w-lg px-4 py-14 text-center">
        {data === null ? <p className="text-stone-500">Đang tải…</p> : data === false ? <p>Không tìm thấy đơn.</p> : (
          <>
            {paid || cod ? <CheckCircle2 className="mx-auto text-emerald-600" size={48} /> : <Clock className="mx-auto text-amber-600" size={48} />}
            <h1 className="mt-4 font-serif text-3xl">{paid ? 'Thanh toán thành công!' : cod ? (data.bookings.every((b) => b.kind === 'SALE') ? 'Đặt mua thành công!' : 'Đặt thuê thành công!') : 'Đơn đã huỷ'}</h1>
            <p className="mt-2 text-sm text-stone-500">
              {cod ? 'Bạn thanh toán khi nhận đồ. ' : ''}Chủ đồ sẽ xác nhận đơn sớm, theo dõi trạng thái trong mục Đơn hàng.
            </p>
            <ul className="card mt-6 divide-y divide-stone-100 text-left text-sm">
              {data.bookings.map((b) => (
                <li key={b.id} className="flex justify-between gap-3 p-4">
                  <span><b>{b.productName}</b><br /><span className="text-stone-500">{b.code} · {b.kind === 'SALE' ? 'Mua thanh lý' : `${formatDate(b.startDate)} → ${formatDate(b.endDate)}`}</span></span>
                  <span className="shrink-0">{formatCurrency(b.totalAmount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-semibold">Tổng: {formatCurrency(data.totalAmount)}</p>
            <Link to={ROUTES.ACCOUNT} className="btn-dark mt-6">Xem đơn hàng của tôi</Link>
          </>
        )}
      </div>
    </MainLayout>
  );
}
