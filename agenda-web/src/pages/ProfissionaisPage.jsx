import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { Link } from 'react-router-dom';

// Array dos dias da semana
const DIAS_SEMANA = [
  { numero: 0, nome: 'Dom' },
  { numero: 1, nome: 'Seg' },
  { numero: 2, nome: 'Ter' },
  { numero: 3, nome: 'Qua' },
  { numero: 4, nome: 'Qui' },
  { numero: 5, nome: 'Sex' },
  { numero: 6, nome: 'Sab' },
];

function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);

  // States do formulário (CORRIGIDOS)
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // NOVO: Para a senha
  const [role, setRole] = useState('profissional'); 
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Busca os profissionais existentes (como antes)
  useEffect(() => {
    fetchProfissionais();
  }, []);

  async function fetchProfissionais() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profissionais')
      .select('*');
    if (error) {
      console.error('Erro ao buscar profissionais:', error);
      setError('Erro ao carregar lista de profissionais.');
    } else {
      setProfissionais(data);
    }
    setLoading(false);
  }

  // --- Função handleSubmit (A que chama a Edge Function) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    if (!nome || !email || !password) {
      setError('Nome, Email e Senha são obrigatórios.');
      setIsSubmitting(false);
      return;
    }
    
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Chama a Edge Function 'create-professional'
      const { data, error } = await supabase.functions.invoke('create-professional', {
        body: {
          nome: nome,
          email: email,
          password: password,
          role: role
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.error) {
        throw new Error(data.error);
      }
      
      // 2. Sucesso!
      setSuccess('Profissional criada com sucesso! (Login e Perfil criados).');
      setNome('');
      setEmail('');
      setPassword('');
      setRole('profissional');
      fetchProfissionais();

    } catch (error) {
      console.error('Erro ao criar perfil:', error);
      setError(`Erro ao criar perfil: ${error.message}. (Verifique se o e-mail já não está em uso)`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      
      {/* --- FORMULÁRIO DE CRIAÇÃO (CORRIGIDO) --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Gerenciar Profissionais
        </h1>
        
        <p className="mb-4 text-sm text-gray-600">
          Crie uma nova profissional preenchendo os dados de login e perfil abaixo.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-fuchsia-500 focus:ring-fuchsia-500"
              placeholder="Nome da profissional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email (que será usado para o login)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-fuchsia-500 focus:ring-fuchsia-500"
              placeholder="email@login.com"
            />
          </div>

          {/* CAMPO DE SENHA (O CORRETO) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Criar Senha (mínimo 6 caracteres)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-fuchsia-500 focus:ring-fuchsia-500"
              placeholder="Senha de acesso"
            />
          </div>
          
          {/* CAMPO UUID REMOVIDO */}

          <div>
            <label className="block text-sm font-medium text-gray-700">Permissão (Role)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white"
            >
              <option value="profissional">Profissional</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full p-3 rounded-lg text-white font-semibold bg-fuchsia-600 hover:bg-fuchsia-700 transition-all disabled:bg-gray-400"
            >
              {isSubmitting ? 'Criando...' : 'Criar Perfil e Login'}
            </button>
          </div>
        </form>
      </div>

      {/* --- LISTA DE PROFISSIONAIS (Como antes) --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Profissionais Cadastradas
        </h2>
        {loading ? (
          <p>Carregando lista...</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {profissionais.map((prof) => (
              <Link 
                to={`/admin/profissionais/${prof.id}`}
                key={prof.id} 
                className="block py-4 px-2 hover:bg-gray-50 transition-all rounded-lg"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-lg text-fuchsia-600">{prof.nome}</p>
                    <p className="text-sm text-gray-600">{prof.email}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      prof.role === 'admin' ? 'bg-green-200 text-green-800' : 'bg-fuchsia-200 text-fuchsia-800'
                    }`}>
                      {prof.role}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}

export default ProfissionaisPage;