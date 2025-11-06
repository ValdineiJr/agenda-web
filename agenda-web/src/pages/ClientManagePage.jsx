import { useState } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { Link } from 'react-router-dom'; // NOVO: Importa o Link
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

// Lista de motivos (como antes)
const MOTIVOS_CLIENTE = [
  "Imprevisto pessoal",
  "Conflito de agenda",
  "Não poderei comparecer",
  "Outro motivo"
];

function ClientManagePage() {
  const [bookingId, setBookingId] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [agendamentoCarregado, setAgendamentoCarregado] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [policyModalIsOpen, setPolicyModalIsOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(MOTIVOS_CLIENTE[0]);

  // handleBuscarAgendamento (como antes)
  const handleBuscarAgendamento = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSucesso(null);
    setAgendamentoCarregado(null);

    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        id, nome_cliente, data_hora_inicio, status,
        servicos ( nome ),
        profissionais ( nome )
      `)
      .eq('id', bookingId)
      .eq('telefone_cliente', telefone)
      .single();

    if (error) {
      console.error('Erro ao buscar:', error);
      setError('Agendamento não encontrado. Verifique o ID e o telefone e tente novamente.');
    } else if (data) {
      setAgendamentoCarregado(data);
    }
    setLoading(false);
  };

  // handleCancelarAgendamento (como antes)
  const handleCancelarAgendamento = async () => {
    if (!agendamentoCarregado) return;
    setCancelReason(MOTIVOS_CLIENTE[0]);
    setPolicyModalIsOpen(true);
  };

  // handleConfirmarCancelamento (como antes)
  const handleConfirmarCancelamento = async () => {
    setLoading(true);
    setError(null);
    setPolicyModalIsOpen(false); 

    const { error: updateError } = await supabase
      .from('agendamentos')
      .update({ 
        status: 'cancelado',
        cancelamento_motivo: `Cliente: ${cancelReason}`
      })
      .eq('id', agendamentoCarregado.id);

    if (updateError) {
      console.error('Erro ao cancelar:', updateError);
      setError('Não foi possível cancelar o agendamento. Tente novamente.');
    } else {
      setSucesso('Seu agendamento foi cancelado com sucesso!');
      setAgendamentoCarregado(null); 
    }
    setLoading(false);
  };

  // formatarData (como antes)
  const formatarData = (iso) => {
    const dataObj = new Date(iso);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(dataObj);
  };

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto bg-gray-50 shadow-md rounded-lg mt-10">
      
      {/* --- NOVO: BOTÃO VOLTAR --- */}
      <Link 
        to="/" // Aponta para a Home Page (a de escolha)
        className="text-indigo-600 hover:underline mb-4 block text-sm"
      >
        &larr; Voltar para o Início
      </Link>
      {/* --- FIM DO BOTÃO VOLTAR --- */}
      
      <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">
        Consultar Agendamento
      </h1>

      {/* --- MENSAGENS DE FEEDBACK --- */}
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

      {/* --- FORMULÁRIO DE BUSCA (como antes) --- */}
      {!agendamentoCarregado && !sucesso && (
        <form onSubmit={handleBuscarAgendamento} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">ID do Agendamento</label>
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              placeholder="Ex: 4"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              placeholder="(11) 99999-9999"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      )}

      {/* --- CARD DO AGENDAMENTO ENCONTRADO (como antes) --- */}
      {agendamentoCarregado && (
        <div className="bg-white p-6 rounded-lg shadow-inner text-left space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Seu Agendamento</h2>
          <p><strong>Status:</strong> <span className={`font-bold ${agendamentoCarregado.status === 'cancelado' ? 'text-red-600' : 'text-green-600'}`}>{agendamentoCarregado.status}</span></p>
          <p><strong>Cliente:</strong> {agendamentoCarregado.nome_cliente}</p>
          <p><strong>Serviço:</strong> {agendamentoCarregado.servicos.nome}</p>
          <p><strong>Profissional:</strong> {agendamentoCarregado.profissionais.nome}</p>
          <p><strong>Data/Hora:</strong> {formatarData(agendamentoCarregado.data_hora_inicio)}</p>

          {agendamentoCarregado.status !== 'cancelado' && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-4">
                Precisa alterar seu agendamento? Cancele este e faça um novo agendamento.
              </p>
              <button
                onClick={handleCancelarAgendamento}
                disabled={loading}
                className="w-full p-3 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700 disabled:bg-red-300"
              >
                {loading ? 'Cancelando...' : 'Cancelar Agendamento'}
              </button>
            </div>
          )}
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