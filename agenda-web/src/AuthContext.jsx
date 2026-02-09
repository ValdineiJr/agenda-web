import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. CONFIGURAÇÃO DE TEMPO (AUMENTADO PARA 12 HORAS) ---
  // Isso evita que a recepção seja deslogada durante todo o dia de trabalho
  const TEMPO_INATIVIDADE = 12 * 60 * 60 * 1000; 

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
        // Fallback de segurança: Se o perfil falhar, tenta reconstruir um básico se for admin conhecido
        const emailsAdmin = ['valdinei@seuemail.com', user.email]; 
        if (emailsAdmin.includes(user.email)) {
             setProfile({ id: user.id, role: 'admin', nome: user.email.split('@')[0], avatar: null });
        } else {
             // Se não achou perfil e não é admin conhecido, pode ser um erro de conexão momentâneo
             console.error("Perfil não encontrado no banco.");
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Erro crítico ao buscar perfil:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let inatividadeTimer;
    let keepAliveInterval;

    // --- 3. MONITOR DE INATIVIDADE ---
    const resetarTimerInatividade = () => {
        if (!mounted) return;
        if (inatividadeTimer) clearTimeout(inatividadeTimer);
        inatividadeTimer = setTimeout(() => {
            realizarLimpezaTotal();
        }, TEMPO_INATIVIDADE);
    };

    // --- 4. SISTEMA KEEP-ALIVE (Mantém a conexão ativa) ---
    const startKeepAlive = () => {
        keepAliveInterval = setInterval(async () => {
            if (!mounted) return;
            const { data, error } = await supabase.auth.getSession();
            
            // Se a sessão existe no Supabase mas caiu no estado local, restaura
            if (!error && data.session && !session) {
                setSession(data.session);
            }
        }, 1000 * 60 * 5); // Verifica a cada 5 minutos
    };

    const eventosAtivos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    eventosAtivos.forEach(evt => window.addEventListener(evt, resetarTimerInatividade));
    resetarTimerInatividade();
    startKeepAlive();

    // --- 5. INICIALIZAÇÃO BLINDADA (CORREÇÃO DO TRAVAMENTO) ---
    const initializeAuth = async () => {
      try {
        // Removemos o "race" com timeout curto que causava o travamento.
        // Agora esperamos o Supabase responder, mesmo que demore um pouco.
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            // Se der erro de refresh token, aí sim limpamos
            if (error.message.includes('refresh_token_not_found') || error.status === 400) {
                realizarLimpezaTotal();
                return;
            }
        }

        if (mounted) {
          if (data.session) {
            setSession(data.session);
            await fetchProfile(data.session.user);
          }
        }
      } catch (error) {
        console.error("Erro na inicialização da auth:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // --- 6. LISTENER DE MUDANÇAS ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
         setSession(null);
         setProfile(null);
         setLoading(false);
         return; 
      }
      
      // Atualiza sessão se mudou
      if (newSession?.access_token !== session?.access_token) {
          setSession(newSession);
      }
      
      // Se temos usuário mas não perfil, busca o perfil
      if (newSession?.user && !profile) {
        await fetchProfile(newSession.user);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
             {/* Spinner Visual */}
             <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-fuchsia-600"></div>
             <p className="text-gray-500 font-semibold animate-pulse">
               Aguarde por favor, Conectando ao sistema...
             </p>
           </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;