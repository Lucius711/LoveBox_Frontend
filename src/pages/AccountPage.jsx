import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import { Field, Tabs } from '../components/ui';
import BookingRow, { StatusBadge } from '../components/BookingRow';
import { useAuth } from '../context/AuthContext';
import { PRODUCT_STATUS, ROUTES } from '../constants';
import { useChat } from '../components/Chat';
import BankSelect from '../components/BankSelect';
import StyleProfileForm, { emptyProfile, toRequest } from '../components/StyleProfileForm';
import {
  becomeOwner, getMeta, saveStyleProfile, cancelBooking, errorMessage, hideProduct, myBookings, ownerBookings, ownerProducts,
  ownerSetStatus, ownerStats, reviewBooking, updateProfile,
} from '../services/api';
import { formatCurrency } from '../utils/format';

const TABS = [['bookings', 'Đơn thuê'], ['owner', 'Cho thuê'], ['profile', 'Hồ sơ']];

export default function AccountPage() {
  const [params] = useSearchParams();
  const tab = params.get('tab') || 'bookings';
  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-serif text-3xl">Tài khoản</h1>
        <Tabs items={TABS} active={tab} />
        <div className="mt-6">
          {tab === 'bookings' && <MyBookings />}
          {tab === 'owner' && <OwnerPanel />}
          {tab === 'profile' && <Profile />}
        </div>
      </div>
    </MainLayout>
  );
}

// ── Lịch sử thuê đồ ────────────────────────────────────────────────────
function MyBookings() {
  const { setOpen } = useChat();
  const [list, setList] = useState(null);
  const load = useCallback(() => myBookings().then(setList).catch(() => setList([])), []);
  useEffect(() => { load(); }, [load]);

  const act = (p, ok) => p.then(() => { toast.success(ok); load(); }).catch((e) => toast.error(errorMessage(e)));

  if (list === null) return <p className="text-stone-500">Đang tải…</p>;
  if (!list.length) return <p className="card p-8 text-center text-stone-500">Bạn chưa thuê món nào. <button onClick={() => setOpen(true)} className="underline">Tìm đồ cùng AI</button></p>;
  return (
    <ul className="space-y-4">
      {list.map((b) => (
        <BookingRow key={b.id} b={b}>
          {b.status === 'PENDING' && (
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => confirm('Huỷ đơn này?') && act(cancelBooking(b.id), 'Đã huỷ đơn')}>Huỷ đơn</button>
          )}
          {b.paymentMethod === 'PAYOS' && b.paymentStatus === 'UNPAID' && b.status === 'PENDING' && (
            <Link to={`/checkout/success?code=${b.checkoutCode}`} className="btn-wine px-3 py-1.5 text-xs">Tiếp tục thanh toán</Link>
          )}
          {['RETURNED', 'COMPLETED', 'DISPUTED'].includes(b.status) && !b.reviewed && <ReviewForm onSubmit={(body) => act(reviewBooking(b.id, body), 'Cảm ơn bạn đã đánh giá')} />}
        </BookingRow>
      ))}
    </ul>
  );
}

function ReviewForm({ onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  return (
    <form className="flex w-full flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); onSubmit({ rating, comment }); }}>
      <span className="text-xs text-stone-500">Đánh giá:</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} sao`} className={`text-lg ${n <= rating ? 'text-amber-400' : 'text-stone-300'}`}>★</button>
      ))}
      <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="Nhận xét (tuỳ chọn)" className="input min-w-0 flex-1 py-1.5" />
      <button className="btn-dark px-3 py-1.5 text-xs">Gửi</button>
    </form>
  );
}

// ── Chủ đồ ─────────────────────────────────────────────────────────────
const OWNER_ACTIONS = {
  PENDING: [['CONFIRMED', 'Xác nhận đơn'], ['CANCELLED', 'Từ chối']],
  CONFIRMED: [['SHIPPING', 'Đã gửi đi'], ['RENTED', 'Khách đã nhận']],
  SHIPPING: [['RENTED', 'Khách đã nhận']],
  RENTED: [['RETURNED', 'Đã nhận lại đồ']],
};

function OwnerPanel() {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const load = useCallback(() => {
    ownerStats().then(setStats).catch(() => {});
    ownerProducts().then(setProducts).catch(() => {});
    ownerBookings().then(setBookings).catch(() => {});
  }, []);
  useEffect(() => { if (isOwner) load(); }, [isOwner, load]);

  if (!isOwner) {
    return (
      <div className="card p-8 text-center">
        <h2 className="font-serif text-2xl">Cho thuê đồ trên Lentique</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">Đăng đồ kèm ảnh & số đo, admin duyệt trước khi hiển thị. Bạn nhận thông báo khi có người thuê, xác nhận đơn và theo dõi doanh thu tại đây.</p>
        <button className="btn-wine mt-5" onClick={() => becomeOwner().then(refreshUser).then(() => toast.success('Bạn đã là Chủ đồ!')).catch((e) => toast.error(errorMessage(e)))}>
          Trở thành Chủ đồ
        </button>
      </div>
    );
  }

  const act = (id, status) => ownerSetStatus(id, { status }).then(() => { toast.success('Đã cập nhật'); load(); }).catch((e) => toast.error(errorMessage(e)));
  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;

  return (
    <div className="space-y-8">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat k="Doanh thu thuê" v={formatCurrency(stats.revenue)} />
          <Stat k="Đơn chờ xác nhận" v={stats.pending} highlight={stats.pending > 0} />
          <Stat k="Đang cho thuê" v={stats.active} />
          <Stat k="Món đã đăng" v={stats.productCount} />
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Đơn thuê đồ của bạn {pendingCount > 0 && <span className="ml-1 rounded-full bg-wine-600 px-2 py-0.5 text-xs text-white">{pendingCount} mới</span>}</h2>
        </div>
        {bookings.length === 0 ? <p className="text-sm text-stone-500">Chưa có ai thuê.</p> : (
          <ul className="space-y-4">
            {bookings.map((b) => (
              <BookingRow key={b.id} b={b} showRenter>
                {(OWNER_ACTIONS[b.status] || []).map(([to, label]) => (
                  <button key={to} onClick={() => act(b.id, to)} className={to === 'CANCELLED' ? 'btn-ghost px-3 py-1.5 text-xs' : 'btn-dark px-3 py-1.5 text-xs'}>{label}</button>
                ))}
              </BookingRow>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Đồ của tôi</h2>
          <Link to={ROUTES.NEW_PRODUCT} className="btn-wine px-4 py-2"><Plus size={15} /> Đăng đồ cho thuê</Link>
        </div>
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <img src={p.image} alt="" loading="lazy" className="h-16 w-12 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <Link to={ROUTES.PRODUCT(p.id)} className="line-clamp-1 text-sm font-medium">{p.name}</Link>
                <p className="text-xs text-stone-500">{formatCurrency(p.rentPricePerDay)}/ngày · {p.rentCount} lượt thuê</p>
                {p.status === 'REJECTED' && p.rejectReason && <p className="text-xs text-rose-600">Lý do: {p.rejectReason}</p>}
              </div>
              <StatusBadge map={PRODUCT_STATUS} value={p.status} />
              <Link to={ROUTES.EDIT_PRODUCT(p.id)} className="text-xs underline">Sửa</Link>
              {p.status !== 'HIDDEN' && (
                <button className="text-xs text-stone-500 underline" onClick={() => confirm('Ẩn món này?') && hideProduct(p.id).then(load)}>Ẩn</button>
              )}
            </li>
          ))}
          {products.length === 0 && <li className="p-6 text-center text-sm text-stone-500">Chưa đăng món nào.</li>}
        </ul>
      </section>
    </div>
  );
}

const Stat = ({ k, v, highlight }) => (
  <div className={`card p-4 ${highlight ? 'ring-2 ring-wine-500' : ''}`}><p className="text-xs text-stone-500">{k}</p><p className="mt-1 text-lg font-semibold">{v}</p></div>
);

// ── Hồ sơ ──────────────────────────────────────────────────────────────
function Profile() {
  return (
    <div className="space-y-6">
      <StyleProfile />
      <ContactInfo />
    </div>
  );
}

/** Hồ sơ phong cách (đã trả lời lúc onboarding) — xem lại & sửa bất cứ lúc nào. */
function StyleProfile() {
  const { user, refreshUser } = useAuth();
  const [meta, setMeta] = useState(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() => emptyProfile(user?.styleProfile));
  useEffect(() => { getMeta().then(setMeta).catch(() => {}); }, []);

  const p = user?.styleProfile || {};
  const save = () => saveStyleProfile(toRequest(value)).then(refreshUser)
    .then(() => { toast.success('Đã cập nhật hồ sơ'); setEditing(false); }).catch((e) => toast.error(errorMessage(e)));

  const rows = [
    ['Dịp thường mặc', p.favOccasions?.join(', ')],
    ['Chiều cao / cân nặng', p.heightCm && p.weightKg ? `${p.heightCm} cm · ${p.weightKg} kg` : null],
    ['Size hay mặc', p.clothingSize],
    ['Số đo 3 vòng', p.bust || p.waist || p.hip ? `${p.bust ?? '–'} - ${p.waist ?? '–'} - ${p.hip ?? '–'}` : null],
    ['Phong cách thích', p.favStyles?.join(', ')],
    ['Màu yêu thích', p.favColors?.join(', ')],
    ['Ngân sách / ngày', p.budgetMax ? `≤ ${formatCurrency(p.budgetMax)}` : null],
    ['Lưu ý vóc dáng', p.fitNote],
  ];

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Hồ sơ phong cách</h2>
          <p className="text-xs text-stone-500">Trợ lý AI dùng để chọn size, lọc theo ngân sách và ưu tiên đồ hợp gu bạn.</p>
        </div>
        {!editing && <button onClick={() => { setValue(emptyProfile(user?.styleProfile)); setEditing(true); }} className="btn-ghost px-4 py-2">Chỉnh sửa</button>}
      </div>
      {editing ? (
        meta && (
          <>
            <StyleProfileForm meta={meta} value={value} onChange={setValue} />
            <div className="mt-6 flex gap-2">
              <button onClick={save} className="btn-dark">Lưu thay đổi</button>
              <button onClick={() => setEditing(false)} className="btn-ghost">Huỷ</button>
            </div>
          </>
        )
      ) : (
        <dl className="divide-y divide-stone-100 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-4 py-2.5">
              <dt className="w-40 shrink-0 text-stone-500">{k}</dt>
              <dd className={v ? '' : 'text-stone-400'}>{v || 'Chưa có'}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function ContactInfo() {
  const { user, refreshUser } = useAuth();
  const [banks, setBanks] = useState([]);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '', bankAccount: user?.bankAccount || '', bankName: user?.bankName || '' });
  useEffect(() => { getMeta().then((m) => setBanks(m.banks)).catch(() => {}); }, []);
  const f = (k) => ({ value: form[k], onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const save = (e) => {
    e.preventDefault();
    updateProfile(form).then(refreshUser).then(() => toast.success('Đã lưu')).catch((err) => toast.error(errorMessage(err)));
  };
  return (
    <form onSubmit={save} className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <h2 className="font-semibold">Thông tin liên hệ & nhận hoàn cọc</h2>
        <span className="text-stone-500">{user?.email} · {{ RENTER: 'Khách thuê', OWNER: 'Chủ đồ', ADMIN: 'Admin' }[user?.role]} · Uy tín <b>{user?.trustScore}</b>/100</span>
      </div>
      <Field label="Họ tên"><input className="input" maxLength={255} {...f('name')} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Số điện thoại"><input className="input" pattern="0\d{9,10}" inputMode="tel" {...f('phone')} /></Field>
        <Field label="Địa chỉ"><input className="input" maxLength={500} {...f('address')} /></Field>
        <Field label="STK nhận hoàn cọc"><input className="input" pattern="\d{6,20}" inputMode="numeric" {...f('bankAccount')} /></Field>
        <Field label="Ngân hàng"><BankSelect banks={banks} {...f('bankName')} /></Field>
      </div>
      <button className="btn-dark">Lưu thông tin</button>
    </form>
  );
}
