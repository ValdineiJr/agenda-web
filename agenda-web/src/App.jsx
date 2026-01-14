import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './Layout';
import AgendarPage from './pages/Agendar';
import AdminAgendaPage from './pages/AdminAgenda';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './ProtectedRoute'; 
import AdminRoute from './AdminRoute';
import ProfissionaisPage from './pages/ProfissionaisPage';

// --- CONTROLE DE VERSÃO ---
// Mude este número (ex: 1.0.2) quando fizer atualizações importantes para forçar a limpeza
const VERSAO_ATUAL = '1.0.1'; 

function App() {

  // --- LÓGICA DE LIMPEZA DE CACHE AUTOMÁTICA ---
  useEffect(() => {
    const versaoSalva = localStorage.getItem('app_versao');

    // Se a versão salva no navegador for diferente da versão atual do código
    if (versaoSalva !== VERSAO_ATUAL) {
      console.log('Nova versão detectada (' + VERSAO_ATUAL + '). Limpando cache...');
      
      // 1. Limpa todo o armazenamento local (tokens, sessões antigas)
      localStorage.clear();
      sessionStorage.clear();
      
      // 2. Salva a nova versão para não limpar novamente no próximo acesso
      localStorage.setItem('app_versao', VERSAO_ATUAL);
      
      // 3. Opcional: Recarrega a página para garantir que a memória RAM também limpe
      // window.location.reload(); 
    }
  }, []);
  // ------------------------------------------------

  return (
    <Routes>
      {/* --- Rotas Públicas (Cliente) --- */}
      <Route path="/" element={<Layout />}>
        <Route index element={<AgendarPage />} />
        <Route path="login" element={<LoginPage />} />
      </Route>

      {/* --- Rotas Protegidas (Logado - Admin OU Profissional) --- */}
      <Route element={<ProtectedRoute />}> 
        <Route path="/admin" element={<Layout />}>
          <Route index element={<AdminAgendaPage />} />
          {/* A rota /admin (agenda) é acessível por ambos */}
        </Route>
      </Route>

      {/* --- Rotas SÓ DE ADMIN (Só Admin) --- */}
      <Route element={<AdminRoute />}> {/* Usa o novo "Porteiro" */}
        <Route path="/admin/profissionais" element={<Layout />}>
          <Route index element={<ProfissionaisPage />} />
        </Route>
      </Route>
      
    </Routes>
  );
}

export default App;