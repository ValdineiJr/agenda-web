import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useState, useEffect } from 'react';

function AdminRoute() {
  const { session, profile, loading, isAdmin } = useAuth();
  const [demorou, setDemorou] = useState(false);

  useEffect(() => {
    let timer;
    if (loading) timer = setTimeout(() => setDemorou(true), 4000);
    return () => clearTimeout(timer);
  }, [loading]);

  const forcarReinico = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 text-gray-600 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
        <p>Verificando permissões...</p>
        
        {demorou && (
          <button onClick={forcarReinico} className="text-sm font-bold text-red-600 bg-red-100 px-4 py-2 rounded">
             Reiniciar Sistema
          </button>
        )}
      </div>
    ); 
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  // SE NÃO FOR ADMIN, manda para a Home do usuário, NÃO para /admin (evita loop infinito)
  if (!isAdmin) {
    return <Navigate to="/" replace />; 
  }

  return <Outlet />;
}

export default AdminRoute;