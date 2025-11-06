import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function AdminRoute() {
  // Lê 'loading', 'session' E 'profile' do cérebro
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>; 
  }

  // Se não tem sessão OU não tem perfil (erro)
  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  // Se o perfil não é 'admin'
  if (profile.role !== 'admin') {
    return <Navigate to="/admin" replace />; 
  }

  // Se é admin, deixa entrar
  return <Outlet />;
}

export default AdminRoute;