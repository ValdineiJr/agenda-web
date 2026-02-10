import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { Link } from 'react-router-dom';

// Função auxiliar de formatação
function formatarDataHora(iso) {
  if (!iso) return '';
  const dataObj = new Date(iso);
  const dia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(dataObj);
  const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(dataObj);
  const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(dataObj);
  return { dia, hora, semana }; // Retorna objeto para flexibilidade visual
}

function ClientManagePage() {
  // --- ESTADOS ---
  const [telefoneBusca, setTelefoneBusca] = useState('');
  const [nascimentoBusca, setNascimentoBusca] = useState('');
  const [lembrarDados, setLembrarDados] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  
  const [cliente, setCliente] = useState(null);
  
  // Listas de Agendamentos
  const [agendamentosAtivos, setAgendamentosAtivos] = useState([]);
  const [agendamentosFinalizados, setAgendamentosFinalizados] = useState([]); 
  const [agendamentosCancelados, setAgendamentosCancelados] = useState([]);
  
  // Edição
  const [editNome, setEditNome] = useState('');
  const [editNascimento, setEditNascimento] = useState('');
  const [isSavingData, setIsSavingData] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false); // Toggle para editar perfil

  // Controle de Abas (Tabs)
  const [activeTab, setActiveTab] = useState('proximos'); // 'proximos', 'realizados', 'cancelados'

  const NUMERO_SALAO = '5519993562075'; 

  // --- EFEITO INICIAL ---
  useEffect(() => {
    const telefoneSalvo = localStorage.getItem('salao_cliente_telefone');
    const nascimentoSalvo = localStorage.getItem('salao_cliente_nascimento');
    if (telefoneSalvo && nascimentoSalvo) {
      setTelefoneBusca(telefoneSalvo);
      setNascimentoBusca(nascimentoSalvo);
      setLembrarDados(true);
    }
  }, []);

  // --- BUSCAR DADOS ---
  const handleBuscarAgendamento = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setSucesso(null); setCliente(null);
    setAgendamentosAtivos([]); setAgendamentosFinalizados([]); setAgendamentosCancelados([]);

    const telefoneLimpo = telefoneBusca.replace(/[^0-9]/g, '');

    try {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes').select('*')
        .eq('telefone', telefoneLimpo).eq('data_nascimento', nascimentoBusca).single();
      
      if (clienteError || !clienteData) throw new Error('Dados não encontrados. Verifique as informações.');

      // Salvar/Remover LocalStorage
      if (lembrarDados) {
        localStorage.setItem('salao_cliente_telefone', telefoneBusca);
        localStorage.setItem('salao_cliente_nascimento', nascimentoBusca);
      } else {
        localStorage.removeItem('salao_cliente_telefone');
        localStorage.removeItem('salao_cliente_nascimento');
      }
      
      setCliente(clienteData);
      setEditNome(clienteData.nome || '');
      setEditNascimento(clienteData.data_nascimento || '');

      // Buscar histórico completo
      const { data: agendamentosData, error: agError } = await supabase
        .from('agendamentos')
        .select(`id, data_hora_inicio, status, cancelamento_motivo, servicos ( nome ), profissionais ( nome )`)
        .eq('telefone_cliente', telefoneLimpo)
        .order('data_hora_inicio', { ascending: false }); 

      if (agError) throw agError;

      const ativos = []; const finalizados = []; const cancelados = [];
      agendamentosData.forEach(ag => {
        if (ag.status === 'confirmado' || ag.status === 'em_atendimento') ativos.push(ag);
        else if (ag.status === 'finalizado') finalizados.push(ag);
        else if (ag.status === 'cancelado') cancelados.push(ag);
      });

      ativos.sort((a, b) => new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio)); // Mais próximo primeiro

      setAgendamentosAtivos(ativos);
      setAgendamentosFinalizados(finalizados);
      setAgendamentosCancelados(cancelados);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSair = () => {
    setCliente(null); setSucesso(null); setError(null);
    setAgendamentosAtivos([]);
  };
  
  const handleSalvarDados = async (e) => {
    e.preventDefault();
    setIsSavingData(true); setError(null); setSucesso(null);
    const { error } = await supabase.from('clientes').update({ nome: editNome, data_nascimento: editNascimento || null }).eq('telefone', cliente.telefone);
    if (error) setError('Erro ao salvar.');
    else {
      setSucesso('Dados atualizados!');
      setCliente(prev => ({ ...prev, nome: editNome, data_nascimento: editNascimento }));
      setShowEditProfile(false);
      if (lembrarDados) localStorage.setItem('salao_cliente_nascimento', editNascimento);
    }
    setIsSavingData(false);
  };

  // --- RENDERIZAÇÃO ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* --- HEADER (FIXO) --- */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="text-fuchsia-600 font-bold text-sm flex items-center gap-1 hover:opacity-80 transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m7 7-7-7 7-7"/></svg>
            Início
          </Link>
          <h1 className="text-lg font-black text-slate-800 tracking-tight">Área do Cliente</h1>
          {cliente && (
             <button onClick={handleSair} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition">
               Sair
             </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6">
        
        {/* MENSAGENS DE FEEDBACK */}
        {error && <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm shadow-sm animate-fade-in">{error}</div>}
        {sucesso && <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-lg text-sm shadow-sm animate-fade-in">{sucesso}</div>}

        {/* --- TELA DE LOGIN --- */}
        {!cliente && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in-up">
            <div className="bg-gradient-to-br from-fuchsia-600 to-purple-700 p-8 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">👋</div>
              <h2 className="text-2xl font-bold mb-1">Bem-vindo(a)!</h2>
              <p className="text-fuchsia-100 text-sm">Acesse seus agendamentos e histórico.</p>
            </div>
            
            <form onSubmit={handleBuscarAgendamento} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Seu WhatsApp</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">📱</span>
                  <input type="tel" value={telefoneBusca} onChange={(e) => setTelefoneBusca(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none transition font-medium text-slate-700" placeholder="(00) 00000-0000" required />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Data de Nascimento</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">📅</span>
                  <input type="date" value={nascimentoBusca} onChange={(e) => setNascimentoBusca(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-fuchsia-500 outline-none transition font-medium text-slate-700" required />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input id="lembrar" type="checkbox" checked={lembrarDados} onChange={(e) => setLembrarDados(e.target.checked)} className="w-5 h-5 text-fuchsia-600 rounded border-slate-300 focus:ring-fuchsia-500" />
                <label htmlFor="lembrar" className="text-sm text-slate-600">Lembrar meus dados</label>
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 bg-fuchsia-600 text-white font-bold rounded-xl shadow-lg shadow-fuchsia-200 hover:bg-fuchsia-700 hover:scale-[1.02] transition-all disabled:opacity-70 disabled:scale-100">
                {loading ? 'Acessando...' : 'Entrar na minha área'}
              </button>
            </form>
          </div>
        )}

        {/* --- ÁREA LOGADA --- */}
        {cliente && (
          <div className="animate-fade-in space-y-6">
            
            {/* CARTÃO DE PERFIL */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
               <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Olá,</p>
                    <h2 className="text-2xl font-black text-slate-800">{cliente.nome.split(' ')[0]}</h2>
                    <p className="text-sm text-slate-500 mt-1">{cliente.telefone}</p>
                  </div>
                  <button onClick={() => setShowEditProfile(!showEditProfile)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-xl transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </button>
               </div>

               {/* Formulário de Edição (Expansível) */}
               {showEditProfile && (
                 <form onSubmit={handleSalvarDados} className="mt-6 pt-6 border-t border-slate-100 space-y-4 animate-fade-in">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Nome Completo</label>
                      <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-fuchsia-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Data Nascimento</label>
                      <input type="date" value={editNascimento} onChange={(e) => setEditNascimento(e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-fuchsia-500" />
                    </div>
                    <button type="submit" disabled={isSavingData} className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition">
                      {isSavingData ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                 </form>
               )}
            </div>

            {/* ABAS DE NAVEGAÇÃO */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
               <button onClick={() => setActiveTab('proximos')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'proximos' ? 'bg-fuchsia-100 text-fuchsia-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                 PRÓXIMOS ({agendamentosAtivos.length})
               </button>
               <button onClick={() => setActiveTab('realizados')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'realizados' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                 REALIZADOS
               </button>
               <button onClick={() => setActiveTab('cancelados')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'cancelados' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                 CANCELADOS
               </button>
            </div>

            {/* CONTEÚDO DAS ABAS */}
            <div className="space-y-4">
              
              {/* 1. ABA PRÓXIMOS */}
              {activeTab === 'proximos' && (
                <>
                  {agendamentosAtivos.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm">Você não tem agendamentos futuros.</p>
                      <Link to="/" className="mt-3 inline-block text-fuchsia-600 font-bold text-sm hover:underline">Agendar Agora</Link>
                    </div>
                  ) : (
                    agendamentosAtivos.map(ag => {
                      const dt = formatarDataHora(ag.data_hora_inicio);
                      const msgAlterar = `Olá! Gostaria de *alterar* meu agendamento de ${ag.servicos?.nome} dia ${dt.dia}.`;
                      const msgCancelar = `Olá! Preciso *cancelar* meu agendamento de ${ag.servicos?.nome} dia ${dt.dia}.`;

                      return (
                        <div key={ag.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                           <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-fuchsia-100 text-fuchsia-700 text-xs font-black px-2 py-1 rounded uppercase">{dt.semana}</span>
                                  <span className="text-slate-400 text-xs font-bold">{dt.dia}</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-800">{dt.hora}</h3>
                              </div>
                              {ag.status === 'em_atendimento' && (
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">EM ANDAMENTO</span>
                              )}
                           </div>
                           
                           <div className="border-l-4 border-fuchsia-500 pl-3 py-1 mb-4">
                              <p className="font-bold text-slate-700 text-lg leading-tight">{ag.servicos?.nome}</p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">Com: {ag.profissionais?.nome}</p>
                           </div>

                           <div className="flex gap-2">
                              <a href={`https://wa.me/${NUMERO_SALAO}?text=${encodeURIComponent(msgAlterar)}`} target="_blank" className="flex-1 py-2.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl text-center hover:bg-blue-100 transition">Alterar</a>
                              <a href={`https://wa.me/${NUMERO_SALAO}?text=${encodeURIComponent(msgCancelar)}`} target="_blank" className="flex-1 py-2.5 bg-red-50 text-red-500 text-xs font-bold rounded-xl text-center hover:bg-red-100 transition">Cancelar</a>
                           </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* 2. ABA REALIZADOS */}
              {activeTab === 'realizados' && (
                 agendamentosFinalizados.length === 0 ? <p className="text-center text-slate-400 py-10 text-sm">Nenhum histórico ainda.</p> : (
                   agendamentosFinalizados.map(ag => {
                      const dt = formatarDataHora(ag.data_hora_inicio);
                      return (
                        <div key={ag.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center opacity-75 hover:opacity-100 transition">
                           <div>
                              <p className="font-bold text-slate-700">{ag.servicos?.nome}</p>
                              <p className="text-xs text-slate-400">{dt.dia} às {dt.hora} • {ag.profissionais?.nome}</p>
                           </div>
                           <div className="bg-green-100 text-green-700 p-1.5 rounded-full">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                           </div>
                        </div>
                      );
                   })
                 )
              )}

              {/* 3. ABA CANCELADOS */}
              {activeTab === 'cancelados' && (
                 agendamentosCancelados.length === 0 ? <p className="text-center text-slate-400 py-10 text-sm">Nenhum cancelamento.</p> : (
                   agendamentosCancelados.map(ag => {
                      const dt = formatarDataHora(ag.data_hora_inicio);
                      return (
                        <div key={ag.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                           <div>
                              <p className="font-bold text-slate-500 line-through">{ag.servicos?.nome}</p>
                              <p className="text-xs text-slate-400">{dt.dia} • {ag.profissionais?.nome}</p>
                              <p className="text-[10px] text-red-400 mt-1 font-bold bg-red-50 inline-block px-1 rounded">Motivo: {ag.cancelamento_motivo || 'Cliente'}</p>
                           </div>
                        </div>
                      );
                   })
                 )
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientManagePage;