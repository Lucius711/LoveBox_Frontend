import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import { Field, Row } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { EXPRESS_FEE, ROUTES } from '../constants';
import { checkout, errorMessage, getCheckout, updateProfile } from '../services/api';
import { cartTotals, formatCurrency, formatDate, rentalDays } from '../utils/format';

export default function CheckoutPage() {
  const { user, refreshUser } = useAuth();
  const { items, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    recipientName: user?.name || '', phone: user?.phone || '', address: user?.address || '',
    deliveryMethod: 'EXPRESS', paymentMethod: 'PAYOS',
    note: '',
  });
  const [save, setSave] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState(null);   // CheckoutResponse khi chờ quét QR
  const poll = useRef(null);
  const placed = useRef(false);   // đã đặt xong → giỏ trống là bình thường, đừng đẩy về /cart

  useEffect(() => () => clearInterval(poll.current), []);
  useEffect(() => { if (!items.length && !payment && !placed.current) navigate(ROUTES.CART, { replace: true }); }, [items.length, payment, navigate]);

  const f = (k) => ({ value: form[k], onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const { rent, deposit } = cartTotals(items);
  const ship = form.deliveryMethod === 'EXPRESS' ? EXPRESS_FEE : 0;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await checkout({
        ...form,
        items: items.map(({ productId, startDate, endDate }) => ({ productId, startDate, endDate })),
      });
      if (save) updateProfile({ phone: form.phone, address: form.address })
        .then(refreshUser).catch(() => {});
      placed.current = true;
      clear();
      if (res.paymentMethod === 'COD') return navigate(`/checkout/success?code=${res.checkoutCode}`);
      setPayment(res);
      poll.current = setInterval(async () => {
        const s = await getCheckout(res.checkoutCode).catch(() => null);
        if (s?.paymentStatus === 'PAID') { clearInterval(poll.current); navigate(`/checkout/success?code=${res.checkoutCode}`); }
      }, 3000);
    } catch (err) {
      toast.error(errorMessage(err, 'Không đặt được, thử lại nhé'));
    } finally { setSubmitting(false); }
  };

  if (payment) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-md px-4 py-10 text-center">
          <h1 className="font-serif text-3xl">Quét mã để thanh toán</h1>
          <p className="mt-2 text-sm text-stone-500">Dùng app ngân hàng hoặc MoMo quét mã VietQR. Trang tự chuyển khi nhận được tiền.</p>
          <div className="card mx-auto mt-6 w-fit p-4">
            {payment.qrCode
              ? <img alt="Mã QR thanh toán" className="h-64 w-64" src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(payment.qrCode)}`} />
              : <p className="p-6 text-sm">Mở trang PayOS để lấy mã QR</p>}
          </div>
          <p className="mt-4 text-2xl font-semibold">{formatCurrency(payment.totalAmount)}</p>
          <p className="text-xs text-stone-500">Mã đơn {payment.checkoutCode}</p>
          {payment.checkoutUrl && (
            <a href={payment.checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-5">Mở trang thanh toán PayOS <ExternalLink size={14} /></a>
          )}
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-stone-500"><Loader2 size={15} className="animate-spin" /> Đang chờ thanh toán…</p>
          <Link to={ROUTES.ACCOUNT} className="mt-4 block text-sm underline">Để sau — xem trong Đơn thuê của tôi</Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <form onSubmit={submit} className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <h1 className="font-serif text-3xl">Đặt thuê & đặt cọc</h1>

          <fieldset className="card space-y-4 p-5">
            <legend className="px-1 text-sm font-semibold">Thông tin giao nhận</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ tên người nhận"><input required maxLength={255} className="input" autoComplete="name" {...f('recipientName')} /></Field>
              <Field label="Số điện thoại"><input required pattern="0\d{9,10}" title="Số điện thoại 10-11 số, bắt đầu bằng 0" inputMode="tel" autoComplete="tel" className="input" {...f('phone')} /></Field>
            </div>
            <Field label="Địa chỉ nhận đồ"><input required maxLength={500} autoComplete="street-address" className="input" {...f('address')} /></Field>
            <div>
              <p className="label">Hình thức giao hàng</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Radio name="delivery" checked={form.deliveryMethod === 'PICKUP'} onChange={() => setForm((s) => ({ ...s, deliveryMethod: 'PICKUP' }))}
                  title="Tự đến lấy" sub="Miễn phí" />
                <Radio name="delivery" checked={form.deliveryMethod === 'EXPRESS'} onChange={() => setForm((s) => ({ ...s, deliveryMethod: 'EXPRESS' }))}
                  title="Ship hoả tốc" sub={`${formatCurrency(EXPRESS_FEE)} / đơn`} />
              </div>
            </div>
          </fieldset>

          <fieldset className="card space-y-4 p-5">
            <legend className="px-1 text-sm font-semibold">Thanh toán</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Radio name="pay" checked={form.paymentMethod === 'PAYOS'} onChange={() => setForm((s) => ({ ...s, paymentMethod: 'PAYOS' }))}
                title="Chuyển khoản QR" sub="Quét bằng app ngân hàng / MoMo — cọc được hoàn về đúng tài khoản đã quét" />
              <Radio name="pay" checked={form.paymentMethod === 'COD'} onChange={() => setForm((s) => ({ ...s, paymentMethod: 'COD' }))}
                title="Thanh toán khi nhận (COD)" sub="Cọc hoàn về STK trong Hồ sơ của bạn" />
            </div>
            <Field label="Ghi chú (tuỳ chọn)"><textarea rows={2} maxLength={1000} className="input" {...f('note')} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> Lưu SĐT, địa chỉ cho lần sau</label>
          </fieldset>
        </div>

        <aside className="card h-fit space-y-3 p-5 text-sm md:sticky md:top-24">
          <ul className="space-y-3 border-b border-stone-100 pb-3">
            {items.map((i) => (
              <li key={i.productId} className="flex gap-3">
                <img src={i.image} alt="" loading="lazy" className="h-14 w-11 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.name}</p>
                  <p className="text-xs text-stone-500">{formatDate(i.startDate)} → {formatDate(i.endDate)} · {rentalDays(i.startDate, i.endDate)} ngày</p>
                </div>
              </li>
            ))}
          </ul>
          <Row k="Tiền thuê đồ × số ngày" v={formatCurrency(rent)} />
          <Row k="Tiền cọc bảo đảm" v={formatCurrency(deposit)} />
          <Row k="Phí vận chuyển" v={formatCurrency(ship)} />
          <div className="border-t border-stone-100 pt-3 text-base"><Row k={<b>Thành tiền</b>} v={<b>{formatCurrency(rent + deposit + ship)}</b>} /></div>
          <button disabled={submitting} className="btn-wine w-full py-3">{submitting ? 'Đang xử lý…' : form.paymentMethod === 'COD' ? 'Đặt thuê' : 'Đặt thuê & lấy mã QR'}</button>
        </aside>
      </form>
    </MainLayout>
  );
}

function Radio({ name, checked, onChange, title, sub }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? 'border-ink bg-stone-50' : 'border-stone-200'}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 accent-ink" />
      <span><span className="block text-sm font-medium">{title}</span><span className="text-xs text-stone-500">{sub}</span></span>
    </label>
  );
}
