import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '/src/supabaseClient.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("AuthContext: onAuthStateChange disparou!"); // DEBUG 1
        setSession(session); 

        try {
          if (session) {
            console.log("AuthContext: Buscando perfil com o UUID:", session.user.id); // DEBUG 2
            
            // --- ESTA É A BUSCA REAL ---
            const { data, error } = await supabase
              .from('profissionais')
              .select('*')
              .eq('user_id', session.user.id); // Apenas um SELECT normal
            
            if (error) throw error; // Joga o erro para o "catch"

            if (data && data.length > 0) {
              console.log("AuthContext: Perfil encontrado:", data[0]); // DEBUG 3
              setProfile(data[0]);
            } else {
              console.log("AuthContext: NENHUM perfil encontrado com esse UUID."); // DEBUG 4
              setProfile(null);
            }
            // --- FIM DA BUSCA REAL ---

          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error('AuthContext: A BUSCA FALHOU. Erro:', error); // DEBUG 5
          setProfile(null);
        } finally {
          console.log("AuthContext: Carregamento finalizado."); // DEBUG 6
          setLoading(false);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = { session, profile, loading, logout: () => supabase.auth.signOut() };

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