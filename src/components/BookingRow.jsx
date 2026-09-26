import { Link } from 'react-router-dom';
import { BOOKING_STATUS, DEPOSIT_STATUS, PAYMENT_STATUS, ROUTES, TIMELINE } from '../constants';
import { formatCurrency, formatDate } from '../utils/format';

export const StatusBadge = ({ map, value }) => (
  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[value]?.tone || 'bg-stone-100'}`}>{map[value]?.label || value}</span>
);

const REFUND_LABEL = { PROCESSING: 'Chờ hoàn', SUCCEEDED: 'Đã hoàn' };
const REFUND_TONE = { PROCESSING: 'text-amber-700', SUCCEEDED: 'text-emerald-700', FAILED: 'font-semibold text-rose-600' };

/** Thanh tiến trình: Chờ xác nhận → Đang giao → Đang thuê → Đã trả đồ → Đã hoàn cọc */
function Timeline({ status }) {
  const pos = { PENDING: 0, CONFIRMED: 0, SHIPPING: 1, RENTED: 2, RETURNED: 3, DISPUTED: 3, COMPLETED: 4 }[status];
  if (pos === undefined) return null;
  return (
    <ol className="mt-3 grid grid-cols-5 gap-1">
      {TIMELINE.map((s, i) => (
        <li key={s}>
          <div className={`h-1 rounded-full ${i <= pos ? 'bg-wine-600' : 'bg-stone-200'}`} />
          <p className={`mt-1 text-[10px] leading-tight ${i <= pos ? 'text-ink' : 'text-stone-400'}`}>{BOOKING_STATUS[s].label}</p>
        </li>
      ))}
    </ol>
  );
}

export default function BookingRow({ b, showRenter, children }) {
  return (
    <li className="card p-4">
      <div className="flex gap-3">
        <Link to={ROUTES.PRODUCT(b.productId)} className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-200">
          {b.productImage && <img src={b.productImage} alt="" loading="lazy" className="h-full w-full object-cover" />}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-medium">{b.productName}</p>
            <StatusBadge map={BOOKING_STATUS} value={b.status} />
          </div>
          <p className="text-xs text-stone-500">{b.code} · {formatDate(b.startDate)} → {formatDate(b.endDate)} ({b.days} ngày)</p>
          <p className="mt-1 text-xs text-stone-600">
            Thuê {formatCurrency(b.rentAmount)} · Cọc {formatCurrency(b.depositAmount)}{b.shippingFee ? ` · Ship ${formatCurrency(b.shippingFee)}` : ''}
            {' · '}<b>{formatCurrency(b.totalAmount)}</b>
          </p>
          <p className="text-xs text-stone-500">
            {b.paymentMethod === 'COD' ? 'COD' : 'QR'} · {PAYMENT_STATUS[b.paymentStatus]} · {DEPOSIT_STATUS[b.depositStatus]}
            {b.deductionAmount > 0 && <span className="text-rose-600"> · Trừ cọc {formatCurrency(b.deductionAmount)}</span>}
            {b.refundAmount > 0 && (
              <span className={REFUND_TONE[b.refundStatus] || 'text-stone-600'}>
                {' · '}{REFUND_LABEL[b.refundStatus] || 'Hoàn'} {formatCurrency(b.refundAmount)}{b.refundBankName ? ` về ${b.refundBankName}` : ''}
              </span>
            )}
          </p>
          {showRenter && (
            <p className="mt-1 text-xs text-stone-500">
              {b.recipientName} · {b.phone} · {b.deliveryMethod === 'EXPRESS' ? 'Ship hoả tốc' : 'Tự đến lấy'} · {b.address}
              {showRenter === 'admin' && <> · Hoàn cọc: {b.refundBankAccount ? `${b.refundBankAccount} (${b.refundBankName || 'NH'})` : 'STK hồ sơ khách'}</>}
            </p>
          )}
          {b.note && <p className="mt-1 text-xs italic text-stone-500">“{b.note}”</p>}
          {b.adminNote && <p className="mt-1 text-xs text-rose-700">Ghi chú kiểm định: {b.adminNote}</p>}
        </div>
      </div>
      <Timeline status={b.status} />
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </li>
  );
}
