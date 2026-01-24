import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useState, useEffect } from 'react';

function ProtectedRoute() {
  const { session, profile, loading } = useAuth(); 
  const [demorou, setDemorou] = useState(false);

  // Timer de segurança
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
        <p>Carregando sistema...</p>
        
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

  // --- CORREÇÃO DA TELA BRANCA ---
  // Se não tem sessão, vai pro login.
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // NOVA TRAVA DE SEGURANÇA:
  // Se tem sessão, mas o perfil falhou em carregar (é null), 
  // não podemos deixar carregar o Layout, senão da TELA BRANCA.
  // Mandamos volta para o login para tentar buscar o perfil de novo.
  if (!profile) {
    console.warn("Sessão ativa mas perfil não encontrado. Redirecionando...");
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;