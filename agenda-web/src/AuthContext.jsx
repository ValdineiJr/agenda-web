import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. CONFIGURAÇÃO DE TEMPO (AUMENTADO PARA 12 HORAS) ---
  // Cobre o dia todo de trabalho sem deslogar
  const TEMPO_INATIVIDADE = 12 * 60 * 60 * 1000; 

  const lastCheckTime = useRef(0);

  const realizarLimpezaTotal = async () => {
    console.warn("Sessão expirada: Renovando sistema...");
    try { await supabase.auth.signOut(); } catch (e) { /* ignore */ }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login'; 
  };

  const fetchProfile = async (user) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        // Fallback para admin principal se a tabela falhar
        const emailsAdmin = ['valdinei@seuemail.com', user.email]; 
        if (emailsAdmin.includes(user.email)) {
             setProfile({ id: user.id, role: 'admin', nome: user.email.split('@')[0], avatar: null });
        } else {
             console.error("Perfil não encontrado.");
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Erro perfil:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let inatividadeTimer;
    let keepAliveInterval;

    // --- 2. DETECTOR DE NOVA VERSÃO (CORREÇÃO ERRO 404) ---
    // Se o navegador tentar carregar um arquivo antigo e falhar, recarrega a página
    const handleChunkError = (event) => {
      if (event?.message && (
          event.message.includes('Loading chunk') || 
          event.message.includes('Importing a module script failed') ||
          event.message.includes('missing')
         )) {
         console.log("Nova versão detectada (Erro de Chunk). Atualizando...");
         window.location.reload(true);
      }
    };
    window.addEventListener('error', handleChunkError);

    // --- 3. MONITOR DE INATIVIDADE ---
    const resetarTimerInatividade = () => {
        if (!mounted) return;
        if (inatividadeTimer) clearTimeout(inatividadeTimer);
        inatividadeTimer = setTimeout(() => {
            realizarLimpezaTotal();
        }, TEMPO_INATIVIDADE);
    };

    // --- 4. KEEPALIVE (Mantém token ativo) ---
    const startKeepAlive = () => {
        keepAliveInterval = setInterval(async () => {
            if (!mounted) return;
            const { data, error } = await supabase.auth.getSession();
            if (!error && data.session && !session) setSession(data.session);
        }, 1000 * 60 * 10); // 10 minutos
    };

    const eventosAtivos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    eventosAtivos.forEach(evt => window.addEventListener(evt, resetarTimerInatividade));
    resetarTimerInatividade();
    startKeepAlive();

    // --- 5. INICIALIZAÇÃO ---
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            // Se o refresh token for inválido, limpa tudo
            if (error.message.includes('refresh_token_not_found') || error.status === 400) {
                realizarLimpezaTotal();
                return;
            }
        }

        if (mounted && data.session) {
            setSession(data.session);
            await fetchProfile(data.session.user);
        }
      } catch (error) {
        console.error("Erro auth init:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // --- 6. LISTENER DO SUPABASE ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
         setSession(null); setProfile(null); setLoading(false); return; 
      }
      
      if (newSession?.access_token !== session?.access_token) {
          setSession(newSession);
      }
      
      if (newSession?.user && !profile) {
        await fetchProfile(newSession.user);
      }
      setLoading(false);
    });

    // --- 7. RECUPERAÇÃO DE FOCO (Celular) ---
    const handleFocus = async () => {
      const now = Date.now();
      if (now - lastCheckTime.current < 60000) return; // Throttle 1min
      lastCheckTime.current = now;
      const { data } = await supabase.auth.getSession();
      if (data.session && session?.access_token !== data.session.access_token) {
          setSession(data.session);
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('error', handleChunkError); // Limpa listener
      window.removeEventListener('focus', handleFocus);
      eventosAtivos.forEach(evt => window.removeEventListener(evt, resetarTimerInatividade));
      if (inatividadeTimer) clearTimeout(inatividadeTimer);
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    };
  }, []); 

  const isAdmin = profile?.role === 'admin';
  const isProfissional = profile?.role === 'professional';

  const value = { session, profile, loading, isAdmin, isProfissional, signOut: realizarLimpezaTotal };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="flex h-screen items-center justify-center bg-gray-50">
           <div className="flex flex-col items-center gap-4">
             <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-fuchsia-600"></div>
             <p className="text-gray-500 font-semibold animate-pulse">Conectando...</p>
           </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;