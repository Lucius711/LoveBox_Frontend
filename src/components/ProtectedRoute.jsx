import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** roles: tuỳ chọn, vd ['ADMIN'] hoặc ['OWNER','ADMIN'] */
export default function ProtectedRoute({ children, roles }) {
  const { isLoggedIn, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-9 w-9 animate-spin rounded-full border-4 border-wine-500 border-t-transparent" />
      </div>
    );
  }
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/account?tab=owner" replace />;
  return children;
}
