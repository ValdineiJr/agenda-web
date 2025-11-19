import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '/src/supabaseClient.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); 

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('AuthContext: Erro perfil:', error);
      setProfile(null);
    }
  };

  const doLogout = async () => {
    setLoading(true);
    // Tenta logout no Supabase, mas não espera eternamente
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.error("Erro ao deslogar do supabase", e);
    }
    // Limpeza forçada local
    localStorage.clear(); 
    setSession(null);
    setProfile(null);
    setLoading(false);
    window.location.href = '/login'; 
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // --- TRUQUE PARA NÃO TRAVAR ---
        // Criamos uma promessa que falha após 5 segundos
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 5000)
        );

        // Corremos: Quem responder primeiro ganha (Supabase ou o Tempo)
        const { data } = await Promise.race([
            supabase.auth.getSession(),
            timeoutPromise
        ]);

        const currentSession = data?.session;
        
        if (mounted) {
          if (currentSession) {
            setSession(currentSession);
            await fetchProfile(currentSession.user.id);
          }
        }
      } catch (error) {
        console.error("Inicialização demorou ou falhou:", error);
        // Se der erro ou timeout, consideramos não logado e paramos o loading
        if (mounted) {
            setSession(null);
            setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false); // LIBERA A TELA DE QUALQUER JEITO
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (mounted) {
          setSession(newSession);
          if (newSession) {
            if (!profile || profile.user_id !== newSession.user.id) {
               await fetchProfile(newSession.user.id);
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = { session, profile, loading, logout: doLogout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}