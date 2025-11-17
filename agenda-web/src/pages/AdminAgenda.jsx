import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { useAuth } from '/src/AuthContext.jsx';

// --- Imports (como antes) ---
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import Modal from 'react-modal';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; 

registerLocale('pt-BR', ptBR);
Modal.setAppElement('#root');

// --- Configuração (como antes) ---
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const messages = {
  allDay: 'Dia Inteiro', previous: 'Anterior', next: 'Próximo', today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', agenda: 'Agenda', date: 'Data', time: 'Hora', event: 'Evento', noEventsInRange: 'Não há eventos neste período.', showMore: (total) => `+ Ver mais (${total})`,
};

// Motivos de Cancelamento (como antes)
const MOTIVOS_ADMIN = [
  "Cliente solicitou (WhatsApp)",
  "Profissional indisponível",
  "Cliente não compareceu (No-show)",
  "Outro motivo"
];

// --- Funções Auxiliares (como antes) ---
function formatarDataCabecalho(dataString) {
  const [dia, mes, ano] = dataString.split('/');
  const dataObj = new Date(`${ano}-${mes}-${dia}T12:00:00`); 
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dataObj);
}
function formatarHora(dataISO) {
  const dataObj = new Date(dataISO);
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(dataObj);
}

// --- Componente da Página ---
function AdminAgenda() {
  // States (como antes)
  const [agendamentosAgrupados, setAgendamentosAgrupados] = useState({});
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const [canceladosAgrupados, setCanceladosAgrupados] = useState({});
  const [finalizadosAgrupados, setFinalizadosAgrupados] = useState({});
  const [showCancelados, setShowCancelados] = useState(false);
  const [showFinalizados, setShowFinalizados] = useState(false);
  const [totalCancelados, setTotalCancelados] = useState(0);
  const [totalFinalizados, setTotalFinalizados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const { profile, loading: authLoading } = useAuth(); 
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('new'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [calendarView, setCalendarView] = useState('week'); 
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [allServicos, setAllServicos] = useState([]);
  const [allProfissionais, setAllProfissionais] = useState([]);
  const [modalServicoId, setModalServicoId] = useState('');
  const [modalProfissionalId, setModalProfissionalId] = useState('');
  const [modalNome, setModalNome] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalTelefone, setModalTelefone] = useState('');
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [showRemarcar, setShowRemarcar] = useState(false);
  const [novaData, setNovaData] = useState(new Date());
  const [novosHorarios, setNovosHorarios] = useState([]);
  const [loadingNovosHorarios, setLoadingNovosHorarios] = useState(false);
  const [novoHorarioSelecionado, setNovoHorarioSelecionado] = useState(null);
  const [showCancelOptions, setShowCancelOptions] = useState(false);
  const [adminCancelReason, setAdminCancelReason] = useState(MOTIVOS_ADMIN[0]);

  // useEffect para buscar dados (como antes)
  useEffect(() => {
    if (!authLoading && profile) {
      fetchAgendamentos(); 
      fetchModalData();
    }
  }, [authLoading, profile]); 

  // fetchAgendamentos (como antes)
  async function fetchAgendamentos() {
    // ... (Lógica 100% igual a antes) ...
    setLoading(true);
    setError(null);
    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    inicioDoMes.setHours(0, 0, 0, 0);
    let query = supabase
      .from('agendamentos')
      .select(`
        id, nome_cliente, email_cliente, telefone_cliente, 
        data_hora_inicio, data_hora_fim,
        servico_id, profissional_id, status, cancelamento_motivo, 
        servicos ( nome, duracao_minutos ),
        profissionais ( nome )
      `)
      .gte('data_hora_inicio', inicioDoMes.toISOString()) 
      .order('data_hora_inicio', { ascending: true });
    if (profile.role !== 'admin') {
      query = query.eq('profissional_id', profile.id);
    }
    const { data: agendamentos, error: dbError } = await query;
    if (dbError) {
      console.error('Erro ao buscar agendamentos:', dbError);
      setError('Não foi possível carregar a agenda.');
    } else if (agendamentos) {
      const ativos = agendamentos.filter(ag => ag.status === 'confirmado' || ag.status === 'em_atendimento');
      const cancelados = agendamentos.filter(ag => ag.status === 'cancelado');
      const finalizados = agendamentos.filter(ag => ag.status === 'finalizado'); 
      setTotalCancelados(cancelados.length);
      setTotalFinalizados(finalizados.length); 
      const agrupadosAtivos = ativos.reduce((acc, ag) => {
        const dataDia = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
        if (!acc[dataDia]) acc[dataDia] = [];
        acc[dataDia].push(ag);
        return acc;
      }, {});
      setAgendamentosAgrupados(agrupadosAtivos);
      const eventosFormatados = ativos.map((ag) => ({
        title: `${ag.nome_cliente} - ${ag.servicos.nome}`,
        start: new Date(ag.data_hora_inicio),
        end: new Date(ag.data_hora_fim),
        resource: ag,
        status: ag.status 
      }));
      setEventosCalendario(eventosFormatados);
      const agrupadosCancelados = cancelados.reduce((acc, ag) => {
        const dataDia = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
        if (!acc[dataDia]) acc[dataDia] = [];
        acc[dataDia].push(ag);
        return acc;
      }, {});
      setCanceladosAgrupados(agrupadosCancelados);
      const agrupadosFinalizados = finalizados.reduce((acc, ag) => {
        const dataDia = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
        if (!acc[dataDia]) acc[dataDia] = [];
        acc[dataDia].push(ag);
        return acc;
      }, {});
      setFinalizadosAgrupados(agrupadosFinalizados);
    }
    setLoading(false);
  }

  // fetchModalData (como antes)
  async function fetchModalData() {
    // ... (Lógica 100% igual a antes) ...
    const { data: servicosData } = await supabase.from('servicos').select('id, nome, duracao_minutos');
    if (servicosData) setAllServicos(servicosData);
    const { data: profData } = await supabase.from('profissionais').select('id, nome');
    if (profData) setAllProfissionais(profData);
  }
  
  // handleUpdateStatus (como antes)
  const handleUpdateStatus = async (agendamentoId, novoStatus) => {
    // ... (Lógica 100% igual a antes) ...
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: novoStatus })
      .eq('id', agendamentoId);
    if (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Não foi possível atualizar o status.');
    } else {
      fetchAgendamentos();
    }
  };

  // Funções do Modal (handleSelectSlot, handleSelectEvent, closeModal)
  // ... (Estas permanecem iguais) ...
    const handleSelectSlot = (slotInfo) => {
    setModalMode('new');
    setSelectedEvent({ start: slotInfo.start, end: slotInfo.end });
    setModalServicoId('');
    setModalNome('');
    setModalEmail('');
    setModalTelefone('');
    setModalError(null);
    setShowRemarcar(false); 
    setNovoHorarioSelecionado(null); 
    setShowCancelOptions(false);
    if (profile.role !== 'admin') {
      setModalProfissionalId(profile.id);
    } else {
      setModalProfissionalId(''); 
    }
    setModalIsOpen(true);
  };
  const handleSelectEvent = (eventInfo) => {
    const agendamento = eventInfo.resource;
    setModalMode('edit');
    setSelectedEvent(agendamento);
    setModalServicoId(agendamento.servico_id);
    setModalProfissionalId(agendamento.profissional_id);
    setModalNome(agendamento.nome_cliente);
    setModalEmail(agendamento.email_cliente || '');
    setModalTelefone(agendamento.telefone_cliente || '');
    setModalError(null);
    setShowRemarcar(false); 
    setNovoHorarioSelecionado(null); 
    setNovaData(new Date(agendamento.data_hora_inicio)); 
    setShowCancelOptions(false);
    setAdminCancelReason(MOTIVOS_ADMIN[0]);
    setModalIsOpen(true); 
  };
  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedEvent(null);
    setShowCancelOptions(false);
  };

  // handleModalSave (como antes)
  const handleModalSave = async () => {
    // ... (Lógica 100% igual a antes) ...
    setIsSavingModal(true);
    setModalError(null);
    if (!modalServicoId || !modalProfissionalId || !modalNome || !modalTelefone) {
      setModalError('Preencha pelo menos Serviço, Profissional, Nome e Telefone.');
      setIsSavingModal(false);
      return;
    }
    const servico = allServicos.find(s => s.id === parseInt(modalServicoId));
    if (!servico) {
      setModalError('Serviço inválido.');
      setIsSavingModal(false);
      return;
    }
    let dataHoraInicio;
    if (showRemarcar && novoHorarioSelecionado) {
      dataHoraInicio = new Date(novoHorarioSelecionado);
    } else if (modalMode === 'new') {
      dataHoraInicio = selectedEvent.start;
    } else {
      dataHoraInicio = new Date(selectedEvent.data_hora_inicio);
    }
    const dataHoraFim = new Date(dataHoraInicio.getTime() + servico.duracao_minutos * 60000);
    const dadosAgendamento = {
      servico_id: servico.id,
      profissional_id: parseInt(modalProfissionalId),
      nome_cliente: modalNome,
      email_cliente: modalEmail,
      telefone_cliente: modalTelefone,
      data_hora_inicio: dataHoraInicio.toISOString(),
      data_hora_fim: dataHoraFim.toISOString(),
      status: 'confirmado'
    };
    let error = null;
    if (modalMode === 'new') {
      const { error: insertError } = await supabase.from('agendamentos').insert(dadosAgendamento);
      error = insertError;
    } else {
      const { error: updateError } = await supabase.from('agendamentos').update(dadosAgendamento).eq('id', selectedEvent.id);
      error = updateError;
    }
    if (error) {
      console.error("Erro ao salvar agendamento:", error);
      setModalError(`Erro: ${error.message}`);
      setIsSavingModal(false);
    } else {
      setIsSavingModal(false);
      closeModal();
    }
  };
  
  // --- handleModalCancel (MODIFICADO) ---
  const handleModalCancel = async () => {
    // 1. Checa permissão
    if (profile.role !== 'admin' && profile.id !== selectedEvent.profissional_id) {
       setModalError('Você só pode cancelar seus próprios agendamentos.');
       return;
    }
    
    // 2. Mostra opções de motivo (se não estiverem visíveis)
    if (!showCancelOptions) {
      setAdminCancelReason(MOTIVOS_ADMIN[0]);
      setShowCancelOptions(true); 
      return;
    }

    // 3. Confirma o cancelamento
    setIsSavingModal(true);
    setModalError(null);
    
    const motivoPrefix = (profile.role === 'admin') ? 'Admin' : 'Profissional';
    const motivo = `${motivoPrefix}: ${adminCancelReason}`;

    const { error } = await supabase
      .from('agendamentos')
      .update({ 
        status: 'cancelado',
        cancelamento_motivo: motivo
      })
      .eq('id', selectedEvent.id);
    
    if (error) {
      console.error("Erro ao cancelar:", error);
      setModalError(`Erro: ${error.message}`);
      setIsSavingModal(false);
    } else {
      // SUCESSO!
      setIsSavingModal(false);
      
      // NOVO: Prepara e abre o link do WhatsApp
      const telefoneCliente = selectedEvent.telefone_cliente.replace(/[^0-9]/g, '');
      const nomeCliente = selectedEvent.nome_cliente;
      const servicoNome = selectedEvent.servicos.nome;
      const dataAgendamento = format(new Date(selectedEvent.data_hora_inicio), "dd/MM/yyyy 'às' HH:mm");
      
      const mensagemWhatsapp = `Olá, ${nomeCliente}. Informamos que seu agendamento de "${servicoNome}" para o dia ${dataAgendamento} foi cancelado. Motivo: ${adminCancelReason}.`;
      
      // Assume DDD 55 (Brasil)
      const linkWhatsapp = `https://wa.me/55${telefoneCliente}?text=${encodeURIComponent(mensagemWhatsapp)}`;
      
      window.open(linkWhatsapp, '_blank'); // Abre em uma nova aba
      
      closeModal(); // Fecha o modal
    }
  };
  
  // buscarHorariosParaRemarcar (como antes)
  const buscarHorariosParaRemarcar = async (data) => {
    // ... (Lógica 100% igual a antes) ...
    setLoadingNovosHorarios(true);
    setNovosHorarios([]);
    setNovoHorarioSelecionado(null);
    setNovaData(data);
    const profissionalId = parseInt(modalProfissionalId);
    const servicoId = parseInt(modalServicoId);
    if (!profissionalId || !servicoId) {
      setModalError("Selecione um serviço e um profissional ANTES de mudar a data.");
      setLoadingNovosHorarios(false);
      return;
    }
    setModalError(null);
    const servico = allServicos.find(s => s.id === servicoId);
    const duracaoServico = servico.duracao_minutos;
    const diaDaSemana = data.getDay();
    const { data: horarioTrabalho, error: errorHorario } = await supabase
      .from('horarios_trabalho').select('hora_inicio, hora_fim')
      .eq('dia_semana', diaDaSemana).eq('profissional_id', profissionalId).single();
    if (errorHorario || !horarioTrabalho) {
      setLoadingNovosHorarios(false);
      return;
    }
    const inicioDoDia = new Date(data).setHours(0, 0, 0, 0);
    const fimDoDia = new Date(data).setHours(23, 59, 59, 999);
    let query = supabase
      .from('agendamentos').select('data_hora_inicio, data_hora_fim')
      .gte('data_hora_inicio', new Date(inicioDoDia).toISOString())
      .lte('data_hora_fim', new Date(fimDoDia).toISOString())
      .eq('profissional_id', profissionalId);
    if (modalMode === 'edit') {
      query = query.neq('id', selectedEvent.id);
    }
    const { data: agendamentos, error: errorAgendamentos } = await query;
    if (errorAgendamentos) {
      setLoadingNovosHorarios(false);
      return;
    }
    const slotsDisponiveis = [];
    const [horaInicio, minInicio] = horarioTrabalho.hora_inicio.split(':').map(Number);
    const [horaFim, minFim] = horarioTrabalho.hora_fim.split(':').map(Number);
    let slotAtual = new Date(data).setHours(horaInicio, minInicio, 0, 0);
    const horarioFechamento = new Date(data).setHours(horaFim, minFim, 0, 0);
    while (slotAtual < horarioFechamento) {
      const slotInicio = new Date(slotAtual);
      const slotFim = new Date(slotAtual + duracaoServico * 60000);
      if (slotFim.getTime() > horarioFechamento) break;
      const agora = new Date();
      if (slotInicio.getTime() < agora.getTime()) {
        slotAtual += duracaoServico * 60000;
        continue;
      }
      let ocupado = false;
      for (const ag of agendamentos) {
        const agInicio = new Date(ag.data_hora_inicio).getTime();
        const agFim = new Date(ag.data_hora_fim).getTime();
        const conflito = (slotInicio.getTime() >= agInicio && slotInicio.getTime() < agFim) || (slotFim.getTime() > agInicio && slotFim.getTime() <= agFim);
        if (conflito) {
          ocupado = true;
          break;
        }
      }
      if (!ocupado) slotsDisponiveis.push(slotInicio);
      slotAtual += duracaoServico * 60000;
    }
    setNovosHorarios(slotsDisponiveis);
    setLoadingNovosHorarios(false);
  };

  // --- Renderização (Como antes) ---
  if (authLoading || loading) {
    return <div className="max-w-4xl mx-auto"><p>Carregando agenda...</p></div>;
  }
  if (error) {
    return <div className="max-w-4xl mx-auto"><p className="text-red-600">{error}</p></div>;
  }
  
  const diasOrdenadosAtivos = Object.keys(agendamentosAgrupados);
  const diasOrdenadosFinalizados = Object.keys(finalizadosAgrupados);
  const diasOrdenadosCancelados = Object.keys(canceladosAgrupados);

  return (
    <div className="max-w-7xl mx-auto">
      
      {/* Cabeçalho (como antes) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          {profile.role === 'admin' ? 'Agenda (Mês Atual)' : 'Minha Agenda (Mês Atual)'}
        </h1>
        <div className="flex space-x-2 mt-4 md:mt-0 p-1 bg-gray-200 rounded-lg">
          <button onClick={() => setViewMode('cards')} className={`px-4 py-2 rounded-md font-semibold transition-all ${viewMode === 'cards' ? 'bg-white text-fuchsia-600 shadow-sm' : 'bg-transparent text-gray-600'}`}>
            Visão em Cards
          </button>
          <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-md font-semibold transition-all ${viewMode === 'calendar' ? 'bg-white text-fuchsia-600 shadow-sm' : 'bg-transparent text-gray-600'}`}>
            Visão em Calendário
          </button>
        </div>
      </div>

      {/* --- VISÃO EM CARDS (Como antes) --- */}
      {viewMode === 'cards' && (
        <div className="space-y-10">
          {/* --- 1. Cards Ativos --- */}
          {diasOrdenadosAtivos.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <h2 className="text-xl font-semibold text-gray-700">Agenda Limpa!</h2>
              <p className="text-gray-500 mt-2">Não há agendamentos futuros (pendentes ou em atendimento).</p>
            </div>
          ) : (
            diasOrdenadosAtivos.map(dataDia => (
              <div key={dataDia}>
                <h2 className="text-2xl font-semibold text-fuchsia-600 pb-2 mb-4 border-b-2 border-fuchsia-100">
                  {formatarDataCabecalho(dataDia)}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {agendamentosAgrupados[dataDia].map(ag => {
                    const statusColorClasses = 
                      ag.status === 'em_atendimento' ? 'bg-yellow-50 border border-yellow-300' :
                      'bg-white';
                    
                    return (
                      <div key={ag.id} className={`${statusColorClasses} rounded-lg shadow-lg overflow-hidden transition-all flex flex-col`}>
                        <div className="p-5 flex-1">
                          <p className="text-2xl font-bold text-gray-800">{formatarHora(ag.data_hora_inicio)}</p>
                          <p className="text-lg font-semibold text-gray-700 mt-2">{ag.nome_cliente}</p>
                          <p className="text-md text-gray-500 mt-1">{ag.servicos.nome}</p>
                          {profile.role === 'admin' && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <span className="text-xs font-semibold text-gray-400">PROFISSIONAL</span>
                              <p className="text-sm font-medium text-gray-600">{ag.profissionais.nome}</p>
                            </div>
                          )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t">
                          {ag.status === 'confirmado' && (
                            <button onClick={() => handleUpdateStatus(ag.id, 'em_atendimento')}
                              className="w-full p-2 rounded-lg text-white font-semibold bg-yellow-500 hover:bg-yellow-600"
                            > Iniciar Atendimento </button>
                          )}
                          {ag.status === 'em_atendimento' && (
                            <button onClick={() => handleUpdateStatus(ag.id, 'finalizado')}
                              className="w-full p-2 rounded-lg text-white font-semibold bg-green-500 hover:bg-green-600"
                            > Finalizar Atendimento </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* --- 2. Seção de Agendamentos Finalizados (Como antes) --- */}
          {diasOrdenadosFinalizados.length > 0 && (
            <div className="mt-12">
              <button
                onClick={() => setShowFinalizados(!showFinalizados)}
                className="text-2xl font-semibold text-gray-700 mb-4 w-full text-left p-4 bg-green-100 rounded-lg hover:bg-green-200"
              >
                Agendamentos Finalizados ({totalFinalizados})
                <span className="float-right">{showFinalizados ? 'Ocultar' : 'Mostrar'}</span>
              </button>
              
              {showFinalizados && (
                <div className="space-y-10 pt-4">
                  {diasOrdenadosFinalizados.map(dataDia => (
                    <div key={dataDia}>
                      <h3 className="text-xl font-semibold text-gray-500 pb-2 mb-4 border-b">
                        {formatarDataCabecalho(dataDia)}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {finalizadosAgrupados[dataDia].map(ag => (
                          <div key={ag.id} className="bg-green-50 border border-green-200 rounded-lg shadow-md overflow-hidden">
                            <div className="p-5">
                              <p className="text-2xl font-bold text-gray-600">{formatarHora(ag.data_hora_inicio)}</p>
                              <p className="text-lg font-semibold text-gray-600 mt-2">{ag.nome_cliente}</p>
                              <p className="text-md text-gray-500 mt-1">{ag.servicos.nome}</p>
                              {profile.role === 'admin' && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <p className="text-sm font-medium text-gray-500">{ag.profissionais.nome}</p>
                                </div>
                              )}
                            </div>
                            <div className="p-2 bg-green-100 border-t">
                              <p className="text-center font-semibold text-green-700">✓ FINALIZADO</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- 3. Seção de Agendamentos Cancelados (Como antes) --- */}
          {diasOrdenadosCancelados.length > 0 && (
            <div className="mt-12">
              <button
                onClick={() => setShowCancelados(!showCancelados)}
                className="text-2xl font-semibold text-gray-700 mb-4 w-full text-left p-4 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Agendamentos Cancelados ({totalCancelados})
                <span className="float-right">{showCancelados ? 'Ocultar' : 'Mostrar'}</span>
              </button>
              
              {showCancelados && (
                <div className="space-y-10 pt-4">
                  {diasOrdenadosCancelados.map(dataDia => (
                    <div key={dataDia}>
                      <h3 className="text-xl font-semibold text-gray-500 pb-2 mb-4 border-b">
                        {formatarDataCabecalho(dataDia)}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {canceladosAgrupados[dataDia].map(ag => (
                          <div key={ag.id} className="bg-red-50 border border-red-200 rounded-lg shadow-md overflow-hidden opacity-70">
                            <div className="p-5">
                              <p className="text-2xl font-bold text-gray-600 line-through">{formatarHora(ag.data_hora_inicio)}</p>
                              <p className="text-lg font-semibold text-gray-600 mt-2 line-through">{ag.nome_cliente}</p>
                              <p className="text-md text-gray-500 mt-1 line-through">{ag.servicos.nome}</p>
                              {profile.role === 'admin' && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <p className="text-sm font-medium text-gray-500 line-through">{ag.profissionais.nome}</p>
                                </div>
                              )}
                            </div>
                            <div className="p-2 bg-red-100 border-t">
                              <p className="text-center font-semibold text-red-700">
                                {ag.cancelamento_motivo || 'CANCELADO'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* --- VISÃO EM CALENDÁRIO (Como antes) --- */}
      {viewMode === 'calendar' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div style={{ height: '70vh' }}> 
            <Calendar
              localizer={localizer}
              events={eventosCalendario}
              startAccessor="start"
              endAccessor="end"
              views={['day', 'week', 'month', 'agenda']} 
              culture="pt-BR" 
              messages={messages} 
              style={{ height: '100%' }}
              selectable={true}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              view={calendarView}
              onView={setCalendarView}
              date={calendarDate}
              onNavigate={setCalendarDate}
              eventPropGetter={(event) => {
                const style = { backgroundColor: '#c026d3', borderColor: '#9d174d' }; 
                if (event.resource.status === 'em_atendimento') { 
                  style.backgroundColor = '#ECC94B'; style.borderColor = '#D69E2E';
                }
                return { style };
              }}
            />
          </div>
        </div>
      )}

      {/* --- MODAL (MODIFICADO) --- */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        onAfterClose={fetchAgendamentos} 
        className="Modal"
        overlayClassName="ModalOverlay"
      >
        {selectedEvent && (
          <form onSubmit={(e) => { e.preventDefault(); handleModalSave(); }}>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {modalMode === 'new' ? 'Novo Agendamento' : 'Editar Agendamento'}
            </h2>
            
            {/* Oculta o formulário de reagendamento se for cancelar */}
            {!showCancelOptions && (
              <>
                <p className="text-lg text-gray-600 mb-6">
                  Horário Atual: 
                  <strong> {format(selectedEvent.start || new Date(selectedEvent.data_hora_inicio), 'dd/MM/yyyy \'às\' HH:mm')} </strong>
                </p>
                {/* Reagendamento (SÓ ADMIN) */}
                {modalMode === 'edit' && profile.role === 'admin' && (
                  <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                    <button type="button" onClick={() => setShowRemarcar(!showRemarcar)} className="font-semibold text-fuchsia-600">
                      {showRemarcar ? '▼ Fechar Reagendamento' : '► Mudar Dia/Horário'}
                    </button>
                    {showRemarcar && (
                      <div className="mt-4 space-y-4">
                        <p className="text-sm text-gray-600">Atenção: Para buscar horários, o Serviço e o Profissional (nos campos abaixo) devem estar selecionados.</p>
                        <div className="flex gap-4">
                          <div className="w-1H-2">
                            <label className="block text-sm font-medium text-gray-700">Novo Dia</label>
                            <DatePicker
                              selected={novaData}
                              onChange={buscarHorariosParaRemarcar}
                              minDate={new Date()}
                              locale="pt-BR"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
                            />
                          </div>
                          <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700">Novo Horário</label>
                            <select
                              value={novoHorarioSelecionado || ''}
                              onChange={(e) => setNovoHorarioSelecionado(e.target.value)}
                              disabled={loadingNovosHorarios || novosHorarios.length === 0}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white disabled:bg-gray-100"
                            >
                              <option value="">
                                {loadingNovosHorarios ? 'Buscando...' : (novosHorarios.length === 0 ? 'Sem horários' : 'Selecione...')}
                              </option>
                              {novosHorarios.map(horario => (
                                <option key={horario.getTime()} value={horario.toISOString()}>
                                  {format(horario, 'HH:mm')}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Detalhes do Agendamento */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Serviço</label>
                    <select value={modalServicoId} onChange={(e) => setModalServicoId(e.target.value)}
                      disabled={profile.role !== 'admin'} // SÓ ADMIN EDITA
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white disabled:bg-gray-100" required
                    >
                      <option value="">Selecione um serviço...</option>
                      {allServicos.map(s => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Profissional</label>
                    <select value={modalProfissionalId} onChange={(e) => setModalProfissionalId(e.target.value)}
                      disabled={profile.role !== 'admin'} // SÓ ADMIN EDITA
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white disabled:bg-gray-100" required
                    >
                      <option value="">Selecione uma profissional...</option>
                      {allProfissionais.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome do Cliente</label>
                    <input type="text" value={modalNome} onChange={(e) => setModalNome(e.target.value)}
                      disabled={profile.role !== 'admin'} // SÓ ADMIN EDITA
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 disabled:bg-gray-100"
                      placeholder="Nome completo" required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
                    <input type="tel" value={modalTelefone} onChange={(e) => setModalTelefone(e.target.value)}
                      disabled={profile.role !== 'admin'} // SÓ ADMIN EDITA
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 disabled:bg-gray-100"
                      placeholder="(11) 99999-9999" required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email (Opcional)</label>
                    <input type="email" value={modalEmail} onChange={(e) => setEmail(e.target.value)}
                      disabled={profile.role !== 'admin'} // SÓ ADMIN EDITA
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 disabled:bg-gray-100"
                      placeholder="email@cliente.com"
                    />
                  </div>
                </div>
              </>
            )}

            {/* --- Formulário de Cancelamento (MODIFICADO) --- */}
            {/* Agora aparece para Admin E Profissional */}
            {modalMode === 'edit' && showCancelOptions && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-red-600">Cancelar Agendamento</h3>
                <p>Por favor, selecione o motivo do cancelamento:</p>
                <select
                  value={adminCancelReason}
                  onChange={(e) => setAdminCancelReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white"
                >
                  {MOTIVOS_ADMIN.map(motivo => (
                    <option key={motivo} value={motivo}>{motivo}</option>
                  ))}
                </select>
              </div>
            )}
            
            {modalError && (
              <p className="text-red-600 text-sm mt-4">{modalError}</p>
            )}

            {/* --- Botões do Modal (MODIFICADOS) --- */}
            <div className="mt-8 flex space-x-4">
              
              {/* 1. Botão "Voltar" ou "Cancelar" (Padrão) */}
              <button
                type="button"
                onClick={() => {
                  if (showCancelOptions) setShowCancelOptions(false); // Se estiver cancelando, volta para a edição
                  else closeModal(); // Se estiver editando ou criando, fecha
                }}
                className="w-1/2 p-3 rounded-lg text-gray-700 font-semibold bg-gray-200 hover:bg-gray-300"
              >
                {showCancelOptions ? 'Voltar' : (modalMode === 'new' ? 'Cancelar' : 'Fechar')}
              </button>

              {/* 2. Botão "Salvar" (Fúcsia) */}
              {/* Só aparece se for 'novo' OU se for 'admin' e NÃO estiver cancelando */}
              {(modalMode === 'new' || profile.role === 'admin') && !showCancelOptions && (
                <button
                  type="submit"
                  disabled={isSavingModal}
                  className="w-1/2 p-3 rounded-lg text-white font-semibold bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-gray-400"
                >
                  {isSavingModal ? 'Salvando...' : (modalMode === 'new' ? 'Salvar Agendamento' : 'Salvar Mudanças')}
                </button>
              )}

              {/* 3. Botão "Cancelar Agendamento" (Vermelho) */}
              {/* Aparece se for 'edit' (para Admin E Profissional) */}
              {modalMode === 'edit' && (
                <button
                  type="button"
                  onClick={handleModalCancel} // A função que agora mostra os motivos
                  disabled={isSavingModal}
                  className="w-1/2 p-3 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                  {showCancelOptions ? 'Confirmar Cancelamento' : 'Cancelar Agendamento'}
                </button>
              )}
            </div>
            
          </form>
        )}
      </Modal>

    </div>
  );
}

export default AdminAgenda;