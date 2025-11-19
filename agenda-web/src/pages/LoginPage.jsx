import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '/src/supabaseClient.js'; 

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lembrarEmail, setLembrarEmail] = useState(false); // Estado para o checkbox
  const navigate = useNavigate();

  // --- EFEITO: Carregar e-mail salvo ao abrir a tela ---
  useEffect(() => {
    const emailSalvo = localStorage.getItem('salao_admin_email');
    if (emailSalvo) {
      setEmail(emailSalvo);
      setLembrarEmail(true); // Já deixa marcado se encontrou dados
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault(); 
    setIsLoading(true);
    setError(null); 

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        throw error;
      }

      // --- LÓGICA: Salvar ou Esquecer o E-mail ---
      if (lembrarEmail) {
        localStorage.setItem('salao_admin_email', email);
      } else {
        localStorage.removeItem('salao_admin_email');
      }

      if (data.user) {
        navigate('/admin');
      }

    } catch (error) {
      console.error('Erro no login:', error.message);
      setError('Email ou senha inválidos. Tente novamente.');
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
      
      {/* --- LOGO --- */}
      <div className="flex justify-center mb-6">
        <img 
          src="/logo-salao.png" 
          alt="Logo do Salão" 
          className="w-32 h-auto object-contain" 
        />
      </div>

      <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">
        Login (Admin)
      </h1>
      
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label 
            htmlFor="email" 
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 sm:text-sm p-2"
          />
        </div>
        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-gray-700"
          >
            Senha
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 sm:text-sm p-2"
          />
        </div>

        {/* --- CHECKBOX LEMBRAR E-MAIL --- */}
        <div className="flex items-center">
          <input
            id="lembrar-email"
            type="checkbox"
            checked={lembrarEmail}
            onChange={(e) => setLembrarEmail(e.target.checked)}
            className="h-4 w-4 text-fuchsia-600 focus:ring-fuchsia-500 border-gray-300 rounded"
          />
          <label htmlFor="lembrar-email" className="ml-2 block text-sm text-gray-900 cursor-pointer">
            Lembrar meu e-mail
          </label>
        </div>

        {error && (
          <div className="text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full p-3 rounded-lg text-white font-semibold
              ${isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-fuchsia-600 hover:bg-fuchsia-700 transition-all'
              }
            `}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LoginPage;