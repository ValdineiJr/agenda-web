import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import '/src/index.css';
import { Link } from 'react-router-dom'; 

import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css'; 

registerLocale('pt-BR', ptBR); 

// --- COMPONENTE DE SUCESSO (Como antes) ---
function TelaSucesso({ agendamento, servico, onNovoAgendamento }) {
  // ... (código 100% igual a antes) ...
  const dataFormatada = new Date(agendamento.data_hora_inicio).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const horaFormatada = new Date(agendamento.data_hora_inicio).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const numeroWhatsapp = '5519993562075';
  const mensagemWhatsapp = 
    `Olá! Acabei de confirmar meu agendamento (ID: ${agendamento.id}):
    \n- Serviço: ${servico.nome}
    \n- Dia: ${dataFormatada}
    \n- Horário: ${horaFormatada}
    \n- Cliente: ${agendamento.nome_cliente}`;
  const linkWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagemWhatsapp)}`;
  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto bg-gray-50 shadow-md rounded-lg mt-10 text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4"> Agendamento Confirmado! </h1>
      <div className="bg-fuchsia-100 border-l-4 border-fuchsia-500 p-4 rounded-md text-left">
        <p className="font-bold text-fuchsia-800">Guarde o ID do seu Agendamento!</p>
        <p className="text-sm text-fuchsia-700">Use este ID e seu telefone para consultar ou cancelar seu agendamento.</p>
        <p className="text-3xl font-bold text-fuchsia-900 text-center my-2"> {agendamento.id} </p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-inner text-left space-y-3 mt-6">
        <p><strong>Serviço:</strong> {servico.nome}</p>
        <p><strong>Cliente:</strong> {agendamento.nome_cliente}</p>
        <p><strong>Data:</strong> {dataFormatada}</p>
        <p><strong>Horário:</strong> {horaFormatada}</p>
      </div>
      <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer"
        className="mt-8 block w-full p-4 rounded-lg text-white font-bold text-lg bg-green-500 hover:bg-green-600 transition-all"
      > Confirmar pelo WhatsApp </a>
      <Link to="/consultar" className="mt-4 block text-sm text-fuchsia-600 hover:underline">
        Consultar ou Cancelar meu Agendamento
      </Link>
      <button onClick={onNovoAgendamento} className="mt-2 text-sm text-gray-600 hover:underline">
        Fazer um novo agendamento
      </button>
    </div>
  );
}


// --- COMPONENTE PRINCIPAL (MODIFICADO) ---
function AgendarPage() {
  const [servicos, setServicos] = useState([]);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState(null);
  const [isLoadingProfissionais, setIsLoadingProfissionais] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [horarioSelecionado, setHorarioSelecionado] = useState(null);
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  
  const hoje = new Date();
  const umMesDepois = new Date();
  umMesDepois.setMonth(hoje.getMonth() + 1);

  // 1. Busca os serviços ao carregar (MODIFICADO)
  useEffect(() => {
    async function getServicos() {
      // NOVO: Pede a coluna 'dias_disponiveis'
      const { data, error } = await supabase
        .from('servicos')
        .select('id, nome, duracao_minutos, preco, foto_url, dias_disponiveis'); 
        
      if (error) console.error('Erro ao buscar serviços:', error);
      else setServicos(data);
    }
    getServicos();
  }, []);

  // 2. Busca profissionais (Como antes)
  useEffect(() => {
    setProfissionais([]);
    setProfissionalSelecionado(null);
    setHorariosDisponiveis([]);
    setHorarioSelecionado(null);
    if (servicoSelecionado) {
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

  // 3. Busca horários (Como antes)
  useEffect(() => {
    if (servicoSelecionado && dataSelecionada && profissionalSelecionado) {
      buscarHorariosDisponiveis();
    }
  }, [dataSelecionada, servicoSelecionado, profissionalSelecionado]); 

  // buscarHorariosDisponiveis (Como antes)
  async function buscarHorariosDisponiveis() {
    // ... (Lógica 100% igual a antes) ...
    setIsLoadingHorarios(true);
    setHorarioSelecionado(null);
    setHorariosDisponiveis([]);
    const diaDaSemana = dataSelecionada.getDay();
    // NOVO: Checagem dupla (se o dia já não foi filtrado pelo calendário)
    if (servicoSelecionado.dias_disponiveis && !servicoSelecionado.dias_disponiveis.includes(diaDaSemana)) {
      console.warn('Profissional não trabalha neste dia (filtrado pelo serviço).');
      setIsLoadingHorarios(false);
      return; 
    }
    const duracaoServico = servicoSelecionado.duracao_minutos;
    const { data: horarioTrabalho, error: errorHorario } = await supabase
      .from('horarios_trabalho').select('hora_inicio, hora_fim')
      .eq('dia_semana', diaDaSemana).eq('profissional_id', profissionalSelecionado.id).single();
    if (errorHorario || !horarioTrabalho) {
      console.warn('Profissional não trabalha neste dia (filtrado pelo horário).');
      setIsLoadingHorarios(false);
      return;
    }
    const inicioDoDia = new Date(dataSelecionada).setHours(0, 0, 0, 0);
    const fimDoDia = new Date(dataSelecionada).setHours(23, 59, 59, 999);
    const { data: agendamentos, error: errorAgendamentos } = await supabase
      .from('agendamentos').select('data_hora_inicio, data_hora_fim')
      .gte('data_hora_inicio', new Date(inicioDoDia).toISOString())
      .lte('data_hora_fim', new Date(fimDoDia).toISOString())
      .eq('profissional_id', profissionalSelecionado.id);
    if (errorAgendamentos) {
      console.error('Erro ao buscar agendamentos:', errorAgendamentos);
      setIsLoadingHorarios(false);
      return;
    }
    const slotsDisponiveis = [];
    const [horaInicio, minInicio] = horarioTrabalho.hora_inicio.split(':').map(Number);
    const [horaFim, minFim] = horarioTrabalho.hora_fim.split(':').map(Number);
    let slotAtual = new Date(dataSelecionada).setHours(horaInicio, minInicio, 0, 0);
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
    setHorariosDisponiveis(slotsDisponiveis);
    setIsLoadingHorarios(false);
  }

  // handleAgendamento (Como antes)
  async function handleAgendamento() {
    // ... (Lógica 100% igual a antes) ...
    if (!nome || !telefone) {
      alert('Por favor, preencha seu Nome e Telefone.');
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
      telefone_cliente: telefone,
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
      const dadosCliente = {
        telefone: telefone,
        nome: nome,
        ...(dataNascimento && { data_nascimento: dataNascimento })
      };
      const { error: clienteError } = await supabase
        .from('clientes')
        .upsert(dadosCliente, { onConflict: 'telefone' });
      if (clienteError) {
        console.warn('Aviso: Agendamento salvo, mas falha ao salvar ficha do cliente:', clienteError.message);
      }
      setAgendamentoConfirmado(agendamentoData);
      setIsSubmitting(false);
    }
  }

  // resetarFormulario (Como antes)
  function resetarFormulario() {
    setServicoSelecionado(null);
    setProfissionais([]);
    setProfissionalSelecionado(null);
    setDataSelecionada(new Date());
    setHorarioSelecionado(null);
    setNome('');
    setTelefone('');
    setDataNascimento(''); 
    setHorariosDisponiveis([]);
    setAgendamentoConfirmado(null);
  }

  const formatarHorario = (date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // NOVO: A função de filtro para o calendário
  const filtrarDiaPorServico = (data) => {
    // Se nenhum serviço foi selecionado, permite todos os dias
    if (!servicoSelecionado) return true;
    
    // Se o serviço NÃO tiver um array (ex: serviço antigo), permite
    if (!servicoSelecionado.dias_disponiveis) return true;
    
    // Pega o dia da semana (0-6)
    const dia = data.getDay();
    
    // Retorna true (liberado) se o dia estiver no array
    return servicoSelecionado.dias_disponiveis.includes(dia);
  };

  if (agendamentoConfirmado) {
    return (
      <TelaSucesso 
        agendamento={agendamentoConfirmado}
        servico={servicoSelecionado}
        onNovoAgendamento={resetarFormulario}
      />
    );
  }

  // --- JSX (HTML) ---
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto bg-gray-50 shadow-md rounded-lg mt-10">
      
      <Link 
        to="/"
        className="text-fuchsia-600 hover:underline mb-4 block text-sm"
      >
        &larr; Voltar para o Início
      </Link>

      <h1 className="text-3xl font-bold text-fuchsia-600 mb-6 text-center">
        Agendar Horário
      </h1>
      
      {/* --- ETAPA 1: SERVIÇO (Como antes) --- */}
      <h2 className="text-xl font-semibold mb-3">1. Selecione um Serviço:</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {servicos.map((servico) => (
          <div 
            key={servico.id} 
            className={`
              rounded-lg border overflow-hidden cursor-pointer transition-all
              ${servicoSelecionado?.id === servico.id 
                ? 'border-fuchsia-500 ring-2 ring-fuchsia-300' 
                : 'border-gray-200 hover:border-gray-400'
              }
            `}
            onClick={() => setServicoSelecionado(servico)}
          >
            <img 
              src={servico.foto_url || 'https://api.iconify.design/solar:camera-minimalistic-bold.svg?color=%239ca3af'}
              alt={servico.nome}
              className="w-full h-32 object-cover bg-gray-100"
            />
            <div className={`p-3 ${servicoSelecionado?.id === servico.id ? 'bg-fuchsia-50' : 'bg-white'}`}>
              <h3 className="font-bold text-md text-gray-800 truncate">{servico.nome}</h3>
              <p className="text-xs text-gray-500">{servico.duracao_minutos} min | R$ {servico.preco.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
      {servicos.length === 0 && <p className="text-gray-500">Carregando serviços...</p>}


      {/* --- ETAPA 2: PROFISSIONAL (Como antes) --- */}
      {servicoSelecionado && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">2. Selecione o(a) Profissional:</h2>
          {isLoadingProfissionais && <div className="text-center text-gray-500">Buscando profissionais...</div>}
          {!isLoadingProfissionais && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {profissionais.map((prof) => (
                <div 
                  key={prof.id} 
                  className={`
                    p-4 border rounded-lg cursor-pointer transition-all
                    flex flex-col items-center justify-center h-24
                    ${profissionalSelecionado?.id === prof.id
                      ? 'bg-fuchsia-100 border-fuchsia-500 ring-2 ring-fuchsia-300' 
                      : 'bg-white hover:bg-gray-100'
                    }
                  `}
                  onClick={() => setProfissionalSelecionado(prof)}
                >
                  <h3 className="font-bold text-lg text-center">{prof.nome}</h3>
                </div>
              ))}
              {profissionais.length === 0 && (
                <div className="text-center text-gray-500 col-span-2">Nenhum profissional disponível para este serviço.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- ETAPA 3: DATA (MODIFICADA) --- */}
      {servicoSelecionado && profissionalSelecionado && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">3. Selecione a Data:</h2>
          <DatePicker
            selected={dataSelecionada}
            onChange={(date) => setDataSelecionada(date)}
            inline locale="pt-BR"
            minDate={hoje} maxDate={umMesDepois} 
            
            // NOVO: APLICA O FILTRO
            filterDate={filtrarDiaPorServico}
            
            wrapperClassName="w-full"
            calendarClassName="w-full"
          />
        </div>
      )}

      {/* --- ETAPA 4: HORÁRIO (Como antes) --- */}
      {servicoSelecionado && dataSelecionada && profissionalSelecionado && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">4. Selecione o Horário:</h2>
          {isLoadingHorarios && <div className="text-center text-gray-500">Buscando horários...</div>}
          {!isLoadingHorarios && horariosDisponiveis.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {horariosDisponiveis.map((horario) => (
                <button
                  key={horario.getTime()}
                  onClick={() => setHorarioSelecionado(horario)}
                  className={`p-3 rounded-lg border text-center font-semibold transition-all ${
                    horarioSelecionado?.getTime() === horario.getTime() ? 'bg-fuchsia-600 text-white border-fuchsia-700' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  {formatarHorario(horario)}
                </button>
              ))}
            </div>
          )}
          {!isLoadingHorarios && horariosDisponiveis.length === 0 && (
            <div className="text-center text-gray-500">Nenhum horário disponível para este dia.</div>
          )}
        </div>
      )}

      {/* --- ETAPA 5: SEUS DADOS (Como antes) --- */}
      {horarioSelecionado && (
        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">5. Preencha seus dados:</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome Completo</label>
              <input type="text" id="nome" value={nome} onChange={(e) => setNome(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 sm:text-sm p-2"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
              <input type="tel" id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-fuchsia-500 focus:ring-fuchsia-500 sm:text-sm p-2"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label htmlFor="nascimento" className="block text-sm font-medium text-gray-700">
                Data de Nascimento (Opcional)
              </label>
              <span className="text-xs text-gray-500">Usado para promoções de aniversário.</span>
              <input
                type="date"
                id="nascimento"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
              />
            </div>
          </div>
          <div className="mt-8">
            <button
              onClick={handleAgendamento}
              disabled={!nome || !telefone || isSubmitting}
              className={`
                w-full p-4 rounded-lg text-white font-bold text-lg transition-all
                ${!nome || !telefone || isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
                }
              `}
            >
              {isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default AgendarPage;