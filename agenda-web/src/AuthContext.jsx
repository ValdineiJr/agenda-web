import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- CONFIGURAÇÃO DE TEMPO (NOVA FUNCIONALIDADE) ---
  // Tempo em milissegundos para derrubar a sessão e limpar cache por inatividade.
  // 45 minutos = 45 * 60 * 1000
  const TEMPO_INATIVIDADE = 45 * 60 * 1000; 

  // Referência para controlar o tempo da última checagem de foco (Throttle)
  const lastCheckTime = useRef(0);

  // --- FUNÇÃO DE LIMPEZA TOTAL (Logout Forçado) ---
  // Esta função limpa o cache, storage e redireciona, prevenindo travamentos por memória cheia.
  const realizarLimpezaTotal = async () => {
    console.warn("Inatividade detectada ou erro crítico: Limpando sistema...");
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.error("Erro ao deslogar supabase (ignorado):", e);
    }
    // Limpa tudo que pode estar "sujando" a memória do navegador
    localStorage.clear();
    sessionStorage.clear();
    // Força o recarregamento real da página indo para o login
    window.location.href = '/login';
  };

  // Função auxiliar para buscar o perfil do usuário
  const fetchProfile = async (user) => {
    try {
      // Tenta buscar na tabela 'profiles'
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      // Se a tabela não existir (Erro 404/PGRST205) ou der erro,
      // usamos o fallback de emergência que você já tinha.
      if (error) {
        console.warn('Fallback de perfil ativado (Tabela ausente ou erro).');
        
        // --- FALLBACK DE SEGURANÇA MANTIDO ---
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
      // Fallback de emergência em caso de crash total
      setProfile({ role: 'admin', nome: 'Admin Recuperado' });
    }
  };

  useEffect(() => {
    let mounted = true;
    let inatividadeTimer; // Variável para controlar o timer de inatividade

    // --- LÓGICA DO MONITOR DE INATIVIDADE ---
    const resetarTimerInatividade = () => {
        if (!mounted) return;
        
        // Limpa o timer anterior (o utilizador mexeu-se)
        if (inatividadeTimer) clearTimeout(inatividadeTimer);
        
        // Cria um novo timer para limpar tudo daqui a 45 min
        inatividadeTimer = setTimeout(() => {
            realizarLimpezaTotal();
        }, TEMPO_INATIVIDADE);
    };

    // Adiciona "ouvintes" para saber se o utilizador está ativo
    window.addEventListener('mousemove', resetarTimerInatividade);
    window.addEventListener('keydown', resetarTimerInatividade);
    window.addEventListener('click', resetarTimerInatividade);
    window.addEventListener('scroll', resetarTimerInatividade);
    window.addEventListener('touchstart', resetarTimerInatividade);

    // Inicia o timer assim que a tela carrega
    resetarTimerInatividade();

    // 1. Verificação Inicial da Sessão
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
        console.error("Erro na inicialização da sessão:", error);
        // Se der erro grave de token, já limpa tudo para evitar tela branca
        if (error.message && (error.message.includes('refresh_token_not_found') || error.status === 400)) {
           await realizarLimpezaTotal();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 2. Escutar mudanças de Login/Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Se houver logout explícito ou utilizador deletado, limpa estados
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
         setSession(null);
         setProfile(null);
         setLoading(false);
         return; 
      }

      setSession(session);
      
      if (session?.user) {
        // Se já temos um perfil carregado, não busca de novo (Performance)
        if (!profile) await fetchProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // 3. Auto-Recuperação OTIMIZADA (Throttle de 60s mantido)
    const handleFocus = async () => {
      const now = Date.now();
      
      // REGRA: Só permite checar novamente se passou 60 segundos.
      if (now - lastCheckTime.current < 60000) {
        return; 
      }
      
      lastCheckTime.current = now; // Atualiza o tempo da última checagem

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
         // Se perdeu a sessão, faz a limpeza total
         if (session) await realizarLimpezaTotal();
         setSession(null);
         setProfile(null);
      } else {
         // Não sobrescreve se a sessão for idêntica
         setSession((prev) => (JSON.stringify(prev) !== JSON.stringify(session) ? session : prev));
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      
      // Remove os ouvintes de inatividade ao sair
      window.removeEventListener('mousemove', resetarTimerInatividade);
      window.removeEventListener('keydown', resetarTimerInatividade);
      window.removeEventListener('click', resetarTimerInatividade);
      window.removeEventListener('scroll', resetarTimerInatividade);
      window.removeEventListener('touchstart', resetarTimerInatividade);
      if (inatividadeTimer) clearTimeout(inatividadeTimer);
    };
  }, []); 

  // Helpers
  const isAdmin = profile?.role === 'admin';
  const isProfissional = profile?.role === 'professional';

  const value = {
    session,
    profile,
    loading,
    isAdmin,
    isProfissional,
    // Substitui o signOut normal pela Limpeza Total para garantir que nada fique na memória
    signOut: realizarLimpezaTotal, 
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="flex h-screen items-center justify-center bg-gray-50">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;