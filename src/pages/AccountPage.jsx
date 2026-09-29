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
  applyOwner, myOwnerApplication, getMeta, saveStyleProfile, cancelBooking, errorMessage, hideProduct, myBookings, ownerBookings, ownerProducts,
  ownerSetStatus, ownerStats, reviewBooking, updateProfile,
} from '../services/api';
import { formatCurrency } from '../utils/format';

const TABS = [['bookings', 'Đơn thuê'], ['owner', 'Cho thuê'], ['profile', 'Hồ sơ']];
const RENTER_TABS = [['bookings', 'Đơn thuê'], ['owner', 'Đăng ký Chủ đồ'], ['profile', 'Hồ sơ']];

export default function AccountPage() {
  const [params] = useSearchParams();
  const role = useAuth().user?.role;
  const isAdmin = role === 'ADMIN';   // admin chỉ duyệt: không có Đơn thuê / Cho thuê, chỉ Hồ sơ
  const tab = isAdmin ? 'profile' : params.get('tab') || 'bookings';
  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-serif text-3xl">Tài khoản</h1>
        <Tabs items={isAdmin ? TABS.filter(([k]) => k === 'profile') : role === 'OWNER' ? TABS : RENTER_TABS} active={tab} />
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

/** Khách thuê gửi đơn làm Chủ đồ → admin duyệt. Chưa gửi / bị từ chối: hiện form; đang chờ: hiện trạng thái. */
function OwnerApply() {
  const { user, refreshUser } = useAuth();
  const [app, setApp] = useState(undefined);   // undefined = đang tải, null = chưa gửi
  const [banks, setBanks] = useState([]);
  const [form, setForm] = useState({ phone: user?.phone || '', address: user?.address || '', bankAccount: user?.bankAccount || '', bankName: user?.bankName || '', intro: '', agreed: false });
  useEffect(() => {
    myOwnerApplication().then((a) => {
      setApp(a ?? null);   // chưa gửi đơn: API bỏ trường data (null) → undefined
      if (a?.status === 'APPROVED') refreshUser();   // vừa được duyệt → tải lại role để mở tab Cho thuê
      if (a?.status === 'REJECTED') setForm((f) => ({ ...f, ...a, agreed: false }));
    }).catch(() => setApp(null));
    getMeta().then((m) => setBanks(m.banks)).catch(() => {});
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps -- chỉ tải 1 lần khi mở tab
  const f = (k) => ({ value: form[k], onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const submit = (e) => {
    e.preventDefault();
    const { phone, address, bankAccount, bankName, intro, agreed } = form;
    applyOwner({ phone, address, bankAccount, bankName, intro, agreed })
      .then((a) => { setApp(a); toast.success('Đã gửi đơn, admin sẽ duyệt sớm'); }).catch((err) => toast.error(errorMessage(err)));
  };

  if (app === undefined) return <p className="text-stone-500">Đang tải…</p>;
  if (app?.status === 'PENDING' || app?.status === 'APPROVED') {
    return (
      <div className="card p-8 text-center">
        <h2 className="font-serif text-2xl">{app.status === 'PENDING' ? 'Đơn đăng ký Chủ đồ đang chờ duyệt' : 'Đơn đã được duyệt'}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
          {app.status === 'PENDING' ? 'Admin sẽ xem xét trong 24h. Bạn sẽ nhận email khi có kết quả.' : 'Đang mở tính năng cho thuê…'}
        </p>
        <p className="mt-4 text-xs text-stone-400">Gửi lúc {new Date(app.createdAt).toLocaleString('vi-VN')}</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div>
        <h2 className="font-serif text-2xl">Đăng ký làm Chủ đồ</h2>
        <p className="mt-1 text-sm text-stone-500">Chủ đồ được đăng đồ cho thuê, nhận thông báo khi có người thuê, xác nhận đơn và theo dõi doanh thu. Admin duyệt đơn trước để tránh hàng giả, kém chất lượng.</p>
      </div>
      {app?.status === 'REJECTED' && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Đơn trước chưa được duyệt. Lý do: <b>{app.rejectReason}</b>. Bạn sửa lại và gửi đơn mới nhé.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Số điện thoại"><input className="input" required pattern="0\d{9,10}" inputMode="tel" {...f('phone')} /></Field>
        <Field label="Địa chỉ lấy / nhận lại đồ"><input className="input" required maxLength={500} {...f('address')} /></Field>
        <Field label="STK nhận tiền thuê"><input className="input" required pattern="\d{6,20}" inputMode="numeric" {...f('bankAccount')} /></Field>
        <Field label="Ngân hàng"><BankSelect banks={banks} required {...f('bankName')} /></Field>
      </div>
      <Field label="Bạn định cho thuê đồ gì?">
        <textarea className="input min-h-28" required minLength={20} maxLength={1000} {...f('intro')}
          placeholder="Vd: 5 bộ áo dài lụa và 3 đầm dạ hội size S-M, đa số mặc 1-2 lần, có hoá đơn mua…" />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={form.agreed} onChange={(e) => setForm((s) => ({ ...s, agreed: e.target.checked }))} required />
        <span>Tôi cam kết đồ đăng lên là hàng thật, đúng mô tả, và đồng ý <Link to="/terms" className="underline" target="_blank">điều khoản Chủ đồ</Link>.</span>
      </label>
      <button className="btn-wine">Gửi đơn đăng ký</button>
    </form>
  );
}

function OwnerPanel() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const isOwner = user?.role === 'OWNER';

  const load = useCallback(() => {
    ownerStats().then(setStats).catch(() => {});
    ownerProducts().then(setProducts).catch(() => {});
    ownerBookings().then(setBookings).catch(() => {});
  }, []);
  useEffect(() => { if (isOwner) load(); }, [isOwner, load]);

  if (!isOwner) return <OwnerApply />;

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
  const isAdmin = useAuth().user?.role === 'ADMIN';   // admin không thuê đồ → không cần gu AI / STK hoàn cọc
  return (
    <div className="space-y-6">
      {!isAdmin && <StyleProfile />}
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
  const isAdmin = user?.role === 'ADMIN';
  const save = (e) => {
    e.preventDefault();
    updateProfile(form).then(refreshUser).then(() => toast.success('Đã lưu')).catch((err) => toast.error(errorMessage(err)));
  };
  return (
    <form onSubmit={save} className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <h2 className="font-semibold">{isAdmin ? 'Thông tin liên hệ' : 'Thông tin liên hệ & nhận hoàn cọc'}</h2>
        <span className="text-stone-500">{user?.email} · {{ RENTER: 'Khách thuê', OWNER: 'Chủ đồ', ADMIN: 'Admin' }[user?.role]}{!isAdmin && <> · Uy tín <b>{user?.trustScore}</b>/100</>}</span>
      </div>
      <Field label="Họ tên"><input className="input" maxLength={255} {...f('name')} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Số điện thoại"><input className="input" pattern="0\d{9,10}" inputMode="tel" {...f('phone')} /></Field>
        {!isAdmin && <>
          <Field label="Địa chỉ"><input className="input" maxLength={500} {...f('address')} /></Field>
          <Field label="STK nhận hoàn cọc"><input className="input" pattern="\d{6,20}" inputMode="numeric" {...f('bankAccount')} /></Field>
          <Field label="Ngân hàng"><BankSelect banks={banks} {...f('bankName')} /></Field>
        </>}
      </div>
      <button className="btn-dark">Lưu thông tin</button>
    </form>
  );
}
