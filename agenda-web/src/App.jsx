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
import ClientManagePage from './pages/ClientManagePage'; // Página de consulta do cliente
import HistoricoPage from './pages/HistoricoPage';
import ClientesPage from './pages/ClientesPage'; // Página de gestão de clientes (Admin)
import HomePage from './pages/HomePage';

// --- CONTROLE DE VERSÃO ---
const VERSAO_ATUAL = '1.0.2'; // Subi para 1.0.2 para garantir que pegue as rotas novas

function App() {

  // --- LÓGICA DE LIMPEZA DE CACHE AUTOMÁTICA ---
  useEffect(() => {
    const versaoSalva = localStorage.getItem('app_versao');
    if (versaoSalva !== VERSAO_ATUAL) {
      console.log('Nova versão detectada (' + VERSAO_ATUAL + '). Limpando cache...');
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('app_versao', VERSAO_ATUAL);
      // O reload é opcional, mas ajuda a garantir a limpeza
      // window.location.reload(); 
    }
  }, []);

  return (
    <Routes>
      {/* --- Rotas Públicas (Cliente) --- */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} /> 
        <Route path="agendar" element={<AgendarPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="consultar" element={<ClientManagePage />} />
      </Route>

      {/* --- Rotas Protegidas (Admin Geral - Agenda) --- */}
      <Route element={<ProtectedRoute />}> 
        <Route path="/admin" element={<Layout />}>
          <Route index element={<AdminAgendaPage />} />
        </Route>
      </Route>

      {/* --- Rotas EXCLUSIVAS DE ADMIN (Gestão) --- */}
      <Route element={<AdminRoute />}> 
        
        {/* Gestão de Profissionais */}
        <Route path="/admin/profissionais" element={<Layout />}>
          <Route index element={<ProfissionaisPage />} /> 
          <Route path=":id" element={<ProfissionalEditPage />} /> {/* Faltava essa rota de edição */}
        </Route>

        {/* Gestão de Serviços */}
        <Route path="/admin/servicos" element={<Layout />}>
          <Route index element={<ServicosPage />} />
          <Route path=":id" element={<ServicoEditPage />} />
        </Route>

        {/* Dashboards e Relatórios */}
        <Route path="/admin/dashboard" element={<Layout />}>
          <Route index element={<DashboardPage />} />
        </Route>
        
        <Route path="/admin/historico" element={<Layout />}>
          <Route index element={<HistoricoPage />} />
        </Route>

        {/* Gestão de Clientes */}
        <Route path="/admin/clientes" element={<Layout />}>
          <Route index element={<ClientesPage />} />
        </Route>

      </Route>
    </Routes>
  );
}

export default App;