import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '/src/supabaseClient.js';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lembrarEmail, setLembrarEmail] = useState(false);
  const navigate = useNavigate();

  // --- EFEITO: Carregar e-mail salvo ao abrir a tela ---
  useEffect(() => {
    const emailSalvo = localStorage.getItem('salao_admin_email');
    if (emailSalvo) {
      setEmail(emailSalvo);
      setLembrarEmail(true);
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

      if (error) throw error;

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
      setError('Email ou senha inválidos. Verifique suas credenciais.');
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-white p-4 relative overflow-hidden">
      
      {/* Elementos Decorativos de Fundo (Bolhas Suaves) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/50 relative z-10 transition-all duration-300 hover:shadow-fuchsia-100/50">
        
        {/* Cabeçalho do Card */}
        <div className="pt-10 pb-6 px-8 text-center">
          <div className="mx-auto mb-4 w-24 h-24 bg-white rounded-full shadow-md flex items-center justify-center p-2">
             <img 
               src="/logo-salao.png" 
               alt="Studio Patrícia Ramalho" 
               className="w-full h-full object-contain" 
             />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Bem-vindo(a)</h2>
          <p className="text-gray-500 text-sm mt-1">Acesse o painel administrativo</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="px-8 pb-10 space-y-6">
          
          {/* Input Email */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 group-focus-within:text-fuchsia-500 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all shadow-sm"
              placeholder="seu@email.com"
            />
          </div>

          {/* Input Senha */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 group-focus-within:text-fuchsia-500 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all shadow-sm"
              placeholder="••••••••"
            />
          </div>

          {/* Opções (Lembrar / Esqueci senha) */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="lembrar-email"
                type="checkbox"
                checked={lembrarEmail}
                onChange={(e) => setLembrarEmail(e.target.checked)}
                className="h-4 w-4 text-fuchsia-600 focus:ring-fuchsia-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="lembrar-email" className="ml-2 block text-gray-600 cursor-pointer select-none">
                Lembrar e-mail
              </label>
            </div>
            {/* Link visual apenas (pode ser implementado futuramente) */}
            <a href="#" className="font-medium text-fuchsia-600 hover:text-fuchsia-500 transition-colors">
              Esqueceu a senha?
            </a>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-700 animate-pulse">
              <p className="font-bold">Acesso Negado</p>
              <p>{error}</p>
            </div>
          )}

          {/* Botão de Entrar */}
          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white tracking-wide uppercase 
              transition-all duration-300 transform hover:-translate-y-0.5
              ${isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 hover:shadow-fuchsia-500/30'
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Autenticando...
              </span>
            ) : 'Acessar Sistema'}
          </button>
        </form>
        
        {/* Rodapé do Card */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Studio Patrícia Ramalho. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;