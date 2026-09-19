import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ChatProvider } from './context/ChatContext';
import FloatingChatBubble from './components/chat/FloatingChatBubble';
import ProtectedRoute from './components/ProtectedRoute';
import { ROUTES } from './constants';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import ProductsPage from './pages/ProductsPage';
import ShippingPage from './pages/ShippingPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import MyCollectionPage from './pages/MyCollectionPage';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <CartProvider>
          <ChatProvider>
            <BrowserRouter>
              <Toaster
                position="top-center"
                toastOptions={{
                  style: {
                    background: '#FFF0F8',
                    color: '#9D174D',
                    border: '1px solid #FBCFE8',
                    borderRadius: '12px',
                    fontSize: '14px',
                  },
                }}
              />
              <Routes>
                <Route path={ROUTES.HOME} element={<HomePage />} />
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                <Route
                  path={ROUTES.CART}
                  element={
                    <ProtectedRoute>
                      <CartPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.CHECKOUT}
                  element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.ORDER_SUCCESS}
                  element={
                    <ProtectedRoute>
                      <OrderSuccessPage />
                    </ProtectedRoute>
                  }
                />
                <Route path={ROUTES.PRODUCTS} element={<ProductsPage />} />
                <Route path="/my-collection" element={<ProtectedRoute><MyCollectionPage /></ProtectedRoute>} />
                <Route path="/shipping" element={<ShippingPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
              </Routes>

              {/* Floating chat bubble — visible on all non-excluded routes */}
              <FloatingChatBubble />
            </BrowserRouter>
          </ChatProvider>
        </CartProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
