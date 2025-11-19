import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useState, useEffect } from 'react';

function AdminRoute() {
  const { session, profile, loading, logout } = useAuth();
  const [demorou, setDemorou] = useState(false);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setDemorou(true), 3000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 text-gray-600 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
        <p>Verificando permissões...</p>
        
        {demorou && (
          <button 
            onClick={() => { logout(); window.location.reload(); }}
            className="text-sm text-red-500 underline hover:text-red-700 mt-4"
          >
            Travou? Clique aqui para reiniciar a sessão.
          </button>
        )}
      </div>
    ); 
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role !== 'admin') {
    return <Navigate to="/admin" replace />; 
  }

  return <Outlet />;
}

export default AdminRoute;