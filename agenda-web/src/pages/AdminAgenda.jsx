import { useState, useEffect, useMemo } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { useAuth } from '/src/AuthContext.jsx';

// --- Imports de Bibliotecas ---
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import Modal from 'react-modal';
import DatePicker, { registerLocale } from 'react-datepicker';

// --- Imports de Estilos CSS ---
import 'react-datepicker/dist/react-datepicker.css'; 
import 'react-big-calendar/lib/css/react-big-calendar.css';

// --- Configuração Inicial ---
registerLocale('pt-BR', ptBR);
Modal.setAppElement('#root');

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const messages = {
  allDay: 'Dia Inteiro', previous: 'Anterior', next: 'Próximo',
  today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia',
  agenda: 'Lista', date: 'Data', time: 'Hora', event: 'Evento',
  noEventsInRange: 'Sem agendamentos neste período.',
  showMore: (total) => `+${total} mais`,
};

const MOTIVOS_ADMIN = [
  "Cliente solicitou (WhatsApp)", 
  "Profissional indisponível", 
  "Cliente não compareceu (No-show)", 
  "Erro de Agendamento",
  "Outro motivo"
];

// =========================================================
//               FUNÇÕES AUXILIARES
// =========================================================
function formatarDataCabecalho(dataString) {
  if (!dataString) return '';
  const [dia, mes, ano] = dataString.split('/');
  const data = new Date(`${ano}-${mes}-${dia}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(data);
}

function formatarHora(dataISO) {
  if (!dataISO) return '';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(dataISO));
}

function getMesAno(dataString) {
  // Recebe dd/mm/yyyy e retorna "Fevereiro 2026"
  const [dia, mes, ano] = dataString.split('/');
  const data = new Date(`${ano}-${mes}-${dia}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(data);
}

// =========================================================
//    COMPONENTE DE EVENTO (VISUAL DO CALENDÁRIO)
// =========================================================
const EventoCalendario = ({ event }) => {
  const isEmAtendimento = event.resource.status === 'em_atendimento';
  const isFinalizado = event.resource.status === 'finalizado';
  const isCancelado = event.resource.status === 'cancelado';

  let borderClass = 'border-fuchsia-600';
  let bgClass = 'bg-white text-gray-700';
  let indicator = null;

  if (isEmAtendimento) {
    borderClass = 'border-amber-500';
    bgClass = 'bg-amber-50 text-amber-900';
    indicator = <span className="absolute top-1 right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>;
  } else if (isFinalizado) {
    borderClass = 'border-gray-400';
    bgClass = 'bg-gray-100 text-gray-400 opacity-70';
  } else if (isCancelado) {
    borderClass = 'border-red-500';
    bgClass = 'bg-red-50 text-red-800 decoration-slate-400';
  }

  return (
    <div className="relative group h-full w-full font-sans">
      <div className={`h-full w-full border-l-[4px] ${borderClass} rounded-r-md p-1.5 shadow-sm hover:shadow-md transition-all ${bgClass} flex flex-col justify-start overflow-hidden leading-tight`}>
        {indicator}
        <div className="flex justify-between items-center mb-0.5">
           <span className="text-[10px] font-bold opacity-80 font-mono">
             {format(event.start, 'HH:mm')}
           </span>
        </div>
        <div className="font-extrabold text-[11px] truncate uppercase tracking-tight">
          {event.resource.nome_cliente}
        </div>
        <div className="text-[10px] truncate opacity-90 font-medium">
          {event.resource.servicos?.nome}
        </div>
      </div>
    </div>
  );
};

// =========================================================
//               COMPONENTE PRINCIPAL
// =========================================================
function AdminAgenda() {
  const { profile, loading: authLoading } = useAuth(); 
  
  // --- STATES DE DADOS ---
  const [agendamentosRawState, setAgendamentosRawState] = useState([]); 
  const [agendamentosAgrupados, setAgendamentosAgrupados] = useState({});
  const [concluidosAgrupados, setConcluidosAgrupados] = useState({}); // NOVO: Separado por mês
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const [proximosAgendamentos, setProximosAgendamentos] = useState([]);

  // --- STATES DE UI E FILTROS ---
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); 
  const [filtroProfissionalId, setFiltroProfissionalId] = useState(''); 
  const [selectedBulkIds, setSelectedBulkIds] = useState([]); 
  const [calendarView, setCalendarView] = useState('week');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showConcluidos, setShowConcluidos] = useState(false); // Toggle para ver histórico

  // --- DADOS AUXILIARES ---
  const [allServicos, setAllServicos] = useState([]);
  const [allProfissionais, setAllProfissionais] = useState([]);
  const [allClientes, setAllClientes] = useState([]); 
  
  // --- MODAL ---
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('new'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // --- CAMPOS FORMULÁRIO ---
  const [modalServicoId, setModalServicoId] = useState('');
  const [modalProfissionalId, setModalProfissionalId] = useState('');
  const [modalNome, setModalNome] = useState('');
  const [modalEmail, setModalEmail] = useState(''); 
  const [modalTelefone, setModalTelefone] = useState('');
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [modalError, setModalError] = useState(null);
  
  // --- LÓGICA DE REMARCAÇÃO ---
  const [showRemarcar, setShowRemarcar] = useState(false);
  const [novaData, setNovaData] = useState(new Date());
  const [novosHorarios, setNovosHorarios] = useState([]);
  const [loadingNovosHorarios, setLoadingNovosHorarios] = useState(false);
  const [novoHorarioSelecionado, setNovoHorarioSelecionado] = useState(null);

  // --- LÓGICA DE CANCELAMENTO ---
  const [showCancelOptions, setShowCancelOptions] = useState(false);
  const [adminCancelReason, setAdminCancelReason] = useState(MOTIVOS_ADMIN[0]);

  useEffect(() => { if (!authLoading && profile) fetchModalData(); }, [authLoading, profile]);
  useEffect(() => { if (!authLoading && profile) fetchAgendamentos(); }, [authLoading, profile, filtroProfissionalId]); 

  // --- FETCH DADOS ---
  async function fetchModalData() {
    try {
        const { data: servicosData } = await supabase.from('servicos').select('id, nome, duracao_minutos').order('nome');
        if (servicosData) setAllServicos(servicosData);
        
        const { data: profData } = await supabase.from('profissionais').select('id, nome').order('nome');
        if (profData) setAllProfissionais(profData);

        const { data: clientesData } = await supabase.from('clientes').select('id, nome, telefone').order('nome');
        if (clientesData) setAllClientes(clientesData);
    } catch (e) { console.error(e); }
  }

  async function fetchAgendamentos() {
    setLoading(true);
    if (!profile) return;

    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    inicioDoMes.setHours(0, 0, 0, 0);
    
    let query = supabase
      .from('agendamentos')
      .select(`
        id, nome_cliente, email_cliente, telefone_cliente, 
        data_hora_inicio, data_hora_fim, servico_id, profissional_id, 
        status, cancelamento_motivo, 
        servicos ( nome, duracao_minutos ), 
        profissionais ( nome )
      `)
      .gte('data_hora_inicio', inicioDoMes.toISOString()) 
      .order('data_hora_inicio', { ascending: true });
    
    if (profile.role !== 'admin') query = query.eq('profissional_id', profile.id);

    const { data: raw } = await query;
    if (raw) {
      setAgendamentosRawState(raw);
      
      let filtrados = filtroProfissionalId ? raw.filter(ag => ag.profissional_id == filtroProfissionalId) : raw;
      
      // SEPARAÇÃO: Ativos (Confirmado/Em Atendimento) vs Concluídos
      const ativos = filtrados.filter(ag => ag.status === 'confirmado' || ag.status === 'em_atendimento');
      const concluidos = filtrados.filter(ag => ag.status === 'finalizado');
      
      const agora = new Date(); agora.setHours(0,0,0,0);
      const limite = new Date(agora); limite.setDate(limite.getDate() + 2);
      
      // Avisos
      setProximosAgendamentos(ativos.filter(ag => {
         const d = new Date(ag.data_hora_inicio); 
         return d >= agora && d < limite;
      }));
      
      // Agrupamento dos ATIVOS por Dia
      const agrupar = (lista) => lista.reduce((acc, ag) => {
          const d = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
          if (!acc[d]) acc[d] = []; acc[d].push(ag); return acc;
      }, {});
      setAgendamentosAgrupados(agrupar(ativos));

      // Agrupamento dos CONCLUÍDOS por Mês/Ano
      const agruparConcluidos = (lista) => lista.reduce((acc, ag) => {
          const d = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
          const mesAno = getMesAno(d); // "Fevereiro 2026"
          
          if (!acc[mesAno]) acc[mesAno] = {};
          if (!acc[mesAno][d]) acc[mesAno][d] = [];
          
          acc[mesAno][d].push(ag);
          return acc;
      }, {});
      setConcluidosAgrupados(agruparConcluidos);

      // Calendário mostra TUDO (incluindo finalizados para histórico visual)
      const eventos = filtrados.filter(ag => ag.status !== 'cancelado').map(ag => ({
        id: ag.id, title: ag.nome_cliente, start: new Date(ag.data_hora_inicio), end: new Date(ag.data_hora_fim), resource: ag, 
      }));
      setEventosCalendario(eventos);
    }
    setLoading(false);
  }

  // =========================================================
  //            AÇÕES: WHATSAPP
  // =========================================================
  const handleEnviarWhatsApp = (agendamento, tipo) => {
    const telefone = agendamento.telefone_cliente?.replace(/[^0-9]/g, '');
    if (!telefone) return alert("Cliente sem telefone cadastrado.");
    
    const nome = agendamento.nome_cliente.split(' ')[0];
    const dataF = format(new Date(agendamento.data_hora_inicio), "dd/MM");
    const horaF = formatarHora(agendamento.data_hora_inicio);
    const servico = agendamento.servicos?.nome || 'Serviço';
    
    // MENSAGEM EXATA SOLICITADA
    let msg = "";
    if (tipo === 'confirmacao') {
        msg = `Olá ${nome}, tudo bem? Passando para confirmar seu horário de *${servico}* para o dia *${dataF} às ${horaF}*. Podemos confirmar?`;
    } else if (tipo === 'lembrete') {
        msg = `Olá ${nome}, tudo bem? Passando para lembrar do seu horário de *${servico}* para o dia *${dataF} às ${horaF}*.`;
    } else if (tipo === 'cancelamento') {
         msg = `Olá ${nome}. Infelizmente precisamos cancelar/remarcar seu horário de *${servico}* no dia ${dataF}. Motivo: ${adminCancelReason}. Entre em contato para reagendar.`;
    } else {
        msg = `Olá ${nome}, sobre seu agendamento no Studio...`;
    }
    
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleUpdateStatus = async (agendamentoId, novoStatus) => {
    const { error } = await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', agendamentoId);
    if (error) alert('Erro ao atualizar status.'); else fetchAgendamentos();
  };

  const toggleBulkSelect = (id) => setSelectedBulkIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAllHoje = (lista) => setSelectedBulkIds(selectedBulkIds.length === lista.length ? [] : lista.map(ag => ag.id));

  const handleBulkFinish = async () => {
    if (selectedBulkIds.length === 0) return alert("Selecione pelo menos um agendamento.");
    if (!window.confirm(`Deseja FINALIZAR ${selectedBulkIds.length} agendamentos?`)) return;
    setLoading(true);
    await supabase.from('agendamentos').update({ status: 'finalizado' }).in('id', selectedBulkIds);
    setSelectedBulkIds([]); fetchAgendamentos(); setLoading(false);
  };

  // --- AUTOCOMPLETE + CADASTRO AUTOMÁTICO NA BUSCA ---
  const handleNomeChange = (e) => {
    const valor = e.target.value;
    setModalNome(valor);
    const clienteExistente = allClientes.find(c => c.nome.toLowerCase() === valor.toLowerCase());
    if (clienteExistente) setModalTelefone(clienteExistente.telefone);
  };

  // --- FUNÇÕES "NOVO SERVIÇO" ---
  const handleAdicionarExtraHoje = () => {
    setModalMode('new');
    setSelectedEvent({ start: new Date(), end: new Date() });
    setModalServicoId(''); setModalNome(''); setModalEmail(''); setModalTelefone(''); setModalError(null); 
    setShowRemarcar(false); setNovoHorarioSelecionado(null); setShowCancelOptions(false);
    setModalProfissionalId(profile?.role !== 'admin' ? profile?.id : (filtroProfissionalId || ''));
    setModalIsOpen(true);
  };

  const handleAdicionarServicoParaCliente = (ag) => {
    setModalMode('new');
    setSelectedEvent({ start: new Date() });
    setModalNome(ag.nome_cliente);
    setModalTelefone(ag.telefone_cliente);
    setModalEmail(ag.email_cliente || '');
    setModalProfissionalId(ag.profissional_id);
    setModalServicoId('');
    setModalError(null); setShowRemarcar(false); setNovoHorarioSelecionado(null); setShowCancelOptions(false);
    setModalIsOpen(true);
  };

  const handleSelectSlot = (slotInfo) => {
    setModalMode('new'); setSelectedEvent({ start: slotInfo.start, end: slotInfo.end });
    setModalServicoId(''); setModalNome(''); setModalTelefone(''); setModalEmail(''); setModalError(null); 
    setModalProfissionalId(profile?.role !== 'admin' ? profile?.id : (filtroProfissionalId || ''));
    setShowRemarcar(false); setNovoHorarioSelecionado(null); setShowCancelOptions(false);
    setModalIsOpen(true);
  };

  const handleSelectEvent = (eventInfo) => {
    const ag = eventInfo.resource || eventInfo; 
    setModalMode('edit'); setSelectedEvent(ag);
    setModalServicoId(ag.servico_id); setModalProfissionalId(ag.profissional_id); 
    setModalNome(ag.nome_cliente); setModalTelefone(ag.telefone_cliente || ''); setModalEmail(ag.email_cliente || '');
    setModalError(null); setShowRemarcar(false); setNovoHorarioSelecionado(null); setNovaData(new Date(ag.data_hora_inicio)); 
    setShowCancelOptions(false); setAdminCancelReason(MOTIVOS_ADMIN[0]);
    setModalIsOpen(true); 
  };
  
  const closeModal = () => { setModalIsOpen(false); setSelectedEvent(null); };

  const buscarHorariosParaRemarcar = async (data) => {
    setLoadingNovosHorarios(true); setNovosHorarios([]); setNovoHorarioSelecionado(null); setNovaData(data);
    const profId = parseInt(modalProfissionalId); const servId = parseInt(modalServicoId);
    if (!profId || !servId) { setLoadingNovosHorarios(false); return; }
    
    const servico = allServicos.find(s => s.id === servId);
    const { data: turno } = await supabase.from('horarios_trabalho').select('hora_inicio, hora_fim').eq('dia_semana', data.getDay()).eq('profissional_id', profId).single();
    if (!turno) { setLoadingNovosHorarios(false); return; }
    
    const diaInicio = new Date(data); diaInicio.setHours(0,0,0,0);
    const diaFim = new Date(data); diaFim.setHours(23,59,59,999);
    const { data: ags } = await supabase.from('agendamentos').select('data_hora_inicio, data_hora_fim').eq('profissional_id', profId).neq('status', 'cancelado').neq('id', selectedEvent?.id || 0).gte('data_hora_inicio', diaInicio.toISOString()).lte('data_hora_fim', diaFim.toISOString());

    const slots = [];
    const [hIni, mIni] = turno.hora_inicio.split(':'); const [hF, mF] = turno.hora_fim.split(':');
    let cursor = new Date(data); cursor.setHours(parseInt(hIni), parseInt(mIni), 0, 0);
    const limite = new Date(data); limite.setHours(parseInt(hF), parseInt(mF), 0, 0);
    
    while (cursor < limite) {
        const slotFim = new Date(cursor.getTime() + servico.duracao_minutos * 60000);
        if (slotFim > limite) break; 
        const temConflito = ags?.some(ag => (cursor < new Date(ag.data_hora_fim) && slotFim > new Date(ag.data_hora_inicio)));
        if (!temConflito && cursor > new Date()) slots.push(new Date(cursor));
        cursor = new Date(cursor.getTime() + servico.duracao_minutos * 60000); 
    }
    setNovosHorarios(slots); setLoadingNovosHorarios(false);
  };

  const handleModalSave = async () => {
    setIsSavingModal(true); setModalError(null);
    try {
      if (!modalServicoId || !modalProfissionalId || !modalNome) throw new Error('Dados incompletos.');
      
      // 1. SALVAR CLIENTE NA BASE (Importante)
      const telLimpo = modalTelefone.replace(/[^0-9]/g, '');
      if (telLimpo && telLimpo.length >= 10) {
          await supabase.from('clientes').upsert({ nome: modalNome, telefone: telLimpo }, { onConflict: 'telefone' });
          fetchModalData(); // Atualiza cache local
      }

      const servico = allServicos.find(s => s.id === parseInt(modalServicoId));
      let dataInicio = (showRemarcar && novoHorarioSelecionado) ? new Date(novoHorarioSelecionado) : (modalMode === 'new' ? (selectedEvent?.start ? new Date(selectedEvent.start) : new Date()) : new Date(selectedEvent.data_hora_inicio));
      const dataFim = new Date(dataInicio.getTime() + servico.duracao_minutos * 60000);

      const payload = { 
          servico_id: servico.id, profissional_id: parseInt(modalProfissionalId), 
          nome_cliente: modalNome, telefone_cliente: modalTelefone, email_cliente: modalEmail,
          data_hora_inicio: dataInicio.toISOString(), data_hora_fim: dataFim.toISOString(), status: 'confirmado' 
      };

      if (modalMode === 'new') await supabase.from('agendamentos').insert(payload);
      else await supabase.from('agendamentos').update(payload).eq('id', selectedEvent.id);

      closeModal(); fetchAgendamentos(); 
    } catch (e) { setModalError(e.message || "Erro."); } finally { setIsSavingModal(false); }
  };

  const handleModalCancel = async () => {
    setIsSavingModal(true);
    try {
        await supabase.from('agendamentos').update({ status: 'cancelado', cancelamento_motivo: adminCancelReason }).eq('id', selectedEvent.id);
        handleEnviarWhatsApp(selectedEvent, 'cancelamento');
        closeModal(); fetchAgendamentos();
    } catch (e) { setModalError('Erro.'); } finally { setIsSavingModal(false); }
  };

  const eventStyleGetter = (event, start, end, isSelected) => ({ style: { backgroundColor: 'transparent', border: 'none', padding: '0px', overflow: 'visible', zIndex: isSelected ? 100 : 20, height: '100%' } });

  // --- RENDERIZAÇÃO: LISTA DE HOJE ---
  const renderListaHoje = () => {
    const hojeStr = new Date().toLocaleDateString('pt-BR');
    const agendamentosHoje = agendamentosRawState.filter(ag => {
        const dataAg = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
        return dataAg === hojeStr && (!filtroProfissionalId || ag.profissional_id == filtroProfissionalId) && ag.status !== 'cancelado';
    });

    return (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden animate-in fade-in duration-500">
            <div className="p-5 bg-gradient-to-r from-fuchsia-50 to-white border-b border-fuchsia-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3"><div className="bg-fuchsia-100 p-2 rounded-lg text-fuchsia-600">📅</div><div><h2 className="text-lg font-black text-slate-800">Atendimentos de Hoje</h2><p className="text-xs text-slate-500 font-bold uppercase">{hojeStr}</p></div></div>
                <div className="flex gap-2">
                    <button onClick={() => toggleSelectAllHoje(agendamentosHoje)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition">{selectedBulkIds.length === agendamentosHoje.length && agendamentosHoje.length > 0 ? 'Desmarcar' : 'Selecionar Todos'}</button>
                    {selectedBulkIds.length > 0 && <button onClick={handleBulkFinish} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg animate-pulse transition"><span>✓</span> Finalizar ({selectedBulkIds.length})</button>}
                    <button onClick={handleAdicionarExtraHoje} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition">+ Encaixe Rápido</button>
                </div>
            </div>
            {agendamentosHoje.length === 0 ? <div className="p-12 text-center text-slate-400"><p className="font-medium">Nenhum agendamento ativo.</p></div> : (
                <div className="divide-y divide-slate-50">{agendamentosHoje.map(ag => (
                    <div key={ag.id} className={`p-4 flex flex-col md:flex-row items-center gap-4 hover:bg-slate-50/80 transition ${ag.status === 'finalizado' ? 'opacity-60 grayscale' : ''}`}>
                        <div className="flex items-center justify-center pl-2"><input type="checkbox" checked={selectedBulkIds.includes(ag.id)} onChange={() => toggleBulkSelect(ag.id)} className="w-5 h-5 rounded border-gray-300 text-fuchsia-600 focus:ring-fuchsia-500 cursor-pointer" /></div>
                        <div className="w-full md:w-20 text-center md:text-left"><span className="block text-xl font-black text-slate-700">{formatarHora(ag.data_hora_inicio)}</span></div>
                        <div className="flex-1 text-center md:text-left"><h3 className="font-bold text-slate-800 text-lg">{ag.nome_cliente}</h3><p className="text-sm text-slate-500 font-medium"><span className="text-fuchsia-600 font-bold">{ag.servicos?.nome}</span> • {ag.profissionais?.nome}</p></div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleEnviarWhatsApp(ag, 'contato')} className="p-2 text-green-500 hover:bg-green-50 rounded-full transition" title="Enviar Whats">💬</button>
                            <button onClick={() => handleAdicionarServicoParaCliente(ag)} className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 border border-purple-100 transition shadow-sm">+ Serviço</button>
                            <button onClick={() => handleSelectEvent(ag)} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition">Editar</button>
                            {ag.status !== 'finalizado' && <button onClick={() => handleUpdateStatus(ag.id, 'finalizado')} className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition">Concluir</button>}
                        </div>
                    </div>
                ))}</div>
            )}
        </div>
    );
  };

  const diasOrdenadosCards = Object.keys(agendamentosAgrupados).sort((a,b) => {
      const [da, ma, aa] = a.split('/'); const [db, mb, ab] = b.split('/');
      return new Date(`${aa}-${ma}-${da}`) - new Date(`${ab}-${mb}-${db}`);
  });

  if (authLoading || loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="animate-pulse flex flex-col items-center"><div className="w-12 h-12 bg-fuchsia-200 rounded-full mb-4"></div><p className="text-fuchsia-600 font-bold">Carregando Agenda...</p></div></div>;

  return (
    <div className="max-w-[1920px] mx-auto p-3 md:p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 sticky top-2 z-40">
        <div><h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-2"><span className="text-fuchsia-600">✦</span> Agenda Master</h1></div>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
           {profile?.role === 'admin' && (
             <select value={filtroProfissionalId} onChange={(e) => setFiltroProfissionalId(e.target.value)} className="w-full md:w-auto bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-bold py-3 px-4 rounded-2xl outline-none transition cursor-pointer"><option value="">Todos os Profissionais</option>{allProfissionais.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}</select>
           )}
           <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto justify-center">
             <button onClick={() => setViewMode('list_today')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === 'list_today' ? 'bg-white text-fuchsia-600 shadow-md transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}>HOJE</button>
             <button onClick={() => setViewMode('calendar')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === 'calendar' ? 'bg-white text-fuchsia-600 shadow-md transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}>CALENDÁRIO</button>
             <button onClick={() => setViewMode('cards')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === 'cards' ? 'bg-white text-fuchsia-600 shadow-md transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}>CARDS</button>
           </div>
        </div>
      </div>

      {/* VIEWS */}
      {viewMode === 'list_today' && renderListaHoje()}

      {viewMode === 'cards' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           
           {/* Seção Avisos (Piscante) */}
           {proximosAgendamentos.length > 0 && (
             <div className="relative group overflow-hidden bg-white p-6 rounded-[2rem] border-2 border-fuchsia-100 shadow-sm">
                <div className="absolute inset-0 border-4 border-fuchsia-200 rounded-[2rem] animate-pulse pointer-events-none opacity-50"></div>
                <h2 className="text-xl font-black text-fuchsia-800 mb-4 flex items-center gap-2 relative z-10"><span className="text-2xl animate-bounce">🔔</span> Próximos Atendimentos</h2>
                <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x relative z-10">
                   {proximosAgendamentos.map(ag => (
                      <div key={ag.id} className="min-w-[280px] snap-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition">
                         <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded">{new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR', {weekday:'short', day:'numeric'})}</span>
                                <span className="bg-fuchsia-600 text-white text-xs font-black px-2 py-1 rounded-lg shadow-sm shadow-fuchsia-200">{formatarHora(ag.data_hora_inicio)}</span>
                            </div>
                            <p className="font-bold text-slate-800 text-lg truncate">{ag.nome_cliente}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mt-1">{ag.servicos?.nome}</p>
                         </div>
                         <div className="grid grid-cols-2 gap-2 mt-4">
                            <button onClick={() => handleEnviarWhatsApp(ag, 'confirmacao')} className="py-2.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition">Confirmar</button>
                            <button onClick={() => handleEnviarWhatsApp(ag, 'lembrete')} className="py-2.5 bg-green-50 text-green-600 text-xs font-bold rounded-xl hover:bg-green-100 transition">Lembrar</button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           )}

           {/* Cards de Agendamentos ATIVOS */}
           {diasOrdenadosCards.map(dia => (
              <div key={dia}>
                 <div className="flex items-center gap-4 mb-4 mt-8">
                     <h3 className="text-2xl font-black text-slate-700 capitalize tracking-tight">{formatarDataCabecalho(dia)}</h3>
                     <div className="h-1 flex-1 bg-slate-100 rounded-full"></div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                    {agendamentosAgrupados[dia].map(ag => (
                       <div key={ag.id} className={`bg-white rounded-[1.5rem] p-5 shadow-sm border-l-[6px] relative transition hover:-translate-y-1 hover:shadow-lg ${ag.status === 'em_atendimento' ? 'border-amber-400 bg-amber-50/50' : 'border-fuchsia-500'}`}>
                          
                          {/* BOTÕES WHATSAPP SEPARADOS NO CARD */}
                          <div className="absolute top-4 right-4 flex flex-col gap-1">
                              <button 
                                onClick={() => handleEnviarWhatsApp(ag, 'confirmacao')} 
                                className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold hover:bg-green-500 hover:text-white transition border border-green-100 flex items-center gap-1 shadow-sm"
                              >
                                <span>✅</span> Confirmar
                              </button>
                              <button 
                                onClick={() => handleEnviarWhatsApp(ag, 'lembrete')} 
                                className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold hover:bg-blue-500 hover:text-white transition border border-blue-100 flex items-center gap-1 shadow-sm"
                              >
                                <span>⏰</span> Lembrar
                              </button>
                          </div>
                          
                          <div className="flex items-center gap-3 mb-3 mt-1">
                              <span className="text-3xl font-black text-slate-700 tracking-tighter">{formatarHora(ag.data_hora_inicio)}</span>
                          </div>
                          
                          <h4 className="font-bold text-lg text-slate-800 leading-tight capitalize mb-1 pr-16">{ag.nome_cliente}</h4>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{ag.servicos?.nome}</p>
                          <p className="text-xs text-slate-400 mt-1">Prof: {ag.profissionais?.nome}</p>

                          <div className="mt-6 pt-4 border-t border-slate-100/50 flex gap-2">
                             {ag.status === 'confirmado' && (
                                <button onClick={() => handleUpdateStatus(ag.id, 'em_atendimento')} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-200 hover:bg-amber-600 transition transform active:scale-95 text-xs">▶ Iniciar</button>
                             )}
                             {ag.status === 'em_atendimento' && (
                                <button onClick={() => handleUpdateStatus(ag.id, 'finalizado')} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 animate-pulse hover:bg-green-700 transition transform active:scale-95 text-xs">✓ Finalizar</button>
                             )}
                             
                             <button onClick={() => handleSelectEvent(ag)} className="px-3 py-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-200 transition">✎</button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           ))}

           {/* --- ÁREA DE CONCLUÍDOS (SEPARADA) --- */}
           <div className="mt-16 pt-8 border-t-2 border-dashed border-slate-200">
              <button 
                onClick={() => setShowConcluidos(!showConcluidos)} 
                className="w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition flex items-center justify-center gap-2"
              >
                {showConcluidos ? 'Ocultar Histórico de Concluídos' : '📂 Ver Histórico de Concluídos (Arquivo)'}
              </button>

              {showConcluidos && (
                <div className="mt-8 space-y-12 animate-in fade-in slide-in-from-bottom-4">
                   {Object.keys(concluidosAgrupados).length === 0 && <p className="text-center text-slate-400">Nenhum histórico encontrado.</p>}
                   {Object.keys(concluidosAgrupados).map(mesAno => (
                      <div key={mesAno}>
                         <h2 className="text-3xl font-black text-slate-300 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">{mesAno}</h2>
                         {Object.keys(concluidosAgrupados[mesAno]).map(dia => (
                            <div key={dia} className="mb-6">
                               <h3 className="text-sm font-bold text-slate-400 uppercase mb-3 pl-2 border-l-4 border-slate-200">{formatarDataCabecalho(dia)}</h3>
                               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                  {concluidosAgrupados[mesAno][dia].map(ag => (
                                     <div key={ag.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 opacity-70 hover:opacity-100 transition">
                                        <span className="text-xs font-black text-slate-400 block">{formatarHora(ag.data_hora_inicio)}</span>
                                        <p className="font-bold text-slate-600 text-sm truncate">{ag.nome_cliente}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{ag.servicos?.nome}</p>
                                        <span className="text-[9px] uppercase bg-green-100 text-green-700 px-1 rounded mt-1 inline-block">Concluído</span>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         ))}
                      </div>
                   ))}
                </div>
              )}
           </div>
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 h-[85vh] p-2 md:p-6 overflow-hidden animate-in zoom-in-95 duration-300">
           <Calendar
              localizer={localizer} events={eventosCalendario} startAccessor="start" endAccessor="end" views={['day', 'week', 'month']} 
              view={calendarView} onView={setCalendarView} date={calendarDate} onNavigate={setCalendarDate}
              selectable onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent}
              components={{ event: EventoCalendario }} messages={messages} culture="pt-BR"
              min={new Date(0, 0, 0, 7, 0, 0)} max={new Date(0, 0, 0, 21, 0, 0)} step={30} timeslots={1} className="font-sans text-xs custom-calendar-height"
            />
        </div>
      )}

      <style>{`
        .rbc-timeslot-group { min-height: 80px !important; border-bottom: 1px solid #f1f5f9 !important; }
        .rbc-header { padding: 15px 0 !important; font-weight: 900 !important; color: #94a3b8; font-size: 11px; text-transform: uppercase; border-bottom: none !important; letter-spacing: 0.05em; }
        .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #f1f5f9 !important; }
        .rbc-time-view { border: none !important; }
        .rbc-time-content { border-top: 1px solid #f1f5f9 !important; }
        .rbc-today { background-color: #fdf4ff !important; }
        .rbc-event { background: transparent !important; padding: 0 !important; width: 100% !important; box-shadow: none !important; }
        .rbc-day-slot .rbc-event { border: none !important; }
        .rbc-event-label { display: none !important; }
        .rbc-time-slot { font-size: 10px; font-weight: bold; color: #cbd5e1; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* MODAL */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} className="Modal w-full max-w-lg mx-auto outline-none mt-4 md:mt-10 p-4" overlayClassName="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex justify-center items-start overflow-y-auto">
        {selectedEvent && (
          <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden w-full relative animate-in zoom-in-95 duration-200">
             <div className="bg-fuchsia-600 p-6 flex justify-between items-start text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="relative z-10"><h2 className="text-2xl font-black tracking-tight">{modalMode === 'new' ? 'Novo Agendamento' : 'Detalhes do Cliente'}</h2><p className="text-fuchsia-100 text-sm font-medium opacity-80">{modalMode === 'new' ? 'Preencha os dados abaixo' : 'Gerencie o atendimento'}</p></div>
                <button onClick={closeModal} className="relative z-10 text-2xl font-bold opacity-70 hover:opacity-100 bg-black/10 hover:bg-black/20 w-8 h-8 rounded-full flex items-center justify-center transition">&times;</button>
             </div>
             
             <div className="p-6 md:p-8 space-y-5">
                {showCancelOptions ? (
                  <div className="bg-red-50 p-6 rounded-3xl text-center border border-red-100 animate-in fade-in">
                     <h3 className="text-red-900 font-black text-lg mb-2">Cancelar Agendamento?</h3>
                     <select value={adminCancelReason} onChange={e => setAdminCancelReason(e.target.value)} className="w-full p-4 border border-red-200 bg-white rounded-2xl mb-4 text-sm outline-none focus:ring-2 focus:ring-red-200">{MOTIVOS_ADMIN.map(m => <option key={m} value={m}>{m}</option>)}</select>
                     <div className="flex gap-3"><button onClick={() => setShowCancelOptions(false)} className="flex-1 py-3 bg-white text-gray-500 rounded-xl font-bold border border-gray-200 hover:bg-gray-50">Voltar</button><button onClick={handleModalCancel} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700">Confirmar</button></div>
                  </div>
                ) : (
                  <>
                     {modalMode === 'edit' && (
                        <div className="flex gap-3 mb-4">
                            <button type="button" onClick={() => handleEnviarWhatsApp({ ...selectedEvent, telefone_cliente: modalTelefone }, 'confirmacao')} className="flex-1 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold border border-blue-100 hover:bg-blue-100 text-xs flex items-center justify-center gap-2"><span>✅</span> Confirmar</button>
                            <button type="button" onClick={() => handleEnviarWhatsApp({ ...selectedEvent, telefone_cliente: modalTelefone }, 'lembrete')} className="flex-1 py-3 bg-purple-50 text-purple-700 rounded-xl font-bold border border-purple-100 hover:bg-purple-100 text-xs flex items-center justify-center gap-2"><span>⏰</span> Lembrar</button>
                        </div>
                     )}

                     <div className="space-y-4">
                         <div className="relative">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Nome do Cliente</label>
                            <input list="lista-clientes" type="text" value={modalNome} onChange={handleNomeChange} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-700 ring-1 ring-slate-200 focus:ring-2 focus:ring-fuchsia-500 transition" placeholder="Busque ou digite..." />
                            <datalist id="lista-clientes">{allClientes.map(c => (<option key={c.id} value={c.nome} />))}</datalist>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Serviço</label><select value={modalServicoId} onChange={e => setModalServicoId(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl outline-none ring-1 ring-slate-200 font-medium text-sm focus:ring-2 focus:ring-fuchsia-500"><option value="">Selecione...</option>{allServicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
                            <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Profissional</label><select value={modalProfissionalId} onChange={e => setModalProfissionalId(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl outline-none ring-1 ring-slate-200 font-medium text-sm focus:ring-2 focus:ring-fuchsia-500"><option value="">Selecione...</option>{allProfissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                         </div>
                         <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Contato</label><input type="tel" value={modalTelefone} onChange={e => setModalTelefone(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-fuchsia-500 transition font-mono text-sm" placeholder="(99) 99999-9999" /></div>
                     </div>

                     {modalMode === 'edit' && profile?.role === 'admin' && (
                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                           <button type="button" onClick={() => setShowRemarcar(!showRemarcar)} className="w-full flex justify-between items-center text-amber-800 text-xs font-bold uppercase tracking-wide"><span>📅 Remarcar Horário?</span><span>{showRemarcar ? '▲' : '▼'}</span></button>
                           {showRemarcar && (<div className="mt-4 grid grid-cols-2 gap-3 animate-in fade-in"><div><label className="text-[10px] font-bold text-amber-700 uppercase">Nova Data</label><DatePicker selected={novaData} onChange={buscarHorariosParaRemarcar} minDate={new Date()} dateFormat="dd/MM/yyyy" className="w-full p-2 rounded-lg border border-amber-200 text-sm text-center" /></div><div><label className="text-[10px] font-bold text-amber-700 uppercase">Novo Horário</label><select onChange={e => setNovoHorarioSelecionado(e.target.value)} className="w-full p-2 rounded-lg border border-amber-200 text-sm bg-white h-[38px]" disabled={loadingNovosHorarios}><option>{loadingNovosHorarios ? 'Buscando...' : 'Selecione...'}</option>{novosHorarios.map(h => (<option key={h} value={h.toISOString()}>{format(h, 'HH:mm')}</option>))}</select></div></div>)}
                        </div>
                     )}

                     <div className="flex gap-3 pt-2">
                        {modalMode === 'edit' && <button type="button" onClick={() => setShowCancelOptions(true)} className="px-5 py-4 text-red-500 font-bold text-sm bg-red-50 rounded-2xl hover:bg-red-100 transition border border-red-100">Excluir</button>}
                        <button type="button" onClick={handleModalSave} className="flex-1 py-4 bg-fuchsia-600 text-white font-black rounded-2xl shadow-xl shadow-fuchsia-200 hover:bg-fuchsia-700 hover:scale-[1.02] transition">{isSavingModal ? 'Salvando...' : (modalMode === 'new' ? 'Agendar Agora' : 'Salvar Alterações')}</button>
                     </div>
                  </>
                )}
                {modalError && <div className="text-center p-3 bg-red-100 text-red-600 rounded-xl text-xs font-bold animate-pulse">{modalError}</div>}
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AdminAgenda;