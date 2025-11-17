import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { Link } from 'react-router-dom';
import Modal from 'react-modal';

// Estilos do Modal (como antes)
const modalStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    position: 'relative',
    background: 'white',
    width: '90%',
    maxWidth: '500px',
    padding: '2rem',
    borderRadius: '0.5rem',
    outline: 'none',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    inset: 'auto',
  }
};

const MOTIVOS_CLIENTE = [
  "Imprevisto pessoal",
  "Conflito de agenda",
  "Não poderei comparecer",
  "Outro motivo"
];

function formatarDataHora(iso) {
  const dataObj = new Date(iso);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(dataObj);
}

function ClientManagePage() {
  // States da Busca (MODIFICADO)
  const [telefoneBusca, setTelefoneBusca] = useState('');
  const [nascimentoBusca, setNascimentoBusca] = useState(''); // NOVO
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [agendamentosAtivos, setAgendamentosAtivos] = useState([]);
  const [agendamentosCancelados, setAgendamentosCancelados] = useState([]);
  const [policyModalIsOpen, setPolicyModalIsOpen] = useState(false);
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState(null);
  const [cancelReason, setCancelReason] = useState(MOTIVOS_CLIENTE[0]);
  const [editNome, setEditNome] = useState('');
  const [editNascimento, setEditNascimento] = useState('');
  const [isSavingData, setIsSavingData] = useState(false);

  // handleBuscarAgendamento (MODIFICADO)
  const handleBuscarAgendamento = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSucesso(null);
    setCliente(null);
    setAgendamentosAtivos([]);
    setAgendamentosCancelados([]);

    const telefoneLimpo = telefoneBusca.replace(/[^0-9]/g, '');

    try {
      // 1. Busca a "ficha" do cliente (AGORA COM 2 CONDIÇÕES)
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', telefoneLimpo)
        .eq('data_nascimento', nascimentoBusca) // NOVO: Checagem de segurança
        .single();
      
      if (clienteError || !clienteData) {
        throw new Error('Dados não encontrados. Verifique o telefone e a data de nascimento.');
      }
      
      setCliente(clienteData);
      setEditNome(clienteData.nome || '');
      setEditNascimento(clienteData.data_nascimento || '');

      // 2. Busca os agendamentos (futuros)
      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select(`
          id, data_hora_inicio, status, cancelamento_motivo,
          servicos ( nome ),
          profissionais ( nome )
        `)
        .eq('telefone_cliente', telefoneLimpo)
        .gte('data_hora_inicio', new Date().toISOString()) 
        .order('data_hora_inicio', { ascending: true });

      if (agendamentosError) {
        throw agendamentosError;
      }

      setAgendamentosAtivos(agendamentosData.filter(ag => ag.status !== 'cancelado'));
      setAgendamentosCancelados(agendamentosData.filter(ag => ag.status === 'cancelado'));

    } catch (error) {
      console.error('Erro ao buscar:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // handleConfirmarCancelamento (como antes)
  const handleConfirmarCancelamento = async () => {
    if (!agendamentoParaCancelar) return;
    setLoading(true);
    setPolicyModalIsOpen(false); 
    const { error: updateError } = await supabase
      .from('agendamentos')
      .update({ 
        status: 'cancelado',
        cancelamento_motivo: `Cliente: ${cancelReason}`
      })
      .eq('id', agendamentoParaCancelar.id);
    if (updateError) {
      console.error('Erro ao cancelar:', updateError);
      setError('Não foi possível cancelar o agendamento.');
    } else {
      setSucesso('Agendamento cancelado com sucesso!');
      setAgendamentosAtivos(prev => prev.filter(ag => ag.id !== agendamentoParaCancelar.id));
      setAgendamentosCancelados(prev => [agendamentoParaCancelar, ...prev]);
    }
    setAgendamentoParaCancelar(null);
    setLoading(false);
  };
  
  // handleSalvarDados (como antes)
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
    }
    setIsSavingData(false);
  };
  
  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto bg-gray-50 shadow-md rounded-lg mt-10">
      
      <Link 
        to="/"
        className="text-fuchsia-600 hover:underline mb-4 block text-sm"
      >
        &larr; Voltar para o Início
      </Link>
      
      <h1 className="text-3xl font-bold text-fuchsia-600 mb-6 text-center">
        Consultar Agendamento
      </h1>

      {error && (
        <div className="p-4 mb-4 text-red-800 bg-red-100 border border-red-300 rounded-lg">
          {error}
        </div>
      )}
      {sucesso && (
        <div className="p-4 mb-4 text-green-800 bg-green-100 border border-green-300 rounded-lg">
          {sucesso}
        </div>
      )}

      {/* --- FORMULÁRIO DE BUSCA (MODIFICADO) --- */}
      {!cliente && (
        <form onSubmit={handleBuscarAgendamento} className="space-y-4">
          <p className="text-sm text-gray-600">
            Digite seu telefone e data de nascimento para ver seus dados.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
            <input
              type="tel"
              value={telefoneBusca}
              onChange={(e) => setTelefoneBusca(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-fuchsia-500 focus:ring-fuchsia-500"
              placeholder="(11) 99999-9999"
              required
            />
          </div>
          
          {/* NOVO: Campo Data de Nascimento */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
            <input
              type="date"
              value={nascimentoBusca}
              onChange={(e) => setNascimentoBusca(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 rounded-lg text-white font-semibold bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-fuchsia-300"
          >
            {loading ? 'Buscando...' : 'Buscar meus dados'}
          </button>
        </form>
      )}

      {/* --- SEÇÕES DE DADOS (Como antes) --- */}
      {cliente && (
        <div className="space-y-8">
          {/* ... (Seção Meus Dados) ... */}
          <form onSubmit={handleSalvarDados} className="bg-white p-6 rounded-lg shadow-inner space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Meus Dados</h2>
            <p className="text-sm text-gray-500">
              Mantenha seus dados atualizados. (Não é possível alterar o telefone por aqui).
            </p>
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
              className="w-full p-3 rounded-lg text-white font-semibold bg-green-600 hover:bg-green-700 disabled:bg-green-300"
            >
              {isSavingData ? 'Salvando...' : 'Salvar meus Dados'}
            </button>
          </form>

          {/* ... (Seção Agendamentos Ativos) ... */}
          <div className="bg-white p-6 rounded-lg shadow-inner space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Meus Agendamentos Ativos</h2>
            {agendamentosAtivos.length === 0 ? (
              <p className="text-gray-500">Você não possui agendamentos ativos.</p>
            ) : (
              agendamentosAtivos.map(ag => (
                <div key={ag.id} className="border p-4 rounded-lg">
                  <p><strong>{ag.servicos.nome}</strong> com {ag.profissionais.nome}</p>
                  <p>{formatarDataHora(ag.data_hora_inicio)}</p>
                  <button
                    onClick={() => handleAbrirModalCancelamento(ag)}
                    className="mt-2 text-sm font-medium text-red-600 hover:underline"
                  >
                    Cancelar este agendamento
                  </button>
                </div>
              ))
            )}
          </div>
          
          {/* ... (Seção Agendamentos Cancelados) ... */}
          <div className="bg-white p-6 rounded-lg shadow-inner space-y-4 opacity-70">
            <h2 className="text-2xl font-bold text-gray-800">Meus Agendamentos Cancelados</h2>
            {agendamentosCancelados.length === 0 ? (
              <p className="text-gray-500">Nenhum agendamento cancelado.</p>
            ) : (
              agendamentosCancelados.map(ag => (
                <div key={ag.id} className="border p-4 rounded-lg bg-gray-50">
                  <p className="line-through"><strong>{ag.servicos.nome}</strong> com {ag.profissionais.nome}</p>
                  <p className="line-through">{formatarDataHora(ag.data_hora_inicio)}</p>
                  <p className="text-sm text-red-700">{ag.cancelamento_motivo || 'Cancelado'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- MODAL DA POLÍTICA (como antes) --- */}
      <Modal
        isOpen={policyModalIsOpen}
        onRequestClose={() => setPolicyModalIsOpen(false)}
        style={modalStyles}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Política de Cancelamento</h2>
        <div className="space-y-3 text-gray-700">
          <p>Entendemos que imprevistos acontecem! Pedimos gentilmente que cancelamentos sejam feitos com, no mínimo, **24 horas de antecedência**.</p>
          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Qual o motivo do cancelamento?</label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white"
            >
              {MOTIVOS_CLIENTE.map(motivo => (
                <option key={motivo} value={motivo}>{motivo}</option>
              ))}
            </select>
          </div>
          <p className="font-bold mt-4">Deseja realmente confirmar o cancelamento?</p>
        </div>
        <div className="mt-8 flex space-x-4">
          <button
            onClick={() => setPolicyModalIsOpen(false)}
            className="w-1/2 p-3 rounded-lg text-gray-700 font-semibold bg-gray-200 hover:bg-gray-300"
          >
            Voltar (Não Cancelar)
          </button>
          <button
            onClick={handleConfirmarCancelamento}
            className="w-1/2 p-3 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700"
          >
            Sim, Cancelar
          </button>
        </div>
      </Modal>

    </div>
  );
}

export default ClientManagePage;