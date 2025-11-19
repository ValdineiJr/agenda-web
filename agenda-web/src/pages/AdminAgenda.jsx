import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { useAuth } from '/src/AuthContext.jsx';

// --- Imports ---
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import Modal from 'react-modal';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; 
import 'react-big-calendar/lib/css/react-big-calendar.css';

registerLocale('pt-BR', ptBR);
Modal.setAppElement('#root');

// --- Configuração do Calendário ---
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const messages = {
  allDay: 'Dia Inteiro',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Não há eventos neste período.',
  showMore: (total) => `+ Ver mais (${total})`,
};

const MOTIVOS_ADMIN = [
  "Cliente solicitou (WhatsApp)",
  "Profissional indisponível",
  "Cliente não compareceu (No-show)",
  "Outro motivo"
];

// --- Funções Auxiliares de Formatação ---
function formatarDataCabecalho(dataString) {
  const [dia, mes, ano] = dataString.split('/');
  const dataObj = new Date(`${ano}-${mes}-${dia}T12:00:00`); 
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dataObj);
}

function formatarHora(dataISO) {
  const dataObj = new Date(dataISO);
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(dataObj);
}

// --- Componente Visual do Evento (Calendário) ---
const EventoPersonalizado = ({ event }) => {
  return (
    <div className="flex flex-col text-xs leading-tight p-1 h-full justify-center overflow-hidden">
      <span className="font-bold text-yellow-200 mb-0.5">
        {format(event.start, 'HH:mm')}
      </span>
      <span className="font-semibold truncate uppercase">
        {event.resource.servicos?.nome}
      </span>
      <span className="font-light truncate text-white/90">
        {event.resource.nome_cliente.split(' ')[0]}
      </span>
    </div>
  );
};

// =========================================================
//               COMPONENTE PRINCIPAL DA PÁGINA
// =========================================================
function AdminAgenda() {
  const { profile, loading: authLoading } = useAuth(); 
  
  // --- States de Dados ---
  const [agendamentosAgrupados, setAgendamentosAgrupados] = useState({});
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const [canceladosAgrupados, setCanceladosAgrupados] = useState({});
  const [finalizadosAgrupados, setFinalizadosAgrupados] = useState({});
  
  // --- States de Controle de Tela ---
  const [showCancelados, setShowCancelados] = useState(false);
  const [showFinalizados, setShowFinalizados] = useState(false);
  const [totalCancelados, setTotalCancelados] = useState(0);
  const [totalFinalizados, setTotalFinalizados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'calendar'
  
  // --- NOVO: Filtro de Profissional ---
  const [filtroProfissionalId, setFiltroProfissionalId] = useState(''); 

  // --- Modal States ---
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('new'); // 'new' ou 'edit'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [calendarView, setCalendarView] = useState('week'); 
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // --- Listas para os Selects do Modal ---
  const [allServicos, setAllServicos] = useState([]);
  const [allProfissionais, setAllProfissionais] = useState([]);
  
  // --- Campos do Formulário do Modal ---
  const [modalServicoId, setModalServicoId] = useState('');
  const [modalProfissionalId, setModalProfissionalId] = useState('');
  const [modalNome, setModalNome] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalTelefone, setModalTelefone] = useState('');
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [modalError, setModalError] = useState(null);
  
  // --- Lógica de Reagendamento e Cancelamento ---
  const [showRemarcar, setShowRemarcar] = useState(false);
  const [novaData, setNovaData] = useState(new Date());
  const [novosHorarios, setNovosHorarios] = useState([]);
  const [loadingNovosHorarios, setLoadingNovosHorarios] = useState(false);
  const [novoHorarioSelecionado, setNovoHorarioSelecionado] = useState(null);
  const [showCancelOptions, setShowCancelOptions] = useState(false);
  const [adminCancelReason, setAdminCancelReason] = useState(MOTIVOS_ADMIN[0]);

  // --- EFEITOS (UseEffect) ---

  // 1. Carregar listas básicas (Serviços e Profissionais) ao iniciar
  useEffect(() => {
    if (!authLoading && profile) {
      fetchModalData(); 
    }
  }, [authLoading, profile]);

  // 2. Buscar Agendamentos (Recarrega se o filtro mudar)
  useEffect(() => {
    if (!authLoading && profile) {
      fetchAgendamentos();
    }
  }, [authLoading, profile, filtroProfissionalId]); // Dependência adicionada: filtroProfissionalId

  // --- FUNÇÕES DE BUSCA (FETCH) ---

  async function fetchModalData() {
    // Busca Serviços
    const { data: servicosData } = await supabase.from('servicos').select('id, nome, duracao_minutos');
    if (servicosData) setAllServicos(servicosData);
    
    // Busca Profissionais
    const { data: profData } = await supabase.from('profissionais').select('id, nome');
    if (profData) setAllProfissionais(profData);
  }

  async function fetchAgendamentos() {
    setLoading(true);
    setError(null);
    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    inicioDoMes.setHours(0, 0, 0, 0);
    
    // Monta a query base
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
    
    // Se NÃO for admin, trava para ver apenas os próprios agendamentos
    if (profile.role !== 'admin') {
      query = query.eq('profissional_id', profile.id);
    }

    const { data: agendamentosRaw, error: dbError } = await query;
    
    if (dbError) {
      console.error('Erro ao buscar agenda:', dbError);
      setError('Erro ao carregar agenda.');
    } else if (agendamentosRaw) {
      
      // --- AQUI ENTRA O FILTRO NOVO DO DROPDOWN ---
      let agendamentosFiltrados = agendamentosRaw;
      if (filtroProfissionalId) {
        // Se o filtro não for vazio, filtra pelo ID selecionado
        agendamentosFiltrados = agendamentosRaw.filter(ag => ag.profissional_id == filtroProfissionalId);
      }

      // --- Separação por Status ---
      const ativos = agendamentosFiltrados.filter(ag => ag.status === 'confirmado' || ag.status === 'em_atendimento');
      const cancelados = agendamentosFiltrados.filter(ag => ag.status === 'cancelado');
      const finalizados = agendamentosFiltrados.filter(ag => ag.status === 'finalizado'); 
      
      setTotalCancelados(cancelados.length);
      setTotalFinalizados(finalizados.length); 
      
      // --- Agrupamento para VISÃO CARDS ---
      const agruparPorDia = (lista) => {
        return lista.reduce((acc, ag) => {
          const dataDia = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
          if (!acc[dataDia]) acc[dataDia] = [];
          acc[dataDia].push(ag);
          return acc;
        }, {});
      };

      setAgendamentosAgrupados(agruparPorDia(ativos));
      setCanceladosAgrupados(agruparPorDia(cancelados));
      setFinalizadosAgrupados(agruparPorDia(finalizados));

      // --- Formatação para VISÃO CALENDÁRIO ---
      const eventos = ativos.map((ag) => ({
        title: `${formatarHora(ag.data_hora_inicio)} - ${ag.servicos?.nome}`,
        start: new Date(ag.data_hora_inicio),
        end: new Date(ag.data_hora_fim),
        resource: ag, // Passa o objeto completo para o evento
        status: ag.status 
      }));
      setEventosCalendario(eventos);
    }
    setLoading(false);
  }

  // --- FUNÇÃO DE ATUALIZAR STATUS (CARD) ---
  const handleUpdateStatus = async (agendamentoId, novoStatus) => {
    const { error } = await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', agendamentoId);
    if (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Não foi possível atualizar o status.');
    } else {
      fetchAgendamentos();
    }
  };

  // --- HANDLERS DO MODAL (ABRIR/FECHAR) ---

  // Abrir para NOVO agendamento (clique no calendário)
  const handleSelectSlot = (slotInfo) => {
    setModalMode('new');
    setSelectedEvent({ start: slotInfo.start, end: slotInfo.end });
    
    // Limpa campos
    setModalServicoId(''); 
    setModalNome(''); 
    setModalEmail(''); 
    setModalTelefone('');
    setModalError(null); 
    setShowRemarcar(false); 
    setNovoHorarioSelecionado(null); 
    setShowCancelOptions(false);
    
    // Preenche profissional:
    // Se não for admin, é o próprio user.
    // Se FOR admin e tiver filtro selecionado, usa o filtro. Senão, vazio.
    if (profile.role !== 'admin') {
      setModalProfissionalId(profile.id);
    } else {
      setModalProfissionalId(filtroProfissionalId || ''); 
    }
    
    setModalIsOpen(true);
  };

  // Abrir para EDITAR agendamento (clique no evento)
  const handleSelectEvent = (eventInfo) => {
    const ag = eventInfo.resource;
    setModalMode('edit');
    setSelectedEvent(ag);
    
    // Preenche campos com dados existentes
    setModalServicoId(ag.servico_id); 
    setModalProfissionalId(ag.profissional_id);
    setModalNome(ag.nome_cliente); 
    setModalEmail(ag.email_cliente || ''); 
    setModalTelefone(ag.telefone_cliente || '');
    
    setModalError(null); 
    setShowRemarcar(false); 
    setNovoHorarioSelecionado(null);
    setNovaData(new Date(ag.data_hora_inicio)); 
    setShowCancelOptions(false);
    setAdminCancelReason(MOTIVOS_ADMIN[0]);
    
    setModalIsOpen(true); 
  };
  
  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedEvent(null);
    setShowCancelOptions(false);
  };

  // --- FUNÇÃO SALVAR NO MODAL (CRIAR OU EDITAR) ---
  const handleModalSave = async () => {
    setIsSavingModal(true); 
    setModalError(null);
    
    // Validação básica
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
    
    // Define Horário de Início
    let dataHoraInicio;
    if (showRemarcar && novoHorarioSelecionado) {
      dataHoraInicio = new Date(novoHorarioSelecionado); // Usando novo horário
    } else if (modalMode === 'new') {
      dataHoraInicio = selectedEvent.start; // Do slot clicado
    } else {
      dataHoraInicio = new Date(selectedEvent.data_hora_inicio); // Mantém original
    }
    
    // Calcula fim com base na duração
    const dataHoraFim = new Date(dataHoraInicio.getTime() + servico.duracao_minutos * 60000);
    
    const payload = {
      servico_id: servico.id, 
      profissional_id: parseInt(modalProfissionalId),
      nome_cliente: modalNome, 
      email_cliente: modalEmail, 
      telefone_cliente: modalTelefone,
      data_hora_inicio: dataHoraInicio.toISOString(), 
      data_hora_fim: dataHoraFim.toISOString(), 
      status: 'confirmado'
    };

    let errorReq = null;
    if (modalMode === 'new') {
      const { error } = await supabase.from('agendamentos').insert(payload); 
      errorReq = error;
    } else {
      const { error } = await supabase.from('agendamentos').update(payload).eq('id', selectedEvent.id); 
      errorReq = error;
    }

    if (errorReq) {
      console.error("Erro ao salvar:", errorReq);
      setModalError(`Erro: ${errorReq.message}`);
      setIsSavingModal(false);
    } else {
      setIsSavingModal(false);
      closeModal();
    }
  };

  // --- FUNÇÃO CANCELAR AGENDAMENTO (COM WHATSAPP) ---
  const handleModalCancel = async () => {
    // Verifica permissão (Profissional só cancela o seu)
    if (profile.role !== 'admin' && profile.id !== selectedEvent.profissional_id) {
       setModalError('Você só pode cancelar seus próprios agendamentos.');
       return;
    }
    
    // Se ainda não mostrou o dropdown de motivos, mostra agora
    if (!showCancelOptions) {
      setAdminCancelReason(MOTIVOS_ADMIN[0]);
      setShowCancelOptions(true); 
      return;
    }

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
      setIsSavingModal(false);
      
      // Gera link do WhatsApp para avisar cliente
      const telefoneCliente = selectedEvent.telefone_cliente.replace(/[^0-9]/g, '');
      const nomeCliente = selectedEvent.nome_cliente;
      const servicoNome = selectedEvent.servicos?.nome;
      const dataAgendamento = format(new Date(selectedEvent.data_hora_inicio), "dd/MM/yyyy 'às' HH:mm");
      
      const mensagemWhatsapp = `Olá, ${nomeCliente}. Informamos que seu agendamento de "${servicoNome}" para o dia ${dataAgendamento} foi cancelado. Motivo: ${adminCancelReason}.`;
      const linkWhatsapp = `https://wa.me/55${telefoneCliente}?text=${encodeURIComponent(mensagemWhatsapp)}`;
      
      window.open(linkWhatsapp, '_blank'); 
      
      closeModal(); 
    }
  };

  // --- LÓGICA COMPLEXA DE BUSCAR HORÁRIOS PARA REMARCAR ---
  const buscarHorariosParaRemarcar = async (data) => {
    setLoadingNovosHorarios(true); 
    setNovosHorarios([]); 
    setNovoHorarioSelecionado(null); 
    setNovaData(data);
    
    const profId = parseInt(modalProfissionalId); 
    const servId = parseInt(modalServicoId);
    
    if (!profId || !servId) {
      setModalError("Selecione um serviço e um profissional ANTES de mudar a data.");
      setLoadingNovosHorarios(false);
      return;
    }
    setModalError(null);
    
    const servico = allServicos.find(s => s.id === servId);
    const duracaoServico = servico.duracao_minutos;
    const diaDaSemana = data.getDay();
    
    // 1. Busca horário de trabalho do profissional naquele dia da semana
    const { data: trab, error: errTrab } = await supabase
      .from('horarios_trabalho').select('hora_inicio, hora_fim')
      .eq('dia_semana', diaDaSemana).eq('profissional_id', profId).single();
      
    if (errTrab || !trab) {
      setLoadingNovosHorarios(false);
      return; // Não trabalha nesse dia
    }
    
    // 2. Busca agendamentos existentes nesse dia
    const inicioDia = new Date(data).setHours(0,0,0,0); 
    const fimDia = new Date(data).setHours(23,59,59,999);
    
    let query = supabase
      .from('agendamentos').select('data_hora_inicio, data_hora_fim')
      .gte('data_hora_inicio', new Date(inicioDia).toISOString())
      .lte('data_hora_fim', new Date(fimDia).toISOString())
      .eq('profissional_id', profId)
      .neq('status', 'cancelado'); // Ignora cancelados
      
    if (modalMode === 'edit') {
      query = query.neq('id', selectedEvent.id); // Ignora o próprio agendamento que está sendo editado
    }
    
    const { data: agends, error: errAg } = await query;
    if (errAg) {
      setLoadingNovosHorarios(false);
      return;
    }
    
    // 3. Calcula Slots livres
    const slots = [];
    const [hIni, mIni] = trab.hora_inicio.split(':').map(Number);
    const [hFim, mFim] = trab.hora_fim.split(':').map(Number);
    
    let atual = new Date(data).setHours(hIni, mIni, 0, 0); 
    const limite = new Date(data).setHours(hFim, mFim, 0, 0);
    
    while (atual < limite) {
      const ini = new Date(atual); 
      const fim = new Date(atual + duracaoServico * 60000);
      
      if (fim.getTime() > limite) break;
      
      // Verifica se já passou da hora (se for hoje)
      const agora = new Date();
      if (ini.getTime() < agora.getTime()) {
        atual += duracaoServico * 60000;
        continue;
      }
      
      // Verifica colisão
      const ocupado = agends?.some(ag => {
        const aIni = new Date(ag.data_hora_inicio).getTime(); 
        const aFim = new Date(ag.data_hora_fim).getTime();
        return (ini.getTime() >= aIni && ini.getTime() < aFim) || 
               (fim.getTime() > aIni && fim.getTime() <= aFim);
      });
      
      if (!ocupado) slots.push(ini);
      
      atual += duracaoServico * 60000;
    }
    
    setNovosHorarios(slots); 
    setLoadingNovosHorarios(false);
  };

  // =========================================================
  //                 RENDERIZAÇÃO (JSX)
  // =========================================================
  
  if (authLoading || (loading && !agendamentosAgrupados)) {
    return <div className="p-8 text-center">Carregando agenda...</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  const diasOrdenadosAtivos = Object.keys(agendamentosAgrupados).sort((a,b) => {
      // Ordena as chaves de data (String) convertendo para Date
      const [da, ma, aa] = a.split('/');
      const [db, mb, ab] = b.split('/');
      return new Date(`${aa}-${ma}-${da}`) - new Date(`${ab}-${mb}-${db}`);
  });
  const diasOrdenadosFinalizados = Object.keys(finalizadosAgrupados);
  const diasOrdenadosCancelados = Object.keys(canceladosAgrupados);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">
          {profile.role === 'admin' ? 'Agenda Geral' : 'Minha Agenda'}
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          
          {/* --- FILTRO DE PROFISSIONAL (SÓ ADMIN VÊ) --- */}
          {profile.role === 'admin' && (
            <div className="relative">
               <select 
                 value={filtroProfissionalId} 
                 onChange={(e) => setFiltroProfissionalId(e.target.value)}
                 className="appearance-none w-full sm:w-64 bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-fuchsia-500"
               >
                 <option value="">Todos os Profissionais</option>
                 {allProfissionais.map(p => (
                   <option key={p.id} value={p.id}>{p.nome}</option>
                 ))}
               </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                 <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
               </div>
            </div>
          )}

          {/* Botões de Alternar Visualização */}
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button onClick={() => setViewMode('cards')} className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-semibold text-sm transition-all ${viewMode === 'cards' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-gray-600'}`}>
              Cards
            </button>
            <button onClick={() => setViewMode('calendar')} className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-semibold text-sm transition-all ${viewMode === 'calendar' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-gray-600'}`}>
              Calendário
            </button>
          </div>
        </div>
      </div>

      {/* --- MODO VISUALIZAÇÃO: CARDS --- */}
      {viewMode === 'cards' && (
        <div className="space-y-10 animate-fade-in">
          
          {/* Lista de Ativos */}
          {diasOrdenadosAtivos.length === 0 ? (
             <div className="bg-white p-10 rounded-lg shadow text-center text-gray-500">
               <p className="text-lg">Nenhum agendamento encontrado para este filtro.</p>
             </div>
          ) : (
            diasOrdenadosAtivos.map(dia => (
              <div key={dia}>
                <h2 className="text-xl font-bold text-fuchsia-700 mb-4 border-b pb-2 border-fuchsia-100">
                  {formatarDataCabecalho(dia)}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {agendamentosAgrupados[dia].map(ag => {
                    const emAtendimento = ag.status === 'em_atendimento';
                    return (
                      <div key={ag.id} className={`rounded-lg shadow-md border-l-4 p-4 bg-white flex flex-col justify-between ${emAtendimento ? 'border-yellow-400 bg-yellow-50' : 'border-fuchsia-500'}`}>
                        <div>
                          <div className="flex justify-between items-start">
                             <span className="text-2xl font-bold text-gray-700">{formatarHora(ag.data_hora_inicio)}</span>
                             {emAtendimento && <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded font-bold">EM ANDAMENTO</span>}
                          </div>
                          <p className="font-semibold text-gray-800 mt-2">{ag.nome_cliente}</p>
                          <p className="text-sm text-gray-600">{ag.servicos?.nome}</p>
                          <p className="text-xs text-gray-400 mt-3 uppercase tracking-wide font-bold">
                             {ag.profissionais?.nome}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                          {ag.status === 'confirmado' && (
                            <button onClick={() => handleUpdateStatus(ag.id, 'em_atendimento')} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded text-sm font-bold transition-colors">Iniciar</button>
                          )}
                          {ag.status === 'em_atendimento' && (
                            <button onClick={() => handleUpdateStatus(ag.id, 'finalizado')} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded text-sm font-bold transition-colors">Finalizar</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Botões de Expandir Histórico */}
          {(diasOrdenadosFinalizados.length > 0 || diasOrdenadosCancelados.length > 0) && <hr className="border-gray-200 my-8" />}
          
          {/* Finalizados */}
          {diasOrdenadosFinalizados.length > 0 && (
            <div>
               <button onClick={() => setShowFinalizados(!showFinalizados)} className="w-full text-left bg-green-50 hover:bg-green-100 p-4 rounded-lg text-green-800 font-semibold flex justify-between transition-colors">
                 <span>Agendamentos Finalizados ({totalFinalizados})</span> <span>{showFinalizados ? '▼' : '►'}</span>
               </button>
               {showFinalizados && (
                 <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                   {diasOrdenadosFinalizados.map(d => finalizadosAgrupados[d].map(ag => (
                     <div key={ag.id} className="bg-green-50 border border-green-200 p-3 rounded opacity-80">
                        <p className="text-sm font-bold text-gray-700">{ag.servicos?.nome} - {formatarHora(ag.data_hora_inicio)}</p>
                        <p className="text-xs text-gray-500">{ag.nome_cliente} ({ag.profissionais?.nome})</p>
                     </div>
                   )))}
                 </div>
               )}
            </div>
          )}

          {/* Cancelados */}
          {diasOrdenadosCancelados.length > 0 && (
            <div className="mt-4">
               <button onClick={() => setShowCancelados(!showCancelados)} className="w-full text-left bg-red-50 hover:bg-red-100 p-4 rounded-lg text-red-800 font-semibold flex justify-between transition-colors">
                 <span>Agendamentos Cancelados ({totalCancelados})</span> <span>{showCancelados ? '▼' : '►'}</span>
               </button>
               {showCancelados && (
                 <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                   {diasOrdenadosCancelados.map(d => canceladosAgrupados[d].map(ag => (
                     <div key={ag.id} className="bg-red-50 border border-red-200 p-3 rounded opacity-60 grayscale">
                        <p className="text-sm font-bold line-through text-gray-700">{ag.servicos?.nome}</p>
                        <p className="text-xs text-gray-500">{ag.nome_cliente} - Motivo: {ag.cancelamento_motivo}</p>
                     </div>
                   )))}
                 </div>
               )}
            </div>
          )}
        </div>
      )}

      {/* --- MODO VISUALIZAÇÃO: CALENDÁRIO --- */}
      {viewMode === 'calendar' && (
        <div className="bg-white p-4 rounded-lg shadow-md h-[80vh] animate-fade-in">
           <Calendar
              localizer={localizer}
              events={eventosCalendario}
              startAccessor="start" 
              endAccessor="end"
              views={['day', 'week', 'month', 'agenda']} 
              culture="pt-BR" 
              messages={messages}
              selectable={true}
              onSelectSlot={handleSelectSlot} 
              onSelectEvent={handleSelectEvent}
              view={calendarView} 
              onView={setCalendarView} 
              date={calendarDate} 
              onNavigate={setCalendarDate}
              // Componente customizado de evento
              components={{ event: EventoPersonalizado }}
              // Estilização do evento baseada no status
              eventPropGetter={(event) => {
                const style = { backgroundColor: '#d946ef', borderColor: '#a21caf', color: 'white', borderLeft: '4px solid #fdf4ff' }; 
                if (event.resource.status === 'em_atendimento') { 
                  style.backgroundColor = '#f59e0b'; 
                  style.borderColor = '#b45309'; 
                }
                return { style };
              }}
            />
        </div>
      )}

      {/* --- MODAL (NOVO/EDITAR/CANCELAR) --- */}
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
              {modalMode === 'new' ? 'Novo Agendamento' : 'Detalhes do Agendamento'}
            </h2>
            
            {/* --- SEÇÃO PRINCIPAL (DADOS) --- */}
            {!showCancelOptions ? (
              <div className="space-y-4">
                 {/* Seção de Reagendamento (Só Admin) */}
                 {modalMode === 'edit' && profile.role === 'admin' && (
                   <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 mb-4">
                      <button type="button" onClick={() => setShowRemarcar(!showRemarcar)} className="text-fuchsia-600 font-bold flex items-center gap-2">
                        {showRemarcar ? '▼ Fechar Reagendamento' : '📅 Reagendar (Mudar Dia/Horário)'}
                      </button>
                      
                      {showRemarcar && (
                        <div className="mt-4 space-y-3 animate-fade-in">
                          <p className="text-xs text-gray-500">Selecione o Serviço e Profissional abaixo para calcular os horários.</p>
                          <div className="flex flex-col sm:flex-row gap-4">
                             <div className="w-full sm:w-1/2">
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Novo Dia</label>
                               <DatePicker selected={novaData} onChange={buscarHorariosParaRemarcar} minDate={new Date()} locale="pt-BR" className="input-modal" />
                             </div>
                             <div className="w-full sm:w-1/2">
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Novo Horário</label>
                               <select onChange={e => setNovoHorarioSelecionado(e.target.value)} className="input-modal">
                                  <option>Selecione...</option>
                                  {novosHorarios.map(h => <option key={h} value={h.toISOString()}>{format(h, 'HH:mm')}</option>)}
                               </select>
                             </div>
                          </div>
                        </div>
                      )}
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">Serviço</label>
                      <select value={modalServicoId} onChange={e => setModalServicoId(e.target.value)} disabled={profile.role !== 'admin'} className="input-modal" required>
                        <option value="">Selecione...</option>
                        {allServicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">Profissional</label>
                      <select value={modalProfissionalId} onChange={e => setModalProfissionalId(e.target.value)} disabled={profile.role !== 'admin'} className="input-modal" required>
                        <option value="">Selecione...</option>
                        {allProfissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase">Nome Cliente</label>
                   <input type="text" value={modalNome} onChange={e => setModalNome(e.target.value)} disabled={profile.role !== 'admin'} className="input-modal" required />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase">Telefone</label>
                   <input type="tel" value={modalTelefone} onChange={e => setModalTelefone(e.target.value)} disabled={profile.role !== 'admin'} className="input-modal" required />
                 </div>
                 
                 {/* Footer do Modal (Botões) */}
                 <div className="flex gap-3 pt-4 mt-4 border-t border-gray-100">
                    <button type="button" onClick={closeModal} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded font-semibold hover:bg-gray-300 transition-colors">Fechar</button>
                    
                    {/* Botão Salvar (Novo ou Admin) */}
                    {(modalMode === 'new' || profile.role === 'admin') && (
                      <button type="submit" disabled={isSavingModal} className="flex-1 bg-fuchsia-600 text-white py-2 rounded font-bold hover:bg-fuchsia-700 transition-colors shadow-md">
                         {isSavingModal ? 'Salvando...' : 'Salvar'}
                      </button>
                    )}
                    
                    {/* Botão Cancelar Agendamento (Edição) */}
                    {modalMode === 'edit' && (
                      <button type="button" onClick={handleModalCancel} className="flex-1 bg-red-100 text-red-600 py-2 rounded font-bold hover:bg-red-200 transition-colors">Cancelar Agenda</button>
                    )}
                 </div>
              </div>
            ) : (
              // --- SEÇÃO DE CONFIRMAÇÃO DE CANCELAMENTO ---
              <div className="space-y-6 animate-fade-in">
                 <div className="bg-red-50 p-4 rounded border border-red-200">
                    <h3 className="text-lg font-bold text-red-700 mb-2">Confirmar Cancelamento</h3>
                    <p className="text-sm text-red-600 mb-4">Selecione o motivo. Isso será enviado ao cliente via WhatsApp.</p>
                    
                    <select value={adminCancelReason} onChange={e => setAdminCancelReason(e.target.value)} className="input-modal border-red-300 focus:ring-red-500">
                       {MOTIVOS_ADMIN.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                 </div>

                 <div className="flex gap-3">
                    <button type="button" onClick={() => setShowCancelOptions(false)} className="flex-1 bg-gray-200 py-3 rounded font-semibold text-gray-700">Voltar</button>
                    <button type="button" onClick={handleModalCancel} disabled={isSavingModal} className="flex-1 bg-red-600 text-white py-3 rounded font-bold shadow-md hover:bg-red-700">
                       {isSavingModal ? 'Processando...' : 'Confirmar e Avisar Cliente'}
                    </button>
                 </div>
              </div>
            )}

            {modalError && <p className="text-red-600 text-center font-bold text-sm mt-4">{modalError}</p>}
          </form>
        )}
      </Modal>

    </div>
  );
}

export default AdminAgenda;