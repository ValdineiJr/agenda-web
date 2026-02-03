import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import '/src/index.css';
import { Link } from 'react-router-dom'; 

import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css'; 

registerLocale('pt-BR', ptBR); 

// --- COMPONENTE DE SUCESSO (Atualizado para Múltiplos Itens) ---
function TelaSucesso({ itensAgendados, cliente, onNovoAgendamento }) {
  const numeroWhatsapp = '5519988136946'; 
  
  // Monta mensagem detalhada para o WhatsApp
  let mensagemWhatsapp = `Olá! Acabei de realizar agendamentos no site:\n`;
  mensagemWhatsapp += `Cliente: ${cliente.nome}\n\n`;
  
  itensAgendados.forEach((item, index) => {
    const dataFormatada = new Date(item.data_hora_inicio).toLocaleDateString('pt-BR');
    const horaFormatada = new Date(item.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    mensagemWhatsapp += `*${index + 1}. ${item.servico_nome}*\n`;
    mensagemWhatsapp += `   Profissional: ${item.profissional_nome || 'Indiferente'}\n`;
    mensagemWhatsapp += `   Data: ${dataFormatada} às ${horaFormatada}\n`;
    mensagemWhatsapp += `   ID: ${item.id}\n\n`;
  });

  const linkWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagemWhatsapp)}`;

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto bg-gray-50 shadow-md rounded-lg mt-10 text-center animate-fade-in">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🎉</span>
      </div>
      <h1 className="text-3xl font-bold text-green-600 mb-2">
        Tudo Certo!
      </h1>
      <p className="text-gray-600 mb-6">Seus agendamentos foram confirmados com sucesso.</p>
      
      <div className="bg-white border border-gray-200 rounded-lg text-left overflow-hidden shadow-sm mb-6">
        <div className="bg-fuchsia-50 p-3 border-b border-fuchsia-100">
          <p className="font-bold text-fuchsia-800 text-sm text-center">Resumo dos Agendamentos</p>
        </div>
        <div className="p-4 space-y-4 max-h-60 overflow-y-auto">
          {itensAgendados.map((item, idx) => (
            <div key={idx} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
              <p className="font-bold text-gray-800">{item.servico_nome}</p>
              <p className="text-sm text-gray-600">
                {new Date(item.data_hora_inicio).toLocaleDateString('pt-BR')} às {new Date(item.data_hora_inicio).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
              </p>
              <p className="text-xs text-gray-500">Prof: {item.profissional_nome || '-'}</p>
              <p className="text-xs text-fuchsia-600 font-mono mt-1">ID: {item.id}</p>
            </div>
          ))}
        </div>
      </div>

      <a
        href={linkWhatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full p-4 rounded-lg text-white font-bold text-lg bg-green-500 hover:bg-green-600 transition-all shadow-lg transform hover:-translate-y-1"
      >
        Enviar Comprovante no WhatsApp
      </a>

      <div className="mt-6 flex flex-col gap-3">
        <Link to="/consultar" className="text-sm text-fuchsia-600 hover:underline">
          Consultar meus agendamentos
        </Link>
        <button onClick={onNovoAgendamento} className="text-sm text-gray-500 hover:text-gray-700">
          Voltar para o início
        </button>
      </div>
    </div>
  );
}

// --- COMPONENTE DE RESUMO LATERAL (Carrinho) ---
function ResumoPedido({ carrinho, itemAtual }) {
  // Calcula total do carrinho + item atual (se tiver selecionado)
  const itensParaMostrar = [...carrinho];
  if (itemAtual && itemAtual.servico) {
    itensParaMostrar.push(itemAtual);
  }

  const total = itensParaMostrar.reduce((acc, item) => acc + (item.servico?.preco || 0), 0);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 sticky top-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
        <span>Resumo</span>
        <span className="text-xs font-normal bg-fuchsia-100 text-fuchsia-800 px-2 py-1 rounded-full">
          {itensParaMostrar.length} {itensParaMostrar.length === 1 ? 'item' : 'itens'}
        </span>
      </h3>
      
      <div className="space-y-4">
        {itensParaMostrar.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-4">Seu carrinho está vazio.</p>
        ) : (
          itensParaMostrar.map((item, idx) => (
            <div key={idx} className="text-sm border-b border-gray-50 pb-3 last:border-0 relative group">
              <div className="flex justify-between font-semibold text-gray-700">
                <span>{item.servico?.nome}</span>
                <span>R$ {item.servico?.preco.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex flex-col gap-0.5">
                <span>📅 {item.data ? item.data.toLocaleDateString('pt-BR') : '...'}</span>
                <span>⏰ {item.horario ? item.horario.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '...'}</span>
                <span>👤 {item.profissional ? item.profissional.nome : 'Qualquer Profissional'}</span>
              </div>
              {/* Indicador de item atual (ainda não adicionado) */}
              {item === itemAtual && (
                <span className="absolute top-0 right-0 -mt-2 -mr-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-fuchsia-500"></span>
                </span>
              )}
            </div>
          ))
        )}

        <div className="border-t pt-4 mt-2 flex justify-between items-center">
          <span className="text-gray-600 font-bold">Total</span>
          <span className="text-2xl font-bold text-fuchsia-600">
            R$ {total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
function AgendarPage() {
  // --- ESTADOS DE DADOS ---
  const [categorias, setCategorias] = useState([]);
  const [todosServicos, setTodosServicos] = useState([]);
  const [servicosFiltrados, setServicosFiltrados] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  
  // --- ESTADOS DO CARRINHO E SELEÇÃO ATUAL ---
  const [carrinho, setCarrinho] = useState([]); // Lista de agendamentos prontos para salvar
  
  // Seleção atual (temporária antes de ir pro carrinho)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState(null);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [horarioSelecionado, setHorarioSelecionado] = useState(null);
  
  // --- ESTADOS DE CONTROLE ---
  const [etapa, setEtapa] = useState(1); // 1:Categ/Serv, 2:Prof, 3:Data, 4:Hora, 5:Revisão/Dados
  const [isLoadingProfissionais, setIsLoadingProfissionais] = useState(false);
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sucessoDados, setSucessoDados] = useState(null); // Objeto com dados finais para tela de sucesso
  
  // --- ESTADOS DO FORMULÁRIO ---
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [lembrarDados, setLembrarDados] = useState(false);
  
  const hoje = new Date();
  const limiteFuturo = new Date();
  limiteFuturo.setMonth(hoje.getMonth() + 3); // Permitir agendamento até 3 meses

  // --- 1. CARREGAMENTO INICIAL ---
  useEffect(() => {
    const init = async () => {
      // Carregar LocalStorage
      const nomeS = localStorage.getItem('salao_cliente_nome');
      const telS = localStorage.getItem('salao_cliente_telefone');
      const nascS = localStorage.getItem('salao_cliente_nascimento');
      if (nomeS) setNome(nomeS);
      if (telS) setTelefone(telS);
      if (nascS) setDataNascimento(nascS);
      if (nomeS) setLembrarDados(true);

      // Carregar Banco
      const [catRes, servRes] = await Promise.all([
        supabase.from('categorias').select('*').order('nome'),
        supabase.from('servicos').select('*').order('nome')
      ]);

      if (catRes.data) setCategorias(catRes.data);
      if (servRes.data) setTodosServicos(servRes.data);
    };
    init();
  }, []);

  // --- 2. FILTRAR SERVIÇOS ---
  useEffect(() => {
    if (categoriaSelecionada) {
      setServicosFiltrados(todosServicos.filter(s => s.categoria_id === categoriaSelecionada.id));
    } else {
      setServicosFiltrados([]);
    }
  }, [categoriaSelecionada, todosServicos]);

  // --- 3. BUSCAR PROFISSIONAIS ---
  useEffect(() => {
    if (servicoSelecionado) {
      setProfissionais([]);
      setProfissionalSelecionado(null);
      setHorarioSelecionado(null);
      
      const loadProfs = async () => {
        setIsLoadingProfissionais(true);
        const { data, error } = await supabase
          .from('profissionais_servicos')
          .select('profissionais ( id, nome )')
          .eq('servico_id', servicoSelecionado.id);
        
        if (!error && data) {
          setProfissionais(data.map(d => d.profissionais));
        }
        setIsLoadingProfissionais(false);
      };
      loadProfs();
    }
  }, [servicoSelecionado]);

  // --- 4. LÓGICA DE HORÁRIOS (OTIMIZADA) ---
  async function buscarHorariosDisponiveis(dataAlvo = dataSelecionada) {
    if (!servicoSelecionado || !profissionalSelecionado) return;

    setIsLoadingHorarios(true);
    setHorarioSelecionado(null);
    setHorariosDisponiveis([]);

    try {
      const diaDaSemana = dataAlvo.getDay();
      const dataISO = dataAlvo.toISOString().split('T')[0];

      // A. Validação de Dia
      let diaValido = true;
      // 1. Datas Específicas
      if (servicoSelecionado.datas_especificas?.length > 0) {
        if (!servicoSelecionado.datas_especificas.includes(dataISO)) diaValido = false;
      } 
      // 2. Dias da Semana
      else if (servicoSelecionado.dias_disponiveis?.length > 0) {
        if (!servicoSelecionado.dias_disponiveis.includes(diaDaSemana)) diaValido = false;
      }

      if (!diaValido) {
        setIsLoadingHorarios(false);
        return; 
      }

      // B. Horário do Profissional
      const { data: jornada, error: errJornada } = await supabase
        .from('horarios_trabalho')
        .select('hora_inicio, hora_fim')
        .eq('dia_semana', diaDaSemana)
        .eq('profissional_id', profissionalSelecionado.id)
        .maybeSingle(); // maybeSingle evita erro 406 se não achar

      if (errJornada || !jornada) {
        setIsLoadingHorarios(false);
        return; // Profissional não trabalha nesse dia
      }

      // C. Agendamentos Existentes
      const inicioDia = new Date(dataAlvo); inicioDia.setHours(0,0,0,0);
      const fimDia = new Date(dataAlvo); fimDia.setHours(23,59,59,999);

      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('data_hora_inicio, data_hora_fim')
        .gte('data_hora_inicio', inicioDia.toISOString())
        .lte('data_hora_fim', fimDia.toISOString())
        .eq('profissional_id', profissionalSelecionado.id)
        .neq('status', 'cancelado');

      // D. Cálculo de Slots
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

        // Regra: Não mostrar passado
        if (atual > agora) {
          // Regra: Colisão
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
      console.error("Erro ao calcular horários:", err);
    } finally {
      setIsLoadingHorarios(false);
    }
  }

  // --- GERENCIAMENTO DE NAVEGAÇÃO E CARRINHO ---

  const adicionarAoCarrinho = () => {
    if (!servicoSelecionado || !profissionalSelecionado || !dataSelecionada || !horarioSelecionado) return;

    const novoItem = {
      tempId: Date.now(), // ID temporário para UI
      servico: servicoSelecionado,
      profissional: profissionalSelecionado,
      data: dataSelecionada,
      horario: horarioSelecionado
    };

    setCarrinho([...carrinho, novoItem]);
    
    // Limpa seleção atual
    setCategoriaSelecionada(null);
    setServicoSelecionado(null);
    setProfissionalSelecionado(null);
    setHorarioSelecionado(null);
    
    // Vai para a tela de revisão (Etapa 5)
    setEtapa(5);
  };

  const removerDoCarrinho = (index) => {
    const novoCarrinho = [...carrinho];
    novoCarrinho.splice(index, 1);
    setCarrinho(novoCarrinho);
    if (novoCarrinho.length === 0) {
      // Se esvaziar, volta para o início
      setEtapa(1);
    }
  };

  const handleAdicionarMais = () => {
    if (carrinho.length >= 3) {
      alert("Para garantir a qualidade, permitimos agendar no máximo 3 serviços por vez.");
      return;
    }
    setEtapa(1); // Volta para escolher outro serviço
  };

  const finalizarAgendamento = async () => {
    // Validação
    const telefoneLimpo = telefone.replace(/[^0-9]/g, '');
    if (!nome || telefoneLimpo.length < 10 || !dataNascimento) {
      alert('Preencha Nome, Telefone (com DDD) e Data de Nascimento.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Salvar/Atualizar Cliente
      await supabase.from('clientes').upsert({
        telefone: telefoneLimpo,
        nome: nome,
        data_nascimento: dataNascimento
      }, { onConflict: 'telefone' });

      // 2. Salvar Preferências Locais
      if (lembrarDados) {
        localStorage.setItem('salao_cliente_nome', nome);
        localStorage.setItem('salao_cliente_telefone', telefone);
        localStorage.setItem('salao_cliente_nascimento', dataNascimento);
      } else {
        localStorage.removeItem('salao_cliente_nome');
        localStorage.removeItem('salao_cliente_telefone');
        localStorage.removeItem('salao_cliente_nascimento');
      }

      // 3. Processar Agendamentos em Paralelo (Promise.all)
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
      
      // Verifica erros
      const erros = resultados.filter(r => r.error);
      if (erros.length > 0) throw new Error("Erro ao salvar alguns itens.");

      // Sucesso!
      const agendamentosConfirmados = resultados.map((r, index) => ({
        ...r.data,
        servico_nome: carrinho[index].servico.nome,
        profissional_nome: carrinho[index].profissional.nome
      }));

      setSucessoDados({
        itens: agendamentosConfirmados,
        cliente: { nome }
      });

    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao processar seu agendamento. Tente novamente ou entre em contato.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERIZAÇÃO DAS ETAPAS ---
  
  if (sucessoDados) {
    return (
      <TelaSucesso 
        itensAgendados={sucessoDados.itens} 
        cliente={sucessoDados.cliente}
        onNovoAgendamento={() => window.location.reload()} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto mt-4">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="text-fuchsia-600 hover:underline text-sm font-bold flex items-center gap-1">
            <span>&larr;</span> Início
          </Link>
          {carrinho.length > 0 && (
            <span className="text-xs bg-fuchsia-100 text-fuchsia-800 px-3 py-1 rounded-full font-bold">
              {carrinho.length} serviço(s) no carrinho
            </span>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* ÁREA PRINCIPAL (WIZARD) */}
          <div className="flex-1 bg-white p-6 rounded-lg shadow-md min-h-[500px]">
            
            {/* ETAPA 1: CATEGORIA E SERVIÇO */}
            {etapa === 1 && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">O que vamos fazer hoje?</h2>
                
                {!categoriaSelecionada ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {categorias.map(cat => (
                      <button 
                        key={cat.id} 
                        onClick={() => setCategoriaSelecionada(cat)}
                        className="group border rounded-xl p-4 hover:border-fuchsia-500 hover:bg-fuchsia-50 transition-all text-center shadow-sm"
                      >
                        <img 
                          src={cat.foto_url || 'https://via.placeholder.com/100?text=?'} 
                          alt={cat.nome} 
                          className="w-20 h-20 rounded-full mx-auto mb-3 object-cover bg-gray-100 group-hover:scale-110 transition-transform"
                        />
                        <p className="font-bold text-gray-700 group-hover:text-fuchsia-700">{cat.nome}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg text-fuchsia-700">{categoriaSelecionada.nome}</h3>
                      <button onClick={() => setCategoriaSelecionada(null)} className="text-sm text-gray-500 hover:text-gray-800">Alterar Categoria</button>
                    </div>
                    <div className="space-y-3">
                      {servicosFiltrados.map(serv => (
                        <div 
                          key={serv.id} 
                          onClick={() => { setServicoSelecionado(serv); setEtapa(2); }}
                          className="border p-4 rounded-lg cursor-pointer hover:border-fuchsia-500 hover:bg-fuchsia-50 flex justify-between items-center transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center text-fuchsia-600 font-bold group-hover:bg-fuchsia-200">
                              {serv.nome.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{serv.nome}</p>
                              <p className="text-xs text-gray-500">{serv.duracao_minutos} min</p>
                            </div>
                          </div>
                          <span className="font-bold text-fuchsia-600">R$ {serv.preco.toFixed(2)}</span>
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
                <button onClick={() => setEtapa(1)} className="text-sm text-gray-400 mb-4 hover:text-gray-600">&larr; Voltar</button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Escolha o Profissional</h2>
                
                {isLoadingProfissionais ? (
                  <div className="text-center py-10 text-gray-500">Carregando equipe...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {profissionais.map(prof => (
                      <button 
                        key={prof.id} 
                        onClick={() => { setProfissionalSelecionado(prof); setEtapa(3); }}
                        className="p-4 border rounded-xl hover:border-fuchsia-500 hover:bg-fuchsia-50 transition-all text-center"
                      >
                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold text-gray-600">
                          {prof.nome.charAt(0)}
                        </div>
                        <p className="font-bold text-gray-700">{prof.nome}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 3: DATA */}
            {etapa === 3 && (
              <div className="animate-fade-in">
                <button onClick={() => setEtapa(2)} className="text-sm text-gray-400 mb-4 hover:text-gray-600">&larr; Voltar</button>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Qual o melhor dia?</h2>
                
                <div className="flex justify-center mt-6">
                  <DatePicker
                    selected={dataSelecionada}
                    onChange={(date) => {
                      setDataSelecionada(date);
                      buscarHorariosDisponiveis(date);
                      setEtapa(4);
                    }}
                    inline locale="pt-BR"
                    minDate={hoje} maxDate={limiteFuturo}
                    filterDate={(date) => {
                      // Filtro dias da semana se configurado
                      if (servicoSelecionado?.dias_disponiveis?.length > 0) {
                        return servicoSelecionado.dias_disponiveis.includes(date.getDay());
                      }
                      return true;
                    }}
                    // Filtro datas específicas se configurado
                    includeDates={servicoSelecionado?.datas_especificas?.map(d => {
                       const [y, m, day] = d.split('-');
                       return new Date(y, m-1, day);
                    })}
                  />
                </div>
              </div>
            )}

            {/* ETAPA 4: HORÁRIO */}
            {etapa === 4 && (
              <div className="animate-fade-in">
                <button onClick={() => setEtapa(3)} className="text-sm text-gray-400 mb-4 hover:text-gray-600">&larr; Voltar</button>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Horários Disponíveis</h2>
                <p className="text-gray-500 mb-6 capitalize">{dataSelecionada.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

                {isLoadingHorarios ? (
                  <div className="text-center py-10"><span className="animate-spin text-2xl">⏳</span></div>
                ) : horariosDisponiveis.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {horariosDisponiveis.map(h => (
                      <button
                        key={h.getTime()}
                        onClick={() => {
                          setHorarioSelecionado(h);
                          // Aqui adicionamos ao carrinho e vamos para revisão
                          // O usuário clica no horário e já adiciona
                          const novoItem = {
                            tempId: Date.now(),
                            servico: servicoSelecionado,
                            profissional: profissionalSelecionado,
                            data: dataSelecionada,
                            horario: h
                          };
                          setCarrinho(prev => [...prev, novoItem]);
                          // Limpa seleção temporária
                          setCategoriaSelecionada(null);
                          setServicoSelecionado(null);
                          setProfissionalSelecionado(null);
                          setHorarioSelecionado(null);
                          setEtapa(5);
                        }}
                        className="py-3 px-2 border rounded-lg hover:bg-fuchsia-600 hover:text-white hover:border-fuchsia-600 transition-colors font-semibold text-gray-700"
                      >
                        {h.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center bg-gray-50 p-8 rounded-lg">
                    <p className="text-gray-500">Sem horários livres nesta data.</p>
                    <button onClick={() => setEtapa(3)} className="text-fuchsia-600 underline mt-2">Escolher outro dia</button>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 5: REVISÃO E FINALIZAÇÃO */}
            {etapa === 5 && (
              <div className="animate-fade-in space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Revisão do Pedido</h2>
                  
                  {/* Lista de Itens no Carrinho (Editável) */}
                  <div className="space-y-3">
                    {carrinho.map((item, idx) => (
                      <div key={item.tempId} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div>
                          <p className="font-bold text-gray-800">{item.servico.nome}</p>
                          <p className="text-sm text-gray-600">
                            {item.data.toLocaleDateString('pt-BR')} às {item.horario.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                          </p>
                          <p className="text-xs text-gray-500">{item.profissional.nome}</p>
                        </div>
                        <button 
                          onClick={() => removerDoCarrinho(idx)}
                          className="text-red-500 hover:text-red-700 text-sm font-semibold px-3 py-1"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Botão para Adicionar Mais */}
                  <div className="mt-4">
                    <button 
                      onClick={handleAdicionarMais}
                      className="text-fuchsia-600 font-bold hover:bg-fuchsia-50 px-4 py-2 rounded-lg border border-dashed border-fuchsia-300 w-full"
                    >
                      + Adicionar outro serviço
                    </button>
                  </div>
                </div>

                {/* Formulário do Cliente */}
                <div className="bg-white border-t pt-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Seus Dados</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                      <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-fuchsia-500 outline-none" placeholder="Digite seu nome" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
                      <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-fuchsia-500 outline-none" placeholder="(00) 00000-0000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                      <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-fuchsia-500 outline-none" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="lembrar" checked={lembrarDados} onChange={e => setLembrarDados(e.target.checked)} className="text-fuchsia-600 rounded focus:ring-fuchsia-500" />
                      <label htmlFor="lembrar" className="text-sm text-gray-600">Lembrar meus dados</label>
                    </div>
                  </div>
                </div>

                {/* Botão Final */}
                <button
                  onClick={finalizarAgendamento}
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transform transition-all
                    ${isSubmitting ? 'bg-gray-400 cursor-wait' : 'bg-green-600 hover:bg-green-700 hover:scale-[1.02]'}
                  `}
                >
                  {isSubmitting ? 'Confirmando...' : `Confirmar Agendamento (R$ ${carrinho.reduce((a,b)=>a+b.servico.preco,0).toFixed(2)})`}
                </button>
              </div>
            )}

          </div>

          {/* COLUNA DIREITA (Resumo fixo Desktop) */}
          <div className="hidden lg:block w-1/3">
            <ResumoPedido 
              carrinho={carrinho} 
              itemAtual={{
                servico: servicoSelecionado,
                profissional: profissionalSelecionado,
                data: dataSelecionada,
                horario: horarioSelecionado
              }} 
            />
          </div>

        </div>
      </div>
    </div>
  );
}

export default AgendarPage;