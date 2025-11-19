import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '/src/supabaseClient.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); 

  // Função auxiliar para buscar o perfil
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select('*')
        .eq('user_id', userId)
        .single(); // Usar single() é mais rápido e seguro aqui
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('AuthContext: Erro ao buscar perfil:', error);
      setProfile(null);
    }
  };

  // Função de Logout
  const doLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setLoading(false);
    window.location.href = '/login'; // Força o redirecionamento limpo
  };

  useEffect(() => {
    let mounted = true;

    // 1. Função que inicializa tudo
    const initializeAuth = async () => {
      try {
        // Verifica a sessão atual IMEDIATAMENTE (não espera evento)
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(currentSession);
          if (currentSession) {
            await fetchProfile(currentSession.user.id);
          }
        }
      } catch (error) {
        console.error("Erro na inicialização:", error);
      } finally {
        if (mounted) setLoading(false); // Libera o app de qualquer jeito
      }
    };

    initializeAuth();

    // 2. Ouve mudanças futuras (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // console.log("Auth Event:", event); // Descomente para debug
        if (mounted) {
          setSession(newSession);
          
          if (newSession) {
            // Só busca perfil se mudou o usuário ou se não temos perfil ainda
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

  // --- Timer de Inatividade (Simplificado e Seguro) ---
  useEffect(() => {
    if (!session) return;

    const timerDuration = 30 * 60 * 1000; // 30 minutos
    let inactivityTimer;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.log("Sessão expirada por inatividade.");
        doLogout();
      }, timerDuration);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    
    resetTimer(); // Inicia

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [session]);

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