import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Caminho corrigido

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função auxiliar para buscar o perfil do usuário
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil:', error);
      }
      setProfile(data);
    } catch (error) {
      console.error('Erro interno perfil:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Verificação Inicial da Sessão (SEM TIMEOUT)
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) throw error;
          setSession(currentSession);
          
          // Se tem sessão, busca o perfil
          if (currentSession?.user) {
            await fetchProfile(currentSession.user.id);
          }
        }
      } catch (error) {
        console.error("Erro na inicialização da sessão:", error);
        // Se der erro grave de token, desloga para evitar loop
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
        // Se logou e não tem perfil, busca agora
        if (!profile) await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false); 
      }
      
      setLoading(false);
    });

    // 3. Auto-Recuperação ao focar na janela (Anti-travamento)
    const handleFocus = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
         if (session) await supabase.auth.signOut();
         setSession(null);
      } else {
         setSession(session);
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const value = {
    session,
    profile,
    loading,
    // Verificações seguras com ?. para não quebrar se o perfil demorar
    isAdmin: profile?.role === 'admin',
    isProfissional: profile?.role === 'professional',
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