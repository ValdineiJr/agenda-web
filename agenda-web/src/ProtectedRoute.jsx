import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useState, useEffect } from 'react';

function ProtectedRoute() {
  const { session, loading } = useAuth(); 
  const [demorou, setDemorou] = useState(false);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setDemorou(true), 3000); // 3 segundos
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // Função de Limpeza Forçada
  const forcarReinico = () => {
    console.log("Limpando cache local e forçando reload...");
    localStorage.clear(); // Apaga tokens locais
    sessionStorage.clear(); // Apaga sessão
    window.location.href = '/login'; // Redireciona via navegador (hard navigation)
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 text-gray-600 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
        <p>Carregando sistema...</p>
        
        {demorou && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">Está demorando muito?</p>
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

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;