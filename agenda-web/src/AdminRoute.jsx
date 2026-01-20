import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useState, useEffect } from 'react';

function AdminRoute() {
  const { session, profile, loading, isAdmin } = useAuth();
  const [demorou, setDemorou] = useState(false);

  // Timer para mostrar botão de socorro se a internet estiver lenta
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setDemorou(true), 3000); // 3 segundos
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
          <div className="text-center animate-fade-in">
             <p className="text-sm text-gray-500 mb-2">Está demorando muito?</p>
             <button 
               onClick={forcarReinico}
               className="text-sm font-bold text-red-600 bg-red-100 px-4 py-2 rounded hover:bg-red-200 transition-colors shadow-sm"
             >
               Clique aqui para Limpar e Reiniciar
             </button>
          </div>
        )}
      </div>
    ); 
  }

  // Se não tem sessão ou o perfil falhou em carregar, manda pro login
  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  // --- CORREÇÃO AQUI ---
  // Se tem perfil mas não é admin, NÃO mande para /admin novamente (causa loop).
  // Mande para a raiz '/' ou para '/painel' ou a rota principal do usuário comum.
  if (!isAdmin) {
    // Alterei de '/admin' para '/' (Home/Dashboard) para evitar a tela branca
    return <Navigate to="/" replace />; 
  }

  return <Outlet />;
}

export default AdminRoute;