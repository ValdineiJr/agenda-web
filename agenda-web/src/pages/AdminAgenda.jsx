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

const locales = { 'pt-BR': ptBR };

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales
});

const messages = {
  allDay: 'Dia Inteiro', previous: 'Anterior', next: 'Próximo',
  today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia',
  agenda: 'Lista', date: 'Data', time: 'Hora', event: 'Evento',
  noEventsInRange: 'Sem agendamentos.', showMore: (total) => `+${total} mais`,
};

const MOTIVOS_ADMIN = [
  "Cliente solicitou (WhatsApp)", "Profissional indisponível", "Cliente não compareceu (No-show)", "Outro motivo"
];

// =========================================================
//               FUNÇÕES AUXILIARES
// =========================================================
function formatarDataCabecalho(dataString) {
  const [dia, mes, ano] = dataString.split('/');
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${ano}-${mes}-${dia}T12:00:00`));
}
function formatarHora(dataISO) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(dataISO));
}

// =========================================================
//    COMPONENTE DE EVENTO (BLOCO SÓLIDO)
// =========================================================
const EventoPersonalizado = ({ event }) => {
  const isEmAtendimento = event.resource.status === 'em_atendimento';
  const isFinalizado = event.resource.status === 'finalizado';
  
  // Cores Sólidas e Modernas
  let bgClass = 'bg-fuchsia-100 border-l-4 border-fuchsia-600 text-fuchsia-900'; // Padrão
  if (isEmAtendimento) bgClass = 'bg-amber-100 border-l-4 border-amber-500 text-amber-900';
  if (isFinalizado) bgClass = 'bg-gray-100 border-l-4 border-gray-500 text-gray-500 opacity-80';

  return (
    <div className="relative group h-full w-full font-sans">
      
      {/* --- BLOCO DO EVENTO --- */}
      <div className={`h-full w-full rounded-r px-2 py-1 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden leading-tight ${bgClass}`}>
        
        <div className="flex justify-between items-center mb-0.5">
           <span className="text-[11px] font-bold opacity-80">
             {format(event.start, 'HH:mm')}
           </span>
           {isEmAtendimento && (
             <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
           )}
        </div>

        <div className="font-extrabold text-xs truncate uppercase tracking-tight">
          {event.resource.nome_cliente}
        </div>
        <div className="text-[10px] font-medium truncate opacity-90">
          {event.resource.servicos?.nome}
        </div>
      </div>

      {/* --- TOOLTIP FLUTUANTE --- */}
      <div className="hidden md:group-hover:block absolute left-1/2 -translate-x-1/2 top-full mt-1 z-[100] w-64 bg-white p-4 rounded-xl shadow-2xl border border-gray-100 animate-fade-in pointer-events-none text-left">
         <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white transform rotate-45 border-l border-t border-gray-100"></div>
         
         <div className="relative z-50">
            <p className="font-bold text-gray-800 text-lg">{event.resource.nome_cliente}</p>
            <p className="text-xs text-gray-400 mb-2">{event.resource.telefone_cliente || 'Sem telefone'}</p>
            
            <div className="bg-gray-50 p-2 rounded text-sm space-y-1 text-gray-600">
               <p><span className="font-bold">Serviço:</span> {event.resource.servicos?.nome}</p>
               <p><span className="font-bold">Prof:</span> {event.resource.profissionais?.nome}</p>
               <p><span className="font-bold">Horário:</span> {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</p>
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
  
  // States
  const [agendamentosRawState, setAgendamentosRawState] = useState([]); 
  const [agendamentosAgrupados, setAgendamentosAgrupados] = useState({});
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const [proximosAgendamentos, setProximosAgendamentos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Responsividade: Se for celular, começa como "Dia", se PC começa como "Semana"
  const [viewMode, setViewMode] = useState(window.innerWidth < 768 ? 'list_today' : 'calendar'); 
  const [calendarView, setCalendarView] = useState(window.innerWidth < 768 ? 'day' : 'week');
  
  const [filtroProfissionalId, setFiltroProfissionalId] = useState(''); 
  const [selectedBulkIds, setSelectedBulkIds] = useState([]);

  // Modal
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('new'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  const [allServicos, setAllServicos] = useState([]);
  const [allProfissionais, setAllProfissionais] = useState([]);
  
  // Form Modal
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

  useEffect(() => { 
    if (!authLoading && profile) fetchModalData(); 
    
    // Listener de resize para ajustar visualização
    const handleResize = () => {
      if (window.innerWidth < 768 && calendarView === 'week') {
        setCalendarView('day'); // Força dia no mobile
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);

  }, [authLoading, profile]);

  useEffect(() => { if (!authLoading && profile) fetchAgendamentos(); }, [authLoading, profile, filtroProfissionalId]); 

  // --- BUSCAS ---
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

      const ativos = agendamentosFiltrados.filter(ag => ag.status === 'confirmado' || ag.status === 'em_atendimento');
      
      // Lista de próximos
      const agora = new Date(); agora.setHours(0,0,0,0);
      const limiteAmanha = new Date(agora); limiteAmanha.setDate(limiteAmanha.getDate() + 2);
      setProximosAgendamentos(ativos.filter(ag => {
         const d = new Date(ag.data_hora_inicio); return d >= agora && d < limiteAmanha && ag.status === 'confirmado';
      }));
      
      const agruparPorDia = (lista) => lista.reduce((acc, ag) => {
          const d = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
          if (!acc[d]) acc[d] = []; acc[d].push(ag); return acc;
      }, {});

      setAgendamentosAgrupados(agruparPorDia(ativos));

      setEventosCalendario(ativos.map(ag => ({
        title: `${ag.nome_cliente}`, // Título simples para o RBC
        start: new Date(ag.data_hora_inicio), 
        end: new Date(ag.data_hora_fim), 
        resource: ag, 
        status: ag.status 
      })));
    }
    setLoading(false);
  }

  // ... (MANTENHA TODAS AS FUNÇÕES DE AÇÃO: handleEnviarWhatsApp, handleUpdateStatus, toggleBulkSelect, etc. IDÊNTICAS AO ANTERIOR) ...
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
    else if (tipo === 'contato') msg = `Olá ${nome}, tudo bem? Aqui é do Studio.`;
    
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
    if (!window.confirm(`Deseja finalizar ${selectedBulkIds.length} agendamentos selecionados?`)) return;

    setLoading(true);
    const { error } = await supabase.from('agendamentos').update({ status: 'finalizado' }).in('id', selectedBulkIds);
    if (error) { alert("Erro ao finalizar em massa."); } 
    else { setSelectedBulkIds([]); fetchAgendamentos(); alert("Agendamentos finalizados com sucesso!"); }
    setLoading(false);
  };

  const handleAdicionarExtraHoje = () => {
    setModalMode('new');
    setSelectedEvent({ start: new Date(), end: new Date() });
    setModalServicoId(''); setModalNome(''); setModalEmail(''); setModalTelefone(''); setModalError(null); setShowRemarcar(false); setNovoHorarioSelecionado(null); setShowCancelOptions(false);
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

  // --- FUNÇÃO RECUPERADA (JÁ EXISTE NO SEU CÓDIGO) ---
  const renderListaHoje = () => {
    // ... (Mantenha o código da renderListaHoje igual ao que você já tem) ...
    const hojeStr = new Date().toLocaleDateString('pt-BR');
    const agendamentosHoje = agendamentosRawState.filter(ag => {
        const dataAg = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR');
        const isHoje = dataAg === hojeStr;
        const isAtivo = ag.status === 'confirmado' || ag.status === 'em_atendimento';
        if (filtroProfissionalId) return isHoje && isAtivo && ag.profissional_id == filtroProfissionalId;
        return isHoje && isAtivo;
    });

    const porProfissional = agendamentosHoje.reduce((acc, ag) => {
        const nomeProf = ag.profissionais?.nome || 'Sem Profissional';
        if (!acc[nomeProf]) acc[nomeProf] = [];
        acc[nomeProf].push(ag);
        return acc;
    }, {});

    if (agendamentosHoje.length === 0) {
        return (
            <div className="text-center p-10 bg-white rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 mb-4">Nenhum agendamento pendente para hoje.</p>
                <button onClick={handleAdicionarExtraHoje} className="bg-fuchsia-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-fuchsia-700 transition">
                    + Incluir Serviço Extra (Hoje)
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-fuchsia-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Agendamentos de Hoje</h2>
                    <p className="text-sm text-gray-500">{hojeStr}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleAdicionarExtraHoje} className="bg-white border border-fuchsia-600 text-fuchsia-600 px-4 py-2 rounded-lg font-bold hover:bg-fuchsia-50 transition">
                        + Serviço Extra (Novo)
                    </button>
                    {selectedBulkIds.length > 0 && (
                        <button onClick={handleBulkFinish} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-md animate-pulse">
                            ✅ Finalizar Selecionados ({selectedBulkIds.length})
                        </button>
                    )}
                </div>
            </div>

            {Object.keys(porProfissional).map(profNome => (
                <div key={profNome} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                    <div className="bg-fuchsia-50 p-4 border-b border-fuchsia-100 flex justify-between items-center">
                        <h3 className="font-bold text-fuchsia-800">{profNome}</h3>
                        <span className="text-xs font-semibold bg-white text-fuchsia-600 px-2 py-1 rounded-full border border-fuchsia-200">
                            {porProfissional[profNome].length} clientes
                        </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {porProfissional[profNome].map(ag => (
                            <div key={ag.id} className="p-4 flex flex-col md:flex-row items-center gap-4 hover:bg-gray-50 transition">
                                <input 
                                    type="checkbox" 
                                    checked={selectedBulkIds.includes(ag.id)}
                                    onChange={() => toggleBulkSelect(ag.id)}
                                    className="w-5 h-5 text-fuchsia-600 rounded focus:ring-fuchsia-500 cursor-pointer"
                                />
                                <div className="min-w-[80px] text-center">
                                    <span className="block text-lg font-bold text-gray-700">{formatarHora(ag.data_hora_inicio)}</span>
                                    {ag.status === 'em_atendimento' && (
                                        <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-1 rounded">Em Andamento</span>
                                    )}
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <p className="font-bold text-gray-800">{ag.nome_cliente}</p>
                                    <p className="text-sm text-gray-500">{ag.servicos?.nome}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleAdicionarServicoParaCliente(ag)} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-200 transition">+ Serviço</button>
                                    <button onClick={() => handleEnviarWhatsApp(ag, 'contato')} className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></button>
                                    <button onClick={() => handleSelectEvent({ resource: ag })} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition">Editar</button>
                                    <button onClick={() => handleUpdateStatus(ag.id, 'finalizado')} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition shadow-sm">Finalizar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
  };

  // --- HANDLERS E MODAIS (IGUAIS AO SEU CÓDIGO) ---
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
    try {
      if (!modalServicoId || !modalProfissionalId || !modalNome) throw new Error('Preencha os campos obrigatórios.');
      
      const servico = allServicos.find(s => s.id === parseInt(modalServicoId));
      let ini;
      if (showRemarcar && novoHorarioSelecionado) ini = new Date(novoHorarioSelecionado);
      else if (modalMode === 'new') ini = selectedEvent?.start ? new Date(selectedEvent.start) : new Date();
      else ini = new Date(selectedEvent.data_hora_inicio);
      
      const fim = new Date(ini.getTime() + servico.duracao_minutos * 60000);
      const payload = { servico_id: servico.id, profissional_id: parseInt(modalProfissionalId), nome_cliente: modalNome, email_cliente: modalEmail, telefone_cliente: modalTelefone, data_hora_inicio: ini.toISOString(), data_hora_fim: fim.toISOString(), status: 'confirmado' };

      let errReq;
      if (modalMode === 'new') { const { error } = await supabase.from('agendamentos').insert(payload); errReq = error; } 
      else { const { error } = await supabase.from('agendamentos').update(payload).eq('id', selectedEvent.id); errReq = error; }

      if (errReq) throw errReq;
      closeModal(); fetchAgendamentos();
    } catch (error) {
      setModalError(error.message || "Erro ao salvar.");
    } finally {
      setIsSavingModal(false);
    }
  };

  const handleModalCancel = async () => {
    if (profile.role !== 'admin' && profile.id !== selectedEvent.profissional_id) { setModalError('Sem permissão.'); return; }
    if (!showCancelOptions) { setShowCancelOptions(true); return; }
    
    setIsSavingModal(true); 
    try {
        const { error } = await supabase.from('agendamentos').update({ status: 'cancelado', cancelamento_motivo: adminCancelReason }).eq('id', selectedEvent.id);
        if (error) throw error;
        
        const nome = selectedEvent.nome_cliente.split(' ')[0];
        const msg = `Olá ${nome}. Infelizmente tivemos que cancelar seu agendamento. Motivo: ${adminCancelReason}`;
        window.open(`https://wa.me/55${selectedEvent.telefone_cliente.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
        
        closeModal(); fetchAgendamentos();
    } catch (error) {
        setModalError(error.message);
    } finally {
        setIsSavingModal(false);
    }
  };

  const buscarHorariosParaRemarcar = async (data) => {
    setLoadingNovosHorarios(true); setNovosHorarios([]); setNovoHorarioSelecionado(null); setNovaData(data);
    // ... (Mesma lógica de remarcação) ...
    const profId = parseInt(modalProfissionalId); const servId = parseInt(modalServicoId);
    if (!profId || !servId) { setLoadingNovosHorarios(false); return; }
    
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

  // --- CONFIGURAÇÃO CHAVE PARA CORRIGIR O LAYOUT ---
  const eventStyleGetter = (event, start, end, isSelected) => {
    return {
      style: {
        backgroundColor: 'transparent',
        border: 'none',
        padding: '0px', 
        overflow: 'visible',
        zIndex: 20
      }
    };
  };

  if (authLoading || (loading && !agendamentosAgrupados)) return <div className="p-10 text-center text-fuchsia-600 font-bold animate-pulse">Carregando...</div>;
  if (!profile) return <div className="p-10 text-center"><button onClick={()=>window.location.reload()}>Recarregar</button></div>;

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-center mb-4 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">
          {profile?.role === 'admin' ? 'Agenda Geral' : 'Minha Agenda'}
        </h1>
        <div className="flex flex-wrap gap-3 justify-center items-center">
          {profile?.role === 'admin' && (
             <select value={filtroProfissionalId} onChange={(e) => setFiltroProfissionalId(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-4 rounded-lg outline-none h-10">
               <option value="">Todos os Profissionais</option>
               {allProfissionais.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
             </select>
          )}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setViewMode('list_today')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'list_today' ? 'bg-white text-fuchsia-600 shadow' : 'text-gray-500'}`}>Hoje</button>
            <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'calendar' ? 'bg-white text-fuchsia-600 shadow' : 'text-gray-500'}`}>Calendário</button>
            <button onClick={() => setViewMode('cards')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'cards' ? 'bg-white text-fuchsia-600 shadow' : 'text-gray-500'}`}>Cards</button>
          </div>
        </div>
      </div>

      {viewMode === 'list_today' && renderListaHoje()}

      {viewMode === 'cards' && (
        <div className="space-y-10 animate-fade-in">
           {/* (Código de cards igual ao anterior, mantido) */}
           {Object.keys(agendamentosAgrupados).length === 0 ? (
             <div className="bg-white p-10 rounded-xl shadow text-center text-gray-500 border border-gray-100">
               <p className="text-lg">Nenhum agendamento encontrado.</p>
             </div>
          ) : (
            Object.keys(agendamentosAgrupados).sort((a,b) => {
              const [da, ma, aa] = a.split('/'); const [db, mb, ab] = b.split('/');
              return new Date(`${aa}-${ma}-${da}`) - new Date(`${ab}-${mb}-${db}`);
            }).map(dia => (
              <div key={dia}>
                <h2 className="text-xl font-bold text-fuchsia-800 mb-4 border-b pb-2 border-fuchsia-100">{formatarDataCabecalho(dia)}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {agendamentosAgrupados[dia].map(ag => (
                      <div key={ag.id} className={`rounded-xl shadow-sm border-l-4 p-5 bg-white flex flex-col justify-between transition hover:shadow-md ${ag.status === 'em_atendimento' ? 'border-amber-400 bg-amber-50/50' : 'border-fuchsia-500'}`}>
                        <div>
                          <span className="text-2xl font-bold text-gray-700 block mb-2">{formatarHora(ag.data_hora_inicio)}</span>
                          <p className="font-bold text-gray-800 text-lg">{ag.nome_cliente}</p>
                          <p className="text-sm text-gray-600">{ag.servicos?.nome}</p>
                          <p className="text-xs text-gray-400 mt-2 uppercase">{ag.profissionais?.nome}</p>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="bg-white p-2 md:p-6 rounded-2xl shadow-xl h-[85vh] animate-fade-in border border-gray-100 relative overflow-hidden">
           <Calendar
              localizer={localizer}
              events={eventosCalendario}
              startAccessor="start" endAccessor="end"
              views={['day', 'week', 'month']} 
              view={calendarView} // Estado controlado
              onView={setCalendarView} // Atualiza estado
              date={calendarDate} onNavigate={setCalendarDate}
              selectable={true}
              onSelectSlot={handleSelectSlot} 
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              components={{ event: EventoPersonalizado }}
              messages={messages}
              culture="pt-BR"
              min={new Date(0, 0, 0, 7, 0, 0)} // Começa a mostrar as 07:00
              max={new Date(0, 0, 0, 21, 0, 0)} // Termina de mostrar as 21:00
              step={30} // Blocos de 30 min
              timeslots={2} // 1 hora dividida em 2
            />
        </div>
      )}

      {/* MODAL (Mantido igual) */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} className="Modal" overlayClassName="ModalOverlay">
        {selectedEvent && (
          <form onSubmit={(e) => { e.preventDefault(); handleModalSave(); }} className="flex flex-col h-full">
             {/* ... (Todo o formulário do modal igual ao anterior) ... */}
             <div className="bg-gradient-to-r from-fuchsia-600 to-purple-700 p-6 rounded-t-2xl text-white relative shrink-0">
               <h2 className="text-2xl font-bold">{modalMode === 'new' ? '✨ Novo Agendamento' : '✏️ Editar Agendamento'}</h2>
               <p className="text-fuchsia-100 text-sm opacity-90 mt-1">Gerencie os detalhes do cliente.</p>
               <button type="button" onClick={closeModal} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
               {modalMode === 'edit' && !showCancelOptions && (
                 <div className="flex gap-3 mb-2">
                    <button type="button" onClick={() => handleEnviarWhatsApp({ ...selectedEvent, telefone_cliente: modalTelefone }, 'confirmacao')} className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-3 rounded-xl font-bold hover:bg-blue-100 transition shadow-sm border border-blue-200"><span>💬</span> Confirmar</button>
                    <button type="button" onClick={() => handleEnviarWhatsApp({ ...selectedEvent, telefone_cliente: modalTelefone }, 'lembrete')} className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-700 py-3 rounded-xl font-bold hover:bg-green-100 transition shadow-sm border border-green-200"><span>⏰</span> Lembrar</button>
                 </div>
               )}

               {!showCancelOptions ? (
                 <>
                   {/* Inputs do Formulário (Mantidos) */}
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serviço</label>
                        <select value={modalServicoId} onChange={e => setModalServicoId(e.target.value)} disabled={profile?.role !== 'admin'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none">
                          <option value="">Selecione...</option>
                          {allServicos.map(s => (<option key={s.id} value={s.id}>{s.nome}</option>))}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Profissional</label>
                        <select value={modalProfissionalId} onChange={e => setModalProfissionalId(e.target.value)} disabled={profile?.role !== 'admin'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none">
                          <option value="">Selecione...</option>
                          {allProfissionais.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
                        </select>
                     </div>
                   </div>
                   
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                     <input type="text" value={modalNome} onChange={e => setModalNome(e.target.value)} disabled={profile?.role !== 'admin'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none" placeholder="Nome completo" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / WhatsApp</label>
                     <input type="tel" value={modalTelefone} onChange={e => setModalTelefone(e.target.value)} disabled={profile?.role !== 'admin'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none" placeholder="(00) 00000-0000" />
                   </div>
                 </>
               ) : (
                 <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center animate-fade-in">
                    <h3 className="text-xl font-bold text-red-800 mb-2">Cancelar Agendamento?</h3>
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

            {!showCancelOptions && (
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 rounded-b-2xl shrink-0">
                 <button type="button" onClick={closeModal} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">Cancelar</button>
                 <div className="flex-1 flex gap-3 justify-end">
                    {modalMode === 'edit' && <button type="button" onClick={handleModalCancel} className="px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition">Excluir</button>}
                    {(modalMode === 'new' || profile?.role === 'admin') && <button type="submit" disabled={isSavingModal} className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-700 shadow-lg transition">{isSavingModal ? 'Salvando...' : 'Salvar'}</button>}
                 </div>
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}

export default AdminAgenda;