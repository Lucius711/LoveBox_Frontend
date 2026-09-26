import { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// Giỏ đồ thuê lưu ở trình duyệt (khách chưa đăng nhập vẫn thêm được); server kiểm tra lại lịch khi thanh toán.
const KEY = 'lt_cart';
const CartContext = createContext(null);

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

export function CartProvider({ children }) {
  const [items, setItems] = useState(read);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode */ } }, [items]);

  /** product: { id, name, image, rentPricePerDay, deposit, size }; dates có thể để trống, chọn trong giỏ. */
  const addItem = (product, startDate = null, endDate = null) => {
    setItems((prev) => {
      const rest = prev.filter((i) => i.productId !== product.id);
      return [...rest, {
        productId: product.id, name: product.name, image: product.image ?? product.images?.[0],
        rentPricePerDay: product.rentPricePerDay, deposit: product.deposit, size: product.size, startDate, endDate,
      }];
    });
    toast.success('Đã thêm vào giỏ');
  };

  const updateItem = (productId, patch) =>
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, ...patch } : i)));
  const removeItem = (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId));
  const clear = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, itemCount: items.length, addItem, updateItem, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
