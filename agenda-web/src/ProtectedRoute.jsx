import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function ProtectedRoute() {
  // Lê 'loading' e 'session' do cérebro
  const { session, loading } = useAuth(); 

  if (loading) {
    return <div>Carregando...</div>; 
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Se passou, deixa entrar
  return <Outlet />;
}

export default ProtectedRoute;