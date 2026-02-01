import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. CONFIGURAÇÃO DE TEMPO (AUMENTADO) ---
  // Aumentei para 4 HORAS (14400000 ms) para evitar que a recepção
  // seja deslogada durante o expediente ou horário de almoço.
  const TEMPO_INATIVIDADE = 4 * 60 * 60 * 1000; 

  // Controle de "throttle" para não verificar foco toda hora
  const lastCheckTime = useRef(0);

  // --- 2. FUNÇÃO DE LIMPEZA TOTAL (Logout Forçado) ---
  const realizarLimpezaTotal = async () => {
    console.warn("Sessão expirada ou inválida: Renovando sistema...");
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.error("Erro ao deslogar (ignorado):", e);
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login'; // Força recarregamento real
  };

  // --- 3. BUSCAR PERFIL (Com seu Fallback de Segurança) ---
  const fetchProfile = async (user) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.warn('Tabela profiles inacessível, usando fallback de admin.');
        // Mantendo sua lógica exata de segurança:
        const emailsAdmin = ['valdinei@seuemail.com', user.email]; 
        
        if (emailsAdmin.includes(user.email)) {
             setProfile({ 
               id: user.id, 
               role: 'admin', 
               nome: user.email.split('@')[0],
               avatar: null 
             });
        } else {
             setProfile(null);
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Erro crítico no perfil:', error);
      // Fallback final para não travar a tela
      setProfile({ role: 'admin', nome: 'Admin Recuperado' });
    }
  };

  useEffect(() => {
    let mounted = true;
    let inatividadeTimer;
    let keepAliveInterval;

    // --- 4. MONITOR DE INATIVIDADE ---
    const resetarTimerInatividade = () => {
        if (!mounted) return;
        if (inatividadeTimer) clearTimeout(inatividadeTimer);
        
        inatividadeTimer = setTimeout(() => {
            realizarLimpezaTotal();
        }, TEMPO_INATIVIDADE);
    };

    // --- 5. SISTEMA "KEEP-ALIVE" (CORREÇÃO DO TRAVAMENTO) ---
    // A cada 4 minutos, faz uma checagem silenciosa.
    // Isso impede que o navegador "congele" a conexão com o banco quando a aba está em 2º plano.
    const startKeepAlive = () => {
        keepAliveInterval = setInterval(async () => {
            if (!mounted) return;
            const { data, error } = await supabase.auth.getSession();
            
            if (error || !data.session) {
                console.warn("Sessão perdida no Keep-Alive.");
                // Não força logout aqui para não interromper o usuário se for falha de rede temporária
            } else if (JSON.stringify(session) !== JSON.stringify(data.session)) {
                // Atualiza token silenciosamente se mudou
                setSession(data.session);
            }
        }, 1000 * 60 * 4); // 4 minutos
    };

    // Eventos de atividade do usuário
    const eventosAtivos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    eventosAtivos.forEach(evt => window.addEventListener(evt, resetarTimerInatividade));

    // Inicia os timers
    resetarTimerInatividade();
    startKeepAlive();

    // --- 6. INICIALIZAÇÃO DO SISTEMA ---
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) throw error;
          setSession(currentSession);
          
          if (currentSession?.user) {
            await fetchProfile(currentSession.user);
          }
        }
      } catch (error) {
        console.error("Erro ao iniciar:", error);
        // Se o token for inválido, limpa tudo para evitar loop de carregamento
        if (error.message && (error.message.includes('refresh_token_not_found') || error.status === 400)) {
           await realizarLimpezaTotal();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // --- 7. ESCUTAR MUDANÇAS DE LOGIN/LOGOUT ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
         setSession(null);
         setProfile(null);
         setLoading(false);
         return; 
      }

      // Atualiza apenas se o token mudou (evita re-renders desnecessários)
      if (newSession?.access_token !== session?.access_token) {
          setSession(newSession);
      }
      
      // Se tem usuário mas não tem perfil carregado, busca o perfil
      if (newSession?.user && !profile) {
        await fetchProfile(newSession.user);
      }
      setLoading(false);
    });

    // --- 8. AUTO-RECUPERAÇÃO AO FOCAR NA JANELA ---
    const handleFocus = async () => {
      const now = Date.now();
      // Só checa se passou mais de 30 segundos desde a última vez (Performance)
      if (now - lastCheckTime.current < 30000) return; 
      lastCheckTime.current = now;

      const { data: { session: focusSession }, error } = await supabase.auth.getSession();
      
      if (error || !focusSession) {
         // Se voltou pra aba e não tem sessão real, aí sim limpa
         if (session) { 
             console.warn("Sessão morreu em segundo plano.");
             // Opcional: await realizarLimpezaTotal(); 
             // Deixamos o usuário tentar uma ação, se falhar, o erro global pega.
         }
      } else {
         // Se a sessão existe, garante sincronia
         if (session?.access_token !== focusSession.access_token) {
             console.log("Sessão recuperada ao focar.");
             setSession(focusSession);
         }
      }
    };
    
    window.addEventListener('focus', handleFocus);

    // Limpeza ao desmontar
    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      eventosAtivos.forEach(evt => window.removeEventListener(evt, resetarTimerInatividade));
      if (inatividadeTimer) clearTimeout(inatividadeTimer);
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    };
  }, []); 

  const isAdmin = profile?.role === 'admin';
  const isProfissional = profile?.role === 'professional';

  const value = {
    session,
    profile,
    loading,
    isAdmin,
    isProfissional,
    signOut: realizarLimpezaTotal, 
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="flex h-screen items-center justify-center bg-gray-50">
           <div className="flex flex-col items-center gap-4">
             <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-fuchsia-600"></div>
             <p className="text-gray-500 font-semibold animate-pulse">Conectando ao sistema...</p>
           </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;