import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { ROUTES } from '../constants';
import { getCheckout } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';

/** Trang kết quả: sau COD, sau khi quét QR, hoặc PayOS redirect về (?orderCode=). */
export default function CheckoutResultPage() {
  const [params] = useSearchParams();
  const code = params.get('code') || params.get('orderCode');
  const [data, setData] = useState(null);

  useEffect(() => { if (code) getCheckout(code).then(setData).catch(() => setData(false)); }, [code]);

  const paid = data?.paymentStatus === 'PAID';
  const cod = data?.paymentMethod === 'COD';
  return (
    <MainLayout>
      <div className="mx-auto max-w-lg px-4 py-14 text-center">
        {data === null ? <p className="text-stone-500">Đang tải…</p> : data === false ? <p>Không tìm thấy đơn.</p> : (
          <>
            {paid || cod ? <CheckCircle2 className="mx-auto text-emerald-600" size={48} /> : <Clock className="mx-auto text-amber-600" size={48} />}
            <h1 className="mt-4 font-serif text-3xl">{paid ? 'Thanh toán thành công!' : cod ? 'Đặt thuê thành công!' : 'Đơn đang chờ thanh toán'}</h1>
            <p className="mt-2 text-sm text-stone-500">
              {cod ? 'Bạn thanh toán khi nhận đồ. ' : ''}Chủ đồ sẽ xác nhận đơn sớm — theo dõi trạng thái trong mục Đơn thuê.
            </p>
            <ul className="card mt-6 divide-y divide-stone-100 text-left text-sm">
              {data.bookings.map((b) => (
                <li key={b.id} className="flex justify-between gap-3 p-4">
                  <span><b>{b.productName}</b><br /><span className="text-stone-500">{b.code} · {formatDate(b.startDate)} → {formatDate(b.endDate)}</span></span>
                  <span className="shrink-0">{formatCurrency(b.totalAmount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-semibold">Tổng: {formatCurrency(data.totalAmount)}</p>
            <Link to={ROUTES.ACCOUNT} className="btn-dark mt-6">Xem đơn thuê của tôi</Link>
          </>
        )}
      </div>
    </MainLayout>
  );
}
