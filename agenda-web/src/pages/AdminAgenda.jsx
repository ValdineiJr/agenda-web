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

// --- Configuração Inicial de Localização ---
registerLocale('pt-BR', ptBR);
Modal.setAppElement('#root');

const locales = {
  'pt-BR': ptBR
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

// --- Mensagens Traduzidas do Calendário ---
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

// --- Motivos de Cancelamento Padrão ---
const MOTIVOS_ADMIN = [
  "Cliente solicitou (WhatsApp)",
  "Profissional indisponível",
  "Cliente não compareceu (No-show)",
  "Outro motivo"
];

// =========================================================
//               FUNÇÕES AUXILIARES DE FORMATAÇÃO
// =========================================================

function formatarDataCabecalho(dataString) {
  const [dia, mes, ano] = dataString.split('/');
  const dataObj = new Date(`${ano}-${mes}-${dia}T12:00:00`); 
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(dataObj);
}

function formatarHora(dataISO) {
  const dataObj = new Date(dataISO);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  }).format(dataObj);
}

// =========================================================
//    NOVO: COMPONENTE DE EVENTO COM TOOLTIP (HOVER)
// =========================================================
const EventoPersonalizado = ({ event }) => {
  const isEmAtendimento = event.resource.status === 'em_atendimento';
  // Cores dinâmicas baseadas no status
  const bgClass = isEmAtendimento ? 'bg-amber-100 border-amber-500 text-amber-900' : 'bg-fuchsia-100 border-fuchsia-500 text-fuchsia-900';
  
  return (
    <div className="relative group h-full">
      {/* O Card Visível no Calendário */}
      <div className={`h-full rounded border-l-4 p-1 px-2 text-xs shadow-sm transition-all hover:brightness-95 ${bgClass} overflow-hidden`}>
        <div className="flex justify-between items-center mb-0.5">
           <span className="font-bold">{format(event.start, 'HH:mm')}</span>
           {isEmAtendimento && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Em Atendimento"></span>}
        </div>
        <div className="font-semibold truncate">{event.resource.servicos?.nome}</div>
        <div className="font-light truncate opacity-80">{event.resource.nome_cliente.split(' ')[0]}</div>
      </div>

      {/* TOOLTIP FLUTUANTE (Aparece ao passar o mouse) */}
      <div className="hidden md:group-hover:block absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 bg-white p-4 rounded-xl shadow-2xl border border-gray-100 animate-fade-in pointer-events-none">
         {/* Setinha do tooltip */}
         <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white transform rotate-45 border-l border-t border-gray-100"></div>
         
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3 border-b border-gray-100 pb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${isEmAtendimento ? 'bg-amber-500' : 'bg-fuchsia-600'}`}>
                  {event.resource.nome_cliente.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-800 leading-tight">{event.resource.nome_cliente}</p>
                  <p className="text-xs text-gray-500">{event.resource.telefone_cliente || 'Sem telefone'}</p>
                </div>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-semibold text-gray-400 text-xs uppercase">Serviço:</span><br/> {event.resource.servicos?.nome}</p>
                <p><span className="font-semibold text-gray-400 text-xs uppercase">Profissional:</span><br/> {event.resource.profissionais?.nome}</p>
                <p><span className="font-semibold text-gray-400 text-xs uppercase">Horário:</span><br/> {format(event.start, 'HH:mm')} às {format(event.end, 'HH:mm')}</p>
            </div>
         </div>
      </div>
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
  const [proximosAgendamentos, setProximosAgendamentos] = useState([]);

  // --- States de Controle ---
  const [showCancelados, setShowCancelados] = useState(false);
  const [showFinalizados, setShowFinalizados] = useState(false);
  const [totalCancelados, setTotalCancelados] = useState(0);
  const [totalFinalizados, setTotalFinalizados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'cards' ou 'calendar'
  const [filtroProfissionalId, setFiltroProfissionalId] = useState(''); 

  // --- Modal States ---
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('new'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [calendarView, setCalendarView] = useState('week'); 
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // --- Dados Auxiliares ---
  const [allServicos, setAllServicos] = useState([]);
  const [allProfissionais, setAllProfissionais] = useState([]);
  
  // --- Form Modal ---
  const [modalServicoId, setModalServicoId] = useState('');
  const [modalProfissionalId, setModalProfissionalId] = useState('');
  const [modalNome, setModalNome] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalTelefone, setModalTelefone] = useState('');
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [modalError, setModalError] = useState(null);
  
  // --- Reagendamento/Cancelamento ---
  const [showRemarcar, setShowRemarcar] = useState(false);
  const [novaData, setNovaData] = useState(new Date());
  const [novosHorarios, setNovosHorarios] = useState([]);
  const [loadingNovosHorarios, setLoadingNovosHorarios] = useState(false);
  const [novoHorarioSelecionado, setNovoHorarioSelecionado] = useState(null);
  const [showCancelOptions, setShowCancelOptions] = useState(false);
  const [adminCancelReason, setAdminCancelReason] = useState(MOTIVOS_ADMIN[0]);

  // --- EFEITOS ---
  useEffect(() => { if (!authLoading && profile) fetchModalData(); }, [authLoading, profile]);
  useEffect(() => { if (!authLoading && profile) fetchAgendamentos(); }, [authLoading, profile, filtroProfissionalId]); 

  // --- FUNÇÕES DE BUSCA ---
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
      let agendamentosFiltrados = agendamentosRaw;
      if (filtroProfissionalId) agendamentosFiltrados = agendamentosRaw.filter(ag => ag.profissional_id == filtroProfissionalId);

      const ativos = agendamentosFiltrados.filter(ag => ag.status === 'confirmado' || ag.status === 'em_atendimento');
      const cancelados = agendamentosFiltrados.filter(ag => ag.status === 'cancelado');
      const finalizados = agendamentosFiltrados.filter(ag => ag.status === 'finalizado'); 
      
      // Central de Avisos (Hoje/Amanhã)
      const agora = new Date(); agora.setHours(0,0,0,0);
      const limiteAmanha = new Date(agora); limiteAmanha.setDate(limiteAmanha.getDate() + 2);
      setProximosAgendamentos(ativos.filter(ag => {
         const d = new Date(ag.data_hora_inicio); return d >= agora && d < limiteAmanha && ag.status === 'confirmado';
      }));

      setTotalCancelados(cancelados.length); setTotalFinalizados(finalizados.length); 
      
      const agruparPorDia = (lista) => lista.reduce((acc, ag) => {
          const d = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
          if (!acc[d]) acc[d] = []; acc[d].push(ag); return acc;
      }, {});

      setAgendamentosAgrupados(agruparPorDia(ativos));
      setCanceladosAgrupados(agruparPorDia(cancelados));
      setFinalizadosAgrupados(agruparPorDia(finalizados));

      setEventosCalendario(ativos.map(ag => ({
        title: `${formatarHora(ag.data_hora_inicio)} - ${ag.servicos?.nome}`,
        start: new Date(ag.data_hora_inicio),
        end: new Date(ag.data_hora_fim),
        resource: ag, status: ag.status 
      })));
    }
    setLoading(false);
  }

  // --- WHATSAPP ---
  const handleEnviarWhatsApp = (agendamento, tipo) => {
    const telefone = agendamento.telefone_cliente?.replace(/[^0-9]/g, '');
    if (!telefone) return alert("Sem telefone.");
    const nome = agendamento.nome_cliente.split(' ')[0];
    const data = format(new Date(agendamento.data_hora_inicio), "dd/MM");
    const hora = formatarHora(agendamento.data_hora_inicio);
    const servico = agendamento.servicos?.nome || 'Serviço';
    
    let msg = "";
    if (tipo === 'confirmacao') msg = `Olá ${nome}, tudo bem? Passando para confirmar seu horário de *${servico}* para o dia *${data} às ${hora}*. Podemos confirmar?`;
    else if (tipo === 'lembrete') msg = `Olá ${nome}! Passando para lembrar do seu horário de *${servico}* amanhã, dia *${data} às ${hora}*. Te aguardamos!`;
    
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleUpdateStatus = async (agendamentoId, novoStatus) => {
    const { error } = await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', agendamentoId);
    if (error) alert('Erro ao atualizar status.'); else fetchAgendamentos();
  };

  // --- HANDLERS MODAL ---
  const handleSelectSlot = (slotInfo) => {
    setModalMode('new'); setSelectedEvent({ start: slotInfo.start, end: slotInfo.end });
    setModalServicoId(''); setModalNome(''); setModalEmail(''); setModalTelefone(''); setModalError(null); setShowRemarcar(false); setNovoHorarioSelecionado(null); setShowCancelOptions(false);
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
    if (!modalServicoId || !modalProfissionalId || !modalNome || !modalTelefone) { setModalError('Preencha campos obrigatórios.'); setIsSavingModal(false); return; }
    
    const servico = allServicos.find(s => s.id === parseInt(modalServicoId));
    let ini;
    if (showRemarcar && novoHorarioSelecionado) ini = new Date(novoHorarioSelecionado);
    else if (modalMode === 'new') ini = selectedEvent.start;
    else ini = new Date(selectedEvent.data_hora_inicio);
    
    const fim = new Date(ini.getTime() + servico.duracao_minutos * 60000);
    const payload = { servico_id: servico.id, profissional_id: parseInt(modalProfissionalId), nome_cliente: modalNome, email_cliente: modalEmail, telefone_cliente: modalTelefone, data_hora_inicio: ini.toISOString(), data_hora_fim: fim.toISOString(), status: 'confirmado' };

    let errReq;
    if (modalMode === 'new') { const { error } = await supabase.from('agendamentos').insert(payload); errReq = error; } 
    else { const { error } = await supabase.from('agendamentos').update(payload).eq('id', selectedEvent.id); errReq = error; }

    if (errReq) { setModalError(errReq.message); setIsSavingModal(false); } 
    else { setIsSavingModal(false); closeModal(); }
  };

  const handleModalCancel = async () => {
    if (profile.role !== 'admin' && profile.id !== selectedEvent.profissional_id) { setModalError('Sem permissão.'); return; }
    if (!showCancelOptions) { setShowCancelOptions(true); return; }
    setIsSavingModal(true); 
    const { error } = await supabase.from('agendamentos').update({ status: 'cancelado', cancelamento_motivo: adminCancelReason }).eq('id', selectedEvent.id);
    if (error) { setModalError(error.message); setIsSavingModal(false); } 
    else {
      setIsSavingModal(false); 
      // Abre WhatsApp ao cancelar
      const nome = selectedEvent.nome_cliente.split(' ')[0];
      const servico = selectedEvent.servicos?.nome || 'serviço';
      const msg = `Olá ${nome}. Infelizmente tivemos que cancelar seu agendamento de ${servico}. Motivo: ${adminCancelReason}`;
      const link = `https://wa.me/55${selectedEvent.telefone_cliente.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
      window.open(link, '_blank');
      closeModal(); 
    }
  };

  const buscarHorariosParaRemarcar = async (data) => {
    setLoadingNovosHorarios(true); setNovosHorarios([]); setNovoHorarioSelecionado(null); setNovaData(data);
    const profId = parseInt(modalProfissionalId); const servId = parseInt(modalServicoId);
    if (!profId || !servId) { setModalError("Selecione serviço e profissional."); setLoadingNovosHorarios(false); return; }
    
    const servico = allServicos.find(s => s.id === servId);
    const { data: trab } = await supabase.from('horarios_trabalho').select('hora_inicio, hora_fim').eq('dia_semana', data.getDay()).eq('profissional_id', profId).single();
    if (!trab) { setLoadingNovosHorarios(false); return; }
    
    const dIni = new Date(data); dIni.setHours(0,0,0,0); const dFim = new Date(data); dFim.setHours(23,59,59);
    const { data: ags } = await supabase.from('agendamentos').select('data_hora_inicio, data_hora_fim').gte('data_hora_inicio', dIni.toISOString()).lte('data_hora_fim', dFim.toISOString()).eq('profissional_id', profId).neq('status', 'cancelado').neq('id', selectedEvent?.id || 0);
    
    const slots = [];
    const [hI, mI] = trab.hora_inicio.split(':'); const [hF, mF] = trab.hora_fim.split(':');
    let curr = new Date(data); curr.setHours(hI, mI, 0, 0); const limit = new Date(data); limit.setHours(hF, mF, 0, 0);
    
    while (curr < limit) {
      const slotEnd = new Date(curr.getTime() + servico.duracao_minutos * 60000);
      if (slotEnd > limit) break;
      if (curr > new Date()) {
        if (!ags?.some(a => { const ai=new Date(a.data_hora_inicio), af=new Date(a.data_hora_fim); return (curr>=ai && curr<af) || (slotEnd>ai && slotEnd<=af); })) slots.push(new Date(curr));
      }
      curr = new Date(curr.getTime() + servico.duracao_minutos * 60000);
    }
    setNovosHorarios(slots); setLoadingNovosHorarios(false);
  };

  // --- RENDERIZAÇÃO ---
  
  if (authLoading || (loading && !agendamentosAgrupados)) return <div className="p-10 text-center text-fuchsia-600 font-bold animate-pulse">Carregando Studio...</div>;
  if (!profile) return <div className="p-10 text-center"><button onClick={()=>window.location.reload()}>Recarregar</button></div>;

  const diasOrdenadosAtivos = Object.keys(agendamentosAgrupados).sort((a,b) => {
      const [da, ma, aa] = a.split('/'); const [db, mb, ab] = b.split('/');
      return new Date(`${aa}-${ma}-${da}`) - new Date(`${ab}-${mb}-${db}`);
  });
  const diasOrdenadosFinalizados = Object.keys(finalizadosAgrupados);
  const diasOrdenadosCancelados = Object.keys(canceladosAgrupados);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
          {profile?.role === 'admin' ? 'Agenda Geral' : 'Minha Agenda'}
        </h1>
        <div className="flex flex-wrap gap-3 justify-center">
          {profile?.role === 'admin' && (
             <select value={filtroProfissionalId} onChange={(e) => setFiltroProfissionalId(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-4 rounded-lg focus:ring-2 focus:ring-fuchsia-500 outline-none">
               <option value="">Todos os Profissionais</option>
               {allProfissionais.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
             </select>
          )}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setViewMode('cards')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'cards' ? 'bg-white text-fuchsia-600 shadow' : 'text-gray-500'}`}>Cards</button>
            <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'calendar' ? 'bg-white text-fuchsia-600 shadow' : 'text-gray-500'}`}>Calendário</button>
          </div>
        </div>
      </div>

      {/* --- CENTRAL DE AVISOS (WhatsApp) --- */}
      {viewMode === 'cards' && proximosAgendamentos.length > 0 && (
         <div className="mb-8 bg-gradient-to-br from-fuchsia-50 to-purple-50 p-6 rounded-2xl border border-fuchsia-100 shadow-sm animate-fade-in-up">
            <h2 className="text-lg font-bold text-fuchsia-900 flex items-center gap-2 mb-4">
               <span className="text-2xl">🔔</span> Avisos Rápidos (Hoje e Amanhã)
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-thin">
               {proximosAgendamentos.map(ag => (
                  <div key={`aviso-${ag.id}`} className="min-w-[260px] bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                     <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-gray-400 uppercase">{formatarDataCabecalho(new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR'))}</span>
                       <span className="text-xs font-black bg-fuchsia-100 text-fuchsia-700 px-2 py-1 rounded">{formatarHora(ag.data_hora_inicio)}</span>
                     </div>
                     <p className="font-bold text-gray-800 truncate">{ag.nome_cliente}</p>
                     <p className="text-xs text-gray-500 truncate mb-3">{ag.servicos?.nome}</p>
                     <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleEnviarWhatsApp(ag, 'confirmacao')} className="bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition border border-blue-200">Confirmar</button>
                        <button onClick={() => handleEnviarWhatsApp(ag, 'lembrete')} className="bg-green-50 text-green-600 py-2 rounded-lg text-xs font-bold hover:bg-green-100 transition border border-green-200">Lembrar</button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* --- MODO VISUALIZAÇÃO: CARDS (100% FUNCIONAL) --- */}
      {viewMode === 'cards' && (
        <div className="space-y-10 animate-fade-in">
          {diasOrdenadosAtivos.length === 0 ? (
             <div className="bg-white p-10 rounded-xl shadow text-center text-gray-500 border border-gray-100">
               <p className="text-lg">Nenhum agendamento encontrado para este filtro.</p>
             </div>
          ) : (
            diasOrdenadosAtivos.map(dia => (
              <div key={dia}>
                <h2 className="text-xl font-bold text-fuchsia-800 mb-4 border-b pb-2 border-fuchsia-100">
                  {formatarDataCabecalho(dia)}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {agendamentosAgrupados[dia].map(ag => {
                    const emAtendimento = ag.status === 'em_atendimento';
                    return (
                      <div key={ag.id} className={`rounded-xl shadow-sm border-l-4 p-5 bg-white flex flex-col justify-between transition hover:shadow-md ${emAtendimento ? 'border-amber-400 bg-amber-50/50' : 'border-fuchsia-500'}`}>
                        <div>
                          <div className="flex justify-between items-start">
                             <span className="text-2xl font-bold text-gray-700">{formatarHora(ag.data_hora_inicio)}</span>
                             {/* Botão Flutuante WhatsApp no Card */}
                             <button 
                                onClick={() => handleEnviarWhatsApp(ag, 'confirmacao')}
                                className="text-green-500 hover:text-green-600 bg-green-50 p-2 rounded-full hover:bg-green-100 transition"
                                title="Enviar mensagem no WhatsApp"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                             </button>
                          </div>
                          {emAtendimento && <span className="bg-amber-200 text-amber-900 text-xs px-2 py-1 rounded font-bold mt-1 inline-block">EM ANDAMENTO</span>}
                          
                          <p className="font-bold text-gray-800 mt-2 text-lg">{ag.nome_cliente}</p>
                          <p className="text-sm text-gray-600">{ag.servicos?.nome}</p>
                          <p className="text-xs text-gray-400 mt-3 uppercase tracking-wide font-bold">
                             {ag.profissionais?.nome}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                          {ag.status === 'confirmado' && (
                            <button 
                              onClick={() => handleUpdateStatus(ag.id, 'em_atendimento')} 
                              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                            >
                              Iniciar
                            </button>
                          )}
                          {ag.status === 'em_atendimento' && (
                            <button 
                              onClick={() => handleUpdateStatus(ag.id, 'finalizado')} 
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                            >
                              Finalizar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Histórico e Cancelados */}
          {(diasOrdenadosFinalizados.length > 0 || diasOrdenadosCancelados.length > 0) && <hr className="border-gray-200 my-8" />}
          
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

      {/* --- MODO VISUALIZAÇÃO: CALENDÁRIO (VISUAL NOVO) --- */}
      {viewMode === 'calendar' && (
        <div className="bg-white p-2 md:p-6 rounded-2xl shadow-xl h-[85vh] animate-fade-in border border-gray-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-100 rounded-full blur-3xl opacity-20 -z-10 pointer-events-none"></div>
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
              components={{ event: EventoPersonalizado }}
              messages={messages}
              culture="pt-BR"
              tooltipAccessor={null} // Desativa tooltip nativo para usar o nosso
            />
        </div>
      )}

      {/* --- NOVO MODAL DE EDIÇÃO --- */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} className="Modal" overlayClassName="ModalOverlay">
        {selectedEvent && (
          <form onSubmit={(e) => { e.preventDefault(); handleModalSave(); }} className="flex flex-col h-full">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-fuchsia-600 to-purple-700 p-6 rounded-t-2xl text-white relative shrink-0">
               <h2 className="text-2xl font-bold">{modalMode === 'new' ? '✨ Novo Agendamento' : '✏️ Editar Agendamento'}</h2>
               <p className="text-fuchsia-100 text-sm opacity-90 mt-1">Gerencie os detalhes do cliente.</p>
               <button type="button" onClick={closeModal} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold">&times;</button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
               
               {/* Atalhos WhatsApp (Apenas edição) */}
               {modalMode === 'edit' && !showCancelOptions && (
                 <div className="flex gap-3 mb-2">
                    <button type="button" onClick={() => handleEnviarWhatsApp({ ...selectedEvent, telefone_cliente: modalTelefone }, 'confirmacao')} className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-3 rounded-xl font-bold hover:bg-blue-100 transition shadow-sm border border-blue-200">
                       <span>💬</span> Confirmar
                    </button>
                    <button type="button" onClick={() => handleEnviarWhatsApp({ ...selectedEvent, telefone_cliente: modalTelefone }, 'lembrete')} className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-700 py-3 rounded-xl font-bold hover:bg-green-100 transition shadow-sm border border-green-200">
                       <span>⏰</span> Lembrar
                    </button>
                 </div>
               )}

               {!showCancelOptions ? (
                 <>
                   {/* Reagendamento */}
                   {modalMode === 'edit' && profile?.role === 'admin' && (
                     <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                        <button type="button" onClick={() => setShowRemarcar(!showRemarcar)} className="flex items-center justify-between w-full text-amber-800 font-bold">
                          <span>📅 Mudar Data ou Horário?</span>
                          <span>{showRemarcar ? '▲' : '▼'}</span>
                        </button>
                        {showRemarcar && (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                             <div>
                               <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Nova Data</label>
                               <DatePicker selected={novaData} onChange={buscarHorariosParaRemarcar} minDate={new Date()} locale="pt-BR" className="w-full p-2 border border-amber-300 rounded-lg focus:ring-amber-500" />
                             </div>
                             <div>
                               <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Novo Horário</label>
                               <select onChange={e => setNovoHorarioSelecionado(e.target.value)} className="w-full p-2 border border-amber-300 rounded-lg bg-white">
                                  <option>Selecione...</option>
                                  {novosHorarios.map(h => (<option key={h} value={h.toISOString()}>{format(h, 'HH:mm')}</option>))}
                               </select>
                             </div>
                          </div>
                        )}
                     </div>
                   )}

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serviço</label>
                        <select value={modalServicoId} onChange={e => setModalServicoId(e.target.value)} disabled={profile?.role !== 'admin'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all">
                          <option value="">Selecione...</option>
                          {allServicos.map(s => (<option key={s.id} value={s.id}>{s.nome}</option>))}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Profissional</label>
                        <select value={modalProfissionalId} onChange={e => setModalProfissionalId(e.target.value)} disabled={profile?.role !== 'admin'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all">
                          <option value="">Selecione...</option>
                          {allProfissionais.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
                        </select>
                     </div>
                   </div>
                   
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                     <input type="text" value={modalNome} onChange={e => setModalNome(e.target.value)} disabled={profile?.role !== 'admin'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" placeholder="Nome completo" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / WhatsApp</label>
                     <input type="tel" value={modalTelefone} onChange={e => setModalTelefone(e.target.value)} disabled={profile?.role !== 'admin'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" placeholder="(00) 00000-0000" />
                   </div>
                 </>
               ) : (
                 /* Cancelamento */
                 <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
                    <h3 className="text-xl font-bold text-red-800 mb-2">Cancelar Agendamento?</h3>
                    <p className="text-red-600 mb-4 text-sm">Selecione o motivo. Isso pode ser enviado ao cliente.</p>
                    <select value={adminCancelReason} onChange={e => setAdminCancelReason(e.target.value)} className="w-full p-3 border border-red-200 rounded-xl mb-4 focus:ring-red-500">
                       {MOTIVOS_ADMIN.map(m => (<option key={m} value={m}>{m}</option>))}
                    </select>
                    <div className="flex gap-3">
                       <button type="button" onClick={() => setShowCancelOptions(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50">Voltar</button>
                       <button type="button" onClick={handleModalCancel} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200">Confirmar Cancelamento</button>
                    </div>
                 </div>
               )}
            </div>

            {/* Footer */}
            {!showCancelOptions && (
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 rounded-b-2xl shrink-0">
                 <button type="button" onClick={closeModal} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">Cancelar</button>
                 <div className="flex-1 flex gap-3 justify-end">
                    {modalMode === 'edit' && (
                      <button type="button" onClick={handleModalCancel} className="px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition">Excluir</button>
                    )}
                    {(modalMode === 'new' || profile?.role === 'admin') && (
                      <button type="submit" disabled={isSavingModal} className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-700 shadow-lg shadow-fuchsia-200 transition transform active:scale-95">
                        {isSavingModal ? 'Salvando...' : 'Salvar'}
                      </button>
                    )}
                 </div>
              </div>
            )}
            {modalError && <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl animate-bounce">{modalError}</div>}
          </form>
        )}
      </Modal>
    </div>
  );
}

export default AdminAgenda;