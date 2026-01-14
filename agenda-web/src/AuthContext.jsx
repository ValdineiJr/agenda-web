import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

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

    // 1. Verificação Inicial da Sessão
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) throw error;
          setSession(currentSession);
          if (currentSession?.user) {
            await fetchProfile(currentSession.user.id);
          }
        }
      } catch (error) {
        console.error("Erro na inicialização da sessão:", error);
        // Se der erro grave de sessão (ex: refresh token inválido), desloga
        if (error.message.includes('refresh_token_not_found') || error.status === 400) {
           await supabase.auth.signOut();
           setSession(null);
           setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 2. Escutar mudanças de Login/Logout/Token Refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      setSession(session);
      
      if (session?.user) {
        // Se acabou de logar e não tem perfil carregado, busca.
        if (!profile) await fetchProfile(session.user.id);
      } else {
        // Se deslogou
        setProfile(null);
        setLoading(false); 
      }
      
      // Garante que o loading saia após qualquer mudança de estado
      setLoading(false);
    });

    // 3. (NOVO) Auto-Recuperação ao focar na janela
    // Isso corrige o problema da aba que ficou aberta muito tempo
    const handleFocus = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
         // Se ao voltar para a aba a sessão morreu, força o logout visualmente
         // para o usuário não clicar no vazio.
         if (session) await supabase.auth.signOut();
         setSession(null);
      } else {
         // Se a sessão existe, atualiza o estado local para garantir
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
    isAdmin: profile?.role === 'admin',
    isProfissional: profile?.role === 'professional',
    signOut: () => supabase.auth.signOut(),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        // Um loading simples enquanto verifica a sessão inicial
        <div className="flex h-screen items-center justify-center bg-gray-50">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;