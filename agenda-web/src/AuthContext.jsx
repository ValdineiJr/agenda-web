import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

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
      setProfile(data || null); // Garante que seja null se vier undefined
    } catch (error) {
      console.error('Erro interno perfil:', error);
      setProfile(null); 
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
        if (!profile) await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // 3. Auto-Recuperação mantida (Sua funcionalidade original)
    const handleFocus = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
         if (session) await supabase.auth.signOut();
         setSession(null);
         setProfile(null); // Adicionei segurança para limpar perfil também
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

  // --- CORREÇÃO APLICADA ---
  // Utilizei o operador ?. (Optional Chaining).
  // Isso previne 100% o erro "Cannot read properties of null".
  // Se profile for null, ele retorna undefined (falso) automaticamente.
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