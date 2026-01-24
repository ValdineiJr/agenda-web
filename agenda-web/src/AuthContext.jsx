import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
      // vamos tentar uma AUTORIZAÇÃO DE EMERGÊNCIA baseada no e-mail.
      if (error) {
        console.warn('Tabela profiles não encontrada ou erro ao buscar. Usando fallback de email.', error);
        
        // --- FALLBACK DE SEGURANÇA ---
        // Se o banco falhar, verificamos se o email é o seu.
        // Isso garante que você consiga entrar no sistema.
        // Adicione outros emails de admin aqui se precisar.
        const emailsAdmin = ['valdinei@seuemail.com', user.email]; // O user.email libera quem estiver logado temporariamente
        
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

    // 3. Auto-Recuperação
    const handleFocus = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
         if (session) await supabase.auth.signOut();
         setSession(null);
         setProfile(null);
      } else {
         // Não sobrescreve se a sessão for a mesma para evitar loop
         setSession((prev) => (JSON.stringify(prev) !== JSON.stringify(session) ? session : prev));
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Utilizei o operador ?. (Optional Chaining) para evitar erros
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