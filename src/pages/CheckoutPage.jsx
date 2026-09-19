import { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { createOrder, initPayment, uploadReceipt } from '../services/orderApi';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { Package, CreditCard, Upload, CheckCircle, ChevronRight, Loader } from 'lucide-react';

const STEPS = ['Thông tin giao hàng', 'Thanh toán QR', 'Xác nhận'];

export default function CheckoutPage() {
  const { openStudio } = useChat();
  const navigate = useNavigate();
  const { cart, fetchCart } = useCart();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 0: Shipping form
  const [shipping, setShipping] = useState({
    recipientName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    ward: '',
    note: '',
  });

  // Step 1: Payment
  const [orderId, setOrderId] = useState(null);
  const [vietqrPayload, setVietqrPayload] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleShippingChange = (e) => {
    setShipping((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Step 0 → 1: Create order and init payment ─────────────────────────
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    const { recipientName, phone, addressLine1, city } = shipping;
    if (!recipientName || !phone || !addressLine1 || !city) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create order
      const orderRes = await createOrder({
        recipientName: shipping.recipientName,
        phone: shipping.phone,
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2 || undefined,
        city: shipping.city,
        district: shipping.district || undefined,
        ward: shipping.ward || undefined,
        note: shipping.note || undefined,
      });
      const newOrderId = orderRes.data.id;
      setOrderId(newOrderId);

      // 2. Init payment → get VietQR payload
      const payRes = await initPayment(newOrderId);
      setVietqrPayload(payRes.data?.vietqrPayload || payRes.data?.qrPayload || null);
      setStep(1);
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể tạo đơn hàng';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 1: Receipt image selection ──────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    // Convert to data URL for preview and to send as URL
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Step 1 → 2: Upload receipt ────────────────────────────────────────
  const handleUploadReceipt = async () => {
    if (!receiptPreview) {
      toast.error('Vui lòng chụp/chọn ảnh biên lai');
      return;
    }
    setUploading(true);
    try {
      // Send base64 data URL as the receiptImageUrl
      await uploadReceipt(orderId, receiptPreview);
      await fetchCart(); // refresh cart (should be empty after order)
      setStep(2);
      toast.success('Đã gửi biên lai! Đơn hàng của bạn đang được xử lý 🎉');
    } catch (err) {
      toast.error('Không thể gửi biên lai. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const total = cart?.totalPrice ?? 0;
  const items = cart?.items || [];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
        <div className="max-w-xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold text-pink-600 mb-6">Đặt hàng</h1>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i < step ? 'bg-pink-500 text-white' :
                    i === step ? 'bg-pink-100 text-pink-600 ring-2 ring-pink-300' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block ${i === step ? 'text-pink-600 font-medium' : 'text-gray-400'}`}>
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* ── STEP 0: Shipping info ─────────────────────────── */}
          {step === 0 && (
            <form onSubmit={handlePlaceOrder} className="space-y-5">
              {/* Order summary */}
              <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                  <Package size={15} /> Đơn hàng ({items.length} sản phẩm)
                </h2>
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-pink-50 last:border-0">
                    <span className="text-gray-500 line-clamp-1 flex-1 mr-4">
                      🎁 {item.giftDesign?.name || 'Hộp quà'} × {item.quantity || 1}
                    </span>
                    {item.totalPrice != null && (
                      <span className="font-medium text-pink-500">
                        {Number(item.totalPrice).toLocaleString('vi-VN')}đ
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex justify-between mt-3 font-bold text-pink-600">
                  <span>Tổng</span>
                  <span>{Number(total).toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* Shipping form */}
              <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-gray-600">📍 Thông tin giao hàng</h2>

                {[
                  { name: 'recipientName', label: 'Tên người nhận', required: true, placeholder: 'Nguyễn Văn A' },
                  { name: 'phone', label: 'Số điện thoại', required: true, placeholder: '0901234567', type: 'tel' },
                  { name: 'addressLine1', label: 'Địa chỉ', required: true, placeholder: 'Số nhà, tên đường' },
                  { name: 'addressLine2', label: 'Địa chỉ 2', placeholder: 'Toà nhà, căn hộ... (tuỳ chọn)' },
                  { name: 'ward', label: 'Phường/Xã', placeholder: 'Phường 1' },
                  { name: 'district', label: 'Quận/Huyện', placeholder: 'Quận 1' },
                  { name: 'city', label: 'Tỉnh/Thành phố', required: true, placeholder: 'TP. Hồ Chí Minh' },
                  { name: 'note', label: 'Ghi chú', placeholder: 'Giao giờ hành chính... (tuỳ chọn)' },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      {field.label} {field.required && <span className="text-pink-500">*</span>}
                    </label>
                    <input
                      name={field.name}
                      type={field.type || 'text'}
                      value={shipping[field.name]}
                      onChange={handleShippingChange}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="w-full bg-pink-50 rounded-xl px-4 py-2.5 text-sm outline-none border border-transparent focus:border-pink-300 text-gray-700 placeholder-pink-200"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-200 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader size={18} className="animate-spin" /> : <CreditCard size={18} />}
                {submitting ? 'Đang tạo đơn...' : 'Tiến hành thanh toán'}
              </button>
            </form>
          )}

          {/* ── STEP 1: QR payment + receipt ─────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-pink-100 p-6 shadow-sm text-center">
                <h2 className="text-sm font-semibold text-gray-600 mb-4 flex items-center justify-center gap-2">
                  <CreditCard size={15} /> Quét mã QR để thanh toán
                </h2>
                {vietqrPayload ? (
                  <div className="bg-gray-50 rounded-2xl p-4 inline-block">
                    <img
                      src={`https://img.vietqr.io/image/${vietqrPayload}`}
                      alt="VietQR"
                      className="w-48 h-48 mx-auto rounded-xl"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div className="hidden text-pink-400 text-sm py-4">
                      <div className="text-3xl mb-2">📱</div>
                      QR đang được tải...
                    </div>
                  </div>
                ) : (
                  <div className="bg-pink-50 rounded-2xl p-8 text-pink-400">
                    <div className="text-4xl mb-2">📱</div>
                    <p className="text-sm">Thông tin thanh toán đang được tải</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-4">
                  Số tiền: <span className="font-bold text-pink-500">{Number(total).toLocaleString('vi-VN')}đ</span>
                </p>
                <p className="text-xs text-gray-300 mt-1">Mã đơn: #{orderId?.slice(-8)?.toUpperCase()}</p>
              </div>

              {/* Receipt upload */}
              <div className="bg-white rounded-2xl border border-pink-100 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
                  <Upload size={15} /> Tải lên biên lai thanh toán
                </h2>
                <label className="block cursor-pointer">
                  <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
                    receiptPreview ? 'border-pink-300 bg-pink-50' : 'border-pink-200 hover:border-pink-300 hover:bg-pink-50'
                  }`}>
                    {receiptPreview ? (
                      <img src={receiptPreview} alt="Receipt" className="mx-auto max-h-48 rounded-xl object-contain" />
                    ) : (
                      <>
                        <Upload size={24} className="text-pink-300 mx-auto mb-2" />
                        <p className="text-sm text-pink-400 font-medium">Chọn ảnh biên lai</p>
                        <p className="text-xs text-pink-200 mt-1">JPG, PNG tối đa 10MB</p>
                      </>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
                {receiptPreview && (
                  <p className="text-xs text-center text-pink-400 mt-2">✓ Đã chọn ảnh biên lai</p>
                )}
              </div>

              <button
                onClick={handleUploadReceipt}
                disabled={!receiptPreview || uploading}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-200 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                {uploading ? 'Đang gửi...' : 'Xác nhận đã thanh toán'}
              </button>
            </div>
          )}

          {/* ── STEP 2: Success ───────────────────────────────── */}
          {step === 2 && (
            <div className="text-center py-10">
              <div className="text-7xl mb-6 animate-bounce">🎉</div>
              <h2 className="text-2xl font-bold text-pink-600 mb-3">Đặt hàng thành công!</h2>
              <p className="text-gray-400 text-sm mb-2">
                Biên lai của bạn đã được gửi. Chúng tôi sẽ xác nhận thanh toán và xử lý đơn hàng sớm nhất.
              </p>
              <p className="text-xs text-gray-300 mb-8">Mã đơn: #{orderId?.slice(-8)?.toUpperCase()}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => openStudio()}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-2xl shadow-md"
                >
                  ✨ Tạo thêm hộp quà
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 text-pink-400 text-sm hover:text-pink-500"
                >
                  Về trang chủ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
