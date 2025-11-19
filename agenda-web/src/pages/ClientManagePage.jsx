import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { Link } from 'react-router-dom';

// Função auxiliar para formatar data visualmente (ex: 20/11/2025 14:00)
function formatarDataHora(iso) {
  if (!iso) return '';
  const dataObj = new Date(iso);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(dataObj);
}

function ClientManagePage() {
  // --- ESTADOS DO COMPONENTE ---
  const [telefoneBusca, setTelefoneBusca] = useState('');
  const [nascimentoBusca, setNascimentoBusca] = useState('');
  const [lembrarDados, setLembrarDados] = useState(false); // Checkbox
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  
  const [cliente, setCliente] = useState(null);
  
  // Listas de Agendamentos (Separadas por Status)
  const [agendamentosAtivos, setAgendamentosAtivos] = useState([]);
  const [agendamentosFinalizados, setAgendamentosFinalizados] = useState([]); // NOVO: Realizados
  const [agendamentosCancelados, setAgendamentosCancelados] = useState([]);
  
  const [editNome, setEditNome] = useState('');
  const [editNascimento, setEditNascimento] = useState('');
  const [isSavingData, setIsSavingData] = useState(false);

  // --- CONFIGURAÇÃO DO WHATSAPP DO SALÃO ---
  const NUMERO_SALAO = '5519993562075'; 

  // --- EFEITO: RECUPERAR DADOS SALVOS AO ABRIR A TELA ---
  useEffect(() => {
    const telefoneSalvo = localStorage.getItem('salao_cliente_telefone');
    const nascimentoSalvo = localStorage.getItem('salao_cliente_nascimento');

    if (telefoneSalvo && nascimentoSalvo) {
      setTelefoneBusca(telefoneSalvo);
      setNascimentoBusca(nascimentoSalvo);
      setLembrarDados(true); // Deixa a caixinha marcada pois já tinha dados
    }
  }, []);

  // --- FUNÇÕES ---

  // 1. Buscar Agendamentos e Dados do Cliente (Login)
  const handleBuscarAgendamento = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSucesso(null);
    setCliente(null);
    // Limpa as listas
    setAgendamentosAtivos([]);
    setAgendamentosFinalizados([]);
    setAgendamentosCancelados([]);

    // Remove caracteres não numéricos do telefone para busca
    const telefoneLimpo = telefoneBusca.replace(/[^0-9]/g, '');

    try {
      // 1.1 Busca dados cadastrais do cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', telefoneLimpo)
        .eq('data_nascimento', nascimentoBusca)
        .single();
      
      if (clienteError || !clienteData) {
        throw new Error('Dados não encontrados. Verifique se o telefone e a data de nascimento estão corretos.');
      }

      // --- LÓGICA DE SALVAR DADOS (LOCALSTORAGE) ---
      if (lembrarDados) {
        localStorage.setItem('salao_cliente_telefone', telefoneBusca);
        localStorage.setItem('salao_cliente_nascimento', nascimentoBusca);
      } else {
        localStorage.removeItem('salao_cliente_telefone');
        localStorage.removeItem('salao_cliente_nascimento');
      }
      
      // Salva dados no estado
      setCliente(clienteData);
      setEditNome(clienteData.nome || '');
      setEditNascimento(clienteData.data_nascimento || '');

      // 1.2 Busca TODOS os agendamentos (Passados e Futuros) deste cliente
      // IMPORTANTE: Removemos o filtro de data (.gte) para pegar o histórico completo
      // Ordenamos DESC (decrescente) para facilitar a visualização do histórico
      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select(`
          id, 
          data_hora_inicio, 
          status, 
          cancelamento_motivo,
          servicos ( nome ),
          profissionais ( nome )
        `)
        .eq('telefone_cliente', telefoneLimpo)
        .order('data_hora_inicio', { ascending: false }); 

      if (agendamentosError) {
        throw agendamentosError;
      }

      // 1.3 Separa os agendamentos nas listas corretas
      const ativos = [];
      const finalizados = [];
      const cancelados = [];

      agendamentosData.forEach(ag => {
        if (ag.status === 'confirmado' || ag.status === 'em_atendimento') {
          ativos.push(ag);
        } 
        else if (ag.status === 'finalizado') {
          finalizados.push(ag);
        } 
        else if (ag.status === 'cancelado') {
          cancelados.push(ag);
        }
      });

      // Reordena os ATIVOS para Ascendente (o mais próximo primeiro)
      // O banco trouxe decrescente, então invertemos ou ordenamos novamente
      ativos.sort((a, b) => new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio));

      setAgendamentosAtivos(ativos);
      setAgendamentosFinalizados(finalizados);
      setAgendamentosCancelados(cancelados);

    } catch (error) {
      console.error('Erro ao buscar:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Função de Logout (Limpar tela apenas)
  const handleSair = () => {
    setCliente(null);
    setSucesso(null);
    setError(null);
  };
  
  // 2. Salvar Alterações de Dados Pessoais (Nome/Data Nasc)
  const handleSalvarDados = async (e) => {
    e.preventDefault();
    setIsSavingData(true);
    setError(null);
    setSucesso(null);

    const { error } = await supabase
      .from('clientes')
      .update({
        nome: editNome,
        data_nascimento: editNascimento || null
      })
      .eq('telefone', cliente.telefone);

    if (error) {
      setError('Não foi possível salvar seus dados. Tente novamente.');
    } else {
      setSucesso('Seus dados foram atualizados com sucesso!');
      setCliente(prev => ({ ...prev, nome: editNome, data_nascimento: editNascimento }));
      
      if (lembrarDados && editNascimento) {
         localStorage.setItem('salao_cliente_nascimento', editNascimento);
         setNascimentoBusca(editNascimento);
      }
    }
    setIsSavingData(false);
  };
  
  // --- RENDERIZAÇÃO (JSX) ---
  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto bg-gray-50 shadow-md rounded-lg mt-10">
      
      {/* Link de Voltar */}
      <div className="flex justify-between items-center mb-4">
        <Link 
          to="/"
          className="text-fuchsia-600 hover:underline text-sm"
        >
          &larr; Voltar para o Início
        </Link>
        {cliente && (
           <button onClick={handleSair} className="text-sm text-gray-500 hover:text-red-600 underline">
             Sair / Trocar Conta
           </button>
        )}
      </div>
      
      <h1 className="text-3xl font-bold text-fuchsia-600 mb-6 text-center">
        Área do Cliente
      </h1>

      {/* Mensagens de Feedback */}
      {error && (
        <div className="p-4 mb-4 text-red-800 bg-red-100 border border-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}
      {sucesso && (
        <div className="p-4 mb-4 text-green-800 bg-green-100 border border-green-300 rounded-lg text-sm">
          {sucesso}
        </div>
      )}

      {/* --- CENÁRIO 1: USUÁRIO NÃO LOGADO --- */}
      {!cliente && (
        <form onSubmit={handleBuscarAgendamento} className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-700">Consultar meus horários</h2>
          <p className="text-sm text-gray-500">
            Identifique-se para acessar seus agendamentos e histórico.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
            <input
              type="tel"
              value={telefoneBusca}
              onChange={(e) => setTelefoneBusca(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 focus:border-fuchsia-500 focus:ring-fuchsia-500"
              placeholder="(11) 99999-9999"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
            <input
              type="date"
              value={nascimentoBusca}
              onChange={(e) => setNascimentoBusca(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 focus:border-fuchsia-500 focus:ring-fuchsia-500"
              required
            />
          </div>

          {/* Checkbox Lembrar Dados */}
          <div className="flex items-center">
            <input
              id="lembrar-dados"
              type="checkbox"
              checked={lembrarDados}
              onChange={(e) => setLembrarDados(e.target.checked)}
              className="h-4 w-4 text-fuchsia-600 focus:ring-fuchsia-500 border-gray-300 rounded"
            />
            <label htmlFor="lembrar-dados" className="ml-2 block text-sm text-gray-900">
              Lembrar meus dados neste dispositivo
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 rounded-lg text-white font-semibold bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-fuchsia-300 transition-colors"
          >
            {loading ? 'Buscando...' : 'Buscar meus dados'}
          </button>
        </form>
      )}

      {/* --- CENÁRIO 2: USUÁRIO LOGADO --- */}
      {cliente && (
        <div className="space-y-8">
          
          {/* 1. Formulário de Edição de Dados Pessoais */}
          <form onSubmit={handleSalvarDados} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Meus Dados</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
              <input
                type="text"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-fuchsia-500 focus:ring-fuchsia-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
              <input
                type="date"
                value={editNascimento}
                onChange={(e) => setEditNascimento(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingData}
              className="w-full py-2 px-4 rounded-md text-white font-medium bg-green-600 hover:bg-green-700 disabled:bg-green-300 transition-colors text-sm"
            >
              {isSavingData ? 'Salvando...' : 'Atualizar Dados'}
            </button>
          </form>

          {/* 2. Lista de Agendamentos ATIVOS */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Próximos Agendamentos</h2>
            
            {agendamentosAtivos.length === 0 ? (
              <p className="text-gray-500 italic">Você não tem agendamentos futuros.</p>
            ) : (
              agendamentosAtivos.map(ag => {
                const textoData = formatarDataHora(ag.data_hora_inicio);
                
                // Mensagem para Alterar
                const msgAlterar = `Olá! Gostaria de *alterar o horário/data* do meu agendamento de ${ag.servicos?.nome} (ID: ${ag.id}) marcado para ${textoData}.`;
                const linkAlterar = `https://wa.me/${NUMERO_SALAO}?text=${encodeURIComponent(msgAlterar)}`;

                // Mensagem para Cancelar
                const msgCancelar = `Olá! Infelizmente preciso *cancelar* meu agendamento de ${ag.servicos?.nome} (ID: ${ag.id}) marcado para ${textoData}.`;
                const linkCancelar = `https://wa.me/${NUMERO_SALAO}?text=${encodeURIComponent(msgCancelar)}`;

                return (
                  <div key={ag.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                    <div className="mb-3">
                      {/* Badge de status (ex: Em Atendimento) */}
                      {ag.status === 'em_atendimento' && (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold mb-2">
                          EM ATENDIMENTO
                        </span>
                      )}
                      <h3 className="font-bold text-lg text-gray-800">{ag.servicos?.nome}</h3>
                      <p className="text-gray-600">Profissional: <span className="font-medium">{ag.profissionais?.nome}</span></p>
                      <p className="text-fuchsia-700 font-bold text-lg mt-1 capitalize">
                        {textoData}
                      </p>
                    </div>

                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 mb-4">
                      <p className="text-xs text-yellow-800">
                        <strong>Política:</strong> Alterações ou cancelamentos devem ser comunicados com antecedência mínima de 24h.
                      </p>
                    </div>

                    <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
                      <a
                        href={linkAlterar}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-sm transition-colors cursor-pointer"
                      >
                        Alterar Data/Horário
                      </a>

                      <a
                        href={linkCancelar}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 px-4 border border-red-500 text-red-600 hover:bg-red-50 rounded-md font-semibold text-sm transition-colors cursor-pointer"
                      >
                        Cancelar Agendamento
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* 3. Histórico de FINALIZADOS (Novo) */}
          {agendamentosFinalizados.length > 0 && (
            <div className="bg-green-50 p-6 rounded-lg border border-green-200 space-y-4">
              <h2 className="text-lg font-bold text-green-800 border-b border-green-200 pb-2">
                Histórico de Atendimentos Realizados
              </h2>
              {agendamentosFinalizados.map(ag => (
                <div key={ag.id} className="bg-white border border-green-100 p-3 rounded-md shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <p className="font-bold text-gray-700 text-sm sm:text-base">{ag.servicos?.nome}</p>
                    <p className="text-xs sm:text-sm text-gray-500">Profissional: {ag.profissionais?.nome}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">{formatarDataHora(ag.data_hora_inicio)}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="inline-block text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      ✓ Concluído
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. Histórico de CANCELADOS */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4 opacity-80">
            <h2 className="text-lg font-bold text-gray-600 border-b border-gray-200 pb-2">
              Histórico de Cancelamentos
            </h2>
            {agendamentosCancelados.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum registro recente.</p>
            ) : (
              agendamentosCancelados.map(ag => (
                <div key={ag.id} className="border-b border-gray-200 pb-2 last:border-0">
                  <p className="line-through text-gray-500 text-sm">
                    <strong>{ag.servicos?.nome}</strong> - {formatarDataHora(ag.data_hora_inicio)}
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    Motivo: {ag.cancelamento_motivo || 'Cancelado pelo cliente'}
                  </p>
                </div>
              ))
            )}
          </div>

        </div>
      )}

    </div>
  );
}

export default ClientManagePage;