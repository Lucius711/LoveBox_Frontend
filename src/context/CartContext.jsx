import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCart, addCartItem, updateCartItem, removeCartItem } from '../services/cartApi';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCart(null);
      return;
    }
    try {
      setLoading(true);
      const res = await getCart();
      setCart(res.data);
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = async (payload) => {
    try {
      await addCartItem(payload);
      await fetchCart();
      toast.success('Đã thêm vào giỏ hàng! 🎁');
    } catch (err) {
      toast.error('Không thể thêm vào giỏ hàng');
      throw err;
    }
  };

  const updateItem = async (cartItemId, quantity) => {
    try {
      await updateCartItem(cartItemId, quantity);
      await fetchCart();
    } catch (err) {
      toast.error('Không thể cập nhật số lượng');
      throw err;
    }
  };

  const removeItem = async (cartItemId) => {
    try {
      await removeCartItem(cartItemId);
      await fetchCart();
      toast.success('Đã xóa khỏi giỏ hàng');
    } catch (err) {
      toast.error('Không thể xóa sản phẩm');
      throw err;
    }
  };

  const itemCount = cart?.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;

  return (
    <CartContext.Provider value={{ cart, loading, itemCount, fetchCart, addItem, updateItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
