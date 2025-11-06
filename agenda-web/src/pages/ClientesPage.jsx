import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';

function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // States para o formulário de edição
  const [editingClient, setEditingClient] = useState(null); // Guarda o cliente sendo editado
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editNascimento, setEditNascimento] = useState(''); // Guarda como 'AAAA-MM-DD'

  useEffect(() => {
    fetchClientes();
  }, []);

  async function fetchClientes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true });
    
    if (error) {
      console.error('Erro ao buscar clientes:', error);
      setError('Erro ao carregar lista de clientes.');
    } else {
      setClientes(data);
    }
    setLoading(false);
  }

  // Abre o "mini-formulário" de edição para um cliente
  const handleEditClick = (cliente) => {
    setEditingClient(cliente);
    setEditNome(cliente.nome);
    setEditTelefone(cliente.telefone);
    // Formata a data para o input (AAAA-MM-DD)
    setEditNascimento(cliente.data_nascimento ? cliente.data_nascimento.split('T')[0] : '');
  };

  // Cancela a edição
  const handleCancelEdit = () => {
    setEditingClient(null);
  };

  // Salva as mudanças no banco
  const handleSaveEdit = async () => {
    if (!editingClient) return;

    const { error } = await supabase
      .from('clientes')
      .update({
        nome: editNome,
        telefone: editTelefone,
        data_nascimento: editNascimento || null // Salva null se o campo estiver vazio
      })
      .eq('id', editingClient.id);

    if (error) {
      alert(`Erro ao salvar: ${error.message}`);
    } else {
      alert('Cliente atualizado com sucesso!');
      setEditingClient(null); // Fecha o formulário
      fetchClientes(); // Atualiza a lista
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Gerenciar Clientes
        </h1>
        <p className="text-gray-600">
          Aqui você pode ver todos os clientes que já agendaram e adicionar a data de nascimento deles para futuras ações de marketing (como disparos de aniversário).
        </p>
      </div>

      {/* --- LISTA DE CLIENTES --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Todos os Clientes
        </h2>
        {/* TODO: Adicionar um campo de filtro/busca aqui no futuro */}
        
        {loading ? (
          <p>Carregando lista de clientes...</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {clientes.map((cliente) => (
              <li key={cliente.id} className="py-4">
                
                {/* Se não estiver editando este cliente, mostra os dados normais */}
                {editingClient?.id !== cliente.id ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-lg text-gray-900">{cliente.nome}</p>
                      <p className="text-sm text-gray-600">{cliente.telefone}</p>
                      <p className="text-sm text-blue-600 font-medium">
                        {cliente.data_nascimento 
                          ? `Nasc: ${new Date(cliente.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR')}`
                          : 'Data de nasc. não cadastrada'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditClick(cliente)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 font-semibold"
                    >
                      Editar
                    </button>
                  </div>
                ) : (
                  
                  /* --- Formulário de Edição (Aparece ao clicar em "Editar") --- */
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Editando: {cliente.nome}</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nome</label>
                      <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Telefone</label>
                      <input type="tel" value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                      <input type="date" value={editNascimento} onChange={(e) => setEditNascimento(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
                      />
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 font-semibold"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ClientesPage;