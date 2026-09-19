import { useState } from 'react';
import { createGreetingWish } from '../../services/aiApi';
import toast from 'react-hot-toast';
import { X, Heart, Send, SkipForward } from 'lucide-react';

export default function WishModal({ onComplete, onSkip, onClose }) {
  const [form, setForm] = useState({
    recipientName: '',
    message: '',
    senderName: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.recipientName.trim() || !form.message.trim()) {
      toast.error('Vui lòng nhập tên người nhận và lời chúc');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createGreetingWish({
        recipientName: form.recipientName.trim(),
        message: form.message.trim(),
        senderName: form.senderName.trim() || undefined,
      });
      onComplete({ greetingWishId: res.data.id, qrToken: res.data.qrToken });
    } catch (err) {
      toast.error('Không thể lưu lời chúc');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-400 to-rose-500 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Heart size={18} fill="white" />
              <h2 className="font-bold text-lg">Lời chúc yêu thương</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <X size={16} />
            </button>
          </div>
          <p className="text-pink-100 text-sm">Thêm lời chúc đặc biệt vào hộp quà của bạn 💌</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Tên người nhận <span className="text-pink-500">*</span>
            </label>
            <input
              name="recipientName"
              value={form.recipientName}
              onChange={handleChange}
              placeholder="Ví dụ: Mẹ, Bạch Tuyết, Anh Minh..."
              className="w-full bg-pink-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-pink-300 text-gray-700 placeholder-pink-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Lời chúc <span className="text-pink-500">*</span>
            </label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={4}
              placeholder="Viết lời chúc từ trái tim bạn... 💖"
              className="w-full bg-pink-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-pink-300 text-gray-700 placeholder-pink-200 resize-none"
            />
            <p className="text-xs text-pink-200 mt-1 text-right">{form.message.length} ký tự</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Người gửi <span className="text-gray-300 text-xs">(tuỳ chọn)</span>
            </label>
            <input
              name="senderName"
              value={form.senderName}
              onChange={handleChange}
              placeholder="Tên của bạn..."
              className="w-full bg-pink-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-pink-300 text-gray-700 placeholder-pink-200"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onSkip}
              className="flex items-center gap-2 px-4 py-3 text-sm text-pink-400 hover:text-pink-500 border border-pink-200 hover:border-pink-300 rounded-xl transition-colors"
            >
              <SkipForward size={14} />
              Bỏ qua
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
            >
              <Send size={14} />
              {submitting ? 'Đang lưu...' : 'Lưu lời chúc & thêm vào giỏ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
