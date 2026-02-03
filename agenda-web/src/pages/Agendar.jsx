import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import '/src/index.css';
import { Link } from 'react-router-dom'; 

import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css'; 

registerLocale('pt-BR', ptBR); 

// --- COMPONENTE DE SUCESSO (Com Botão Piscante) ---
function TelaSucesso({ itensAgendados, cliente, onNovoAgendamento }) {
  const numeroWhatsapp = '5519988136946'; 
  
  let mensagemWhatsapp = `Olá! Acabei de realizar agendamentos no site:\n`;
  mensagemWhatsapp += `Cliente: ${cliente.nome}\n\n`;
  
  itensAgendados.forEach((item, index) => {
    const dataFormatada = new Date(item.data_hora_inicio).toLocaleDateString('pt-BR');
    const horaFormatada = new Date(item.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    mensagemWhatsapp += `*${index + 1}. ${item.servico_nome}*\n`;
    mensagemWhatsapp += `   Profissional: ${item.profissional_nome || 'Indiferente'}\n`;
    mensagemWhatsapp += `   Data: ${dataFormatada} às ${horaFormatada}\n`;
  });

  const linkWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagemWhatsapp)}`;

  return (
    <div className="p-6 md:p-10 max-w-lg mx-auto bg-white shadow-2xl rounded-3xl mt-10 text-center animate-fade-in border border-fuchsia-50">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
        <span className="text-4xl">🎉</span>
      </div>
      <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
        Agendamento Realizado!
      </h1>
      <p className="text-gray-500 mb-8">Agora, confirme enviando o comprovante.</p>
      
      {/* Botão Piscante */}
      <a
        href={linkWhatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full p-4 rounded-xl text-white font-bold text-lg bg-green-500 hover:bg-green-600 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 animate-pulse-strong flex items-center justify-center gap-3"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        Enviar no WhatsApp
      </a>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <button onClick={onNovoAgendamento} className="text-fuchsia-600 font-semibold hover:underline">
          Voltar para o início
        </button>
      </div>
    </div>
  );
}

// --- RESUMO LATERAL ---
function ResumoPedido({ carrinho, itemAtual }) {
  const itensParaMostrar = [...carrinho];
  if (itemAtual && itemAtual.servico) {
    itensParaMostrar.push(itemAtual);
  }
  const total = itensParaMostrar.reduce((acc, item) => acc + (item.servico?.preco || 0), 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 sticky top-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex justify-between items-center">
        <span>🛒 Resumo</span>
        <span className="bg-fuchsia-100 text-fuchsia-700 text-xs px-2 py-1 rounded-lg">{itensParaMostrar.length} itens</span>
      </h3>
      
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {itensParaMostrar.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-4">Selecione um serviço...</p>
        ) : (
          itensParaMostrar.map((item, idx) => (
            <div key={idx} className="text-sm border-b border-gray-50 pb-3 last:border-0">
              <div className="flex justify-between font-bold text-gray-700 mb-1">
                <span>{item.servico?.nome}</span>
                <span>R$ {item.servico?.preco.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 flex flex-col gap-1">
                {item.data && <span>📅 {item.data.toLocaleDateString('pt-BR')}</span>}
                {item.horario && <span>⏰ {item.horario.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>}
                {item.profissional && <span>👤 {item.profissional.nome}</span>}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-dashed border-gray-200 pt-4 mt-2 flex justify-between items-center">
        <span className="text-gray-600 font-bold">Total Estimado</span>
        <span className="text-2xl font-black text-fuchsia-600">R$ {total.toFixed(2)}</span>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
function AgendarPage() {
  const [categorias, setCategorias] = useState([]);
  const [todosServicos, setTodosServicos] = useState([]);
  const [servicosFiltrados, setServicosFiltrados] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [carrinho, setCarrinho] = useState([]); 
  
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState(null);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [horarioSelecionado, setHorarioSelecionado] = useState(null);
  
  const [etapa, setEtapa] = useState(1); 
  const [isLoadingProfissionais, setIsLoadingProfissionais] = useState(false);
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sucessoDados, setSucessoDados] = useState(null);
  
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [lembrarDados, setLembrarDados] = useState(false);
  
  const hoje = new Date();
  const limiteFuturo = new Date();
  limiteFuturo.setMonth(hoje.getMonth() + 3);

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    const init = async () => {
      const nomeS = localStorage.getItem('salao_cliente_nome');
      const telS = localStorage.getItem('salao_cliente_telefone');
      const nascS = localStorage.getItem('salao_cliente_nascimento');
      if (nomeS) setNome(nomeS);
      if (telS) setTelefone(telS);
      if (nascS) setDataNascimento(nascS);
      if (nomeS) setLembrarDados(true);

      const [catRes, servRes] = await Promise.all([
        supabase.from('categorias').select('*').order('nome'),
        supabase.from('servicos').select('*').order('nome')
      ]);

      if (catRes.data) setCategorias(catRes.data);
      if (servRes.data) setTodosServicos(servRes.data);
    };
    init();
  }, []);

  // --- FILTRO DE SERVIÇOS ---
  useEffect(() => {
    if (categoriaSelecionada) {
      setServicosFiltrados(todosServicos.filter(s => s.categoria_id === categoriaSelecionada.id));
    } else {
      setServicosFiltrados([]);
    }
  }, [categoriaSelecionada, todosServicos]);

  // --- SELEÇÃO DE PROFISSIONAL (AUTO-AVANÇO) ---
  const selecionarServico = (serv) => {
    setServicoSelecionado(serv);
    setEtapa(2); // Avança direto
    
    // Busca profissionais imediatamente
    setProfissionais([]);
    setProfissionalSelecionado(null);
    setHorarioSelecionado(null);
    
    const loadProfs = async () => {
      setIsLoadingProfissionais(true);
      const { data, error } = await supabase
        .from('profissionais_servicos')
        .select('profissionais ( id, nome, foto_url )') // Puxar foto se tiver
        .eq('servico_id', serv.id);
      
      if (!error && data) {
        setProfissionais(data.map(d => d.profissionais));
      }
      setIsLoadingProfissionais(false);
    };
    loadProfs();
  };

  const selecionarProfissional = (prof) => {
    setProfissionalSelecionado(prof);
    setEtapa(3); // Avança direto para data
    buscarHorariosDisponiveis(new Date()); // Já busca para hoje
  };

  // --- BUSCA HORÁRIOS ---
  async function buscarHorariosDisponiveis(dataAlvo) {
    if (!servicoSelecionado || !profissionalSelecionado) return;

    setIsLoadingHorarios(true);
    setHorarioSelecionado(null);
    setHorariosDisponiveis([]);

    try {
      const diaDaSemana = dataAlvo.getDay();
      const dataISO = dataAlvo.toISOString().split('T')[0];

      // Validação rápida de dia (para evitar chamadas inúteis)
      let diaValido = true;
      if (servicoSelecionado.datas_especificas?.length > 0) {
        if (!servicoSelecionado.datas_especificas.includes(dataISO)) diaValido = false;
      } else if (servicoSelecionado.dias_disponiveis?.length > 0) {
        if (!servicoSelecionado.dias_disponiveis.includes(diaDaSemana)) diaValido = false;
      }

      if (!diaValido) { setIsLoadingHorarios(false); return; }

      const { data: jornada } = await supabase
        .from('horarios_trabalho')
        .select('hora_inicio, hora_fim')
        .eq('dia_semana', diaDaSemana)
        .eq('profissional_id', profissionalSelecionado.id)
        .maybeSingle();

      if (!jornada) { setIsLoadingHorarios(false); return; }

      // Verifica conflitos
      const inicioDia = new Date(dataAlvo); inicioDia.setHours(0,0,0,0);
      const fimDia = new Date(dataAlvo); fimDia.setHours(23,59,59,999);

      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('data_hora_inicio, data_hora_fim')
        .gte('data_hora_inicio', inicioDia.toISOString())
        .lte('data_hora_fim', fimDia.toISOString())
        .eq('profissional_id', profissionalSelecionado.id)
        .neq('status', 'cancelado');

      const slots = [];
      const [hIni, mIni] = jornada.hora_inicio.split(':').map(Number);
      const [hFim, mFim] = jornada.hora_fim.split(':').map(Number);
      const duracao = servicoSelecionado.duracao_minutos;

      let atual = new Date(dataAlvo); atual.setHours(hIni, mIni, 0, 0);
      const fimExpediente = new Date(dataAlvo); fimExpediente.setHours(hFim, mFim, 0, 0);
      const agora = new Date();

      while (atual < fimExpediente) {
        const fimSlot = new Date(atual.getTime() + duracao * 60000);
        if (fimSlot > fimExpediente) break;

        if (atual > agora) {
          const colide = agendamentos?.some(ag => {
            const agIni = new Date(ag.data_hora_inicio);
            const agFim = new Date(ag.data_hora_fim);
            return (atual >= agIni && atual < agFim) || (fimSlot > agIni && fimSlot <= agFim);
          });
          if (!colide) slots.push(new Date(atual));
        }
        atual = new Date(atual.getTime() + duracao * 60000);
      }
      setHorariosDisponiveis(slots);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHorarios(false);
    }
  }

  // --- RENDERIZADOR DO CALENDÁRIO (BOLINHAS VERDES) ---
  const renderDiaCalendario = (day, date) => {
    // Lógica visual para mostrar bolinha verde se o dia for "potencialmente" válido
    let temVagaVisual = false;
    if (servicoSelecionado) {
        const dataISO = date.toISOString().split('T')[0];
        const diaSemana = date.getDay();
        
        if (servicoSelecionado.datas_especificas?.length > 0) {
            temVagaVisual = servicoSelecionado.datas_especificas.includes(dataISO);
        } else if (servicoSelecionado.dias_disponiveis?.length > 0) {
            temVagaVisual = servicoSelecionado.dias_disponiveis.includes(diaSemana);
        } else {
            // Se não tiver restrição, assume que todo dia (exceto passado) pode ter
            temVagaVisual = true; 
        }
    }
    
    // Não mostra bolinha no passado
    if (date < new Date(new Date().setHours(0,0,0,0))) temVagaVisual = false;

    return (
        <div className="relative flex flex-col items-center justify-center h-full w-full">
            <span className="z-10">{day}</span>
            {temVagaVisual && (
                <div className="day-indicator-dot absolute bottom-1 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            )}
        </div>
    );
  };

  const selecionarHorario = (h) => {
    const novoItem = {
      tempId: Date.now(),
      servico: servicoSelecionado,
      profissional: profissionalSelecionado,
      data: dataSelecionada,
      horario: h
    };
    setCarrinho([...carrinho, novoItem]);
    setCategoriaSelecionada(null);
    setServicoSelecionado(null);
    setProfissionalSelecionado(null);
    setHorarioSelecionado(null);
    setEtapa(5); // Vai para revisão
  };

  const removerDoCarrinho = (index) => {
    const novoCarrinho = [...carrinho];
    novoCarrinho.splice(index, 1);
    setCarrinho(novoCarrinho);
    if (novoCarrinho.length === 0) setEtapa(1);
  };

  const finalizarAgendamento = async () => {
    const telefoneLimpo = telefone.replace(/[^0-9]/g, '');
    if (!nome || telefoneLimpo.length < 10 || !dataNascimento) {
      alert('Preencha seus dados corretamente.'); return;
    }
    setIsSubmitting(true);
    try {
      await supabase.from('clientes').upsert({ telefone: telefoneLimpo, nome, data_nascimento: dataNascimento }, { onConflict: 'telefone' });
      if (lembrarDados) {
        localStorage.setItem('salao_cliente_nome', nome);
        localStorage.setItem('salao_cliente_telefone', telefone);
        localStorage.setItem('salao_cliente_nascimento', dataNascimento);
      }
      const promises = carrinho.map(item => {
        const fim = new Date(item.horario.getTime() + item.servico.duracao_minutos * 60000);
        return supabase.from('agendamentos').insert({
          servico_id: item.servico.id,
          profissional_id: item.profissional.id,
          nome_cliente: nome,
          telefone_cliente: telefoneLimpo,
          data_hora_inicio: item.horario.toISOString(),
          data_hora_fim: fim.toISOString(),
          status: 'confirmado'
        }).select().single();
      });
      const resultados = await Promise.all(promises);
      if (resultados.some(r => r.error)) throw new Error("Erro ao salvar.");
      
      setSucessoDados({
        itens: resultados.map((r, i) => ({ ...r.data, servico_nome: carrinho[i].servico.nome, profissional_nome: carrinho[i].profissional.nome })),
        cliente: { nome }
      });
    } catch (err) {
      alert("Erro ao agendar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sucessoDados) return <TelaSucesso itensAgendados={sucessoDados.itens} cliente={sucessoDados.cliente} onNovoAgendamento={() => window.location.reload()} />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto mt-4">
        
        {/* Header Simples */}
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="text-fuchsia-600 hover:text-fuchsia-800 font-bold flex items-center gap-2 transition-colors">
            <span className="text-xl">←</span> Início
          </Link>
          {carrinho.length > 0 && (
            <span className="bg-fuchsia-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md animate-bounce">
              {carrinho.length} no carrinho
            </span>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* ESQUERDA: FLUXO DE AGENDAMENTO */}
          <div className="flex-1 bg-white p-6 md:p-8 rounded-3xl shadow-xl min-h-[500px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-fuchsia-500 to-purple-600"></div>

            {/* ETAPA 1: SERVIÇOS (COM FOTOS) */}
            {etapa === 1 && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-6">Escolha o Procedimento</h2>
                
                {!categoriaSelecionada ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {categorias.map(cat => (
                      <button key={cat.id} onClick={() => setCategoriaSelecionada(cat)} className="group bg-gray-50 border border-gray-100 rounded-2xl p-4 hover:border-fuchsia-400 hover:shadow-lg transition-all flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full overflow-hidden mb-3 border-2 border-white shadow-sm group-hover:scale-110 transition-transform">
                           <img src={cat.foto_url || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-gray-700 group-hover:text-fuchsia-700">{cat.nome}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <button onClick={() => setCategoriaSelecionada(null)} className="text-sm text-gray-400 hover:text-fuchsia-600 mb-4 flex items-center gap-1">← Voltar para categorias</button>
                    <h3 className="text-lg font-bold text-fuchsia-700 mb-4">{categoriaSelecionada.nome}</h3>
                    
                    <div className="space-y-3">
                      {servicosFiltrados.map(serv => (
                        <div 
                          key={serv.id} 
                          onClick={() => selecionarServico(serv)}
                          className="flex items-center justify-between p-3 border border-gray-100 rounded-2xl hover:border-fuchsia-400 hover:bg-fuchsia-50/50 cursor-pointer transition-all group shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            {/* FOTO DO SERVIÇO */}
                            <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-white">
                               {serv.foto_url ? (
                                 <img src={serv.foto_url} className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-fuchsia-100 text-fuchsia-500 font-bold text-lg">
                                   {serv.nome.charAt(0)}
                                 </div>
                               )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 group-hover:text-fuchsia-800 transition-colors">{serv.nome}</p>
                              <p className="text-xs text-gray-500">{serv.duracao_minutos} minutos</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <span className="block font-bold text-fuchsia-600">R$ {serv.preco.toFixed(2)}</span>
                             <span className="text-xs text-fuchsia-400 font-semibold group-hover:translate-x-1 transition-transform inline-block">Agendar &rarr;</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ETAPA 2: PROFISSIONAL */}
            {etapa === 2 && (
              <div className="animate-fade-in">
                <button onClick={() => setEtapa(1)} className="text-sm text-gray-400 mb-4 hover:text-gray-600">← Voltar</button>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Quem vai te atender?</h2>
                <p className="text-gray-500 text-sm mb-6">Selecione o profissional de sua preferência.</p>
                
                {isLoadingProfissionais ? (
                  <div className="py-10 text-center text-gray-400 animate-pulse">Buscando profissionais...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {profissionais.map(prof => (
                      <button key={prof.id} onClick={() => selecionarProfissional(prof)} className="p-4 border border-gray-100 rounded-2xl hover:border-fuchsia-400 hover:shadow-md transition-all text-center group bg-white">
                        <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-3 overflow-hidden border-2 border-transparent group-hover:border-fuchsia-300 transition-all">
                           {/* Se tiver foto do profissional (futuro), poe aqui. Senão usa inicial */}
                           <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400 group-hover:text-fuchsia-500">
                             {prof.nome.charAt(0)}
                           </div>
                        </div>
                        <p className="font-bold text-gray-700 group-hover:text-fuchsia-700">{prof.nome}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 3 & 4: DATA E HORÁRIO (JUNTOS) */}
            {(etapa === 3 || etapa === 4) && (
              <div className="animate-fade-in">
                <button onClick={() => setEtapa(2)} className="text-sm text-gray-400 mb-4 hover:text-gray-600">← Voltar</button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Escolha a Data</h2>
                
                <div className="flex justify-center mb-8">
                  <DatePicker
                    selected={dataSelecionada}
                    onChange={(date) => {
                      setDataSelecionada(date);
                      buscarHorariosDisponiveis(date);
                      setEtapa(4); // Garante que mostre os horários
                    }}
                    inline
                    locale="pt-BR"
                    minDate={hoje}
                    maxDate={limiteFuturo}
                    renderDayContents={renderDiaCalendario} // AQUI ESTÁ A MÁGICA DAS BOLINHAS
                    calendarClassName="border-0 shadow-none"
                  />
                </div>

                {/* AREA DE HORÁRIOS (Aparece embaixo do calendário) */}
                <div className={`transition-all duration-500 ${etapa === 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 hidden'}`}>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
                        Horários para <span className="text-fuchsia-600 capitalize">{dataSelecionada.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}</span>
                    </h3>
                    
                    {isLoadingHorarios ? (
                        <div className="text-center py-6"><div className="animate-spin h-8 w-8 border-4 border-fuchsia-500 border-t-transparent rounded-full mx-auto"></div></div>
                    ) : horariosDisponiveis.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {horariosDisponiveis.map(h => (
                                <button
                                    key={h.getTime()}
                                    onClick={() => selecionarHorario(h)}
                                    className="py-2 px-1 bg-white border border-fuchsia-200 text-fuchsia-700 font-semibold rounded-lg hover:bg-fuchsia-600 hover:text-white transition-all shadow-sm hover:shadow-md text-sm"
                                >
                                    {h.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 py-4 bg-gray-50 rounded-lg">Nenhum horário livre nesta data.</p>
                    )}
                </div>
              </div>
            )}

            {/* ETAPA 5: CADASTRO E FINALIZAÇÃO */}
            {etapa === 5 && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Finalizar Agendamento</h2>
                
                <div className="bg-fuchsia-50 p-6 rounded-2xl mb-6 border border-fuchsia-100">
                  <h3 className="font-bold text-fuchsia-800 mb-4">Seus Dados</h3>
                  <div className="grid gap-4">
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-fuchsia-400" placeholder="Nome Completo" />
                    <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-fuchsia-400" placeholder="WhatsApp (DDD + Número)" />
                    <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} className="w-full p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-fuchsia-400" />
                    <div className="flex items-center gap-2 mt-2">
                        <input type="checkbox" checked={lembrarDados} onChange={e => setLembrarDados(e.target.checked)} className="text-fuchsia-600 rounded focus:ring-fuchsia-500" />
                        <label className="text-sm text-gray-600">Salvar meus dados para a próxima</label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={handleAdicionarMais} className="flex-1 py-3 border border-fuchsia-200 text-fuchsia-700 font-bold rounded-xl hover:bg-fuchsia-50 transition">
                        + Outro Serviço
                    </button>
                    <button onClick={finalizarAgendamento} disabled={isSubmitting} className="flex-[2] py-3 bg-fuchsia-600 text-white font-bold rounded-xl hover:bg-fuchsia-700 shadow-lg transition transform hover:-translate-y-1 disabled:opacity-50">
                        {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                    </button>
                </div>
              </div>
            )}

          </div>

          {/* COLUNA DIREITA (RESUMO) */}
          <div className="hidden lg:block w-80 shrink-0">
            <ResumoPedido 
              carrinho={carrinho} 
              itemAtual={{ servico: servicoSelecionado, profissional: profissionalSelecionado, data: dataSelecionada, horario: horarioSelecionado }} 
            />
          </div>

        </div>
      </div>
    </div>
  );
}

export default AgendarPage;