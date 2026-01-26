import { useState, useEffect } from 'react'; 
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '/src/AuthContext.jsx'; 

// --- ÍCONES SVG (Mantidos) ---
const Icons = {
  Menu: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>,
  Close: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  CalendarAdd: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  CalendarUser: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
  Chart: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v2.25m0 0V20.25m0-14.25h12m-12 2.25h12m-12 2.25h12" /></svg>,
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  Briefcase: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  Scissors: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>,
  Archive: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>,
  Logout: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>,
  Reload: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
  Login: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
};

const MenuLink = ({ to, children, icon: Icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group whitespace-nowrap
        ${isActive 
          ? 'bg-white/20 text-white font-bold shadow-lg backdrop-blur-sm border border-white/10' 
          : 'text-fuchsia-100 hover:bg-white/10 hover:text-white'
        }
      `}
    >
      <Icon />
      <span className="opacity-100">{children}</span>
    </Link>
  );
};

function Layout() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  
  // LÓGICA DE ABERTURA INTELIGENTE
  const [menuAberto, setMenuAberto] = useState(false); 

  useEffect(() => {
    // Abre automaticamente no desktop
    if (window.innerWidth >= 768) {
      setMenuAberto(true);
    }
  }, []);

  const whatsappLink = "https://wa.me/5519993562075";

  const handleLogout = async () => {
    try {
      await signOut(); 
      navigate('/login'); 
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleForceReset = () => {
    if (window.confirm("⚠️ ATENÇÃO: Isso vai limpar a memória do navegador e reiniciar o sistema.\n\nUse isso apenas se o sistema estiver travado ou não carregar.\n\nDeseja continuar?")) {
      console.warn("Reset forçado pelo usuário.");
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* --- BARRA LATERAL (Sidebar) --- */}
      <aside className={
        `fixed inset-y-0 left-0 z-50 
        flex flex-col 
        bg-fuchsia-900 bg-gradient-to-b from-fuchsia-900 to-purple-900 
        text-white shadow-2xl
        transition-all duration-300 ease-in-out
        overflow-hidden
        
        /* Mobile: Desliza da esquerda */
        ${menuAberto ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 /* Desktop: Sempre na posição correta */
        
        /* Largura Mobile Fixa | Desktop Variável */
        w-72 
        ${menuAberto ? 'md:w-72' : 'md:w-0'} 
        `
      }>
        
        {/* Botão de Fechar (MOBILE) */}
        <button 
          onClick={() => setMenuAberto(false)}
          className="absolute top-4 right-4 p-2 text-fuchsia-200 hover:text-white md:hidden"
          title="Fechar Menu"
        >
          <Icons.Close />
        </button>

        {/* Wrapper do Menu (Conteúdo Interno) */}
        <div className="w-72 flex flex-col h-full flex-shrink-0">
          
          {/* --- CABEÇALHO --- */}
          <div className="flex flex-col items-center justify-center pt-8 pb-6 px-4 border-b border-white/10 bg-black/10">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center p-2 mb-3">
              <img src="/logo-salao.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold tracking-wide whitespace-nowrap">Agenda Salão</h1>
            <p className="text-xs text-fuchsia-200 uppercase tracking-widest mt-1 opacity-70 whitespace-nowrap">
              {profile?.role === 'admin' ? 'Administrador' : (profile ? 'Profissional' : 'Bem-vindo')}
            </p>
          </div>
          
          {/* --- NAVEGAÇÃO --- */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
            
            <MenuLink to="/" icon={Icons.CalendarAdd}>
              Fazer Agendamento
            </MenuLink>

            {session ? (
              <>
                <div className="pt-4 pb-2 px-4 text-xs font-bold text-fuchsia-300/60 uppercase tracking-wider whitespace-nowrap">
                  Minha Área
                </div>
                
                <MenuLink to="/admin" icon={Icons.CalendarUser}>
                  Minha Agenda
                </MenuLink>

                {profile && profile.role === 'admin' && (
                  <>
                    <div className="pt-4 pb-2 px-4 text-xs font-bold text-fuchsia-300/60 uppercase tracking-wider whitespace-nowrap">
                      Gestão
                    </div>

                    <MenuLink to="/admin/dashboard" icon={Icons.Chart}>
                      Dashboard
                    </MenuLink>
                    <MenuLink to="/admin/clientes" icon={Icons.Users}>
                      Clientes
                    </MenuLink>
                    <MenuLink to="/admin/profissionais" icon={Icons.Briefcase}>
                      Profissionais
                    </MenuLink>
                    <MenuLink to="/admin/servicos" icon={Icons.Scissors}>
                      Serviços
                    </MenuLink>
                    <MenuLink to="/admin/historico" icon={Icons.Archive}>
                      Histórico
                    </MenuLink>
                  </>
                )}
                
                <div className="my-4 border-t border-white/10"></div>
                
                <button 
                  onClick={handleLogout} 
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-fuchsia-100 hover:bg-red-500/20 hover:text-red-100 transition-colors whitespace-nowrap"
                >
                  <Icons.Logout />
                  <span className="font-semibold">Sair</span>
                </button>
              </>
            ) : (
              <MenuLink to="/login" icon={Icons.Login}>
                Login
              </MenuLink>
            )}
          </nav>

          {/* --- RODAPÉ (SOS) --- */}
          {session && (
            <div className="p-4 bg-black/20 border-t border-white/10 flex-shrink-0">
               <button 
                 onClick={handleForceReset}
                 className="w-full flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 text-white py-2 rounded-lg text-xs font-bold shadow-md transition-all hover:scale-105 whitespace-nowrap"
                 title="Use isso se o sistema travar"
               >
                 <Icons.Reload />
                 Reiniciar Sistema
               </button>
            </div>
          )}
        </div>
      </aside>

      {/* --- OVERLAY MOBILE --- */}
      {menuAberto && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMenuAberto(false)}
        ></div>
      )}

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <div className="flex flex-col flex-1 h-screen min-w-0 bg-white">
            
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
          
          {/* Botão Menu Desktop */}
          <button 
            onClick={() => setMenuAberto(!menuAberto)}
            className="hidden md:flex items-center justify-center w-10 h-10 mb-6 bg-white border border-gray-200 shadow-sm rounded-full text-gray-600 hover:text-fuchsia-700 hover:border-fuchsia-300 transition-all hover:shadow-md"
            title={menuAberto ? "Ocultar Menu" : "Mostrar Menu"}
          >
            <Icons.Menu />
          </button>

          {/* Botão Menu Mobile */}
          <button 
            onClick={() => setMenuAberto(true)}
            className="md:hidden p-2 mb-4 text-fuchsia-900 bg-fuchsia-50 rounded-lg"
            title="Abrir Menu"
          >
            <Icons.Menu />
          </button>

          <div className="animate-fade-in-up">
            <Outlet />
          </div>
        </main>

        <footer className="p-4 bg-white border-t border-gray-100 text-center text-xs text-gray-400">
          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fuchsia-600 transition-colors flex items-center justify-center gap-1"
          >
            Desenvolvido por Valdinei Rodrigues
          </a>
        </footer>
      </div>

    </div>
  );
}

export default Layout;