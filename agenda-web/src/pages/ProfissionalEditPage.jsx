import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '/src/supabaseClient.js';

// Dias da semana
const DIAS_DA_SEMANA = [
  { numero: 0, nome: 'Domingo' },
  { numero: 1, nome: 'Segunda' },
  { numero: 2, nome: 'Terça' },
  { numero: 3, nome: 'Quarta' },
  { numero: 4, nome: 'Quinta' },
  { numero: 5, nome: 'Sexta' },
  { numero: 6, nome: 'Sábado' },
];

// Ícones SVG para leveza
const Icons = {
  Check: () => <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
  Clock: () => <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Save: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
};

function ProfissionalEditPage() {
  const { id } = useParams();
  
  const [profissional, setProfissional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [todosServicos, setTodosServicos] = useState([]);
  const [servicosSelecionados, setServicosSelecionados] = useState(new Set());
  
  // Estado otimizado para horários
  const [horarios, setHorarios] = useState({}); 
  const [savingDia, setSavingDia] = useState(null); // Para mostrar carregamento no botão específico

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    async function fetchDados() {
      try {
        setLoading(true);

        // 1. Dados Profissional
        const { data: profData, error: profError } = await supabase.from('profissionais').select('*').eq('id', id).single();
        if (profError) throw profError;
        setProfissional(profData);

        // 2. Todos os Serviços
        const { data: servicosData } = await supabase.from('servicos').select('id, nome, duracao_minutos').order('nome');
        setTodosServicos(servicosData || []);

        // 3. Serviços Vinculados
        const { data: vinculadosData } = await supabase.from('profissionais_servicos').select('servico_id').eq('profissional_id', id);
        if (vinculadosData) {
          setServicosSelecionados(new Set(vinculadosData.map(v => v.servico_id)));
        }

        // 4. Horários
        const { data: horariosData } = await supabase.from('horarios_trabalho').select('*').eq('profissional_id', id);
        
        const mapaHorarios = {};
        DIAS_DA_SEMANA.forEach(dia => {
          const salvo = horariosData?.find(h => h.dia_semana === dia.numero);
          mapaHorarios[dia.numero] = salvo ? {
            id: salvo.id,
            hora_inicio: salvo.hora_inicio,
            hora_fim: salvo.hora_fim,
            ativo: true
          } : {
            id: null,
            hora_inicio: '09:00', // Padrão
            hora_fim: '18:00',    // Padrão
            ativo: false
          };
        });
        setHorarios(mapaHorarios);

      } catch (err) {
        console.error("Erro ao carregar:", err);
        setError("Erro ao carregar dados. Tente recarregar.");
      } finally {
        setLoading(false);
      }
    }
    fetchDados();
  }, [id]);

  // --- LÓGICA DE SERVIÇOS (Toggle Imediato) ---
  const handleServicoToggle = async (servicoId) => {
    // Atualização Otimista (Visual muda na hora)
    const anterior = new Set(servicosSelecionados);
    const novoSet = new Set(servicosSelecionados);
    
    const isAdding = !novoSet.has(servicoId);
    if (isAdding) novoSet.add(servicoId);
    else novoSet.delete(servicoId);
    
    setServicosSelecionados(novoSet); // Atualiza tela

    try {
      if (isAdding) {
        await supabase.from('profissionais_servicos').insert({ profissional_id: id, servico_id: servicoId });
      } else {
        await supabase.from('profissionais_servicos').delete().eq('profissional_id', id).eq('servico_id', servicoId);
      }
    } catch (err) {
      console.error("Erro ao sincronizar serviço:", err);
      setServicosSelecionados(anterior); // Reverte se der erro
      alert("Erro ao atualizar serviço.");
    }
  };

  // --- LÓGICA DE HORÁRIOS ---
  const handleHorarioChange = (diaNum, campo, valor) => {
    setHorarios(prev => ({
      ...prev,
      [diaNum]: { ...prev[diaNum], [campo]: valor }
    }));
  };

  const handleHorarioSave = async (diaNum) => {
    setSavingDia(diaNum);
    const h = horarios[diaNum];

    try {
      if (h.ativo) {
        // SALVAR/ATUALIZAR
        const payload = {
          profissional_id: id,
          dia_semana: diaNum,
          hora_inicio: h.hora_inicio,
          hora_fim: h.hora_fim
        };

        if (h.id) {
          await supabase.from('horarios_trabalho').update(payload).eq('id', h.id);
        } else {
          const { data } = await supabase.from('horarios_trabalho').insert(payload).select().single();
          if (data) handleHorarioChange(diaNum, 'id', data.id);
        }
      } else {
        // REMOVER (Se estiver desativado e existir ID)
        if (h.id) {
          await supabase.from('horarios_trabalho').delete().eq('id', h.id);
          handleHorarioChange(diaNum, 'id', null);
        }
      }
      // Pequeno delay visual para feedback de sucesso
      setTimeout(() => setSavingDia(null), 500); 
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar horário.");
      setSavingDia(null);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-fuchsia-600 font-bold">Carregando perfil...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fade-in font-sans">
      
      {/* --- HEADER MODERNO --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Link to="/admin/profissionais" className="bg-white p-2 rounded-full shadow-sm hover:shadow-md text-gray-500 hover:text-fuchsia-600 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Editar Perfil</h1>
            <p className="text-sm text-gray-500">Gerencie serviços e disponibilidade.</p>
          </div>
        </div>
        
        {/* Card do Profissional */}
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-fuchsia-100">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-fuchsia-600 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
            {profissional.nome.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-gray-800 leading-tight">{profissional.nome}</p>
            <p className="text-xs text-gray-500">{profissional.email}</p>
          </div>
        </div>
      </div>

      {/* --- GRID LAYOUT PRINCIPAL --- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* COLUNA 1: SERVIÇOS (ESQUERDA) */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Quais serviços atende?</h2>
            <p className="text-xs text-gray-400 mb-6">Clique para ativar ou desativar.</p>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {todosServicos.map(serv => {
                const isSelected = servicosSelecionados.has(serv.id);
                return (
                  <div 
                    key={serv.id} 
                    onClick={() => handleServicoToggle(serv.id)}
                    className={`
                      cursor-pointer group flex items-center justify-between p-3 rounded-xl border transition-all duration-200
                      ${isSelected 
                        ? 'bg-fuchsia-50 border-fuchsia-200 shadow-inner' 
                        : 'bg-white border-gray-100 hover:border-fuchsia-200 hover:shadow-sm'}
                    `}
                  >
                    <div>
                      <p className={`font-bold text-sm ${isSelected ? 'text-fuchsia-800' : 'text-gray-600'}`}>{serv.nome}</p>
                      <p className="text-xs text-gray-400">{serv.duracao_minutos} min</p>
                    </div>
                    
                    {/* Checkbox Visual Moderno */}
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center transition-all
                      ${isSelected ? 'bg-fuchsia-500 scale-110' : 'bg-gray-200 group-hover:bg-gray-300'}
                    `}>
                      {isSelected && <Icons.Check />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUNA 2: HORÁRIOS (DIREITA - LARGA) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Grade de Horários</h2>
            <p className="text-xs text-gray-400 mb-6">Defina os dias e intervalos de atendimento.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DIAS_DA_SEMANA.map(dia => {
                const diaNum = dia.numero;
                const h = horarios[diaNum] || {};
                const isAtivo = h.ativo;

                return (
                  <div 
                    key={diaNum} 
                    className={`
                      relative p-4 rounded-2xl border transition-all duration-300
                      ${isAtivo 
                        ? 'bg-white border-fuchsia-200 shadow-md ring-1 ring-fuchsia-100' 
                        : 'bg-gray-50 border-gray-200 opacity-70 grayscale'}
                    `}
                  >
                    {/* Header do Card */}
                    <div className="flex justify-between items-center mb-4">
                      <span className={`font-bold uppercase tracking-wider text-xs ${isAtivo ? 'text-fuchsia-700' : 'text-gray-500'}`}>
                        {dia.nome}
                      </span>
                      
                      {/* Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={isAtivo}
                          onChange={(e) => {
                            handleHorarioChange(diaNum, 'ativo', e.target.checked);
                            // Auto-save ao ligar/desligar? Opcional. 
                            // O usuário pediu botão salvar, então vamos manter manual para segurança.
                          }}
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-fuchsia-600"></div>
                      </label>
                    </div>

                    {/* Inputs de Horário */}
                    <div className={`space-y-3 transition-opacity duration-300 ${!isAtivo ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <span className="text-xs font-bold text-gray-400 w-10">INÍCIO</span>
                        <input
                          type="time"
                          min="07:00"
                          max="20:30"
                          value={h.hora_inicio}
                          onChange={(e) => handleHorarioChange(diaNum, 'hora_inicio', e.target.value)}
                          className="bg-transparent text-sm font-bold text-gray-700 outline-none w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <span className="text-xs font-bold text-gray-400 w-10">FIM</span>
                        <input
                          type="time"
                          min="07:00"
                          max="20:30"
                          value={h.hora_fim}
                          onChange={(e) => handleHorarioChange(diaNum, 'hora_fim', e.target.value)}
                          className="bg-transparent text-sm font-bold text-gray-700 outline-none w-full"
                        />
                      </div>
                    </div>

                    {/* Botão de Ação do Card */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => handleHorarioSave(diaNum)}
                        disabled={savingDia === diaNum}
                        className={`
                          flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                          ${savingDia === diaNum 
                            ? 'bg-gray-200 text-gray-500 cursor-wait'
                            : isAtivo 
                              ? 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200' 
                              : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-200'}
                        `}
                      >
                        {savingDia === diaNum ? (
                          <span>Salvando...</span>
                        ) : (
                          <>
                            <Icons.Save />
                            {isAtivo ? 'Atualizar' : 'Confirmar Fechamento'}
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ProfissionalEditPage;