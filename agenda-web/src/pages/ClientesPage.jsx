import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';

function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // States para Filtros e Mensagens
  const [filtroAniversario, setFiltroAniversario] = useState(false);
  const [showMsgConfig, setShowMsgConfig] = useState(false);
  const [msgAniversario, setMsgAniversario] = useState(
    'Olá {nome}! 🎂 Parabéns pelo seu dia! O Studio Patricia Ramalho deseja muitas felicidades e um ano repleto de brilho. Que tal agendar um momento especial para comemorar?'
  );

  // States para o formulário de edição
  const [editingClient, setEditingClient] = useState(null); 
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editNascimento, setEditNascimento] = useState(''); 

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
        data_nascimento: editNascimento || null 
      })
      .eq('id', editingClient.id);

    if (error) {
      alert(`Erro ao salvar: ${error.message}`);
    } else {
      alert('Cliente atualizado com sucesso!');
      setEditingClient(null); 
      fetchClientes(); 
    }
  };

  // --- LÓGICA DE FILTRO ---
  const clientesFiltrados = clientes.filter((cliente) => {
    if (!filtroAniversario) return true; // Se não tiver filtro, mostra todos
    
    if (!cliente.data_nascimento) return false; // Se não tem data, não é aniversariante
    
    // Pega o mês da data (formato YYYY-MM-DD)
    // split('-')[1] pega o mês (01 a 12)
    const mesCliente = parseInt(cliente.data_nascimento.split('-')[1]);
    const mesAtual = new Date().getMonth() + 1; // getMonth() retorna 0-11, então somamos 1

    return mesCliente === mesAtual;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-10">
      
      {/* CABEÇALHO */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Gerenciar Clientes
        </h1>
        <p className="text-gray-600">
          Aqui você gerencia sua base de clientes e pode realizar ações de marketing, como felicitações de aniversário.
        </p>
      </div>

      {/* --- CONTROLES DE FILTRO E MENSAGEM --- */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-fuchsia-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Botão de Filtro */}
          <button
            onClick={() => setFiltroAniversario(!filtroAniversario)}
            className={`
              px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2
              ${filtroAniversario 
                ? 'bg-fuchsia-600 text-white ring-2 ring-fuchsia-300' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {filtroAniversario ? '🎂 Mostrando Aniversariantes' : '🎂 Filtrar Aniversariantes do Mês'}
            {filtroAniversario && (
              <span className="bg-white text-fuchsia-600 text-xs py-0.5 px-2 rounded-full ml-2">
                {clientesFiltrados.length}
              </span>
            )}
          </button>

          {/* Botão Configurar Mensagem (Só aparece se filtro ativo) */}
          {filtroAniversario && (
            <button
              onClick={() => setShowMsgConfig(!showMsgConfig)}
              className="text-sm text-fuchsia-600 underline hover:text-fuchsia-800"
            >
              {showMsgConfig ? 'Ocultar configuração de mensagem' : 'Personalizar mensagem de Parabéns'}
            </button>
          )}
        </div>

        {/* Área de Edição da Mensagem */}
        {filtroAniversario && showMsgConfig && (
          <div className="mt-4 p-4 bg-fuchsia-50 rounded-md border border-fuchsia-100 animate-fade-in">
            <label className="block text-sm font-bold text-fuchsia-900 mb-2">
              Modelo da Mensagem WhatsApp:
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Dica: Use <strong>{'{nome}'}</strong> onde você quer que apareça o nome do cliente.
            </p>
            <textarea
              rows="3"
              value={msgAniversario}
              onChange={(e) => setMsgAniversario(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-fuchsia-500 focus:ring-fuchsia-500"
            />
          </div>
        )}
      </div>

      {/* --- LISTA DE CLIENTES --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {filtroAniversario ? 'Aniversariantes de Hoje/Mês' : 'Todos os Clientes'}
        </h2>
        
        {loading ? (
          <p>Carregando lista de clientes...</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {clientesFiltrados.length === 0 ? (
               <p className="text-gray-500 py-4 text-center italic">Nenhum cliente encontrado com este filtro.</p>
            ) : (
              clientesFiltrados.map((cliente) => {
                
                // Prepara o link do WhatsApp para este cliente específico
                const msgFinal = msgAniversario.replace('{nome}', cliente.nome);
                const linkZapAniversario = `https://wa.me/55${cliente.telefone}?text=${encodeURIComponent(msgFinal)}`;

                return (
                  <li key={cliente.id} className="py-4">
                    
                    {/* --- MODO VISUALIZAÇÃO --- */}
                    {editingClient?.id !== cliente.id ? (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                          <p className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                            {cliente.nome}
                            {/* Ícone de bolo se for aniversariante no filtro */}
                            {filtroAniversario && <span>🎂</span>}
                          </p>
                          <p className="text-sm text-gray-600">{cliente.telefone}</p>
                          <p className="text-sm text-blue-600 font-medium">
                            {cliente.data_nascimento 
                              ? `Nasc: ${new Date(cliente.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR')}`
                              : 'Data de nasc. não cadastrada'
                            }
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Botão de WhatsApp (Só aparece se filtro de aniversário estiver ATIVO) */}
                          {filtroAniversario && (
                            <a
                              href={linkZapAniversario}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 font-semibold text-sm flex items-center gap-1 transition-colors"
                              title="Enviar mensagem de Parabéns"
                            >
                              <img src="https://api.iconify.design/mdi:whatsapp.svg?color=white" alt="" className="w-5 h-5" />
                              Enviar Parabéns
                            </a>
                          )}

                          <button
                            onClick={() => handleEditClick(cliente)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 font-semibold text-sm"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    ) : (
                      
                      /* --- MODO EDIÇÃO --- */
                      <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-700">Editando: {cliente.nome}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        </div>
                        <div className="flex space-x-4 pt-2">
                          <button
                            onClick={handleSaveEdit}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 font-semibold text-sm"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 font-semibold text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ClientesPage;