import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './Layout';
import AgendarPage from './pages/Agendar';
import AdminAgendaPage from './pages/AdminAgenda';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './ProtectedRoute'; 
import AdminRoute from './AdminRoute';

// Importação de TODAS as páginas administrativas
import ProfissionaisPage from './pages/ProfissionaisPage';
import ProfissionalEditPage from './pages/ProfissionalEditPage'; 
import ServicosPage from './pages/ServicosPage';
import ServicoEditPage from './pages/ServicoEditPage';
import DashboardPage from './pages/DashboardPage';
import ClientManagePage from './pages/ClientManagePage'; 
import HistoricoPage from './pages/HistoricoPage';
import ClientesPage from './pages/ClientesPage'; 
import HomePage from './pages/HomePage';

// --- CONTROLE DE VERSÃO (Incrementado para limpar cache antigo) ---
const VERSAO_ATUAL = '1.0.5'; 

function App() {

  // --- LÓGICA DE LIMPEZA DE CACHE AUTOMÁTICA ---
  useEffect(() => {
    const versaoSalva = localStorage.getItem('app_versao');
    if (versaoSalva !== VERSAO_ATUAL) {
      console.log('Nova versão detectada (' + VERSAO_ATUAL + '). Forçando atualização...');
      
      // Limpeza profunda
      localStorage.clear();
      sessionStorage.clear();
      
      // Salva nova versão
      localStorage.setItem('app_versao', VERSAO_ATUAL);
      
      // Força reload HARD do navegador para corrigir erro 404 de scripts
      window.location.reload(true); 
    }
  }, []);

  return (
    <Routes>
      {/* --- Rotas Públicas --- */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} /> 
        <Route path="agendar" element={<AgendarPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="consultar" element={<ClientManagePage />} />
      </Route>

      {/* --- Rotas Protegidas (Admin Geral) --- */}
      <Route element={<ProtectedRoute />}> 
        <Route path="/admin" element={<Layout />}>
          <Route index element={<AdminAgendaPage />} />
        </Route>
      </Route>

      {/* --- Rotas EXCLUSIVAS DE ADMIN (Gestão) --- */}
      <Route element={<AdminRoute />}> 
        <Route path="/admin/profissionais" element={<Layout />}>
          <Route index element={<ProfissionaisPage />} /> 
          <Route path=":id" element={<ProfissionalEditPage />} /> 
        </Route>

        <Route path="/admin/servicos" element={<Layout />}>
          <Route index element={<ServicosPage />} />
          <Route path=":id" element={<ServicoEditPage />} />
        </Route>

        <Route path="/admin/dashboard" element={<Layout />}>
          <Route index element={<DashboardPage />} />
        </Route>
        
        <Route path="/admin/historico" element={<Layout />}>
          <Route index element={<HistoricoPage />} />
        </Route>

        <Route path="/admin/clientes" element={<Layout />}>
          <Route index element={<ClientesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;