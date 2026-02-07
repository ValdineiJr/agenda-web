import { useState, useEffect } from 'react';
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
  noEventsInRange: 'Sem agendamentos neste período.', showMore: (total) => `+${total} mais`,
};

const MOTIVOS_ADMIN = [
  "Cliente solicitou (WhatsApp)", "Profissional indisponível", "Cliente não compareceu (No-show)", "Outro motivo"
];

// =========================================================
//               FUNÇÕES AUXILIARES
// =========================================================
function formatarDataCabecalho(dataString) {
  const [dia, mes, ano] = dataString.split('/');
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${ano}-${mes}-${dia}T12:00:00`));
}
function formatarHora(dataISO) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(dataISO));
}

// =========================================================
//    COMPONENTE DE EVENTO (COM TOOLTIP E VISUAL UPGRADE)
// =========================================================
const EventoPersonalizado = ({ event }) => {
  const isEmAtendimento = event.resource.status === 'em_atendimento';
  const isFinalizado = event.resource.status === 'finalizado';
  
  // Estilo base do card
  let containerClass = 'bg-white border-l-4 border-fuchsia-600 text-gray-700 shadow-sm';
  if (isEmAtendimento) containerClass = 'bg-amber-50 border-l-4 border-amber-500 text-amber-900 shadow-md';
  if (isFinalizado) containerClass = 'bg-gray-100 border-l-4 border-gray-400 text-gray-400 opacity-80';

  return (
    <div className="relative group h-full w-full font-sans">
      
      {/* --- CARD NO CALENDÁRIO --- */}
      <div className={`h-full w-full rounded-r-md p-1.5 transition-all hover:brightness-95 flex flex-col justify-between overflow-hidden leading-tight ${containerClass}`}>
        
        <div className="flex justify-between items-center mb-0.5">
           <span className={`text-[11px] font-bold tracking-tighter ${isEmAtendimento ? 'text-amber-700' : 'text-fuchsia-700'}`}>
             {format(event.start, 'HH:mm')}
           </span>
           {isEmAtendimento && (
             <span className="flex h-2 w-2 relative">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
             </span>
           )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col justify-center">
            <div className="font-bold text-xs truncate uppercase" title={event.resource.nome_cliente}>
              {event.resource.nome_cliente.split(' ')[0]} 
            </div>
            <div className="text-[10px] opacity-90 truncate font-medium" title={event.resource.servicos?.nome}>
              {event.resource.servicos?.nome}
            </div>
        </div>
      </div>

      {/* --- TOOLTIP FLUTUANTE (Preservado e Melhorado) --- */}
      <div className="hidden md:group-hover:block absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[9999] w-72 bg-white p-0 rounded-xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 pointer-events-none ring-1 ring-black/5">
         <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white transform rotate-45 border-l border-t border-slate-200"></div>
         
         <div className="relative z-50 overflow-hidden rounded-xl">
            {/* Header do Tooltip */}
            <div className={`p-4 ${isEmAtendimento ? 'bg-amber-50' : 'bg-fuchsia-50'} border-b border-gray-100`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${isEmAtendimento ? 'bg-amber-500' : 'bg-fuchsia-600'}`}>
                      {event.resource.nome_cliente.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-gray-800 text-base leading-tight truncate">{event.resource.nome_cliente}</p>
                      <p className="text-xs text-gray-500 font-medium truncate flex items-center gap-1">
                        📱 {event.resource.telefone_cliente || 'Sem telefone'}
                      </p>
                    </div>
                </div>
            </div>

            {/* Corpo do Tooltip */}
            <div className="p-4 space-y-3 bg-white text-sm text-gray-600">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Serviço</span>
                  <span className="font-semibold text-gray-800">{event.resource.servicos?.nome}</span>
                </div>
                
                <div className="flex gap-2">
                   <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">Profissional</span>
                      <span className="text-gray-800">{event.resource.profissionais?.nome}</span>
                   </div>
                   <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">Horário</span>
                      <span className="text-gray-800 font-mono">{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</span>
                   </div>
                </div>

                {isEmAtendimento && (
                   <div className="mt-2 text-center bg-amber-100 text-amber-800 py-1.5 rounded-lg font-bold text-xs border border-amber-200 shadow-sm">
                     ⚠️ EM ATENDIMENTO
                   </div>
                )}
            </div>
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
  
  // --- States (Preservando toda sua lógica) ---
  const [agendamentosRawState, setAgendamentosRawState] = useState([]); 
  const [agendamentosAgrupados, setAgendamentosAgrupados] = useState({});
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const [proximosAgendamentos, setProximosAgendamentos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); 
  const [filtroProfissionalId, setFiltroProfissionalId] = useState(''); 
  const [selectedBulkIds, setSelectedBulkIds] = useState([]);

  // Modal e Edição
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('new'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [calendarView, setCalendarView] = useState('week'); // Padrão 'Semana' como na imagem
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  const [allServicos, setAllServicos] = useState([]);
  const [allProfissionais, setAllProfissionais] = useState([]);
  
  // Campos do Formulário Modal
  const [modalServicoId, setModalServicoId] = useState('');
  const [modalProfissionalId, setModalProfissionalId] = useState('');
  const [modalNome, setModalNome] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalTelefone, setModalTelefone] = useState('');
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [modalError, setModalError] = useState(null);
  
  // Lógica de Remarcação (Complexa) mantida
  const [showRemarcar, setShowRemarcar] = useState(false);
  const [novaData, setNovaData] = useState(new Date());
  const [novosHorarios, setNovosHorarios] = useState([]);
  const [loadingNovosHorarios, setLoadingNovosHorarios] = useState(false);
  const [novoHorarioSelecionado, setNovoHorarioSelecionado] = useState(null);
  
  // Lógica de Cancelamento
  const [showCancelOptions, setShowCancelOptions] = useState(false);
  const [adminCancelReason, setAdminCancelReason] = useState(MOTIVOS_ADMIN[0]);

  useEffect(() => { if (!authLoading && profile) fetchModalData(); }, [authLoading, profile]);
  useEffect(() => { if (!authLoading && profile) fetchAgendamentos(); }, [authLoading, profile, filtroProfissionalId]); 

  // --- BUSCAS DE DADOS ---
  async function fetchModalData() {
    const { data: servicosData } = await supabase.from('servicos').select('id, nome, duracao_minutos');
    if (servicosData) setAllServicos(servicosData);
    const { data: profData } = await supabase.from('profissionais').select('id, nome');
    if (profData) setAllProfissionais(profData);
  }

  async function fetchAgendamentos() {
    setLoading(true); setError(null);
    if (!profile) return;

    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    inicioDoMes.setHours(0, 0, 0, 0);
    
    let query = supabase
      .from('agendamentos')
      .select(`id, nome_cliente, email_cliente, telefone_cliente, data_hora_inicio, data_hora_fim, servico_id, profissional_id, status, cancelamento_motivo, servicos ( nome, duracao_minutos ), profissionais ( nome )`)
      .gte('data_hora_inicio', inicioDoMes.toISOString()) 
      .order('data_hora_inicio', { ascending: true });
    
    if (profile.role !== 'admin') query = query.eq('profissional_id', profile.id);

    const { data: agendamentosRaw, error: dbError } = await query;
    
    if (dbError) { setError('Erro ao carregar agenda.'); } 
    else if (agendamentosRaw) {
      setAgendamentosRawState(agendamentosRaw);

      let agendamentosFiltrados = agendamentosRaw;
      if (filtroProfissionalId) agendamentosFiltrados = agendamentosRaw.filter(ag => ag.profissional_id == filtroProfissionalId);

      const ativos = agendamentosFiltrados.filter(ag => ag.status !== 'cancelado');
      
      const agora = new Date(); agora.setHours(0,0,0,0);
      const limiteAmanha = new Date(agora); limiteAmanha.setDate(limiteAmanha.getDate() + 2);
      
      setProximosAgendamentos(ativos.filter(ag => {
         const d = new Date(ag.data_hora_inicio); 
         return d >= agora && d < limiteAmanha && ag.status === 'confirmado';
      }));
      
      const agruparPorDia = (lista) => lista.reduce((acc, ag) => {
          const d = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
          if (!acc[d]) acc[d] = []; acc[d].push(ag); return acc;
      }, {});

      setAgendamentosAgrupados(agruparPorDia(ativos));

      setEventosCalendario(ativos.map(ag => ({
        title: ag.nome_cliente, 
        start: new Date(ag.data_hora_inicio), 
        end: new Date(ag.data_hora_fim), 
        resource: ag, 
      })));
    }
    setLoading(false);
  }

  // --- LÓGICAS DE AÇÃO (WhatsApp, Status, Bulk) ---
  const handleEnviarWhatsApp = (agendamento, tipo) => {
    const telefone = agendamento.telefone_cliente?.replace(/[^0-9]/g, '');
    if (!telefone) return alert("Sem telefone cadastrado.");
    
    const nome = agendamento.nome_cliente.split(' ')[0];
    const data = format(new Date(agendamento.data_hora_inicio), "dd/MM");
    const hora = formatarHora(agendamento.data_hora_inicio);
    const servico = agendamento.servicos?.nome || 'Serviço';
    
    let msg = "";
    if (tipo === 'confirmacao') msg = `Olá ${nome}, tudo bem? Passando para confirmar seu horário de *${servico}* para o dia *${data} às ${hora}*. Podemos confirmar?`;
    else if (tipo === 'lembrete') msg = `Olá ${nome}! Lembrete do seu horário de *${servico}* amanhã, dia *${data} às ${hora}*. Te aguardamos!`;
    else if (tipo === 'contato') msg = `Olá ${nome}, tudo bem?`;
    
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleUpdateStatus = async (agendamentoId, novoStatus) => {
    const { error } = await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', agendamentoId);
    if (error) alert('Erro ao atualizar status.'); else fetchAgendamentos();
  };

  const toggleBulkSelect = (id) => {
    setSelectedBulkIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkFinish = async () => {
    if (selectedBulkIds.length === 0) return alert("Selecione pelo menos um agendamento.");
    if (!window.confirm(`Deseja finalizar ${selectedBulkIds.length} agendamentos?`)) return;

    setLoading(true);
    const { error } = await supabase.from('agendamentos').update({ status: 'finalizado' }).in('id', selectedBulkIds);
    if (error) alert("Erro ao finalizar."); 
    else { setSelectedBulkIds([]); fetchAgendamentos(); }
    setLoading(false);
  };

  // --- Renderização da Lista de Hoje (Funcionalidade solicitada) ---
  const renderListaHoje = () => {
    const hojeStr = new Date().toLocaleDateString('pt-BR');
    const agendamentosHoje = agendamentosRawState.filter(ag => {
        const dataAg = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
        const isHoje = dataAg === hojeStr;
        const isAtivo = ag.status === 'confirmado' || ag.status === 'em_atendimento';
        if (filtroProfissionalId) return isHoje && isAtivo && ag.profissional_id == filtroProfissionalId;
        return isHoje && isAtivo;
    });

    if (agendamentosHoje.length === 0) {
        return <div className="p-8 text-center bg-white rounded-2xl shadow-sm text-gray-400">Sem agendamentos ativos para hoje.</div>;
    }

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-fuchsia-100">
                <h2 className="text-lg font-bold text-gray-800">Hoje ({hojeStr})</h2>
                {selectedBulkIds.length > 0 && (
                    <button onClick={handleBulkFinish} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md animate-pulse text-sm">
                        ✅ Finalizar Selecionados ({selectedBulkIds.length})
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 divide-y divide-gray-50">
                {agendamentosHoje.map(ag => (
                    <div key={ag.id} className="p-4 flex flex-col sm:flex-row items-center gap-4 hover:bg-gray-50 transition">
                        <input 
                            type="checkbox" 
                            checked={selectedBulkIds.includes(ag.id)}
                            onChange={() => toggleBulkSelect(ag.id)}
                            className="w-5 h-5 accent-fuchsia-600 cursor-pointer"
                        />
                        <div className="min-w-[60px] text-center">
                            <span className="block text-lg font-black text-slate-700">{formatarHora(ag.data_hora_inicio)}</span>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                <p className="font-bold text-slate-800">{ag.nome_cliente}</p>
                                {ag.status === 'em_atendimento' && <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 rounded">EM ANDAMENTO</span>}
                            </div>
                            <p className="text-sm text-slate-500">{ag.servicos?.nome} • {ag.profissionais?.nome}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleEnviarWhatsApp(ag, 'contato')} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition" title="WhatsApp">
                                💬
                            </button>
                            <button onClick={() => handleSelectEvent({ resource: ag })} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition">
                                EDITAR
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  // --- HANDLERS DO MODAL E CÁLCULO DE HORÁRIOS (Lógica Complexa) ---
  const handleSelectSlot = (slotInfo) => {
    setModalMode('new'); setSelectedEvent({ start: slotInfo.start, end: slotInfo.end });
    setModalServicoId(''); setModalNome(''); setModalEmail(''); setModalTelefone(''); setModalError(null); 
    setShowRemarcar(false); setNovoHorarioSelecionado(null); setShowCancelOptions(false);
    setModalProfissionalId(profile?.role !== 'admin' ? profile?.id : (filtroProfissionalId || ''));
    setModalIsOpen(true);
  };

  const handleSelectEvent = (eventInfo) => {
    const ag = eventInfo.resource;
    setModalMode('edit'); setSelectedEvent(ag);
    setModalServicoId(ag.servico_id); setModalProfissionalId(ag.profissional_id); setModalNome(ag.nome_cliente); setModalEmail(ag.email_cliente || ''); setModalTelefone(ag.telefone_cliente || '');
    setModalError(null); setShowRemarcar(false); setNovoHorarioSelecionado(null); setNovaData(new Date(ag.data_hora_inicio)); setShowCancelOptions(false); setAdminCancelReason(MOTIVOS_ADMIN[0]);
    setModalIsOpen(true); 
  };
  
  const closeModal = () => { setModalIsOpen(false); setSelectedEvent(null); setShowCancelOptions(false); };

  const handleModalSave = async () => {
    setIsSavingModal(true); setModalError(null);
    try {
      if (!modalServicoId || !modalProfissionalId || !modalNome) throw new Error('Preencha os campos obrigatórios.');
      
      const servico = allServicos.find(s => s.id === parseInt(modalServicoId));
      let ini;
      if (showRemarcar && novoHorarioSelecionado) ini = new Date(novoHorarioSelecionado);
      else if (modalMode === 'new') ini = selectedEvent?.start ? new Date(selectedEvent.start) : new Date();
      else ini = new Date(selectedEvent.data_hora_inicio);
      
      const fim = new Date(ini.getTime() + servico.duracao_minutos * 60000);
      const payload = { servico_id: servico.id, profissional_id: parseInt(modalProfissionalId), nome_cliente: modalNome, email_cliente: modalEmail, telefone_cliente: modalTelefone, data_hora_inicio: ini.toISOString(), data_hora_fim: fim.toISOString(), status: 'confirmado' };

      if (modalMode === 'new') await supabase.from('agendamentos').insert(payload);
      else await supabase.from('agendamentos').update(payload).eq('id', selectedEvent.id);

      closeModal(); fetchAgendamentos();
    } catch (error) { setModalError(error.message || "Erro ao salvar."); } 
    finally { setIsSavingModal(false); }
  };

  const handleModalCancel = async () => {
    if (profile.role !== 'admin' && profile.id !== selectedEvent.profissional_id) { setModalError('Sem permissão.'); return; }
    if (!showCancelOptions) { setShowCancelOptions(true); return; }
    
    setIsSavingModal(true); 
    try {
        await supabase.from('agendamentos').update({ status: 'cancelado', cancelamento_motivo: adminCancelReason }).eq('id', selectedEvent.id);
        
        // Enviar aviso Whats
        const nome = selectedEvent.nome_cliente.split(' ')[0];
        const servico = selectedEvent.servicos?.nome || 'serviço';
        const msg = `Olá ${nome}. Infelizmente tivemos que cancelar seu agendamento de ${servico}. Motivo: ${adminCancelReason}`;
        const link = `https://wa.me/55${selectedEvent.telefone_cliente?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
        window.open(link, '_blank');
        
        closeModal(); fetchAgendamentos();
    } catch (error) { setModalError(error.message); } 
    finally { setIsSavingModal(false); }
  };

  const buscarHorariosParaRemarcar = async (data) => {
    setLoadingNovosHorarios(true); setNovosHorarios([]); setNovoHorarioSelecionado(null); setNovaData(data);
    const profId = parseInt(modalProfissionalId); const servId = parseInt(modalServicoId);
    if (!profId || !servId) { setModalError("Selecione serviço e profissional primeiro."); setLoadingNovosHorarios(false); return; }
    
    const servico = allServicos.find(s => s.id === servId);
    // Recupera turno
    const { data: trab } = await supabase.from('horarios_trabalho').select('hora_inicio, hora_fim').eq('dia_semana', data.getDay()).eq('profissional_id', profId).single();
    if (!trab) { setLoadingNovosHorarios(false); return; }
    
    const dIni = new Date(data); dIni.setHours(0,0,0,0); const dFim = new Date(data); dFim.setHours(23,59,59);
    // Checa conflitos
    const { data: ags } = await supabase.from('agendamentos').select('data_hora_inicio, data_hora_fim').gte('data_hora_inicio', dIni.toISOString()).lte('data_hora_fim', dFim.toISOString()).eq('profissional_id', profId).neq('status', 'cancelado').neq('id', selectedEvent?.id || 0);
    
    const slots = [];
    const [hI, mI] = trab.hora_inicio.split(':'); const [hF, mF] = trab.hora_fim.split(':');
    let curr = new Date(data); curr.setHours(hI, mI, 0, 0); const limit = new Date(data); limit.setHours(hF, mF, 0, 0);
    
    while (curr < limit) {
      const slotEnd = new Date(curr.getTime() + servico.duracao_minutos * 60000);
      if (slotEnd > limit) break;
      if (curr > new Date()) {
        const conflito = ags?.some(a => { const ai=new Date(a.data_hora_inicio), af=new Date(a.data_hora_fim); return (curr>=ai && curr<af) || (slotEnd>ai && slotEnd<=af); });
        if (!conflito) slots.push(new Date(curr));
      }
      curr = new Date(curr.getTime() + servico.duracao_minutos * 60000);
    }
    setNovosHorarios(slots); setLoadingNovosHorarios(false);
  };

  // --- ESTILIZAÇÃO DO CALENDÁRIO ---
  const eventStyleGetter = (event, start, end, isSelected) => ({
    style: {
      backgroundColor: 'transparent',
      border: 'none',
      padding: '0px',
      overflow: 'visible', // CRÍTICO para o Tooltip aparecer
      zIndex: isSelected ? 50 : 1,
    }
  });

  if (authLoading || (loading && !agendamentosAgrupados)) return <div className="p-20 text-center text-fuchsia-600 font-bold animate-pulse">Carregando Studio...</div>;
  if (!profile) return <div className="p-10 text-center">Erro de autenticação.</div>;

  return (
    <div className="max-w-[1600px] mx-auto p-2 md:p-6 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
             {profile?.role === 'admin' ? 'Painel Master' : 'Minha Agenda'}
           </h1>
           <p className="text-slate-500 text-sm font-medium">Gestão de Agendamentos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
           {profile?.role === 'admin' && (
             <select value={filtroProfissionalId} onChange={(e) => setFiltroProfissionalId(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none px-2 py-2">
               <option value="">Todos Profissionais</option>
               {allProfissionais.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
             </select>
           )}
           <div className="w-[1px] h-6 bg-slate-200 hidden md:block"></div>
           <button onClick={() => setViewMode('list_today')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'list_today' ? 'bg-fuchsia-100 text-fuchsia-700' : 'text-slate-400 hover:text-slate-600'}`}>HOJE</button>
           <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'calendar' ? 'bg-fuchsia-100 text-fuchsia-700' : 'text-slate-400 hover:text-slate-600'}`}>CALENDÁRIO</button>
        </div>
      </div>

      {/* CENTRAL DE AVISOS (Card Alert - Preservado) */}
      {proximosAgendamentos.length > 0 && (
         <div className="mb-6 bg-gradient-to-r from-fuchsia-600 to-purple-600 p-1 rounded-2xl shadow-lg shadow-fuchsia-200">
            <div className="bg-white rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                   <span className="bg-fuchsia-100 text-fuchsia-600 p-2 rounded-lg text-xl">🔔</span>
                   <div>
                      <p className="font-bold text-slate-800">Próximos Clientes</p>
                      <p className="text-xs text-slate-500">Você tem {proximosAgendamentos.length} agendamentos confirmados em breve.</p>
                   </div>
                </div>
                <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
                   {proximosAgendamentos.slice(0, 3).map(ag => (
                      <div key={ag.id} className="min-w-[180px] bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                         <div className="text-xs font-bold text-slate-700">
                            {formatarHora(ag.data_hora_inicio)}<br/>
                            <span className="text-slate-400 font-normal truncate block w-20">{ag.nome_cliente.split(' ')[0]}</span>
                         </div>
                         <button onClick={() => handleEnviarWhatsApp(ag, 'confirmacao')} className="ml-auto text-green-500 hover:bg-green-100 p-1.5 rounded-md transition">💬</button>
                      </div>
                   ))}
                </div>
            </div>
         </div>
      )}

      {/* VISUALIZAÇÃO LISTA HOJE */}
      {viewMode === 'list_today' && renderListaHoje()}

      {/* VISUALIZAÇÃO CALENDÁRIO */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 h-[80vh] p-2 md:p-6 overflow-hidden relative">
           <Calendar
              localizer={localizer}
              events={eventosCalendario}
              startAccessor="start" endAccessor="end"
              views={['day', 'week', 'month']} 
              view={calendarView} onView={setCalendarView} 
              date={calendarDate} onNavigate={setCalendarDate}
              selectable={true}
              onSelectSlot={handleSelectSlot} 
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              components={{ event: EventoPersonalizado }}
              messages={messages}
              culture="pt-BR"
              min={new Date(0, 0, 0, 7, 0, 0)} // Início do dia 07:00
              max={new Date(0, 0, 0, 20, 0, 0)} // Fim do dia 20:00
              step={30} // Slots de 30 min
              timeslots={1} // 1 slot por passo (aumenta o tamanho visual)
              tooltipAccessor={null} // Desativa o nativo para usar o nosso custom
            />
        </div>
      )}

      {/* CSS INJETADO PARA CORRIGIR SOBREPOSIÇÃO VISUAL */}
      <style>{`
        /* Altura mínima para cada linha de 30min para caber o card */
        .rbc-timeslot-group { min-height: 60px !important; border-bottom: 1px solid #f1f5f9 !important; }
        
        /* Remove bordas internas feias */
        .rbc-time-view, .rbc-month-view { border: none !important; }
        .rbc-time-header-content { border-left: none !important; }
        .rbc-time-content { border-top: 1px solid #f1f5f9 !important; }
        .rbc-day-slot .rbc-time-slot { border-top: none !important; }
        
        /* Cabeçalho */
        .rbc-header { padding: 10px !important; font-size: 11px !important; text-transform: uppercase; font-weight: 800 !important; color: #64748b; border-bottom: none !important; }
        
        /* Hoje */
        .rbc-today { background-color: #fdf4ff !important; }
        
        /* Botões de Toolbar */
        .rbc-toolbar button { border: none !important; font-size: 12px; font-weight: bold; color: #64748b; }
        .rbc-toolbar button.rbc-active { color: #c026d3; background: transparent; box-shadow: none; text-decoration: underline; text-underline-offset: 4px; }
      `}</style>

      {/* MODAL COMPLETO (Toda funcionalidade preservada) */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} className="Modal w-full max-w-lg mx-auto outline-none mt-10 md:mt-20" overlayClassName="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-start overflow-y-auto p-4">
        {selectedEvent && (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full relative animate-in zoom-in-95 duration-200">
             
             {/* Header Modal */}
             <div className="bg-fuchsia-600 p-6 flex justify-between items-start">
                <div>
                   <h2 className="text-xl font-black text-white">{modalMode === 'new' ? 'Novo Agendamento' : 'Gerenciar Cliente'}</h2>
                   <p className="text-fuchsia-100 text-sm">Preencha os dados abaixo.</p>
                </div>
                <button onClick={closeModal} className="text-white/70 hover:text-white font-bold text-2xl">&times;</button>
             </div>

             <div className="p-6 space-y-4">
                {/* Botões WhatsApp (Só aparecem na edição) */}
                {modalMode === 'edit' && !showCancelOptions && (
                  <div className="flex gap-2">
                     <button onClick={() => handleEnviarWhatsApp({ ...selectedEvent, telefone_cliente: modalTelefone }, 'confirmacao')} className="flex-1 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl text-xs hover:bg-blue-100 transition border border-blue-100">📲 Confirmar</button>
                     <button onClick={() => handleEnviarWhatsApp({ ...selectedEvent, telefone_cliente: modalTelefone }, 'lembrete')} className="flex-1 py-2 bg-green-50 text-green-600 font-bold rounded-xl text-xs hover:bg-green-100 transition border border-green-100">⏰ Lembrar</button>
                  </div>
                )}

                {/* Área de Cancelamento */}
                {showCancelOptions ? (
                   <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <h3 className="font-bold text-red-800 mb-2">Confirmar Cancelamento?</h3>
                      <select value={adminCancelReason} onChange={e => setAdminCancelReason(e.target.value)} className="w-full p-3 border border-red-200 rounded-xl mb-3 text-sm">
                         {MOTIVOS_ADMIN.map(m => (<option key={m} value={m}>{m}</option>))}
                      </select>
                      <div className="flex gap-2">
                         <button onClick={() => setShowCancelOptions(false)} className="flex-1 py-2 bg-white text-gray-600 font-bold rounded-lg border border-gray-200">Voltar</button>
                         <button onClick={handleModalCancel} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg shadow-lg shadow-red-200">Cancelar e Avisar</button>
                      </div>
                   </div>
                ) : (
                  <>
                     {/* Inputs Padrão */}
                     <div className="space-y-3">
                        <input type="text" placeholder="Nome do Cliente" className="w-full p-3 bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none font-bold text-slate-700" value={modalNome} onChange={e => setModalNome(e.target.value)} disabled={profile?.role !== 'admin'} />
                        
                        <div className="grid grid-cols-2 gap-3">
                           <select className="p-3 bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl outline-none text-sm font-medium" value={modalServicoId} onChange={e => setModalServicoId(e.target.value)} disabled={profile?.role !== 'admin'}>
                             <option value="">Serviço...</option>
                             {allServicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                           </select>
                           <select className="p-3 bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl outline-none text-sm font-medium" value={modalProfissionalId} onChange={e => setModalProfissionalId(e.target.value)} disabled={profile?.role !== 'admin'}>
                             <option value="">Profissional...</option>
                             {allProfissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                           </select>
                        </div>

                        <input type="tel" placeholder="Telefone / WhatsApp" className="w-full p-3 bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none text-sm" value={modalTelefone} onChange={e => setModalTelefone(e.target.value)} disabled={profile?.role !== 'admin'} />
                     </div>

                     {/* Área de Remarcação (Só Admin ou Edição) */}
                     {modalMode === 'edit' && profile?.role === 'admin' && (
                        <div className="mt-4 border-t border-slate-100 pt-4">
                           <button type="button" onClick={() => setShowRemarcar(!showRemarcar)} className="text-amber-600 text-xs font-bold uppercase tracking-wide flex items-center gap-1 hover:underline">
                              📅 Deseja Remarcar? {showRemarcar ? '▲' : '▼'}
                           </button>
                           {showRemarcar && (
                              <div className="mt-3 bg-amber-50 p-3 rounded-xl border border-amber-100 grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="text-[10px] font-bold text-amber-800 uppercase">Nova Data</label>
                                    <DatePicker selected={novaData} onChange={buscarHorariosParaRemarcar} minDate={new Date()} locale="pt-BR" className="w-full p-2 rounded-lg border border-amber-200 text-sm" />
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-bold text-amber-800 uppercase">Novo Horário</label>
                                    <select onChange={e => setNovoHorarioSelecionado(e.target.value)} className="w-full p-2 rounded-lg border border-amber-200 text-sm bg-white" disabled={loadingNovosHorarios}>
                                       <option>{loadingNovosHorarios ? 'Buscando...' : 'Selecione...'}</option>
                                       {novosHorarios.map(h => (<option key={h} value={h.toISOString()}>{format(h, 'HH:mm')}</option>))}
                                    </select>
                                 </div>
                              </div>
                           )}
                        </div>
                     )}

                     {/* Footer Botões */}
                     <div className="flex gap-3 pt-2">
                        {modalMode === 'edit' && (
                           <button type="button" onClick={() => setShowCancelOptions(true)} className="px-4 py-3 text-red-500 font-bold text-sm bg-red-50 rounded-xl hover:bg-red-100 transition">Excluir</button>
                        )}
                        <button type="button" onClick={handleModalSave} className="flex-1 bg-fuchsia-600 text-white font-bold rounded-xl shadow-lg shadow-fuchsia-200 hover:bg-fuchsia-700 transition py-3">
                           {isSavingModal ? 'Salvando...' : 'Salvar Dados'}
                        </button>
                     </div>
                  </>
                )}

                {modalError && <p className="text-center text-red-600 text-xs font-bold bg-red-50 p-2 rounded-lg">{modalError}</p>}
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AdminAgenda;