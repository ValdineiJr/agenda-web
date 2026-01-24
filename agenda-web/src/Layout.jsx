import { useState } from 'react'; 
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '/src/AuthContext.jsx'; 

// Componente de ícone (Menu)
function IconeMenu() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

// Componente de ícone (Fechar "X")
function IconeX() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Layout() {
  // --- CORREÇÃO AQUI ---
  // Trocamos 'logout' por 'signOut' para bater com o AuthContext
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false); 
  const whatsappLink = "https://wa.me/5519993562075";

  const handleLogout = async () => {
    try {
      // Chama a função de limpeza total que criamos no Contexto
      await signOut(); 
      // O signOut já força o redirecionamento, mas mantemos o navigate por segurança
      navigate('/login'); 
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      
      {/* --- BARRA LATERAL --- */}
      <aside className={
        `fixed inset-y-0 left-0 z-50 
        flex flex-col text-white shadow-lg
        bg-fuchsia-900 
        transition-all duration-300 overflow-hidden
        
        ${menuAberto ? 'translate-x-0' : '-translate-x-full'} /* Mobile */
        
        md:relative md:translate-x-0 /* Desktop */
        ${menuAberto ? 'md:w-64' : 'md:w-0'} /* Desktop Toggle */
        `
      }>
        
        {/* Botão de Fechar (MOBILE) */}
        <button 
          onClick={() => setMenuAberto(false)}
          className="absolute top-4 right-4 p-2 text-fuchsia-200 hover:text-white md:hidden"
          title="Fechar Menu"
        >
          <IconeX />
        </button>

        {/* Wrapper do Menu */}
        <div className="w-64">
          
          <div className="flex items-center justify-center p-6 border-b border-fuchsia-700">
           <img src="/logo-salao.png" alt="Logo" className="w-10 h-10" />
            <span className="text-2xl font-bold whitespace-nowrap"><h1>Agenda Salão</h1></span>
          </div>
          
          {/* Navegação */}
          <nav className="flex-1 p-4 space-y-2">
            <Link to="/" className="block px-4 py-3 rounded hover:bg-fuchsia-700">
              Fazer Agendamento
            </Link>
            {session ? (
              <>
                <Link to="/admin" className="block px-4 py-3 rounded hover:bg-fuchsia-700">
                  Minha Agenda
                </Link>
                {profile && profile.role === 'admin' && (
                  <>
                    <Link to="/admin/dashboard" className="block px-4 py-3 rounded hover:bg-fuchsia-700">
                      Dashboard (Relatórios)
                    </Link>
                    <Link to="/admin/clientes" className="block px-4 py-3 rounded hover:bg-fuchsia-700">
                      Gerenciar Clientes
                    </Link>
                    <Link to="/admin/profissionais" className="block px-4 py-3 rounded hover:bg-fuchsia-700">
                      Gerenciar Profissionais
                    </Link>
                    <Link to="/admin/servicos" className="block px-4 py-3 rounded hover:bg-fuchsia-700">
                      Gerenciar Serviços
                    </Link>
                    <Link to="/admin/historico" className="block px-4 py-3 rounded hover:bg-fuchsia-700">
                      Histórico (Arquivados)
                    </Link>
                  </>
                )}
                {/* O Botão agora chama o handleLogout corrigido */}
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded hover:bg-fuchsia-700 text-red-200 hover:text-white font-bold">
                  Sair (Logout)
                </button>
              </>
            ) : (
              <Link to="/login" className="block px-4 py-3 rounded hover:bg-fuchsia-700">
                Login
              </Link>
            )}
          </nav>
        </div>
      </aside>

      {/* --- OVERLAY MOBILE --- */}
      {menuAberto && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMenuAberto(false)}
        ></div>
      )}

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <div className="flex flex-col flex-1 h-screen min-w-0">
            
        <main className="flex-1 overflow-y-auto p-4 md:p-10 relative">
          
          {/* Botão Menu Desktop */}
          <button 
            onClick={() => setMenuAberto(!menuAberto)}
            className="hidden md:block p-2 mb-4 bg-gray-200 rounded-full text-gray-700 hover:bg-gray-300 transition-all"
            title={menuAberto ? "Ocultar Menu" : "Mostrar Menu"}
          >
            <IconeMenu />
          </button>

          {/* Botão Menu Mobile */}
          <button 
            onClick={() => setMenuAberto(true)}
            className="p-2 mb-4 text-fuchsia-900 md:hidden"
            title="Abrir Menu"
          >
            <IconeMenu />
          </button>

          <Outlet />
        </main>

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