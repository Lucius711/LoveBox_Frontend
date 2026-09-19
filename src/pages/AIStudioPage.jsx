import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { createConversation, sendMessage, generateImage, createGiftDesign } from '../services/aiApi';
import { getBoxSizes } from '../services/catalogApi';
import { useCart } from '../context/CartContext';
import WishModal from '../modules/ai-studio/WishModal';
import toast from 'react-hot-toast';
import { Send, Sparkles, ShoppingCart, RefreshCw, Image as ImageIcon } from 'lucide-react';

// Chat message bubble
function ChatBubble({ role, content, imageUrl }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs mr-2 flex-shrink-0 mt-1">
          AI
        </div>
      )}
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-pink-500 text-white rounded-br-md'
            : 'bg-white border border-pink-100 text-gray-700 rounded-bl-md shadow-sm'
        }`}
      >
        {content && <p>{content}</p>}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="AI generated"
            className="mt-2 rounded-xl w-full max-w-[240px] object-cover"
          />
        )}
      </div>
    </div>
  );
}

export default function AIStudioPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  // Generated images to pick from
  const [generatedImages, setGeneratedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null); // { id, url }

  // Box sizes from API
  const [boxSizes, setBoxSizes] = useState([]);
  const [selectedBoxSizeId, setSelectedBoxSizeId] = useState(null);

  // Wish modal
  const [wishModalOpen, setWishModalOpen] = useState(false);
  const [giftDesignId, setGiftDesignId] = useState(null);

  const messagesEndRef = useRef(null);

  // Step tracking: 'chat' | 'pick_image' | 'pick_box' | 'add_wish'
  const [step, setStep] = useState('chat');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Init conversation + load box sizes
  useEffect(() => {
    const init = async () => {
      try {
        const [convRes, boxRes] = await Promise.all([
          createConversation(),
          getBoxSizes(),
        ]);
        setConversationId(convRes.data.id);
        setBoxSizes(boxRes.data || []);
        setMessages([
          {
            role: 'assistant',
            content:
              'Xin chào! Mình là AI trợ lý thiết kế hộp quà của Love Box 🎁\n\nBạn muốn tạo hộp quà cho ai? Hãy mô tả chủ đề, màu sắc, hoặc cảm xúc bạn muốn truyền tải!',
          },
        ]);
      } catch (err) {
        toast.error('Không thể khởi tạo AI Studio');
      }
    };
    init();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || sending) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);
    try {
      const res = await sendMessage(conversationId, userMsg);
      const reply = res.data?.reply || res.data?.message || res.data?.content || 'Đã nhận!';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      toast.error('Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!conversationId) return;
    const prompt =
      messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join(', ') || 'beautiful gift box';
    setGeneratingImage(true);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '✨ Đang tạo hình ảnh cho bạn...' },
    ]);
    try {
      const res = await generateImage(prompt, conversationId);
      const imgData = res.data; // { id, imageUrl, prompt }
      const newImg = { id: imgData.id, url: imgData.imageUrl };
      setGeneratedImages((prev) => [...prev, newImg]);
      setMessages((prev) => [
        ...prev.slice(0, -1), // remove "đang tạo" message
        {
          role: 'assistant',
          content: 'Đây là hình ảnh AI vừa tạo! Bạn có thể chọn hình này hoặc tạo thêm 👇',
          imageUrl: imgData.imageUrl,
        },
      ]);
      setStep('pick_image');
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1));
      toast.error('Không thể tạo hình ảnh');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSelectImage = (img) => {
    setSelectedImage(img);
    setStep('pick_box');
    toast.success('Đã chọn hình ảnh! Hãy chọn kích thước hộp 📦');
  };

  const handleCreateGiftDesign = async () => {
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
      setWishModalOpen(true);
      setStep('add_wish');
    } catch (err) {
      toast.error('Không thể tạo thiết kế');
    }
  };

  const handleWishComplete = async ({ greetingWishId }) => {
    setWishModalOpen(false);
    try {
      await addItem({
        giftDesignId,
        boxSizeId: selectedBoxSizeId,
        greetingWishId: greetingWishId || undefined,
        quantity: 1,
      });
      navigate('/cart');
    } catch (err) {
      toast.error('Không thể thêm vào giỏ hàng');
    }
  };

  const handleSkipWish = async () => {
    setWishModalOpen(false);
    try {
      await addItem({
        giftDesignId,
        boxSizeId: selectedBoxSizeId,
        quantity: 1,
      });
      navigate('/cart');
    } catch (err) {
      toast.error('Không thể thêm vào giỏ hàng');
    }
  };

  const handleReset = () => {
    setGeneratedImages([]);
    setSelectedImage(null);
    setSelectedBoxSizeId(null);
    setGiftDesignId(null);
    setStep('chat');
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: 'Bắt đầu lại nhé! Bạn muốn tạo hộp quà thế nào? 🎨' },
    ]);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-pink-600 mb-2">✨ AI Studio</h1>
            <p className="text-gray-400 text-sm">Thiết kế hộp quà cá nhân hoá cùng AI</p>
          </div>

          {/* Progress steps */}
          <div className="flex items-center justify-center gap-2 mb-8 text-xs">
            {[
              { key: 'chat', label: '💬 Chat' },
              { key: 'pick_image', label: '🖼️ Chọn ảnh' },
              { key: 'pick_box', label: '📦 Chọn hộp' },
              { key: 'add_wish', label: '💌 Lời chúc' },
            ].map((s, i) => {
              const steps = ['chat', 'pick_image', 'pick_box', 'add_wish'];
              const currentIdx = steps.indexOf(step);
              const sIdx = steps.indexOf(s.key);
              const active = sIdx <= currentIdx;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full ${active ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-300'}`}>
                    {s.label}
                  </span>
                  {i < 3 && <span className="text-pink-200">›</span>}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat panel */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-pink-100 flex flex-col" style={{ height: '560px' }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5">
                {messages.map((msg, i) => (
                  <ChatBubble key={i} role={msg.role} content={msg.content} imageUrl={msg.imageUrl} />
                ))}
                {sending && (
                  <div className="flex justify-start mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs mr-2">
                      AI
                    </div>
                    <div className="bg-white border border-pink-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-pink-300 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-pink-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <span className="w-2 h-2 bg-pink-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-pink-50 p-4">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Mô tả hộp quà bạn muốn..."
                    className="flex-1 bg-pink-50 rounded-2xl px-4 py-3 text-sm outline-none border border-transparent focus:border-pink-200 text-gray-700 placeholder-pink-200"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="w-11 h-11 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-200 text-white rounded-2xl flex items-center justify-center transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    onClick={handleGenerateImage}
                    disabled={generatingImage || messages.filter((m) => m.role === 'user').length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    <Sparkles size={13} />
                    {generatingImage ? 'Đang tạo...' : 'Tạo hình ảnh'}
                  </button>
                  {generatedImages.length > 0 && (
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 px-4 py-2 bg-pink-100 text-pink-500 text-xs rounded-xl hover:bg-pink-200 transition-colors"
                    >
                      <RefreshCw size={13} />
                      Làm lại
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right panel: image selection + box size */}
            <div className="flex flex-col gap-4">
              {/* Generated images */}
              {generatedImages.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-pink-100 p-5">
                  <h3 className="text-sm font-semibold text-pink-600 mb-3 flex items-center gap-2">
                    <ImageIcon size={14} /> Ảnh đã tạo
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {generatedImages.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => handleSelectImage(img)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                          selectedImage?.id === img.id
                            ? 'border-pink-500 shadow-md shadow-pink-100'
                            : 'border-transparent hover:border-pink-200'
                        }`}
                      >
                        <img src={img.url} alt="" className="w-full h-20 object-cover" />
                        {selectedImage?.id === img.id && (
                          <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                            <span className="text-white text-lg">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Box size selection */}
              {selectedImage && boxSizes.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-pink-100 p-5">
                  <h3 className="text-sm font-semibold text-pink-600 mb-3">📦 Chọn kích thước hộp</h3>
                  <div className="space-y-2">
                    {boxSizes.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedBoxSizeId(size.id)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm ${
                          selectedBoxSizeId === size.id
                            ? 'border-pink-500 bg-pink-50 text-pink-700'
                            : 'border-pink-100 hover:border-pink-200 text-gray-600'
                        }`}
                      >
                        <span className="font-medium">{size.name}</span>
                        {size.description && (
                          <span className="text-xs text-gray-400 block">{size.description}</span>
                        )}
                        {size.price && (
                          <span className="text-xs font-semibold text-pink-500 block mt-1">
                            {Number(size.price).toLocaleString('vi-VN')}đ
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              {selectedImage && selectedBoxSizeId && (
                <button
                  onClick={handleCreateGiftDesign}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-2xl shadow-lg shadow-pink-200 hover:shadow-xl hover:shadow-pink-300 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={16} />
                  Thêm lời chúc & vào giỏ
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Wish modal */}
      {wishModalOpen && (
        <WishModal
          onComplete={handleWishComplete}
          onSkip={handleSkipWish}
          onClose={() => setWishModalOpen(false)}
        />
      )}
    </MainLayout>
  );
}
