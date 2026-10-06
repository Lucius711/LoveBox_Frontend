import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import { Tabs } from '../components/ui';
import BookingRow from '../components/BookingRow';
import { BOOKING_STATUS, ROUTES } from '../constants';
import { adminBookings, adminOwnerApplications, adminReviewOwnerApplication, adminProducts, adminConfirmRefund, adminReviewProduct, adminSetStatus, adminStats, adminTraffic, errorMessage } from '../services/api';
import { formatCurrency, isSale } from '../utils/format';

const TABS = [['traffic', 'Truy cập & đặt thuê'], ['products', 'Duyệt đồ'], ['owners', 'Đơn Chủ đồ'], ['bookings', 'Đơn & tranh chấp'], ['money', 'Dòng tiền']];

export default function AdminPage() {
  const [params] = useSearchParams();
  const tab = params.get('tab') || 'traffic';
  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-serif text-3xl">Quản trị</h1>
        <Tabs items={TABS} active={tab} />
        <div className="mt-6">
          {tab === 'traffic' && <Traffic />}
          {tab === 'products' && <Moderation />}
          {tab === 'owners' && <OwnerApplications />}
          {tab === 'bookings' && <Bookings />}
          {tab === 'money' && <Money />}
        </div>
      </div>
    </MainLayout>
  );
}

// ── Người truy cập web vs người thực sự đặt thuê ─────────────────────────
function Traffic() {
  const [days, setDays] = useState(7);
  const [s, setS] = useState(null);
  useEffect(() => { setS(null); adminTraffic(days).then(setS).catch(() => setS({ total: {}, daily: [] })); }, [days]);
  const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');
  const today = s?.daily[0] || {};
  const max = Math.max(1, ...(s?.daily || []).map((d) => d.visitors));
  return (
    <>
      <div className="mb-4 flex gap-2">
        {[[1, 'Hôm nay'], [7, '7 ngày'], [30, '30 ngày'], [90, '90 ngày']].map(([n, l]) => (
          <button key={n} onClick={() => setDays(n)} className={days === n ? 'chip-on' : 'chip-off'}>{l}</button>
        ))}
      </div>
      {!s ? <p className="text-stone-500">Đang tải…</p> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Người truy cập', s.total.visitors],
              ['Người đặt thuê', s.total.renters],
              ['Tỉ lệ chuyển đổi', pct(s.total.renters, s.total.visitors)],
              ['Số đơn đã thanh toán', s.total.bookings],
            ].map(([k, v]) => <div key={k} className="card p-4"><p className="text-xs text-stone-500">{k}</p><p className="mt-1 text-2xl font-semibold">{v ?? 0}</p></div>)}
          </div>
          <p className="mt-2 text-xs text-stone-500">Hôm nay: {today.visitors ?? 0} người truy cập · {today.renters ?? 0} người đặt thuê. Người truy cập tính theo trình duyệt, 1 lần/ngày.</p>
          {days > 1 && (
            <div className="mt-4 overflow-x-auto">{/* điện thoại: bảng 5 cột cuộn ngang trong khung, không làm tràn trang */}
            <table className="card w-full min-w-[34rem] text-sm">
              <thead><tr className="text-left text-xs text-stone-500"><th className="p-3">Ngày</th><th className="p-3">Truy cập</th><th className="p-3">Đặt thuê</th><th className="p-3">Đơn</th><th className="p-3">Chuyển đổi</th></tr></thead>
              <tbody>
                {s.daily.map((d) => (
                  <tr key={d.day} className="border-t border-stone-100">
                    <td className="p-3 whitespace-nowrap">{d.day}</td>
                    <td className="p-3"><div className="flex items-center gap-2"><span className="w-8">{d.visitors}</span><span className="h-2 rounded bg-stone-800" style={{ width: `${(d.visitors / max) * 120}px` }} /></div></td>
                    <td className="p-3">{d.renters}</td>
                    <td className="p-3">{d.bookings}</td>
                    <td className="p-3">{pct(d.renters, d.visitors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Kiểm duyệt đồ đăng lên (tránh hàng giả / kém chất lượng) ────────────
function Moderation() {
  const [list, setList] = useState(null);
  const load = useCallback(() => adminProducts('PENDING').then(setList).catch(() => setList([])), []);
  useEffect(() => { load(); }, [load]);

  const decide = (id, approve) => {
    const reason = approve ? null : prompt('Lý do từ chối (chủ đồ sẽ thấy):');
    if (!approve && !reason) return;
    adminReviewProduct(id, { approve, reason }).then(() => { toast.success(approve ? 'Đã duyệt' : 'Đã từ chối'); load(); })
      .catch((e) => toast.error(errorMessage(e)));
  };

  if (list === null) return <p className="text-stone-500">Đang tải…</p>;
  if (!list.length) return <p className="card p-8 text-center text-stone-500">Không có món nào chờ duyệt.</p>;
  return (
    <ul className="space-y-4">
      {list.map((p) => (
        <li key={p.id} className="card p-4">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {p.images.map((src) => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" loading="lazy" className="h-40 w-28 shrink-0 rounded-lg object-cover" /></a>)}
          </div>
          <div className="mt-3 text-sm">
            <Link to={ROUTES.PRODUCT(p.id)} className="font-semibold">{p.name}</Link>
            <p className="text-stone-500">{p.category} · Size {p.size} · {p.bustMax}-{p.waistMax}-{p.hipMax} · {p.itemCondition} · Chủ: {p.owner.name} (uy tín {p.owner.trustScore})</p>
            <p className="mt-1">{isSale(p)
              ? <><b>Thanh lý</b> · Giá gốc {formatCurrency(p.retailPrice)} · Giá bán {formatCurrency(p.salePrice)}</>
              : <>Niêm yết {formatCurrency(p.retailPrice)} · Thuê {formatCurrency(p.rentPricePerDay)}/ngày · Cọc {p.depositPercent}% = {formatCurrency(p.deposit)}</>}</p>
            <p className="mt-1 text-stone-600">{p.description}</p>
            <p className="mt-1 text-xs text-stone-500">{[...p.colors, ...p.styles, ...p.occasions, ...p.features].join(' · ')}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => decide(p.id, true)} className="btn-dark px-4 py-2">Duyệt</button>
            <button onClick={() => decide(p.id, false)} className="btn-ghost px-4 py-2">Từ chối</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Đơn đăng ký làm Chủ đồ: duyệt → khách thành Chủ đồ; từ chối kèm lý do ─
function OwnerApplications() {
  const [list, setList] = useState(null);
  const load = useCallback(() => adminOwnerApplications('PENDING').then(setList).catch(() => setList([])), []);
  useEffect(() => { load(); }, [load]);

  const decide = (id, approve) => {
    const reason = approve ? null : prompt('Lý do từ chối (người gửi sẽ thấy):');
    if (!approve && !reason) return;
    adminReviewOwnerApplication(id, { approve, reason }).then(() => { toast.success(approve ? 'Đã duyệt Chủ đồ' : 'Đã từ chối'); load(); })
      .catch((e) => toast.error(errorMessage(e)));
  };

  if (list === null) return <p className="text-stone-500">Đang tải…</p>;
  if (!list.length) return <p className="card p-8 text-center text-stone-500">Không có đơn đăng ký Chủ đồ nào chờ duyệt.</p>;
  return (
    <ul className="space-y-4">
      {list.map((a) => (
        <li key={a.id} className="card p-4 text-sm">
          <p className="font-semibold">{a.userName} <span className="font-normal text-stone-500">· {a.userEmail}</span></p>
          <p className="text-stone-500">SĐT {a.phone} · {a.address} · STK {a.bankAccount} ({a.bankName}) · Gửi {new Date(a.createdAt).toLocaleString('vi-VN')}</p>
          <p className="mt-2 whitespace-pre-line text-stone-700">{a.intro}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => decide(a.id, true)} className="btn-dark px-4 py-2">Duyệt</button>
            <button onClick={() => decide(a.id, false)} className="btn-ghost px-4 py-2">Từ chối</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Đơn thuê, kiểm định trả đồ, tranh chấp ──────────────────────────────
const ACTIONS = {
  PENDING: [['CONFIRMED', 'Xác nhận'], ['CANCELLED', 'Huỷ']],
  CONFIRMED: [['SHIPPING', 'Đang giao'], ['RENTED', 'Khách đã nhận'], ['CANCELLED', 'Huỷ']],
  SHIPPING: [['RENTED', 'Khách đã nhận'], ['CANCELLED', 'Huỷ']],
  RENTED: [['RETURNED', 'Đã nhận lại đồ']],
  RETURNED: [['COMPLETED', 'Kiểm định OK → Hoàn cọc'], ['DISPUTED', 'Hư hỏng → Tranh chấp']],
  DISPUTED: [['COMPLETED', 'Chốt & hoàn phần cọc còn lại']],
};

// Đơn mua đồ thanh lý: giao xong là hoàn tất, không kiểm định / hoàn cọc
const SALE_ACTIONS = {
  PENDING: [['CONFIRMED', 'Xác nhận'], ['CANCELLED', 'Huỷ']],
  CONFIRMED: [['SHIPPING', 'Đang giao'], ['COMPLETED', 'Khách đã nhận'], ['CANCELLED', 'Huỷ']],
  SHIPPING: [['COMPLETED', 'Khách đã nhận'], ['CANCELLED', 'Huỷ']],
};

function Bookings() {
  const [status, setStatus] = useState('');
  const [list, setList] = useState(null);
  const load = useCallback(() => adminBookings(status || undefined).then(setList).catch(() => setList([])), [status]);
  useEffect(() => { load(); }, [load]);

  const act = (b, to) => {
    const body = { status: to };
    if (to === 'DISPUTED') {
      const amount = prompt(`Số tiền trừ cọc (tối đa ${b.depositAmount}):`, '0');
      if (amount === null) return;
      body.deductionAmount = Math.max(0, Number(amount) || 0);
      body.note = prompt('Mô tả hư hỏng / tranh chấp:') || '';
    }
    if (to === 'CANCELLED' && !confirm(b.paymentStatus === 'PAID' && b.paymentMethod === 'PAYOS'
      ? `Huỷ đơn? Khách đã trả ${formatCurrency(b.totalAmount)} qua QR — đơn sẽ chờ bạn chuyển khoản hoàn lại thủ công.` : 'Huỷ đơn này?')) return;
    if (to === 'COMPLETED' && !isSale(b) && !confirm(`Hoàn ${formatCurrency(b.depositAmount - b.deductionAmount)} tiền cọc về ${b.refundBankAccount ? `${b.refundBankName || ''} ${b.refundBankAccount}` : 'STK trong hồ sơ khách'}. Bạn sẽ tự chuyển khoản rồi bấm "Đã chuyển khoản". Tiếp tục?`)) return;
    adminSetStatus(b.id, body).then(() => { toast.success('Đã cập nhật'); load(); }).catch((e) => toast.error(errorMessage(e)));
  };

  // Hoàn tiền làm tay: admin chuyển khoản trong app ngân hàng rồi xác nhận ở đây
  const confirmRefund = (b) => {
    const ref = prompt(`Đã chuyển ${formatCurrency(b.refundAmount)} về ${b.refundBankName || ''} ${b.refundBankAccount}?\nMã giao dịch ngân hàng (tuỳ chọn):`, '');
    if (ref === null) return;
    adminConfirmRefund(b.id, ref).then(() => { toast.success('Đã ghi nhận hoàn tiền'); load(); }).catch((e) => toast.error(errorMessage(e)));
  };

  return (
    <>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {[['', 'Tất cả'], ...Object.entries(BOOKING_STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`shrink-0 ${status === k ? 'chip-on' : 'chip-off'}`}>{l}</button>
        ))}
      </div>
      {list === null ? <p className="text-stone-500">Đang tải…</p> : !list.length ? <p className="text-sm text-stone-500">Không có đơn.</p> : (
        <ul className="space-y-4">
          {list.map((b) => (
            <BookingRow key={b.id} b={b} showRenter="admin">
              {((isSale(b) ? SALE_ACTIONS : ACTIONS)[b.status] || []).map(([to, label]) => (
                <button key={to} onClick={() => act(b, to)} className={['CANCELLED', 'DISPUTED'].includes(to) ? 'btn-ghost px-3 py-1.5 text-xs' : 'btn-dark px-3 py-1.5 text-xs'}>{label}</button>
              ))}
              {b.refundStatus === 'PROCESSING' && <button onClick={() => confirmRefund(b)} className="btn-wine px-3 py-1.5 text-xs">Đã chuyển khoản</button>}
            </BookingRow>
          ))}
        </ul>
      )}
    </>
  );
}

// ── Dòng tiền ──────────────────────────────────────────────────────────
function Money() {
  const [s, setS] = useState(null);
  useEffect(() => { adminStats().then(setS).catch(() => {}); }, []);
  if (!s) return <p className="text-stone-500">Đang tải…</p>;
  const cards = [
    ['Cọc đang giữ (Hold)', formatCurrency(s.depositsHeld)],
    ['Cọc đã hoàn', formatCurrency(s.depositsRefunded)],
    ['Cọc bị trừ (hư hỏng)', formatCurrency(s.depositsForfeited)],
    ['Doanh thu thuê đã thu', formatCurrency(s.rentRevenue)],
    ['Chưa thu (COD / chờ QR)', formatCurrency(s.unpaid)],
    ['Đồ chờ duyệt', s.pendingProducts],
    ['Chờ chuyển khoản hoàn tiền', s.refundsPending],
    ['Tranh chấp đang mở', s.disputes],
    ['Tổng số đơn', s.totalBookings],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map(([k, v]) => <div key={k} className="card p-4"><p className="text-xs text-stone-500">{k}</p><p className="mt-1 text-lg font-semibold">{v}</p></div>)}
    </div>
  );
}
