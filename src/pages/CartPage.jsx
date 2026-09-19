import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Loader } from 'lucide-react';

function CartItemCard({ item, onUpdate, onRemove }) {
  return (
    <div className="bg-white rounded-2xl border border-pink-100 p-5 flex gap-4 shadow-sm">
      {/* Preview image */}
      {item.giftDesign?.imageUrl ? (
        <img
          src={item.giftDesign.imageUrl}
          alt=""
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-pink-50"
        />
      ) : (
        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center flex-shrink-0">
          <span className="text-3xl">🎁</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-700 text-sm mb-1">
          {item.giftDesign?.name || 'Hộp quà AI'}
        </h3>
        {item.boxSize && (
          <p className="text-xs text-gray-400 mb-0.5">📦 {item.boxSize.name}</p>
        )}
        {item.greetingWish && (
          <p className="text-xs text-pink-400 mb-2 line-clamp-1">
            💌 {item.greetingWish.recipientName}: "{item.greetingWish.message}"
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          {/* Qty controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdate(item.id, Math.max(1, (item.quantity || 1) - 1))}
              className="w-7 h-7 rounded-full border border-pink-200 flex items-center justify-center text-pink-400 hover:bg-pink-50 transition-colors"
            >
              <Minus size={12} />
            </button>
            <span className="text-sm font-medium text-gray-700 w-5 text-center">
              {item.quantity || 1}
            </span>
            <button
              onClick={() => onUpdate(item.id, (item.quantity || 1) + 1)}
              className="w-7 h-7 rounded-full border border-pink-200 flex items-center justify-center text-pink-400 hover:bg-pink-50 transition-colors"
            >
              <Plus size={12} />
            </button>
          </div>
          {/* Price */}
          {item.totalPrice != null && (
            <span className="text-sm font-bold text-pink-500">
              {Number(item.totalPrice).toLocaleString('vi-VN')}đ
            </span>
          )}
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.id)}
        className="self-start w-8 h-8 flex items-center justify-center text-gray-300 hover:text-rose-400 hover:bg-rose-50 rounded-xl transition-colors flex-shrink-0"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export default function CartPage() {
  const { openStudio } = useChat();
  const navigate = useNavigate();
  const { cart, loading, updateItem, removeItem } = useCart();

  const items = cart?.items || [];
  const total = cart?.totalPrice ?? items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader size={24} className="text-pink-400 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold text-pink-600 mb-6 flex items-center gap-2">
            <ShoppingBag size={22} />
            Giỏ hàng của bạn
            {items.length > 0 && (
              <span className="ml-2 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {items.length}
              </span>
            )}
          </h1>

          {items.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🛒</div>
              <h2 className="text-lg font-semibold text-gray-500 mb-2">Giỏ hàng trống</h2>
              <p className="text-gray-400 text-sm mb-6">Hãy tạo hộp quà đặc biệt của bạn!</p>
              <button
                onClick={() => openStudio()}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-2xl shadow-md shadow-pink-200 hover:shadow-lg transition-shadow"
              >
                ✨ Thiết kế ngay
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                  />
                ))}
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500 text-sm">Tổng cộng ({items.length} sản phẩm)</span>
                  <span className="text-xl font-bold text-pink-600">
                    {Number(total).toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-2xl shadow-lg shadow-pink-200 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  Đặt hàng ngay
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => openStudio()}
                  className="w-full mt-3 py-2.5 text-pink-400 text-sm hover:text-pink-500 transition-colors"
                >
                  + Thêm hộp quà khác
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
