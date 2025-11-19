import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useState, useEffect } from 'react';

function AdminRoute() {
  const { session, profile, loading } = useAuth();
  const [demorou, setDemorou] = useState(false);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setDemorou(true), 3000);
    }
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
          <div className="text-center">
             <p className="text-sm text-gray-500 mb-2">Travou?</p>
             <button 
               onClick={forcarReinico}
               className="text-sm font-bold text-red-600 bg-red-100 px-4 py-2 rounded hover:bg-red-200 transition-colors"
             >
               Clique aqui para Limpar e Reiniciar
             </button>
          </div>
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