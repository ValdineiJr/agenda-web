import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { Link } from 'react-router-dom'; // AQUI ESTÁ A CORREÇÃO

function ProfissionaisPage() {
  // Lista de profissionais existentes
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);

  // States do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState(''); // O UUID do Supabase Auth
  const [role, setRole] = useState('profissional'); // 'profissional' ou 'admin'
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Busca os profissionais existentes ao carregar a página
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

  // Função para criar o novo perfil
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!nome || !email || !userId) {
      setError('Todos os campos (Nome, Email, User ID) são obrigatórios.');
      return;
    }

    // Insere na tabela 'profissionais'
    const { error } = await supabase
      .from('profissionais')
      .insert({
        nome: nome,
        email: email,
        user_id: userId,
        role: role
      });

    if (error) {
      console.error('Erro ao criar perfil:', error);
      setError(`Erro ao criar perfil: ${error.message}. (Verifique se o UUID ou Email já não estão em uso)`);
    } else {
      setSuccess('Profissional criada com sucesso!');
      // Limpa o formulário
      setNome('');
      setEmail('');
      setUserId('');
      setRole('profissional');
      // Atualiza a lista
      fetchProfissionais();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      
      {/* --- FORMULÁRIO DE CRIAÇÃO --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Gerenciar Profissionais
        </h1>
<p className="mb-4 text-sm text-gray-600">
  <span className="font-bold">Atenção:</span> Crie o <span className="font-bold">Login</span> (Email/Senha) primeiro no painel do Supabase (Authentication &gt; Users) e copie o <span className="font-bold">UUID</span> para colar aqui.
</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              placeholder="Nome da profissional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email (o mesmo do login)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              placeholder="email@login.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">User ID (UUID do Supabase Auth)</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              placeholder="Cole o UUID aqui (ex: a1b2c3d4-...)"
            />
          </div>
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

          {/* Mensagens de feedback */}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}

          <div>
            <button
              type="submit"
              className="w-full p-3 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 transition-all"
            >
              Criar Perfil da Profissional
            </button>
          </div>
        </form>
      </div>

      {/* --- LISTA DE PROFISSIONAIS --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Profissionais Cadastradas
        </h2>
        {loading ? (
          <p>Carregando lista...</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {profissionais.map((prof) => (
            // NOVO: Cada item da lista agora é um LINK
              <Link 
                to={`/admin/profissionais/${prof.id}`} // O link dinâmico
                key={prof.id} 
                className="block py-4 px-2 hover:bg-gray-50 transition-all rounded-lg" // Estilo de link
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-lg text-blue-600">{prof.nome}</p>
                    <p className="text-sm text-gray-600">{prof.email}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      prof.role === 'admin' ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800'
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