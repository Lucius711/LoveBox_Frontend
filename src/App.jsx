import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ChatProvider, ChatWidget } from './components/Chat';
import { ROUTES } from './constants';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutResultPage from './pages/CheckoutResultPage';
import AccountPage from './pages/AccountPage';
import ProductFormPage from './pages/ProductFormPage';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import OnboardingPage from './pages/OnboardingPage';
import ShippingPage from './pages/ShippingPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

const OWNER = ['OWNER', 'ADMIN'];

/** Đăng nhập lần đầu (chưa có hồ sơ phong cách) → đưa sang bước thiết lập. */
function OnboardingGate() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (user && !user.onboarded && pathname !== ROUTES.ONBOARDING) return <Navigate to={ROUTES.ONBOARDING} replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <ChatProvider>
            <Toaster position="top-center" toastOptions={{ style: { borderRadius: '12px', fontSize: '14px' } }} />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path={ROUTES.ONBOARDING} element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route element={<OnboardingGate />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                <Route path="/checkout/success" element={<ProtectedRoute><CheckoutResultPage /></ProtectedRoute>} />
                <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
                <Route path="/owner/products/new" element={<ProtectedRoute roles={OWNER}><ProductFormPage /></ProtectedRoute>} />
                <Route path="/owner/products/:id/edit" element={<ProtectedRoute roles={OWNER}><ProductFormPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminPage /></ProtectedRoute>} />
                <Route path="/shipping" element={<ShippingPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            <ChatWidget />
            </ChatProvider>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
