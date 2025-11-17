import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '/src/supabaseClient.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); 

  // --- Função de Logout (para o timer usar) ---
  const doLogout = () => {
    console.log("Sessão expirada por inatividade. Deslogando...");
    supabase.auth.signOut();
    // A página será redirecionada automaticamente pelo ProtectedRoute
  };

  // --- Efeito 1: O Listener de Autenticação (Como antes) ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("AuthContext: onAuthStateChange disparou!");
        setSession(session); 

        try {
          if (session) {
            console.log("AuthContext: Buscando perfil com o UUID:", session.user.id);
            const { data, error } = await supabase
              .from('profissionais')
              .select('*')
              .eq('user_id', session.user.id);
            
            if (error) throw error;
            if (data && data.length > 0) {
              console.log("AuthContext: Perfil encontrado:", data[0]);
              setProfile(data[0]);
            } else {
              console.log("AuthContext: NENHUM perfil encontrado com esse UUID.");
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error('AuthContext: A BUSCA FALHOU. Erro:', error);
          setProfile(null);
        } finally {
          console.log("AuthContext: Carregamento finalizado.");
          setLoading(false);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // --- NOVO EFEITO 2: O Timer de Inatividade ---
  useEffect(() => {
    let inactivityTimer;

    // Função que reseta o timer
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer); // Limpa o timer antigo
      
      // Cria um novo timer
      inactivityTimer = setTimeout(() => {
        // Se o timer estourar (30 min), chama o logout
        doLogout();
      }, 1800000); // 30 minutos em milissegundos
    };

    // Lista de eventos que contam como "atividade"
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    
    // Funções para adicionar e remover os "ouvintes" de atividade
    const setupListeners = () => {
      events.forEach(event => window.addEventListener(event, resetTimer));
      resetTimer(); // Inicia o timer na primeira vez
    };
    
    const removeListeners = () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };

    // LÓGICA PRINCIPAL:
    // Se o usuário está logado (sessão existe)...
    if (session) {
      setupListeners(); // Começa a ouvir por atividade
    } else {
      removeListeners(); // Se não está logado, para de ouvir
    }

    // "Limpeza": Remove os ouvintes se o componente for desmontado
    return () => {
      removeListeners();
    };
    
  }, [session]); // Este efeito re-roda sempre que o usuário loga ou desloga
  // --- FIM DO NOVO EFEITO ---


  // Valor que o "cérebro" fornece para o App
  const value = { session, profile, loading, logout: doLogout };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        Carregando...
      </div>
    );
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}