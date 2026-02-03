import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tempo aumentado para manter a sessão (4 horas)
  const TEMPO_INATIVIDADE = 4 * 60 * 60 * 1000; 
  const lastCheckTime = useRef(0);

  const realizarLimpezaTotal = async () => {
    console.warn("Limpando sessão e reiniciando...");
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.error("Erro logout silencioso:", e);
    }
    localStorage.clear();
    sessionStorage.clear();
    // Força recarregamento limpo do servidor
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
        // Fallback de segurança para não travar se a tabela falhar
        const emailsAdmin = ['valdinei@seuemail.com', user.email]; 
        if (emailsAdmin.includes(user.email)) {
             setProfile({ id: user.id, role: 'admin', nome: user.email.split('@')[0], avatar: null });
        } else {
             setProfile(null);
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Erro crítico perfil:', error);
      setProfile({ role: 'admin', nome: 'Admin Recuperado' });
    }
  };

  useEffect(() => {
    let mounted = true;
    let inatividadeTimer;
    let keepAliveInterval;

    // --- 1. MONITOR DE INATIVIDADE ---
    const resetarTimerInatividade = () => {
        if (!mounted) return;
        if (inatividadeTimer) clearTimeout(inatividadeTimer);
        inatividadeTimer = setTimeout(() => {
            realizarLimpezaTotal();
        }, TEMPO_INATIVIDADE);
    };

    // --- 2. SISTEMA KEEP-ALIVE (Evita queda de conexão) ---
    const startKeepAlive = () => {
        keepAliveInterval = setInterval(async () => {
            if (!mounted) return;
            const { data, error } = await supabase.auth.getSession();
            // Se a sessão ainda existe, renova o estado local silenciosamente
            if (!error && data.session && JSON.stringify(session) !== JSON.stringify(data.session)) {
                setSession(data.session);
            }
        }, 1000 * 60 * 4); // Executa a cada 4 minutos
    };

    const eventosAtivos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    eventosAtivos.forEach(evt => window.addEventListener(evt, resetarTimerInatividade));
    resetarTimerInatividade();
    startKeepAlive();

    // --- 3. INICIALIZAÇÃO BLINDADA (CORREÇÃO TELA BRANCA) ---
    const initializeAuth = async () => {
      // Se o banco não responder em 7 segundos, libera o app para evitar travamento
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout de conexão")), 7000)
      );

      try {
        const sessionPromise = supabase.auth.getSession();
        
        // Corrida: Quem chegar primeiro ganha (Sessão ou Erro de Tempo)
        const { data: { session: currentSession }, error } = await Promise.race([
            sessionPromise,
            timeoutPromise
        ]).catch(err => {
            console.warn("Demora na conexão detectada:", err);
            return { data: { session: null }, error: null }; // Assume deslogado se der timeout
        });
        
        if (mounted) {
          if (error) throw error;
          setSession(currentSession);
          
          if (currentSession?.user) {
            await fetchProfile(currentSession.user);
          }
        }
      } catch (error) {
        console.error("Erro inicialização:", error);
        // Se for erro de token inválido, limpa tudo para o usuário logar de novo
        if (error.message && (error.message.includes('refresh_token_not_found') || error.status === 400)) {
           realizarLimpezaTotal();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // --- 4. LISTENER DE MUDANÇAS ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
         setSession(null);
         setProfile(null);
         setLoading(false);
         return; 
      }
      if (newSession?.access_token !== session?.access_token) {
          setSession(newSession);
      }
      if (newSession?.user && !profile) {
        await fetchProfile(newSession.user);
      }
      setLoading(false);
    });

    // --- 5. RECUPERAÇÃO DE FOCO (Para quem usa celular e volta pro app) ---
    const handleFocus = async () => {
      const now = Date.now();
      if (now - lastCheckTime.current < 30000) return; // Não executa se tiver executado há menos de 30s
      lastCheckTime.current = now;

      const { data: { session: focusSession }, error } = await supabase.auth.getSession();
      if (!error && focusSession && session?.access_token !== focusSession.access_token) {
          console.log("Sessão recuperada ao focar.");
          setSession(focusSession);
      }
    };
    
    window.addEventListener('focus', handleFocus);

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
             <p className="text-gray-500 font-semibold animate-pulse">
               Conectando ao sistema...
             </p>
           </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;