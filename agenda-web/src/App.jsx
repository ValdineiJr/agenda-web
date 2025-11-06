import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import AgendarPage from './pages/Agendar';
import AdminAgendaPage from './pages/AdminAgenda';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './ProtectedRoute'; 
import AdminRoute from './AdminRoute';
import ProfissionaisPage from './pages/ProfissionaisPage';
import ProfissionalEditPage from './pages/ProfissionalEditPage'; 
import ServicosPage from './pages/ServicosPage';
import DashboardPage from './pages/DashboardPage';
import ClientManagePage from './pages/ClientManagePage';
import HistoricoPage from './pages/HistoricoPage';
import ClientesPage from './pages/ClientesPage';
import ServicoEditPage from './pages/ServicoEditPage';

// NOVO: Importe a nova Home Page
import HomePage from './pages/HomePage';

function App() {
  return (
    <Routes>
      {/* --- Rotas Públicas (Cliente) --- */}
      <Route path="/" element={<Layout />}>
        
        {/* MUDANÇA: A página principal (index) agora é a HomePage */}
        <Route index element={<HomePage />} /> 
        
        {/* NOVO: A página de agendamento agora está em /agendar */}
        <Route path="agendar" element={<AgendarPage />} />

        <Route path="login" element={<LoginPage />} />
        <Route path="consultar" element={<ClientManagePage />} />
      </Route>

      {/* --- Rotas Protegidas (Logado - Admin OU Profissional) --- */}
      <Route element={<ProtectedRoute />}> 
        <Route path="/admin" element={<Layout />}>
          <Route index element={<AdminAgendaPage />} />
        </Route>
      </Route>

      {/* --- Rotas SÓ DE ADMIN (Só Admin) --- */}
      <Route element={<AdminRoute />}> 
        <Route path="/admin/profissionais" element={<Layout />}>
          <Route index element={<ProfissionaisPage />} /> 
          <Route path=":id" element={<ProfissionalEditPage />} />
        </Route>
        <Route path="/admin/servicos" element={<Layout />}>
          <Route index element={<ServicosPage />} />
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

      {/* Rota de Serviços (MODIFICADA) */}
        <Route path="/admin/servicos" element={<Layout />}>
          <Route index element={<ServicosPage />} />
          <Route path=":id" element={<ServicoEditPage />} /> {/* NOVO: Rota de Edição */}
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
     
      
    </Routes>
  );
}

export default App;