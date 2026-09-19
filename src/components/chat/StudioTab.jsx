import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { createConversation, sendMessage, generateImage, createGiftDesign, createGreetingWish } from '../../services/aiApi';
import { getBoxSizes } from '../../services/catalogApi';
import toast from 'react-hot-toast';
import { Send, Sparkles, ShoppingCart, RefreshCw, Bot, CheckCircle2, Heart, SkipForward } from 'lucide-react';

const STEPS = ['chat', 'pick_image', 'pick_box', 'wish'];
const STEP_LABELS = { chat: '💬 Chat', pick_image: '🖼️ Ảnh', pick_box: '📦 Hộp', wish: '💌 Chúc' };

function ThinkingDots() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white border border-pink-100 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function StudioMessage({ msg, onSelectImage, selectedImageId }) {
  const isUser = msg.role === 'user';
  if (isUser) return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-2xl rounded-br-sm px-3 py-2 shadow-sm text-xs leading-relaxed">
        {msg.content}
      </div>
    </div>
  );
  return (
    <div className="flex items-end gap-2">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="max-w-[85%] flex flex-col gap-1.5">
        {msg.content && (
          <div className="bg-white border border-pink-100 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm text-xs text-gray-700 leading-relaxed">
            {msg.content}
          </div>
        )}
        {msg.imageUrl && (
          <div className="flex flex-col gap-1.5">
            <img
              src={msg.imageUrl}
              alt="AI generated"
              className={`rounded-xl w-44 h-36 object-cover border-2 transition-all cursor-pointer ${
                selectedImageId === msg.imageId ? 'border-pink-500 shadow-md' : 'border-pink-100 hover:border-pink-300'
              }`}
              onClick={() => onSelectImage?.({ id: msg.imageId, url: msg.imageUrl })}
            />
            {selectedImageId !== msg.imageId && (
              <button
                onClick={() => onSelectImage?.({ id: msg.imageId, url: msg.imageUrl })}
                className="text-xs bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 rounded-full px-3 py-1 transition-all font-medium w-fit"
              >
                ✓ Chọn ảnh này
              </button>
            )}
            {selectedImageId === msg.imageId && (
              <span className="text-xs text-pink-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Đã chọn
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudioTab() {
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [boxSizes, setBoxSizes] = useState([]);
  const [selectedBoxSizeId, setSelectedBoxSizeId] = useState(null);
  const [giftDesignId, setGiftDesignId] = useState(null);
  const [step, setStep] = useState('chat');

  // Wish form state
  const [showWish, setShowWish] = useState(false);
  const [wishForm, setWishForm] = useState({ recipientName: '', message: '', senderName: '' });
  const [submittingWish, setSubmittingWish] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    const init = async () => {
      try {
        const [convRes, boxRes] = await Promise.all([
          createConversation(),
          getBoxSizes(),
        ]);
        setConversationId(convRes.data.id);
        setBoxSizes(boxRes.data || []);
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: 'Xin chào! 🎁 Mình là Linh, trợ lý thiết kế hộp quà AI của Love Box.\n\nBạn muốn tạo hộp quà cho ai? Mô tả chủ đề, màu sắc hoặc cảm xúc bạn muốn nhé!',
        }]);
      } catch {
        toast.error('Không thể khởi tạo Studio');
      }
    };
    init();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || sending) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    setSending(true);
    try {
      const res = await sendMessage(conversationId, text);
      const reply = res.data?.reply || res.data?.message || res.data?.content || 'Đã nhận!';
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply }]);
    } catch {
      toast.error('Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!conversationId) return;
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join(', ');
    const prompt = userMessages || 'beautiful romantic gift box';
    setGenerating(true);
    setSending(true);
    setMessages(prev => [...prev, { id: 'gen-thinking', role: 'assistant', content: '✨ Đang tạo hình ảnh AI cho bạn...' }]);
    try {
      const res = await generateImage(prompt, conversationId);
      const img = res.data;
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          id: `img-${img.id}`,
          role: 'assistant',
          content: 'Đây rồi! Click vào ảnh hoặc nút "Chọn ảnh này" để tiếp tục 👇',
          imageUrl: img.imageUrl,
          imageId: img.id,
        },
      ]);
      setStep('pick_image');
    } catch {
      setMessages(prev => prev.slice(0, -1));
      toast.error('Không thể tạo hình ảnh');
    } finally {
      setGenerating(false);
      setSending(false);
    }
  };

  const handleSelectImage = (img) => {
    setSelectedImage(img);
    setStep('pick_box');
    setMessages(prev => [...prev, {
      id: `sel-${Date.now()}`,
      role: 'assistant',
      content: '✅ Đã chọn ảnh! Tiếp theo hãy chọn kích thước hộp phù hợp nhé 📦',
    }]);
  };

  const handleCreateDesign = async () => {
    if (!selectedImage || !selectedBoxSizeId) {
      toast.error('Vui lòng chọn hình ảnh và kích thước hộp');
      return;
    }
    try {
      const res = await createGiftDesign({
        sourceType: 'AI_GENERATED',
        aiGeneratedImageId: selectedImage.id,
      });
      setGiftDesignId(res.data.id);
      setStep('wish');
      setShowWish(true);
    } catch {
      toast.error('Không thể tạo thiết kế');
    }
  };

  const handleAddToCart = async (greetingWishId) => {
    setAddingToCart(true);
    try {
      await addItem({
        giftDesignId,
        boxSizeId: selectedBoxSizeId,
        greetingWishId: greetingWishId || undefined,
        quantity: 1,
      });
      toast.success('Đã thêm vào giỏ hàng! 🛒');
      navigate('/cart');
    } catch {
      toast.error('Không thể thêm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleSubmitWish = async (e) => {
    e.preventDefault();
    if (!wishForm.recipientName.trim() || !wishForm.message.trim()) {
      toast.error('Vui lòng nhập tên người nhận và lời chúc');
      return;
    }
    setSubmittingWish(true);
    try {
      const res = await createGreetingWish({
        recipientName: wishForm.recipientName.trim(),
        message: wishForm.message.trim(),
        senderName: wishForm.senderName.trim() || undefined,
      });
      await handleAddToCart(res.data.id);
    } catch {
      toast.error('Không thể lưu lời chúc');
    } finally {
      setSubmittingWish(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSelectedBoxSizeId(null);
    setGiftDesignId(null);
    setStep('chat');
    setShowWish(false);
    setWishForm({ recipientName: '', message: '', senderName: '' });
    setMessages(prev => [...prev, {
      id: `reset-${Date.now()}`,
      role: 'assistant',
      content: 'Bắt đầu lại nhé! Bạn muốn tạo hộp quà thế nào? 🎨',
    }]);
  };

  const currentStepIdx = STEPS.indexOf(step);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Step progress */}
      <div className="flex items-center px-3 py-2 gap-1 border-b border-pink-50 flex-shrink-0 bg-pink-50/40">
        {STEPS.map((s, i) => {
          const active = i <= currentStepIdx;
          return (
            <div key={s} className="flex items-center gap-1 flex-1">
              <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap transition-colors flex-1 text-center ${
                active ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-300'
              }`}>
                {STEP_LABELS[s]}
              </span>
              {i < STEPS.length - 1 && <span className="text-pink-200 text-xs">›</span>}
            </div>
          );
        })}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map(msg => (
          <StudioMessage
            key={msg.id}
            msg={msg}
            onSelectImage={step === 'pick_image' ? handleSelectImage : null}
            selectedImageId={selectedImage?.id}
          />
        ))}
        {sending && <ThinkingDots />}

        {/* Box size selection — shown inline after image selected */}
        {step === 'pick_box' && boxSizes.length > 0 && (
          <div className="ml-8 space-y-1.5">
            {boxSizes.map(size => (
              <button
                key={size.id}
                onClick={() => setSelectedBoxSizeId(size.id)}
                className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-all text-xs ${
                  selectedBoxSizeId === size.id
                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                    : 'border-pink-100 bg-white hover:border-pink-200 text-gray-600'
                }`}
              >
                <span className="font-semibold">{size.name}</span>
                {size.description && <span className="text-gray-400 ml-1">— {size.description}</span>}
                {size.price && (
                  <span className="text-pink-500 font-bold ml-2">
                    {Number(size.price).toLocaleString('vi-VN')}đ
                  </span>
                )}
              </button>
            ))}
            {selectedBoxSizeId && !showWish && (
              <button
                onClick={handleCreateDesign}
                className="w-full mt-2 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Heart className="w-3.5 h-3.5" />
                Tiếp tục — Thêm lời chúc
              </button>
            )}
          </div>
        )}

        {/* Inline wish form */}
        {showWish && (
          <div className="ml-8 bg-white border border-pink-100 rounded-2xl p-3 space-y-2.5 shadow-sm">
            <p className="text-xs font-semibold text-pink-600 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" fill="currentColor" /> Lời chúc yêu thương 💌
            </p>
            <form onSubmit={handleSubmitWish} className="space-y-2">
              <input
                value={wishForm.recipientName}
                onChange={e => setWishForm(p => ({ ...p, recipientName: e.target.value }))}
                placeholder="Tên người nhận *"
                className="w-full bg-pink-50 rounded-xl px-3 py-2 text-xs outline-none border border-transparent focus:border-pink-300 text-gray-700 placeholder-pink-200"
              />
              <textarea
                value={wishForm.message}
                onChange={e => setWishForm(p => ({ ...p, message: e.target.value }))}
                rows={3}
                placeholder="Lời chúc từ trái tim bạn... 💖 *"
                className="w-full bg-pink-50 rounded-xl px-3 py-2 text-xs outline-none border border-transparent focus:border-pink-300 text-gray-700 placeholder-pink-200 resize-none"
              />
              <input
                value={wishForm.senderName}
                onChange={e => setWishForm(p => ({ ...p, senderName: e.target.value }))}
                placeholder="Tên người gửi (tuỳ chọn)"
                className="w-full bg-pink-50 rounded-xl px-3 py-2 text-xs outline-none border border-transparent focus:border-pink-300 text-gray-700 placeholder-pink-200"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddToCart(null)}
                  disabled={addingToCart}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-pink-400 border border-pink-200 rounded-xl hover:border-pink-300 transition-colors disabled:opacity-50"
                >
                  <SkipForward className="w-3 h-3" />
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  disabled={submittingWish || addingToCart}
                  className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {submittingWish || addingToCart ? 'Đang xử lý...' : 'Lưu & Thêm vào giỏ'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!showWish && (
        <div className="px-3 pb-3 pt-2 border-t border-pink-50 flex-shrink-0 space-y-2">
          <div className="flex items-end gap-2 bg-pink-50 border border-pink-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-pink-300 transition-all">
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Mô tả hộp quà bạn muốn..."
              disabled={sending}
              className="flex-1 bg-transparent resize-none text-xs text-gray-700 placeholder-gray-400 focus:outline-none max-h-20 leading-5"
              style={{ height: 'auto', minHeight: '20px' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleGenerateImage}
              disabled={generating || messages.filter(m => m.role === 'user').length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              <Sparkles className="w-3 h-3" />
              {generating ? 'Đang tạo...' : 'Tạo hình ảnh AI'}
            </button>
            {step !== 'chat' && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-100 text-pink-500 text-xs rounded-xl hover:bg-pink-200 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Làm lại
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
