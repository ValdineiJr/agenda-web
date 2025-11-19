import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useState, useEffect } from 'react';

function ProtectedRoute() {
  const { session, loading, logout } = useAuth(); 
  const [demorou, setDemorou] = useState(false);

  // Se o carregamento demorar mais de 3 segundos, mostra botão de ajuda
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
        <p>Carregando sistema...</p>
        
        {demorou && (
          <button 
            onClick={() => { logout(); window.location.reload(); }}
            className="text-sm text-red-500 underline hover:text-red-700 mt-4"
          >
            Está demorando? Clique aqui para reiniciar.
          </button>
        )}
      </div>
    ); 
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;