import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// NOVO: A importação que estava faltando
import { format } from 'date-fns';

// Cores para os gráficos de pizza
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const STATUS_COLORS = ['#48BB78', '#F56565']; // Verde (Finalizado), Vermelho (Cancelado)

// Função para formatar hora (como antes)
function formatarHora(dataISO) {
  const dataObj = new Date(dataISO);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }).format(dataObj);
}

// Cabeçalhos para o arquivo CSV (como antes)
const csvHeaders = [
  { label: "Profissional", key: "Profissional" },
  { label: "Horário", key: "Horario" },
  { label: "Cliente", key: "Cliente" },
  { label: "Serviço", key: "Servico" },
  { label: "Preço (R$)", key: "Preco" }
];

function DashboardPage() {
  // Todos os states (como antes)
  const [agendasHoje, setAgendasHoje] = useState(0);
  const [faturamentoHoje, setFaturamentoHoje] = useState(0);
  const [servicosData, setServicosData] = useState([]);
  const [profissionaisData, setProfissionaisData] = useState([]);
  const [faturamentoPorDiaData, setFaturamentoPorDiaData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [finalizadosAgrupados, setFinalizadosAgrupados] = useState({});
  const [allProfissionais, setAllProfissionais] = useState([]);
  const [csvData, setCsvData] = useState([]); 
  const [loading, setLoading] = useState(true);

  // getHojeBounds (como antes)
  function getHojeBounds() {
    const hojeInicio = new Date();
    hojeInicio.setHours(0, 0, 0, 0);
    const hojeFim = new Date();
    hojeFim.setHours(23, 59, 59, 999);
    return { hojeInicio, hojeFim };
  }

  // useEffect fetchDashboardData (como antes)
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      const { hojeInicio, hojeFim } = getHojeBounds();

      // 1. Busca Profissionais
      const { data: profsData } = await supabase.from('profissionais').select('id, nome');
      if (profsData) {
        setAllProfissionais(profsData);
      }

      // 2. Busca Agendas de HOJE
      const { data: agendasHojeData, error: agendasHojeError } = await supabase
        .from('agendamentos')
        .select('status, nome_cliente, data_hora_inicio, profissional_id, servicos ( nome, preco )')
        .gte('data_hora_inicio', hojeInicio.toISOString())
        .lte('data_hora_inicio', hojeFim.toISOString());
      
      if (agendasHojeData) {
        setAgendasHoje(agendasHojeData.length);
        const finalizadosHoje = agendasHojeData.filter(ag => ag.status === 'finalizado');
        const faturamento = finalizadosHoje.reduce((acc, ag) => acc + (ag.servicos?.preco || 0), 0);
        setFaturamentoHoje(faturamento);
        const agrupados = finalizadosHoje.reduce((acc, ag) => {
          const profId = ag.profissional_id;
          if (!acc[profId]) acc[profId] = [];
          acc[profId].push(ag);
          return acc;
        }, {});
        setFinalizadosAgrupados(agrupados);
      }

      // 3. Busca Agendas (30 dias)
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      
      const { data: agendasGraficos, error: graficosError } = await supabase
        .from('agendamentos')
        .select('servicos ( nome, preco ), profissionais ( nome ), data_hora_inicio, status')
        .gte('data_hora_inicio', trintaDiasAtras.toISOString());
      
      if (graficosError) {
        console.error("Erro ao buscar dados dos gráficos:", graficosError);
      } else if (agendasGraficos) {
        
        // Processa Gráfico "Serviços Populares"
        const servicosCount = agendasGraficos.reduce((acc, ag) => {
          const nomeServico = ag.servicos?.nome || 'Serviço Deletado';
          acc[nomeServico] = (acc[nomeServico] || 0) + 1; 
          return acc;
        }, {});
        const servicosFormatado = Object.keys(servicosCount).map(nome => ({ name: nome, total: servicosCount[nome] }));
        setServicosData(servicosFormatado);
        
        // Processa Gráfico "Agendamentos por Profissional"
        const profCount = agendasGraficos.reduce((acc, ag) => {
          const nomeProf = ag.profissionais?.nome || 'Profissional Deletado';
          acc[nomeProf] = (acc[nomeProf] || 0) + 1; 
          return acc;
        }, {});
        const profFormatado = Object.keys(profCount).map(nome => ({ name: nome, value: profCount[nome] }));
        setProfissionaisData(profFormatado);

        // Processa Gráfico "Faturamento por Dia" (AGORA CORRIGIDO)
        const faturamentoPorDia = agendasGraficos
          .filter(ag => ag.status === 'finalizado') 
          .reduce((acc, ag) => {
            const dia = format(new Date(ag.data_hora_inicio), 'dd/MM'); // Esta linha agora funciona
            const preco = ag.servicos?.preco || 0;
            acc[dia] = (acc[dia] || 0) + preco;
            return acc;
          }, {});
        const faturamentoFormatado = Object.keys(faturamentoPorDia).map(dia => ({
          name: dia,
          Faturamento: faturamentoPorDia[dia]
        })).sort((a, b) => a.name.localeCompare(b.name)); 
        setFaturamentoPorDiaData(faturamentoFormatado);
        
        // Processa Gráfico "Finalizados vs. Cancelados"
        const statusCount = agendasGraficos
          .filter(ag => ag.status === 'finalizado' || ag.status === 'cancelado') 
          .reduce((acc, ag) => {
            if (ag.status === 'finalizado') acc.finalizados += 1;
            if (ag.status === 'cancelado') acc.cancelados += 1;
            return acc;
          }, { finalizados: 0, cancelados: 0 });
        const statusFormatado = [
          { name: 'Finalizados', value: statusCount.finalizados },
          { name: 'Cancelados', value: statusCount.cancelados }
        ];
        setStatusData(statusFormatado);
      }
      
      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  // useEffect para preparar dados do CSV (como antes)
  useEffect(() => {
    if (allProfissionais.length === 0) return;
    const flattenedData = [];
    for (const prof of allProfissionais) {
      const atendimentos = finalizadosAgrupados[prof.id] || [];
      for (const ag of atendimentos) {
        flattenedData.push({
          Profissional: prof.nome,
          Horario: formatarHora(ag.data_hora_inicio),
          Cliente: ag.nome_cliente,
          Servico: ag.servicos.nome,
          Preco: (ag.servicos?.preco || 0).toFixed(2).replace('.', ',')
        });
      }
    }
    setCsvData(flattenedData);
  }, [finalizadosAgrupados, allProfissionais]);

  // Função para Gerar o PDF (CORRIGIDA)
  const handleGerarPDF = () => {
    const doc = new jsPDF(); 
    const hojeString = new Date().toLocaleDateString('pt-BR');
    
    doc.setFontSize(18);
    doc.text(`Relatório de Atendimentos Finalizados - ${hojeString}`, 14, 22);

    const tableHeaders = ["Profissional", "Horário", "Cliente", "Serviço", "Preço (R$)"];
    const tableData = [];
    let faturamentoTotalPDF = 0.0;

    for (const prof of allProfissionais) {
      const atendimentos = finalizadosAgrupados[prof.id] || [];
      
      if (atendimentos.length > 0) {
        tableData.push([{ 
          content: prof.nome, 
          colSpan: 5, 
          styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [51, 51, 51] } 
        }]);
        for (const ag of atendimentos) {
          const preco = ag.servicos?.preco || 0;
          faturamentoTotalPDF += preco;
          tableData.push([
            "", 
            formatarHora(ag.data_hora_inicio),
            ag.nome_cliente,
            ag.servicos?.nome || 'N/A',
            preco.toFixed(2).replace('.', ',')
          ]);
        }
      }
    }

    // --- CORREÇÃO AQUI ---
    // Removemos o 'didDrawCell' e passamos a usar 'willDrawCell'
    // para definir a cor de fundo ANTES de desenhar.
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 30, 
      headStyles: { fillColor: [43, 108, 176] }, // Azul
      // A função 'willDrawCell' é chamada ANTES de a célula ser desenhada
      willDrawCell: (data) => {
        // Checa se é uma linha de 'body' e se a célula tem 'colSpan'
        if (data.row.section === 'body' && data.cell.raw.colSpan) {
          // Define a cor de fundo (FillColor) para a célula
          doc.setFillColor(240, 240, 240); // Cinza claro (f0f0f0)
        }
      }
    });
    // --- FIM DA CORREÇÃO ---

    const finalY = doc.lastAutoTable.finalY || 50;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Faturamento Total Finalizado: R$ ${faturamentoTotalPDF.toFixed(2).replace('.', ',')}`, 14, finalY + 10);

    doc.save(`Relatorio_Finalizados_${hojeString.replace(/\//g, '-')}.pdf`);
  };


  if (loading) {
    return <div>Carregando relatórios...</div>;
  }

  // --- O RESTO DO JSX (return) permanece 100% igual ---
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* --- KPIs (Como antes) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-600">Total de Agendamentos Hoje</h2>
          <p className="text-4xl font-bold text-blue-600">{agendasHoje}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-600">Faturamento Finalizado Hoje (R$)</h2>
          <p className="text-4xl font-bold text-green-600">
            {faturamentoHoje.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {/* --- Relatório de Atendimentos Finalizados (Como antes) --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6">
          <h2 className="text-2xl font-semibold">Atendimentos Finalizados (Hoje)</h2>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <CSVLink
              data={csvData}
              headers={csvHeaders}
              filename={`Relatorio_Finalizados_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 font-semibold text-center"
            >
              Exportar para Excel (.csv)
            </CSVLink>
            <button
              onClick={handleGerarPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 font-semibold text-center"
            >
              Gerar PDF
            </button>
          </div>
        </div>
        
        {allProfissionais.length === 0 ? (
          <p className="text-gray-500">Nenhuma profissional cadastrada.</p>
        ) : (
          <div className="space-y-6">
            {allProfissionais.map(prof => {
              const atendimentos = finalizadosAgrupados[prof.id] || [];
              const totalProf = atendimentos.reduce((acc, ag) => acc + (ag.servicos?.preco || 0), 0);
              return (
                <div key={prof.id} className="border-b pb-6 mb-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">{prof.nome}</h3>
                    <span className="text-xl font-bold text-green-600">
                      Total: R$ {totalProf.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {atendimentos.length === 0 ? (
                    <p className="text-sm text-gray-500 mt-2">Nenhum atendimento finalizado hoje.</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {atendimentos.map(ag => (
                        <li key={ag.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                          <div>
                            <span className="font-semibold text-gray-700">{formatarHora(ag.data_hora_inicio)}</span>
                            <span className="mx-2 text-gray-400">|</span>
                            <span>{ag.servicos?.nome || 'Serviço Deletado'} - {ag.nome_cliente}</span>
                          </div>
                          <span className="font-semibold text-gray-800">
                            R$ {(ag.servicos?.preco || 0).toFixed(2).replace('.', ',')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Gráficos (Os 4 Gráficos) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        
        {/* Gráfico 1: Faturamento por Dia */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Faturamento por Dia (Últimos 30 dias)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={faturamentoPorDiaData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `R$ ${value}`} />
              <Tooltip formatter={(value) => [`R$ ${value.toFixed(2).replace('.', ',')}`, 'Faturamento']} />
              <Legend />
              <Line type="monotone" dataKey="Faturamento" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Gráfico 2: Finalizados vs. Cancelados */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Finalizados vs. Cancelados (Últimos 30 dias)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Total']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Gráfico 3: Serviços Populares */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Serviços Populares (Últimos 30 dias)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={servicosData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [value, 'Total']} />
              <Legend />
              <Bar dataKey="total" fill="#8884d8" name="Total de Agendamentos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 4: Agendamentos por Profissional */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Agendamentos por Profissional (Últimos 30 dias)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={profissionaisData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {profissionaisData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Agendamentos']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}

export default DashboardPage;