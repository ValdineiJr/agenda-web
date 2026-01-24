import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- MELHORIA DE PERFORMANCE ---
  // Referência para controlar o tempo da última checagem e evitar travamentos
  const lastCheckTime = useRef(0);

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
        if (error.message && (error.message.includes('refresh_token_not_found') || error.status === 400)) {
           await supabase.auth.signOut();
           setSession(null);
           setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 2. Escutar mudanças de Login/Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      setSession(session);
      
      if (session?.user) {
        // Se já temos um perfil carregado na memória, não busca de novo para ganhar performance
        if (!profile) await fetchProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // 3. Auto-Recuperação OTIMIZADA (Evita travamentos)
    const handleFocus = async () => {
      const now = Date.now();
      // REGRA: Só permite checar novamente se passou 60 segundos desde a última vez.
      // Isso impede que o sistema trave se a aba ganhar foco muitas vezes.
      if (now - lastCheckTime.current < 60000) {
        return; 
      }
      
      lastCheckTime.current = now; // Atualiza o tempo da última checagem

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
         if (session) await supabase.auth.signOut();
         setSession(null);
         setProfile(null);
      } else {
         // Não sobrescreve se a sessão for idêntica para evitar re-renderização
         setSession((prev) => (JSON.stringify(prev) !== JSON.stringify(session) ? session : prev));
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []); // Array de dependência vazio = roda apenas na montagem

  // Helpers
  const isAdmin = profile?.role === 'admin';
  const isProfissional = profile?.role === 'professional';

  const value = {
    session,
    profile,
    loading,
    isAdmin,
    isProfissional,
    signOut: () => supabase.auth.signOut(),
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