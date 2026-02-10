import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 12 Horas de sessão
  const TEMPO_INATIVIDADE = 12 * 60 * 60 * 1000; 
  const lastCheckTime = useRef(0);

  const realizarLimpezaTotal = async () => {
    try { await supabase.auth.signOut(); } catch (e) { /* ignore */ }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login'; 
  };

  const fetchProfile = async (user) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (error) {
        // Fallback de segurança
        const emailsAdmin = ['valdinei@seuemail.com', user.email]; 
        if (emailsAdmin.includes(user.email)) {
             setProfile({ id: user.id, role: 'admin', nome: user.email.split('@')[0], avatar: null });
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Erro perfil:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let inatividadeTimer;
    let keepAliveInterval;

    // --- BLINDAGEM 1: Recarregamento automático em caso de erro de versão (404) ---
    const handleChunkError = (event) => {
      if (event?.message && (
          event.message.includes('Loading chunk') || 
          event.message.includes('Importing a module script failed') ||
          event.message.includes('missing') ||
          event.message.includes('404')
         )) {
         // Se der erro de arquivo antigo, recarrega a página forçadamente
         window.location.reload(true);
      }
    };
    window.addEventListener('error', handleChunkError);

    const resetarTimerInatividade = () => {
        if (!mounted) return;
        if (inatividadeTimer) clearTimeout(inatividadeTimer);
        inatividadeTimer = setTimeout(() => realizarLimpezaTotal(), TEMPO_INATIVIDADE);
    };

    const startKeepAlive = () => {
        keepAliveInterval = setInterval(async () => {
            if (!mounted) return;
            // Verifica conexão silenciosamente
            const { data } = await supabase.auth.getSession();
            if (data?.session && !session) setSession(data.session);
        }, 1000 * 60 * 5); 
    };

    const eventos = ['mousemove', 'click', 'keydown', 'touchstart'];
    eventos.forEach(evt => window.addEventListener(evt, resetarTimerInatividade));
    resetarTimerInatividade();
    startKeepAlive();

    // --- BLINDAGEM 2: Inicialização Robusta ---
    const initializeAuth = async () => {
      try {
        // Timeout de segurança: Se o Supabase não responder em 6s, libera o loading
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject("Timeout"), 6000));
        const sessionPromise = supabase.auth.getSession();

        const { data, error } = await Promise.race([sessionPromise, timeoutPromise])
          .catch(() => ({ data: { session: null }, error: null })); // Se der timeout, assume sem sessão

        if (error) {
            if (error.message.includes('refresh_token_not_found')) {
                realizarLimpezaTotal();
                return;
            }
        }

        if (mounted && data?.session) {
            setSession(data.session);
            await fetchProfile(data.session.user);
        }
      } catch (error) {
        console.error("Auth init:", error);
      } finally {
        if (mounted) setLoading(false); // Garante que o loading sempre para
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
         setSession(null); setProfile(null); setLoading(false); return; 
      }
      if (newSession?.access_token !== session?.access_token) setSession(newSession);
      if (newSession?.user && !profile) await fetchProfile(newSession.user);
      setLoading(false);
    });

    const handleFocus = async () => {
      const now = Date.now();
      if (now - lastCheckTime.current < 60000) return;
      lastCheckTime.current = now;
      const { data } = await supabase.auth.getSession();
      if (data.session && session?.access_token !== data.session.access_token) setSession(data.session);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('focus', handleFocus);
      eventos.forEach(evt => window.removeEventListener(evt, resetarTimerInatividade));
      if (inatividadeTimer) clearTimeout(inatividadeTimer);
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    };
  }, []); 

  const isAdmin = profile?.role === 'admin';
  const isProfissional = profile?.role === 'professional';

  return (
    <AuthContext.Provider value={{ session, profile, loading, isAdmin, isProfissional, signOut: realizarLimpezaTotal }}>
      {!loading ? children : (
        <div className="flex h-screen items-center justify-center bg-gray-50">
           <div className="flex flex-col items-center gap-4">
             <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-fuchsia-600"></div>
             <p className="text-gray-500 font-semibold animate-pulse">Iniciando sistema...</p>
           </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;