import { useState, useEffect, useMemo } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- CORES & CONSTANTES VISUAIS ---
const COLORS = ['#c026d3', '#7c3aed', '#2563eb', '#0d9488', '#db2777']; // Fuchsia, Violet, Blue, Teal, Pink
const STATUS_COLORS = ['#10b981', '#ef4444']; // Emerald (Finalizado), Red (Cancelado)

// --- FUNÇÕES AUXILIARES ---
function formatarHora(dataISO) {
  if (!dataISO) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  }).format(new Date(dataISO));
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Cabeçalhos CSV
const csvHeaders = [
  { label: "Profissional", key: "Profissional" },
  { label: "Data", key: "Data" },
  { label: "Horário", key: "Horario" },
  { label: "Cliente", key: "Cliente" },
  { label: "Serviço", key: "Servico" },
  { label: "Status", key: "Status" },
  { label: "Preço (R$)", key: "Preco" }
];

// --- COMPONENTE CARD DE KPI (Stat Card) ---
const KpiCard = ({ title, value, subtext, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-slate-800">{value}</h3>
      {subtext && <p className={`text-xs font-bold mt-2 ${colorClass}`}>{subtext}</p>}
    </div>
    <div className={`p-3 rounded-xl ${colorClass.replace('text-', 'bg-').replace('600', '100')} text-xl`}>
      {icon}
    </div>
  </div>
);

function DashboardPage() {
  // --- STATES ---
  const [kpis, setKpis] = useState({
    agendasHoje: 0,
    faturamentoHoje: 0,
    ticketMedio: 0,
    taxaCancelamento: 0
  });

  const [graficos, setGraficos] = useState({
    servicos: [],
    profissionais: [],
    faturamentoDia: [],
    status: [],
    horariosPico: [], // NOVO
    topClientes: []   // NOVO
  });

  const [finalizadosHojeAgrupados, setFinalizadosHojeAgrupados] = useState({});
  const [allProfissionais, setAllProfissionais] = useState([]);
  const [csvData, setCsvData] = useState([]); 
  const [loading, setLoading] = useState(true);

  // --- FETCH DATA ---
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      const hoje = new Date();
      const inicioHoje = new Date(hoje.setHours(0,0,0,0)).toISOString();
      const fimHoje = new Date(hoje.setHours(23,59,59,999)).toISOString();
      const trintaDiasAtras = subDays(new Date(), 30).toISOString();

      try {
        // 1. Busca Profissionais
        const { data: profs } = await supabase.from('profissionais').select('id, nome').order('nome');
        setAllProfissionais(profs || []);

        // 2. Busca Agendamentos (HOJE)
        const { data: dadosHoje } = await supabase
          .from('agendamentos')
          .select('id, status, nome_cliente, data_hora_inicio, profissional_id, servicos ( nome, preco )')
          .gte('data_hora_inicio', inicioHoje)
          .lte('data_hora_inicio', fimHoje);

        // Processa Dados de Hoje
        if (dadosHoje) {
          const finalizados = dadosHoje.filter(ag => ag.status === 'finalizado');
          const faturamento = finalizados.reduce((acc, ag) => acc + (ag.servicos?.preco || 0), 0);
          
          // Agrupar por profissional para o relatório detalhado
          const agrupados = finalizados.reduce((acc, ag) => {
            const pid = ag.profissional_id;
            if (!acc[pid]) acc[pid] = [];
            acc[pid].push(ag);
            return acc;
          }, {});

          setFinalizadosHojeAgrupados(agrupados);
          setKpis(prev => ({ ...prev, agendasHoje: dadosHoje.length, faturamentoHoje: faturamento }));
        }

        // 3. Busca Histórico (30 DIAS) para Gráficos
        const { data: historico } = await supabase
          .from('agendamentos')
          .select('nome_cliente, data_hora_inicio, status, servicos ( nome, preco ), profissionais ( nome )')
          .gte('data_hora_inicio', trintaDiasAtras)
          .order('data_hora_inicio');

        if (historico) {
          processarGraficos(historico);
        }

      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // --- PROCESSAMENTO DE DADOS (GRÁFICOS) ---
  const processarGraficos = (data) => {
    const finalizados = data.filter(ag => ag.status === 'finalizado');
    const todos = data.length;
    const cancelados = data.filter(ag => ag.status === 'cancelado').length;

    // 1. KPI: Ticket Médio & Taxa Cancelamento
    const receitaTotal30d = finalizados.reduce((acc, ag) => acc + (ag.servicos?.preco || 0), 0);
    const ticketMedio = finalizados.length ? (receitaTotal30d / finalizados.length) : 0;
    const taxaCancelamento = todos ? ((cancelados / todos) * 100).toFixed(1) : 0;

    setKpis(prev => ({ ...prev, ticketMedio, taxaCancelamento }));

    // 2. Gráfico: Serviços Populares
    const servCount = {};
    finalizados.forEach(ag => {
      const nome = ag.servicos?.nome || 'Outros';
      servCount[nome] = (servCount[nome] || 0) + 1;
    });
    const servicosData = Object.entries(servCount)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6); // Top 6

    // 3. Gráfico: Profissionais
    const profCount = {};
    finalizados.forEach(ag => {
      const nome = ag.profissionais?.nome || 'Outros';
      profCount[nome] = (profCount[nome] || 0) + 1;
    });
    const profData = Object.entries(profCount).map(([name, value]) => ({ name, value }));

    // 4. Gráfico: Evolução Faturamento (Area Chart)
    const fatDia = {};
    finalizados.forEach(ag => {
      const dia = format(parseISO(ag.data_hora_inicio), 'dd/MM');
      fatDia[dia] = (fatDia[dia] || 0) + (ag.servicos?.preco || 0);
    });
    const fatData = Object.entries(fatDia)
      .map(([name, Faturamento]) => ({ name, Faturamento }))
      .sort((a, b) => {
        // Ajuste simples para ordenar dd/MM (assumindo mesmo ano/mês próximo)
        const [da, ma] = a.name.split('/'); const [db, mb] = b.name.split('/');
        return new Date(2024, ma-1, da) - new Date(2024, mb-1, db);
      });

    // 5. Gráfico: Status (Pizza)
    const statusData = [
      { name: 'Finalizados', value: finalizados.length },
      { name: 'Cancelados', value: cancelados }
    ];

    // 6. NOVO: Horários de Pico
    const horasMap = {};
    data.forEach(ag => {
        if(ag.status !== 'cancelado') {
            const hora = parseISO(ag.data_hora_inicio).getHours();
            const label = `${hora}h`;
            horasMap[label] = (horasMap[label] || 0) + 1;
        }
    });
    // Ordena de manhã pra noite (ex: 7h as 20h)
    const horariosPico = Object.entries(horasMap)
        .map(([name, agendamentos]) => ({ name, agendamentos, horaInt: parseInt(name) }))
        .sort((a,b) => a.horaInt - b.horaInt)
        .map(({name, agendamentos}) => ({ name, agendamentos }));

    // 7. NOVO: Top Clientes (Quem gasta mais)
    const clientesMap = {};
    finalizados.forEach(ag => {
        const nome = ag.nome_cliente;
        clientesMap[nome] = (clientesMap[nome] || 0) + (ag.servicos?.preco || 0);
    });
    const topClientes = Object.entries(clientesMap)
        .map(([cliente, total]) => ({ cliente, total }))
        .sort((a,b) => b.total - a.total)
        .slice(0, 5); // Top 5

    setGraficos({ 
      servicos: servicosData, 
      profissionais: profData, 
      faturamentoDia: fatData, 
      status: statusData,
      horariosPico,
      topClientes
    });
  };

  // --- PREPARAÇÃO CSV (Export) ---
  useEffect(() => {
    if (allProfissionais.length === 0) return;
    const flatData = [];
    
    // Varre os finalizados de HOJE agrupados para o CSV
    Object.keys(finalizadosHojeAgrupados).forEach(profId => {
       const profName = allProfissionais.find(p => p.id == profId)?.nome || 'Profissional';
       const agendamentos = finalizadosHojeAgrupados[profId];
       agendamentos.forEach(ag => {
          flatData.push({
            Profissional: profName,
            Data: new Date().toLocaleDateString('pt-BR'),
            Horario: formatarHora(ag.data_hora_inicio),
            Cliente: ag.nome_cliente,
            Servico: ag.servicos?.nome,
            Status: ag.status,
            Preco: (ag.servicos?.preco || 0).toFixed(2).replace('.', ',')
          });
       });
    });
    setCsvData(flatData);
  }, [finalizadosHojeAgrupados, allProfissionais]);

  // --- GERAR PDF ---
  const handleGerarPDF = () => {
    const doc = new jsPDF(); 
    const hojeStr = new Date().toLocaleDateString('pt-BR');
    
    // Header Colorido
    doc.setFillColor(192, 38, 211); // Fuchsia 600
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Relatório Diário de Faturamento - ${hojeStr}`, 14, 13);

    const tableHeaders = ["Horário", "Cliente", "Serviço", "Valor (R$)"];
    const tableData = [];
    let fatTotal = 0;

    allProfissionais.forEach(prof => {
      const lista = finalizadosHojeAgrupados[prof.id] || [];
      if (lista.length > 0) {
        // Linha do Profissional (Separador)
        tableData.push([{ 
          content: prof.nome.toUpperCase(), 
          colSpan: 4, 
          styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [192, 38, 211], halign: 'left' } 
        }]);
        
        let subtotal = 0;
        lista.forEach(ag => {
           const valor = ag.servicos?.preco || 0;
           subtotal += valor;
           tableData.push([
             formatarHora(ag.data_hora_inicio),
             ag.nome_cliente,
             ag.servicos?.nome,
             `R$ ${valor.toFixed(2).replace('.', ',')}`
           ]);
        });
        fatTotal += subtotal;
        
        // Linha de Subtotal
        tableData.push([{
            content: `Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}`,
            colSpan: 4,
            styles: { fontStyle: 'bold', halign: 'right', textColor: [100, 116, 139] }
        }]);
      }
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [88, 28, 135], textColor: 255 }, // Roxo Escuro
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [253, 244, 255] } // Fuchsia bem claro
    });

    const finalY = doc.lastAutoTable.finalY || 50;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Geral: ${formatarMoeda(fatTotal)}`, 14, finalY + 15);

    doc.save(`Relatorio_Faturamento_${hojeStr.replace(/\//g, '-')}.pdf`);
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-fuchsia-600 font-bold animate-pulse">Carregando Dashboard...</div>;

  return (
    <div className="max-w-[1920px] mx-auto p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard Executivo</h1>
          <p className="text-slate-500 font-medium">Visão geral do negócio e performance.</p>
        </div>
        
        {/* BARRA DE FERRAMENTAS (Export) */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
           <span className="text-xs font-bold text-slate-400 uppercase px-2">Exportar Hoje:</span>
           <CSVLink
              data={csvData}
              headers={csvHeaders}
              filename={`Relatorio_${new Date().toLocaleDateString('pt-BR')}.csv`}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition border border-green-200"
           >
              📊 Excel (CSV)
           </CSVLink>
           <button
              onClick={handleGerarPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition border border-red-200"
           >
              📄 Relatório PDF
           </button>
        </div>
      </div>

      {/* 1. SEÇÃO DE KPIS (Cartões de Topo) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
            title="Agendamentos Hoje" 
            value={kpis.agendasHoje} 
            subtext="Clientes agendados" 
            icon="📅" 
            colorClass="text-blue-600" 
        />
        <KpiCard 
            title="Faturamento Hoje" 
            value={formatarMoeda(kpis.faturamentoHoje)} 
            subtext="Total finalizado" 
            icon="💰" 
            colorClass="text-emerald-600" 
        />
        <KpiCard 
            title="Ticket Médio (30d)" 
            value={formatarMoeda(kpis.ticketMedio)} 
            subtext="Gasto por cliente" 
            icon="💎" 
            colorClass="text-fuchsia-600" 
        />
        <KpiCard 
            title="Taxa de Cancelamento" 
            value={`${kpis.taxaCancelamento}%`} 
            subtext="Últimos 30 dias" 
            icon="📉" 
            colorClass={parseFloat(kpis.taxaCancelamento) > 15 ? "text-red-600" : "text-green-600"} 
        />
      </div>

      {/* 2. LINHA PRINCIPAL DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO: EVOLUÇÃO FATURAMENTO (Ocupa 2 colunas) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
           <h2 className="text-lg font-bold text-slate-800 mb-6">📈 Evolução do Faturamento (30 dias)</h2>
           <div className="h-[300px] w-full">
             <ResponsiveContainer>
               <AreaChart data={graficos.faturamentoDia}>
                 <defs>
                   <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#c026d3" stopOpacity={0.8}/>
                     <stop offset="95%" stopColor="#c026d3" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} tickFormatter={(v) => `R$${v}`} />
                 <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                    formatter={(v) => formatarMoeda(v)}
                 />
                 <Area type="monotone" dataKey="Faturamento" stroke="#c026d3" strokeWidth={3} fillOpacity={1} fill="url(#colorFat)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* LISTA: TOP CLIENTES (Novo) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <h2 className="text-lg font-bold text-slate-800 mb-4">🏆 Top Clientes (VIP)</h2>
           <div className="space-y-4">
              {graficos.topClientes.length === 0 ? <p className="text-slate-400 text-sm">Sem dados suficientes.</p> : 
                graficos.topClientes.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                     <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-amber-400' : 'bg-slate-200'}`}>{idx + 1}</span>
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{c.cliente}</span>
                     </div>
                     <span className="text-sm font-black text-fuchsia-600">{formatarMoeda(c.total)}</span>
                  </div>
                ))
              }
           </div>
           <div className="mt-6 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-500 mb-3">Status dos Agendamentos</h3>
              <div className="h-[150px]">
                 <ResponsiveContainer>
                    <PieChart>
                       <Pie data={graficos.status} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                          {graficos.status.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip />
                       <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>

      {/* 3. SEGUNDA LINHA DE GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         
         {/* Gráfico: Serviços Populares */}
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4">💇‍♀️ Serviços Mais Realizados</h2>
            <div className="h-[250px]">
              <ResponsiveContainer>
                 <BarChart data={graficos.servicos} layout="vertical" margin={{left: 0}}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} interval={0} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                    <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
              </ResponsiveContainer>
            </div>
         </div>

         {/* Gráfico: Horários de Pico (NOVO) */}
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4">⏰ Horários de Maior Movimento</h2>
            <div className="h-[250px]">
               <ResponsiveContainer>
                  <BarChart data={graficos.horariosPico}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="name" tick={{fontSize: 10}} />
                     <YAxis hide />
                     <Tooltip contentStyle={{borderRadius: '8px'}} />
                     <Bar dataKey="agendamentos" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Gráfico: Performance Profissional */}
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4">👩‍💻 Agendamentos por Profissional</h2>
            <div className="h-[250px]">
               <ResponsiveContainer>
                  <PieChart>
                     <Pie data={graficos.profissionais} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name, percent}) => `${(percent * 100).toFixed(0)}%`}>
                        {graficos.profissionais.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>

      </div>

      {/* 4. TABELA DETALHADA DE HOJE */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h2 className="text-lg font-black text-slate-800">Detalhamento Financeiro de Hoje</h2>
         </div>
         <div className="p-6">
            {allProfissionais.length === 0 ? <p>Carregando...</p> : allProfissionais.map(prof => {
               const atendimentos = finalizadosHojeAgrupados[prof.id] || [];
               if(atendimentos.length === 0) return null;
               
               const total = atendimentos.reduce((acc, ag) => acc + (ag.servicos?.preco || 0), 0);

               return (
                  <div key={prof.id} className="mb-6 last:mb-0">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-fuchsia-700 flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span> {prof.nome}
                        </h3>
                        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-black border border-green-100">
                           Total: {formatarMoeda(total)}
                        </span>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                           <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                              <tr>
                                 <th className="px-4 py-2 rounded-l-lg">Horário</th>
                                 <th className="px-4 py-2">Cliente</th>
                                 <th className="px-4 py-2">Serviço</th>
                                 <th className="px-4 py-2 text-right rounded-r-lg">Valor</th>
                              </tr>
                           </thead>
                           <tbody>
                              {atendimentos.map(ag => (
                                 <tr key={ag.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-bold font-mono">{formatarHora(ag.data_hora_inicio)}</td>
                                    <td className="px-4 py-3">{ag.nome_cliente}</td>
                                    <td className="px-4 py-3">{ag.servicos?.nome}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">{formatarMoeda(ag.servicos?.preco || 0)}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               );
            })}
            {Object.keys(finalizadosHojeAgrupados).length === 0 && (
               <div className="text-center py-10 text-slate-400">
                  <p>Nenhum atendimento finalizado hoje ainda.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}

export default DashboardPage;