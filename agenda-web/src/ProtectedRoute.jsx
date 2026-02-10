import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function ProtectedRoute() {
  const { session, profile, loading } = useAuth(); 

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 text-gray-600 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
        <p>Verificando acesso...</p>
      </div>
    ); 
  }

  // Se o loading terminou e não tem sessão, vai pro login automaticamente
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Se tem sessão mas não tem perfil (erro raro de banco), tenta recarregar ou vai pro login
  if (!profile) {
    // Força limpeza para tentar login limpo
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;