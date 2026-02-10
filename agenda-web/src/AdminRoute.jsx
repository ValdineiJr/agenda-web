import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function AdminRoute() {
  const { session, profile, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 text-gray-600 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
        <p>Verificando permissões...</p>
      </div>
    ); 
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  // Se não for admin, manda para a Home normal para evitar loop
  if (!isAdmin) {
    return <Navigate to="/" replace />; 
  }

  return <Outlet />;
}

export default AdminRoute;