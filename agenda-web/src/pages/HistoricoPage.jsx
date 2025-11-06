import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { useAuth } from '/src/AuthContext.jsx';

// (Funções de formatação copiadas do AdminAgenda)
function formatarDataCabecalho(dataString) {
  const [dia, mes, ano] = dataString.split('/');
  const dataObj = new Date(`${ano}-${mes}-${dia}T12:00:00`); 
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(dataObj);
}
function formatarHora(dataISO) {
  const dataObj = new Date(dataISO);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }).format(dataObj);
}

function HistoricoPage() {
  const [loading, setLoading] = useState(true);
  const [historico, setHistorico] = useState({}); // { "Outubro 2025": { finalizados: [], cancelados: [] } }
  const [mesesOrdenados, setMesesOrdenados] = useState([]);
  
  const { profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && profile) {
      fetchHistorico();
    }
  }, [authLoading, profile]);

  async function fetchHistorico() {
    setLoading(true);
    
    // Pega o primeiro dia do mês atual
    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    inicioDoMes.setHours(0, 0, 0, 0);

    let query = supabase
      .from('agendamentos')
      .select(`
        id, data_hora_inicio, status, cancelamento_motivo,
        servicos ( nome ),
        profissionais ( nome )
      `)
      .lt('data_hora_inicio', inicioDoMes.toISOString()) // Pega TUDO ANTES do mês atual
      .in('status', ['finalizado', 'cancelado']) // Apenas finalizados ou cancelados
      .order('data_hora_inicio', { ascending: false }); // Do mais recente para o mais antigo

    if (profile.role !== 'admin') {
      query = query.eq('profissional_id', profile.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar histórico:', error);
    } else if (data) {
      // Agrupa por Mês/Ano
      const agrupadoPorMes = data.reduce((acc, ag) => {
        const mesAno = format(new Date(ag.data_hora_inicio), 'MMMM yyyy', { locale: ptBR });
        // Capitaliza o Mês (ex: "outubro" para "Outubro")
        const mesAnoCapitalizado = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
        
        if (!acc[mesAnoCapitalizado]) {
          acc[mesAnoCapitalizado] = { finalizados: [], cancelados: [] };
        }

        if (ag.status === 'finalizado') {
          acc[mesAnoCapitalizado].finalizados.push(ag);
        } else if (ag.status === 'cancelado') {
          acc[mesAnoCapitalizado].cancelados.push(ag);
        }
        return acc;
      }, {});
      
      setHistorico(agrupadoPorMes);
      setMesesOrdenados(Object.keys(agrupadoPorMes)); // Pega as chaves (ex: "Outubro 2025")
    }
    setLoading(false);
  }

  if (loading || authLoading) {
    return <div className="max-w-4xl mx-auto"><p>Carregando histórico...</p></div>;
  }
  
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Histórico de Agendamentos (Arquivados)
      </h1>
      <p className="text-gray-600 mb-6 -mt-6">
        Esta página mostra todos os agendamentos finalizados e cancelados dos meses anteriores.
      </p>

      {mesesOrdenados.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold text-gray-700">Histórico Vazio</h2>
          <p className="text-gray-500 mt-2">Ainda não há agendamentos de meses anteriores.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Loop por Mês */}
          {mesesOrdenados.map(mes => (
            <div key={mes} className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-blue-600 mb-6 border-b pb-4">
                {mes}
              </h2>

              {/* Seção de Finalizados do Mês */}
              <h3 className="text-xl font-bold text-green-700 mb-4">
                Finalizados ({historico[mes].finalizados.length})
              </h3>
              {historico[mes].finalizados.length > 0 ? (
                <ul className="divide-y divide-gray-200 mb-6">
                  {historico[mes].finalizados.map(ag => (
                    <li key={ag.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{format(new Date(ag.data_hora_inicio), 'dd/MM/yy HH:mm')} - {ag.servicos.nome}</p>
                        {profile.role === 'admin' && <p className="text-sm text-gray-600">{ag.profissionais.nome}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500 mb-6">Nenhum atendimento finalizado neste mês.</p>}

              {/* Seção de Cancelados do Mês */}
              <h3 className="text-xl font-bold text-red-700 mb-4">
                Cancelados ({historico[mes].cancelados.length})
              </h3>
              {historico[mes].cancelados.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {historico[mes].cancelados.map(ag => (
                    <li key={ag.id} className="py-3 flex justify-between items-center opacity-70">
                      <div>
                        <p className="font-semibold line-through">{format(new Date(ag.data_hora_inicio), 'dd/MM/yy HH:mm')} - {ag.servicos.nome}</p>
                        {profile.role === 'admin' && <p className="text-sm text-gray-600 line-through">{ag.profissionais.nome}</p>}
                        <p className="text-sm text-red-600">{ag.cancelamento_motivo || 'Motivo não informado'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">Nenhum atendimento cancelado neste mês.</p>}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoricoPage;