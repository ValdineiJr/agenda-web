import { useState } from 'react'; // NOVO: Importa o useState
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '/src/AuthContext.jsx'; 

// NOVO: Um componente de ícone simples para o botão de menu
function IconeMenu() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function Layout() {
  const { session, profile, logout } = useAuth();
  const navigate = useNavigate();
  
  // NOVO: State para controlar se o menu está aberto ou fechado
  const [menuAberto, setMenuAberto] = useState(true); 

  const whatsappLink = "https://wa.me/5519993562075";

  const handleLogout = async () => {
    try {
      await logout(); 
      navigate('/login'); 
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      
      {/* --- BARRA LATERAL (MODIFICADA) --- */}
      <aside className={
        `hidden md:flex flex-col 
        bg-fuchsia-900 text-white shadow-lg  /* COR MUDADA */
        transition-all duration-300 overflow-hidden 
        ${menuAberto ? 'w-64' : 'w-0'}` // LÓGICA DE OCULTAR
      }>
        {/* Wrapper para o conteúdo não quebrar ao fechar */}
        <div className="w-64">
          
          {/* NOVO: Header com Logo */}
          <div className="flex items-center justify-center p-6 border-b border-fuchsia-700">
            <img 
              src="https://api.iconify.design/solar:scissors-bold.svg?color=white" 
              alt="Logo" 
              className="w-10 h-10 mr-3 flex-shrink-0" 
            />
            <span className="text-2xl font-bold whitespace-nowrap">Agenda.Web</span>
          </div>
          
          {/* --- NAVEGAÇÃO (Cores atualizadas) --- */}
          <nav className="flex-1 p-4 space-y-2">
            
            <Link 
              to="/" 
              className="block px-4 py-3 rounded hover:bg-fuchsia-700"
            >
              Fazer Agendamento
            </Link>

            {session ? (
              <>
                <Link 
                  to="/admin" 
                  className="block px-4 py-3 rounded hover:bg-fuchsia-700"
                >
                  Minha Agenda
                </Link>
                
                {profile && profile.role === 'admin' && (
                  <>
                    <Link 
                      to="/admin/dashboard" 
                      className="block px-4 py-3 rounded hover:bg-fuchsia-700"
                    >
                      Dashboard (Relatórios)
                    </Link>
                    <Link 
                      to="/admin/clientes" 
                      className="block px-4 py-3 rounded hover:bg-fuchsia-700"
                    >
                      Gerenciar Clientes
                    </Link>
                    <Link 
                      to="/admin/profissionais" 
                      className="block px-4 py-3 rounded hover:bg-fuchsia-700"
                    >
                      Gerenciar Profissionais
                    </Link>
                    <Link 
                      to="/admin/servicos" 
                      className="block px-4 py-3 rounded hover:bg-fuchsia-700"
                    >
                      Gerenciar Serviços
                    </Link>
                    <Link 
                      to="/admin/historico" 
                      className="block px-4 py-3 rounded hover:bg-fuchsia-700"
                    >
                      Histórico (Arquivados)
                    </Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded hover:bg-fuchsia-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="block px-4 py-3 rounded hover:bg-fuchsia-700"
              >
                Login
              </Link>
            )}

          </nav>
        </div>
      </aside>

      {/* --- CONTEÚDO + FOOTER WRAPPER --- */}
      <div className="flex flex-col flex-1 h-screen">
            
        {/* --- ÁREA DE CONTEÚDO PRINCIPAL (Com o botão) --- */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 relative">
          
          {/* --- NOVO: BOTÃO DE TOGGLE --- */}
          <button 
            onClick={() => setMenuAberto(!menuAberto)}
            className="hidden md:block p-2 mb-4 bg-gray-200 rounded-full text-gray-700 hover:bg-gray-300 transition-all"
            title={menuAberto ? "Ocultar Menu" : "Mostrar Menu"}
          >
            <IconeMenu />
          </button>

          <Outlet />
        </main>

        {/* --- FOOTER (MODIFICADO) --- */}
        <footer className="p-3 bg-fuchsia-900 text-center text-xs text-gray-400">
          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fuchsia-400 transition-colors"
          >
            Desenvolvido por Valdinei Rodrigues - Soluções em T.I
          </a>
        </footer>
      </div>

    </div>
  );
}

export default Layout;