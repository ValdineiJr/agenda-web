import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import '/src/index.css';
import { Link } from 'react-router-dom'; 

import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css'; 

registerLocale('pt-BR', ptBR); 

// --- COMPONENTE DE SUCESSO (Completo com Profissional) ---
function TelaSucesso({ agendamento, servico, profissional, onNovoAgendamento }) {
  
  const dataFormatada = new Date(agendamento.data_hora_inicio).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const horaFormatada = new Date(agendamento.data_hora_inicio).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const numeroWhatsapp = '5519988136946'; 
  
  // Mensagem para o WhatsApp incluindo o Profissional
  const mensagemWhatsapp = 
    `Olá! Acabei de confirmar meu agendamento (ID: ${agendamento.id}):
    \n- Serviço: ${servico.nome}
    \n- Profissional: ${profissional ? profissional.nome : 'Não informado'}
    \n- Dia: ${dataFormatada}
    \n- Horário: ${horaFormatada}
    \n- Cliente: ${agendamento.nome_cliente}`;
  
  const linkWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagemWhatsapp)}`;

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto bg-gray-50 shadow-md rounded-lg mt-10 text-center animate-fade-in">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        Agendamento Confirmado!
      </h1>
      
      <div className="bg-fuchsia-100 border-l-4 border-fuchsia-500 p-4 rounded-md text-left">
        <p className="font-bold text-fuchsia-800">Guarde o ID do seu Agendamento!</p>
        <p className="text-sm text-fuchsia-700">Use este ID e seu telefone para consultar ou cancelar seu agendamento.</p>
        <p className="text-3xl font-bold text-fuchsia-900 text-center my-2">
          {agendamento.id}
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-inner text-left space-y-3 mt-6">
        <p><strong>Serviço:</strong> {servico.nome}</p>
        <p><strong>Profissional:</strong> {profissional ? profissional.nome : '-'}</p>
        <p><strong>Cliente:</strong> {agendamento.nome_cliente}</p>
        <p><strong>Data:</strong> {dataFormatada}</p>
        <p><strong>Horário:</strong> {horaFormatada}</p>
      </div>

      <a
        href={linkWhatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 block w-full p-4 rounded-lg text-white font-bold text-lg bg-green-500 hover:bg-green-600 transition-all"
      >
        Confirmar pelo WhatsApp
      </a>

      <Link 
        to="/consultar"
        className="mt-4 block text-sm text-fuchsia-600 hover:underline"
      >
        Consultar ou Cancelar meu Agendamento
      </Link>
      
      <button
        onClick={onNovoAgendamento}
        className="mt-2 text-sm text-gray-600 hover:underline"
      >
        Fazer um novo agendamento
      </button>
    </div>
  );
}

// --- COMPONENTE DE RESUMO LATERAL ---
function ResumoPedido({ servico, profissional, data, horario }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 sticky top-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Resumo do Pedido</h3>
      
      <div className="space-y-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Serviço</span>
          <span className="font-semibold text-gray-800 text-right">{servico ? servico.nome : '-'}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-500">Profissional</span>
          <span className="font-semibold text-gray-800 text-right">{profissional ? profissional.nome : '-'}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Data</span>
          <span className="font-semibold text-gray-800 text-right">
            {data ? data.toLocaleDateString('pt-BR') : '-'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Horário</span>
          <span className="font-semibold text-gray-800 text-right">
            {horario ? horario.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '-'}
          </span>
        </div>

        <div className="border-t pt-4 mt-2 flex justify-between items-center">
          <span className="text-gray-600 font-bold">Preço Total</span>
          <span className="text-2xl font-bold text-fuchsia-600">
            {servico ? `R$ ${servico.preco.toFixed(2)}` : 'R$ 0,00'}
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
  
  // --- ESTADOS DE SELEÇÃO ---
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState(null);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [horarioSelecionado, setHorarioSelecionado] = useState(null);
  
  // --- ESTADOS DE CONTROLE ---
  const [etapa, setEtapa] = useState(1); // 1:Categ/Serv, 2:Prof, 3:Data, 4:Hora, 5:Form
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfissionais, setIsLoadingProfissionais] = useState(false);
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState(null);
  
  // --- ESTADOS DO FORMULÁRIO ---
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [lembrarDados, setLembrarDados] = useState(false);
  
  const hoje = new Date();
  const umMesDepois = new Date();
  umMesDepois.setMonth(hoje.getMonth() + 1);

  // --- EFEITO 1: Carregar dados Iniciais e LocalStorage ---
  useEffect(() => {
    const carregarDados = async () => {
      // LocalStorage
      const nomeSalvo = localStorage.getItem('salao_cliente_nome');
      const telefoneSalvo = localStorage.getItem('salao_cliente_telefone');
      const nascimentoSalvo = localStorage.getItem('salao_cliente_nascimento');

      if (nomeSalvo || telefoneSalvo) {
        if (nomeSalvo) setNome(nomeSalvo);
        if (telefoneSalvo) setTelefone(telefoneSalvo);
        if (nascimentoSalvo) setDataNascimento(nascimentoSalvo);
        setLembrarDados(true);
      }

      // Categorias
      const { data: catData } = await supabase.from('categorias').select('*').order('nome');
      if (catData) setCategorias(catData);

      // Serviços (Todos)
      const { data: servData } = await supabase.from('servicos').select('*').order('nome');
      if (servData) setTodosServicos(servData);
    };
    carregarDados();
  }, []);

  // --- EFEITO 2: Filtrar Serviços quando muda Categoria ---
  useEffect(() => {
    if (categoriaSelecionada) {
      const filtrados = todosServicos.filter(s => s.categoria_id === categoriaSelecionada.id);
      setServicosFiltrados(filtrados);
    } else {
      setServicosFiltrados([]);
    }
  }, [categoriaSelecionada, todosServicos]);

  // --- EFEITO 3: Buscar Profissionais quando muda Serviço ---
  useEffect(() => {
    if (servicoSelecionado) {
      setProfissionais([]);
      setProfissionalSelecionado(null);
      setHorarioSelecionado(null);
      
      async function getProfissionais() {
        setIsLoadingProfissionais(true);
        const { data, error } = await supabase
          .from('profissionais_servicos')
          .select('profissionais ( id, nome )')
          .eq('servico_id', servicoSelecionado.id);
        
        if (error) console.error('Erro ao buscar profissionais:', error);
        else setProfissionais(data.map(item => item.profissionais));
        setIsLoadingProfissionais(false);
      }
      getProfissionais();
    }
  }, [servicoSelecionado]); 

  // --- FUNÇÃO DE BUSCAR HORÁRIOS (Segura e Imediata) ---
  // Aceita 'dataEspecifica' para ser chamada no clique do calendário
  async function buscarHorariosDisponiveis(dataEspecifica = null) {
    
    // Usa a data passada (do clique) ou a do estado
    const dataAlvo = dataEspecifica || dataSelecionada;
    
    console.log("Buscando horários para:", dataAlvo);

    setIsLoadingHorarios(true);
    setHorarioSelecionado(null);
    setHorariosDisponiveis([]);
    
    const diaDaSemana = dataAlvo.getDay();
    
    // 1. Verifica se o serviço atende nesse dia
    if (servicoSelecionado.dias_disponiveis && !servicoSelecionado.dias_disponiveis.includes(diaDaSemana)) {
      console.warn("Serviço fechado neste dia.");
      setIsLoadingHorarios(false);
      return; 
    }
    
    const duracaoServico = servicoSelecionado.duracao_minutos;
    
    // 2. Busca horário de trabalho do profissional
    const { data: horarioTrabalho, error: errorHorario } = await supabase
      .from('horarios_trabalho')
      .select('hora_inicio, hora_fim')
      .eq('dia_semana', diaDaSemana)
      .eq('profissional_id', profissionalSelecionado.id)
      .single();
      
    if (errorHorario || !horarioTrabalho) {
      console.warn("Profissional não trabalha neste dia.");
      setIsLoadingHorarios(false);
      return;
    }
    
    // 3. Busca agendamentos existentes (exceto cancelados)
    const inicioDoDia = new Date(dataAlvo).setHours(0, 0, 0, 0);
    const fimDoDia = new Date(dataAlvo).setHours(23, 59, 59, 999);
    const { data: agendamentos, error: errorAgendamentos } = await supabase
      .from('agendamentos')
      .select('data_hora_inicio, data_hora_fim')
      .gte('data_hora_inicio', new Date(inicioDoDia).toISOString())
      .lte('data_hora_fim', new Date(fimDoDia).toISOString())
      .eq('profissional_id', profissionalSelecionado.id)
      .neq('status', 'cancelado');
      
    if (errorAgendamentos) {
      console.error("Erro ao buscar agendamentos:", errorAgendamentos);
      setIsLoadingHorarios(false);
      return;
    }
    
    // 4. Calcula slots livres
    const slotsDisponiveis = [];
    const [horaInicio, minInicio] = horarioTrabalho.hora_inicio.split(':').map(Number);
    const [horaFim, minFim] = horarioTrabalho.hora_fim.split(':').map(Number);
    
    let slotAtual = new Date(dataAlvo).setHours(horaInicio, minInicio, 0, 0);
    const horarioFechamento = new Date(dataAlvo).setHours(horaFim, minFim, 0, 0);

    while (slotAtual < horarioFechamento) {
      const slotInicio = new Date(slotAtual);
      const slotFim = new Date(slotAtual + duracaoServico * 60000);
      
      if (slotFim.getTime() > horarioFechamento) break;
      
      // Não mostrar horários passados se for hoje
      const agora = new Date();
      if (slotInicio.getTime() < agora.getTime()) {
        slotAtual += duracaoServico * 60000;
        continue;
      }
      
      // Verifica colisões
      let ocupado = false;
      for (const ag of (agendamentos || [])) {
        const agInicio = new Date(ag.data_hora_inicio).getTime();
        const agFim = new Date(ag.data_hora_fim).getTime();
        
        const conflito = (slotInicio.getTime() >= agInicio && slotInicio.getTime() < agFim) || 
                         (slotFim.getTime() > agInicio && slotFim.getTime() <= agFim);
        if (conflito) { ocupado = true; break; }
      }
      
      if (!ocupado) {
        slotsDisponiveis.push(slotInicio);
      }
      
      slotAtual += duracaoServico * 60000;
    }
    
    console.log("Slots encontrados:", slotsDisponiveis.length);
    setHorariosDisponiveis(slotsDisponiveis);
    setIsLoadingHorarios(false);
  }

  // --- HANDLER DE DATA (CORRIGIDO) ---
  const handleDateChange = (date) => {
    setDataSelecionada(date);
    // CORREÇÃO CRUCIAL: Busca imediata com a nova data
    buscarHorariosDisponiveis(date); 
    setEtapa(4); // Avança tela
    window.scrollTo(0, 0);
  };

  // --- SALVAR AGENDAMENTO ---
  async function handleAgendamento() {
    const telefoneLimpo = telefone.replace(/[^0-9]/g, '');

    if (!nome || !telefoneLimpo || !dataNascimento) {
      alert('Por favor, preencha todos os campos: Nome, Telefone e Data de Nascimento.');
      return;
    }
    
    if (telefoneLimpo.length < 10) {
      alert('Telefone inválido. Por favor, inclua o DDD.');
      return;
    }
    
    setIsSubmitting(true);
    const dataHoraFim = new Date(
      horarioSelecionado.getTime() + servicoSelecionado.duracao_minutos * 60000
    );
    const novoAgendamento = {
      servico_id: servicoSelecionado.id,
      profissional_id: profissionalSelecionado.id, 
      nome_cliente: nome,
      email_cliente: null,
      telefone_cliente: telefoneLimpo,
      data_hora_inicio: horarioSelecionado.toISOString(),
      data_hora_fim: dataHoraFim.toISOString(),
      status: 'confirmado'
    };
    const { data: agendamentoData, error: agendamentoError } = await supabase
      .from('agendamentos')
      .insert(novoAgendamento)
      .select()
      .single();
      
    if (agendamentoError) {
      console.error('Erro ao salvar agendamento:', agendamentoError.message);
      alert('Ops! Ocorreu um erro ao agendar. Tente novamente.');
      setIsSubmitting(false);
    } else {
      // Salva cliente
      const dadosCliente = {
        telefone: telefoneLimpo,
        nome: nome,
        data_nascimento: dataNascimento
      };
      const { error: clienteError } = await supabase
        .from('clientes')
        .upsert(dadosCliente, { onConflict: 'telefone' });
      
      if (clienteError) console.warn('Aviso cliente:', clienteError.message);

      // Salva LocalStorage
      if (lembrarDados) {
        localStorage.setItem('salao_cliente_nome', nome);
        localStorage.setItem('salao_cliente_telefone', telefone); 
        localStorage.setItem('salao_cliente_nascimento', dataNascimento);
      } else {
        localStorage.removeItem('salao_cliente_nome');
        localStorage.removeItem('salao_cliente_telefone');
        localStorage.removeItem('salao_cliente_nascimento');
      }

      setAgendamentoConfirmado(agendamentoData);
      setIsSubmitting(false);
    }
  }

  // --- NAVEGAÇÃO DO WIZARD ---
  const avancarEtapa = () => {
    if (etapa === 1 && !servicoSelecionado) return alert('Selecione um serviço.');
    if (etapa === 2 && !profissionalSelecionado) return alert('Selecione um profissional.');
    if (etapa === 3 && !dataSelecionada) return alert('Selecione uma data.');
    if (etapa === 4 && !horarioSelecionado) return alert('Selecione um horário.');
    
    setEtapa(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const voltarEtapa = () => {
    if (etapa === 1 && categoriaSelecionada) {
      setCategoriaSelecionada(null);
      setServicoSelecionado(null);
    } else {
      setEtapa(prev => prev - 1);
    }
  };

  const resetarFormulario = () => {
    setCategoriaSelecionada(null);
    setServicoSelecionado(null);
    setProfissionais([]);
    setProfissionalSelecionado(null);
    setDataSelecionada(new Date());
    setHorarioSelecionado(null);
    setHorariosDisponiveis([]);
    setAgendamentoConfirmado(null);
    setEtapa(1);
  };

  const formatarHorario = (date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const filtrarDiaPorServico = (data) => {
    if (!servicoSelecionado) return true;
    if (!servicoSelecionado.dias_disponiveis) return true;
    const dia = data.getDay();
    return servicoSelecionado.dias_disponiveis.includes(dia);
  };

  // --- RENDERIZAÇÃO DAS ETAPAS ---
  const renderEtapa = () => {
    switch(etapa) {
      case 1: // CATEGORIA & SERVIÇO
        return (
          <div className="animate-fade-in">
            {!categoriaSelecionada ? (
              <>
                <h2 className="text-xl font-semibold mb-4">Selecione uma Categoria:</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {categorias.length > 0 ? categorias.map(cat => (
                    <div 
                      key={cat.id} 
                      onClick={() => setCategoriaSelecionada(cat)}
                      className="border rounded-lg p-4 cursor-pointer hover:border-fuchsia-500 hover:bg-fuchsia-50 transition text-center shadow-sm"
                    >
                      <img 
                        src={cat.foto_url || 'https://via.placeholder.com/100?text=?'} 
                        alt={cat.nome} 
                        className="w-20 h-20 rounded-full mx-auto mb-2 object-cover bg-gray-200"
                      />
                      <p className="font-bold text-gray-800">{cat.nome}</p>
                    </div>
                  )) : (
                    <p className="col-span-3 text-gray-500 text-center">Carregando categorias...</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Serviços de {categoriaSelecionada.nome}</h2>
                  <button onClick={() => setCategoriaSelecionada(null)} className="text-sm text-fuchsia-600 hover:underline">
                    Trocar Categoria
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {servicosFiltrados.map(serv => (
                    <div 
                      key={serv.id} 
                      onClick={() => setServicoSelecionado(serv)}
                      className={`border rounded-lg p-3 cursor-pointer flex items-center gap-3 transition-all hover:shadow-md
                        ${servicoSelecionado?.id === serv.id ? 'border-fuchsia-500 bg-fuchsia-50 ring-1 ring-fuchsia-500' : 'bg-white hover:bg-gray-50'}
                      `}
                    >
                      <img 
                        src={serv.foto_url || 'https://via.placeholder.com/60?text=✂️'} 
                        alt={serv.nome} 
                        className="w-16 h-16 rounded object-cover bg-gray-200"
                      />
                      <div>
                        <p className="font-bold text-gray-800">{serv.nome}</p>
                        <p className="text-xs text-gray-500">{serv.duracao_minutos} min | R$ {serv.preco.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {servicosFiltrados.length === 0 && (
                  <p className="text-gray-500 text-center mt-8">Nenhum serviço encontrado nesta categoria.</p>
                )}
              </>
            )}
          </div>
        );

      case 2: // PROFISSIONAL
        return (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold mb-4">Selecione o Profissional:</h2>
            {isLoadingProfissionais ? (
              <p className="text-center text-gray-500">Buscando profissionais...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {profissionais.map(prof => (
                  <div 
                    key={prof.id} 
                    onClick={() => setProfissionalSelecionado(prof)}
                    className={`p-4 border rounded-lg text-center cursor-pointer transition-all
                      ${profissionalSelecionado?.id === prof.id ? 'border-fuchsia-500 bg-fuchsia-50 ring-1 ring-fuchsia-500' : 'bg-white hover:bg-gray-50'}
                    `}
                  >
                    <div className="w-14 h-14 bg-fuchsia-200 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-fuchsia-700 text-xl">
                      {prof.nome.charAt(0)}
                    </div>
                    <p className="font-bold text-gray-800">{prof.nome}</p>
                  </div>
                ))}
                {profissionais.length === 0 && <p className="col-span-3 text-center text-gray-500">Nenhum profissional disponível.</p>}
              </div>
            )}
          </div>
        );

      case 3: // DATA
        return (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold mb-4">Selecione a Data:</h2>
            <div className="flex justify-center">
              <DatePicker
                selected={dataSelecionada}
                onChange={handleDateChange} 
                inline locale="pt-BR"
                minDate={hoje} maxDate={umMesDepois} 
                filterDate={filtrarDiaPorServico}
                wrapperClassName="w-full"
                calendarClassName="w-full"
              />
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">Clique na data para ver os horários.</p>
          </div>
        );

      case 4: // HORÁRIO
        return (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold mb-4">Selecione o Horário:</h2>
            <p className="mb-4 text-sm text-gray-600">Dia: <strong>{dataSelecionada.toLocaleDateString('pt-BR')}</strong></p>
            
            {isLoadingHorarios ? (
              <p className="text-center text-gray-500 py-10">
                <span className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-fuchsia-600 mr-2"></span>
                Buscando horários disponíveis...
              </p>
            ) : (
              <>
                {horariosDisponiveis.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {horariosDisponiveis.map(horario => (
                      <button
                        key={horario.getTime()}
                        onClick={() => setHorarioSelecionado(horario)}
                        className={`p-3 rounded-lg border text-center font-semibold transition-all
                          ${horarioSelecionado?.getTime() === horario.getTime() ? 'bg-fuchsia-600 text-white border-fuchsia-700' : 'bg-white hover:bg-gray-100'}
                        `}
                      >
                        {formatarHorario(horario)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-2">Nenhum horário livre para este dia.</p>
                    <button 
                      onClick={voltarEtapa}
                      className="text-fuchsia-600 underline hover:text-fuchsia-800"
                    >
                      Escolher outra data
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 5: // FORMULÁRIO FINAL
        return (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold mb-4">Seus Dados:</h2>
            
            {/* Resumo no Mobile (aparece aqui) */}
            <div className="lg:hidden mb-6">
              <ResumoPedido servico={servicoSelecionado} profissional={profissionalSelecionado} data={dataSelecionada} horario={horarioSelecionado} />
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                <input type="text" id="nome" value={nome} onChange={e => setNome(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 sm:text-sm p-2" placeholder="Seu nome" />
              </div>
              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
                <input type="tel" id="telefone" value={telefone} onChange={e => setTelefone(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 sm:text-sm p-2" placeholder="(11) 99999-9999" />
              </div>
              <div>
                <label htmlFor="nascimento" className="block text-sm font-medium text-gray-700">Data de Nascimento (Obrigatório)</label>
                <input type="date" id="nascimento" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2" />
              </div>
              <div className="flex items-center pt-2">
                <input id="lembrar" type="checkbox" checked={lembrarDados} onChange={e => setLembrarDados(e.target.checked)} className="h-4 w-4 text-fuchsia-600 border-gray-300 rounded" />
                <label htmlFor="lembrar" className="ml-2 block text-sm text-gray-900 cursor-pointer">Lembrar meus dados para a próxima vez</label>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  if (agendamentoConfirmado) {
    return (
      <TelaSucesso 
        agendamento={agendamentoConfirmado} 
        servico={servicoSelecionado} 
        // PASSANDO O PROFISSIONAL AQUI:
        profissional={profissionalSelecionado}
        onNovoAgendamento={resetarFormulario} 
      />
    );
  }

  // --- LAYOUT PRINCIPAL (WIZARD) ---
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto mt-4">
        <Link 
          to="/"
          className="text-fuchsia-600 hover:underline mb-4 block text-sm"
        >
          &larr; Voltar para o Início
        </Link>

        <h1 className="text-3xl font-bold text-fuchsia-600 mb-2 text-center md:text-left">
          Agendar Horário
        </h1>
        
        {/* Barra de Progresso */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
          <div 
            className="bg-fuchsia-600 h-2.5 rounded-full transition-all duration-500" 
            style={{ width: `${(etapa / 5) * 100}%` }}
          ></div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* ESQUERDA: Wizard */}
          <div className="flex-1 bg-white p-6 rounded-lg shadow-md min-h-[450px] flex flex-col justify-between">
            <div>{renderEtapa()}</div>
            
            {/* Botões de Navegação */}
            <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
              {/* Botão Voltar */}
              {(etapa > 1 || (etapa === 1 && categoriaSelecionada)) ? (
                <button 
                  onClick={voltarEtapa}
                  className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Voltar
                </button>
              ) : (
                <div></div> // Espaçador vazio para manter layout
              )}

              {/* Botão Próximo/Confirmar */}
              {etapa < 5 && etapa !== 3 ? (
                // Etapa 3 (Data) não tem botão "Próximo" manual, é automático
                <button 
                  onClick={avancarEtapa}
                  className="px-6 py-2 rounded-lg bg-fuchsia-600 text-white font-bold hover:bg-fuchsia-700 transition-colors shadow-md"
                >
                  Próximo &rarr;
                </button>
              ) : (
                etapa === 5 && (
                  <button
                    onClick={handleAgendamento}
                    disabled={isSubmitting}
                    className={`
                      px-8 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-md
                      ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                  </button>
                )
              )}
            </div>
          </div>

          {/* DIREITA: Resumo (Desktop) */}
          <div className="hidden lg:block w-1/3">
            <ResumoPedido servico={servicoSelecionado} profissional={profissionalSelecionado} data={dataSelecionada} horario={horarioSelecionado} />
          </div>

        </div>
      </div>
    </div>
  );
}

export default AgendarPage;