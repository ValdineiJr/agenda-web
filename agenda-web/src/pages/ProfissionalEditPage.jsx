import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { supabase } from '/src/supabaseClient.js';

// NOVO: Array para os dias da semana
const DIAS_DA_SEMANA = [
  { numero: 0, nome: 'Domingo' },
  { numero: 1, nome: 'Segunda-feira' },
  { numero: 2, nome: 'Terça-feira' },
  { numero: 3, nome: 'Quarta-feira' },
  { numero: 4, nome: 'Quinta-feira' },
  { numero: 5, nome: 'Sexta-feira' },
  { numero: 6, nome: 'Sábado' },
];

function ProfissionalEditPage() {
  const { id } = useParams(); // Pega o ID da profissional
  
  // States da profissional e serviços (como antes)
  const [profissional, setProfissional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todosServicos, setTodosServicos] = useState([]);
  const [servicosSelecionados, setServicosSelecionados] = useState(new Set());
  const [loadingServicos, setLoadingServicos] = useState(true);

  // NOVO: State para os horários de trabalho
  const [horarios, setHorarios] = useState(null); // Vai guardar { 0: {id, ...}, 1: {id, ...}, ... }
  const [loadingHorarios, setLoadingHorarios] = useState(true);

  // useEffect para buscar TODOS os dados ao carregar
  useEffect(() => {
    async function fetchDados() {
      setLoading(true);
      setLoadingServicos(true);
      setLoadingHorarios(true); // NOVO

      // --- 1. Busca os dados da profissional (como antes) ---
      const { data: profData, error: profError } = await supabase
        .from('profissionais')
        .select('*')
        .eq('id', id)
        .single();

      if (profError) {
        console.error('Erro ao buscar profissional:', profError);
        setError('Não foi possível carregar os dados da profissional.');
        setLoading(false);
        setLoadingServicos(false);
        setLoadingHorarios(false); // NOVO
        return;
      }
      setProfissional(profData);
      setLoading(false);

      // --- 2. Busca TODOS os serviços do salão (como antes) ---
      const { data: todosServicosData, error: todosServicosError } = await supabase
        .from('servicos')
        .select('id, nome');
      
      if (todosServicosError) {
        console.error('Erro ao buscar todos os serviços:', todosServicosError);
        setError('Erro ao carregar lista de serviços.');
        setLoadingServicos(false);
        return;
      }
      setTodosServicos(todosServicosData);

      // --- 3. Busca os serviços que ESTA profissional já faz (como antes) ---
      const { data: servicosAtuaisData, error: servicosAtuaisError } = await supabase
        .from('profissionais_servicos')
        .select('servico_id')
        .eq('profissional_id', id);

      if (servicosAtuaisError) {
        console.error('Erro ao buscar serviços da profissional:', servicosAtuaisError);
      } else {
        const idSet = new Set(servicosAtuaisData.map(item => item.servico_id));
        setServicosSelecionados(idSet);
      }
      setLoadingServicos(false);

      // --- 4. NOVO: Busca os horários de trabalho DESTA profissional ---
      const { data: horariosData, error: horariosError } = await supabase
        .from('horarios_trabalho')
        .select('*')
        .eq('profissional_id', id);
      
      if (horariosError) {
        console.error('Erro ao buscar horários:', horariosError);
        setError('Erro ao carregar horários de trabalho.');
      } else {
        // Converte o array de horários em um "mapa" (objeto)
        // para ser fácil de acessar (ex: horariosMap[3] é Quarta)
        const horariosMap = {};
        DIAS_DA_SEMANA.forEach(dia => {
          const horarioSalvo = horariosData.find(h => h.dia_semana === dia.numero);
          if (horarioSalvo) {
            // Se achou no banco, usa os dados
            horariosMap[dia.numero] = {
              id: horarioSalvo.id,
              hora_inicio: horarioSalvo.hora_inicio,
              hora_fim: horarioSalvo.hora_fim,
              ativo: true
            };
          } else {
            // Se não achou, usa valores padrão (inativo)
            horariosMap[dia.numero] = {
              id: null,
              hora_inicio: '09:00:00',
              hora_fim: '18:00:00',
              ativo: false
            };
          }
        });
        setHorarios(horariosMap);
      }
      setLoadingHorarios(false);
    }

    fetchDados();
  }, [id]); // O [id] faz isso rodar sempre que o ID na URL mudar

  // Função para salvar serviços (como antes)
  const handleServicoToggle = async (servicoId) => {
    const novosServicos = new Set(servicosSelecionados);
    if (novosServicos.has(servicoId)) {
      novosServicos.delete(servicoId);
      const { error } = await supabase
        .from('profissionais_servicos')
        .delete()
        .eq('profissional_id', id)
        .eq('servico_id', servicoId);
      if (error) alert('Erro ao remover serviço.');
      else setServicosSelecionados(novosServicos);
    } else {
      novosServicos.add(servicoId);
      const { error } = await supabase
        .from('profissionais_servicos')
        .insert({ profissional_id: id, servico_id: servicoId });
      if (error) alert('Erro ao adicionar serviço.');
      else setServicosSelecionados(novosServicos);
    }
  };

  // --- 5. NOVO: Funções para alterar os horários ---

  // Altera qualquer campo (ativo, hora_inicio, hora_fim) de um dia
  const handleHorarioChange = (diaNum, campo, valor) => {
    setHorarios(prevHorarios => ({
      ...prevHorarios,
      [diaNum]: {
        ...prevHorarios[diaNum],
        [campo]: valor
      }
    }));
  };

  // Salva o horário de um dia específico no Supabase
  const handleHorarioSave = async (diaNum) => {
    const horarioDoDia = horarios[diaNum];
    
    // Lógica:
    // 1. Se "ativo" está MARCADO e ID NÃO EXISTE: INSERT
    // 2. Se "ativo" está MARCADO e ID EXISTE: UPDATE
    // 3. Se "ativo" está DESMARCADO e ID EXISTE: DELETE
    // 4. Se "ativo" está DESMARCADO e ID NÃO EXISTE: Faz nada

    try {
      if (horarioDoDia.ativo) {
        // User quer salvar (INSERT ou UPDATE)
        const dataToSave = {
          profissional_id: id,
          dia_semana: diaNum,
          hora_inicio: horarioDoDia.hora_inicio,
          hora_fim: horarioDoDia.hora_fim
        };

        if (horarioDoDia.id) {
          // UPDATE (já existe no banco)
          const { error } = await supabase.from('horarios_trabalho').update(dataToSave).eq('id', horarioDoDia.id);
          if (error) throw error;
        } else {
          // INSERT (novo no banco)
          const { data, error } = await supabase.from('horarios_trabalho').insert(dataToSave).select().single();
          if (error) throw error;
          // Salva o novo ID no estado
          handleHorarioChange(diaNum, 'id', data.id);
        }
        alert(`Horário de ${DIAS_DA_SEMANA[diaNum].nome} salvo!`);

      } else {
        // User quer desativar (DELETE)
        if (horarioDoDia.id) {
          // Só deleta se existir no banco
          const { error } = await supabase.from('horarios_trabalho').delete().eq('id', horarioDoDia.id);
          if (error) throw error;
          // Limpa o ID do estado
          handleHorarioChange(diaNum, 'id', null);
          alert(`Horário de ${DIAS_DA_SEMANA[diaNum].nome} removido!`);
        }
        // Se não tem ID e não está ativo, não faz nada.
      }
    } catch (error) {
      console.error('Erro ao salvar horário:', error);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  // --- Renderização ---
  if (loading || !profissional) {
    return <div className="max-w-4xl mx-auto"><p>Carregando...</p></div>;
  }
  if (error) {
    return <div className="max-w-4xl mx-auto"><p className="text-red-600">{error}</p></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Link para Voltar */}
      <Link 
        to="/admin/profissionais"
        className="text-blue-600 hover:underline"
      >
        &larr; Voltar para a lista de profissionais
      </Link>

      {/* Título Principal (com o nome real) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Editar Profissional
        </h1>
        <p className="text-2xl font-semibold">{profissional.nome}</p>
        <p className="text-gray-600">{profissional.email}</p>
      </div>
      
      {/* Seção de Serviços (Como antes) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Gerenciar Serviços</h2>
        {loadingServicos ? ( <p>Carregando serviços...</p> ) : (
          <div className="space-y-3">
            {todosServicos.map((servico) => (
              <label key={servico.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={servicosSelecionados.has(servico.id)}
                  onChange={() => handleServicoToggle(servico.id)}
                />
                <span className="ml-3 text-lg text-gray-700">{servico.nome}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      
      {/* NOVO: Seção de Horários (Agora é real) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Gerenciar Horários de Trabalho</h2>
        
        {loadingHorarios || !horarios ? (
          <p>Carregando horários...</p>
        ) : (
          <div className="space-y-6">
            {/* Mapeia os 7 dias da semana */}
            {DIAS_DA_SEMANA.map(dia => {
              const diaNum = dia.numero;
              const horarioDoDia = horarios[diaNum];

              return (
                <div key={diaNum} className="p-4 border rounded-lg">
                  {/* Checkbox para Ativar/Desativar o dia */}
                  <label className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-700">{dia.nome}</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
                      checked={horarioDoDia.ativo}
                      onChange={(e) => handleHorarioChange(diaNum, 'ativo', e.target.checked)}
                    />
                  </label>

                  {/* Inputs de Hora (só aparecem se o dia está ativo) */}
                  {horarioDoDia.ativo && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Início</label>
                        <input
                          type="time"
                          value={horarioDoDia.hora_inicio}
                          onChange={(e) => handleHorarioChange(diaNum, 'hora_inicio', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Fim</label>
                        <input
                          type="time"
                          value={horarioDoDia.hora_fim}
                          onChange={(e) => handleHorarioChange(diaNum, 'hora_fim', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Botão Salvar (só aparece se o dia está ativo) */}
                  {horarioDoDia.ativo && (
                    <button
                      onClick={() => handleHorarioSave(diaNum)}
                      className="mt-4 w-full p-2 rounded-lg text-white font-semibold bg-green-600 hover:bg-green-700"
                    >
                      Salvar {dia.nome}
                    </button>
                  )}
                  
                  {/* Botão Remover (só aparece se o dia está inativo mas AINDA EXISTE no banco) */}
                  {!horarioDoDia.ativo && horarioDoDia.id && (
                     <button
                      onClick={() => handleHorarioSave(diaNum)} // A mesma função (ela trata a remoção)
                      className="mt-4 w-full p-2 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700"
                    >
                      Remover {dia.nome} (Salvar)
                    </button>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

export default ProfissionalEditPage;