import { useState, useCallback } from 'react';

const KEY = 'lovebox_cart';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

export const useCart = () => {
  const [items, setItems] = useState(load);
  const addItem = useCallback((item) => {
    setItems((prev) => { const next = [...prev, { ...item, id: Date.now() }]; save(next); return next; });
  }, []);
  const removeItem = useCallback((id) => {
    setItems((prev) => { const next = prev.filter((i) => i.id !== id); save(next); return next; });
  }, []);
  const clearCart = useCallback(() => { setItems([]); save([]); }, []);
  const total = items.reduce((s, i) => s + (i.price || 0), 0);
  return { items, addItem, removeItem, clearCart, total, count: items.length };
};
