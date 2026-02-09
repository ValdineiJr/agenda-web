import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useState, useEffect } from 'react';

function ProtectedRoute() {
  const { session, profile, loading } = useAuth(); 
  const [demorou, setDemorou] = useState(false);

  // Timer de segurança: Se carregar demorar muito, oferece opção de limpar
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setDemorou(true), 4000); // 4 segundos
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
        <p>Verificando acesso...</p>
        
        {demorou && (
          <div className="text-center animate-fade-in">
            <p className="text-sm text-gray-500 mb-2">Está demorando?</p>
            <button onClick={forcarReinico} className="text-sm font-bold text-red-600 bg-red-100 px-4 py-2 rounded hover:bg-red-200 transition-colors shadow-sm">
              Limpar e Reiniciar
            </button>
          </div>
        )}
      </div>
    ); 
  }

  // 1. Se não tem sessão, login.
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 2. Se tem sessão mas o perfil não carregou (erro de banco), 
  // tenta recarregar a página uma vez ou manda pro login pra forçar refresh
  if (!profile) {
    return (
        <div className="flex flex-col h-screen items-center justify-center bg-gray-50">
            <p className="text-gray-600 mb-4">Perfil não identificado.</p>
            <button onClick={forcarReinico} className="text-fuchsia-600 font-bold underline">Tentar novamente</button>
        </div>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;