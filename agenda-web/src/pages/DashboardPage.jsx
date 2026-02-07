import { useState, useEffect, useMemo } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, LineChart, Line
} from 'recharts';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DatePicker, { registerLocale } from 'react-datepicker';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  format, subDays, startOfMonth, endOfMonth, startOfYear, 
  endOfYear, isValid, parseISO, isSameDay 
} from 'date-fns';

// --- CONFIGURAÇÃO INICIAL ---
registerLocale('pt-BR', ptBR);

// --- CONSTANTES VISUAIS ---
const COLORS = ['#c026d3', '#7c3aed', '#2563eb', '#0d9488', '#db2777', '#f59e0b', '#6366f1'];
const STATUS_COLORS = { 'finalizado': '#10b981', 'cancelado': '#ef4444', 'agendado': '#3b82f6' };

// --- FUNÇÕES AUXILIARES ---
const formatarMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatarData = (date) => isValid(date) ? format(date, 'dd/MM/yyyy') : '--/--/----';

// --- COMPONENTE CARD DE KPI (Indicadores) ---
const KpiCard = ({ title, value, subtext, icon, colorClass, loading }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${colorClass.split('-')[1]}-50 rounded-bl-[4rem] -mr-4 -mt-4 transition-all group-hover:scale-110`}></div>
    <div className="relative z-10 flex-1">
      <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
      {loading ? (
         <div className="h-8 w-32 bg-slate-100 rounded animate-pulse"></div>
      ) : (
         <h3 className={`text-3xl font-black ${colorClass.split(' ')[0]} tracking-tight`}>{value}</h3>
      )}
      {subtext && <p className="text-[10px] font-bold text-slate-500 mt-2 flex items-center gap-1 bg-slate-50 w-fit px-2 py-1 rounded-lg">{subtext}</p>}
    </div>
    <div className={`relative z-10 p-3 rounded-2xl ${colorClass.replace('text-', 'bg-').replace('600', '100')} text-2xl shadow-sm`}>
      {icon}
    </div>
  </div>
);

function DashboardPage() {
  // --- STATES DE FILTRO ---
  const [periodoPredefinido, setPeriodoPredefinido] = useState('mes_atual');
  const [dataInicio, setDataInicio] = useState(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState(endOfMonth(new Date()));
  const [filtroProfissional, setFiltroProfissional] = useState('todos');

  // --- STATES DE DADOS ---
  const [rawData, setRawData] = useState([]); // Dados brutos (cache local)
  const [allProfissionais, setAllProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- BUSCA INICIAL DE DADOS ---
  // Buscamos um intervalo grande (ex: ano todo) para permitir filtragem rápida no front-end sem recarregar
  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      try {
        // 1. Busca Lista de Profissionais
        const { data: profs } = await supabase
            .from('profissionais')
            .select('id, nome')
            .order('nome', { ascending: true });
        
        setAllProfissionais(profs || []);

        // 2. Busca Agendamentos (Últimos 12 meses para ter histórico)
        const dataLimite = subDays(new Date(), 365).toISOString(); 
        
        const { data: agendamentos, error } = await supabase
          .from('agendamentos')
          .select(`
            id, status, nome_cliente, data_hora_inicio, servico_id, profissional_id,
            servicos ( nome, preco ),
            profissionais ( nome )
          `)
          .gte('data_hora_inicio', dataLimite) // Otimização: traz apenas o necessário
          .order('data_hora_inicio', { ascending: true });

        if (error) throw error;
        if (agendamentos) setRawData(agendamentos);

      } catch (error) {
        console.error("Erro crítico ao carregar dashboard:", error);
        alert("Erro ao carregar dados. Verifique sua conexão.");
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  // --- LÓGICA DE ATUALIZAÇÃO DOS FILTROS DE DATA ---
  useEffect(() => {
    const hoje = new Date();
    let inicio, fim;

    switch (periodoPredefinido) {
      case 'hoje':
        inicio = new Date(); fim = new Date();
        break;
      case 'ontem':
        inicio = subDays(hoje, 1); fim = subDays(hoje, 1);
        break;
      case '7_dias':
        inicio = subDays(hoje, 7); fim = hoje;
        break;
      case '15_dias':
        inicio = subDays(hoje, 15); fim = hoje;
        break;
      case '30_dias':
        inicio = subDays(hoje, 30); fim = hoje;
        break;
      case 'mes_atual':
        inicio = startOfMonth(hoje); fim = endOfMonth(hoje);
        break;
      case 'ano_atual':
        inicio = startOfYear(hoje); fim = endOfYear(hoje);
        break;
      case 'custom':
        return; // Não altera as datas se for customizado manualmente
      default:
        return;
    }
    
    // Ajusta as horas para cobrir o dia todo
    if (inicio) inicio.setHours(0,0,0,0);
    if (fim) fim.setHours(23,59,59,999);
    
    setDataInicio(inicio);
    setDataFim(fim);

  }, [periodoPredefinido]);

  // --- PROCESSAMENTO INTELIGENTE (MEMOIZED) ---
  // Aqui está a mágica: Filtra e calcula tudo apenas quando os filtros mudam
  const { kpis, graficos, dadosFiltrados, tabelaFinanceira } = useMemo(() => {
    if (!rawData || rawData.length === 0) {
        return { kpis: {}, graficos: {}, dadosFiltrados: [], tabelaFinanceira: [] };
    }

    // 1. APLICAR FILTROS
    const filtered = rawData.filter(ag => {
      if (!ag.data_hora_inicio) return false;
      const dataAg = new Date(ag.data_hora_inicio);
      
      // Filtro de Data (Início e Fim)
      const validDate = dataAg >= dataInicio && dataAg <= dataFim;
      
      // Filtro de Profissional
      const validProf = filtroProfissional === 'todos' || String(ag.profissional_id) === String(filtroProfissional);
      
      return validDate && validProf;
    });

    const finalizados = filtered.filter(ag => ag.status === 'finalizado');
    const cancelados = filtered.filter(ag => ag.status === 'cancelado');
    const agendados = filtered.filter(ag => ag.status === 'confirmado' || ag.status === 'agendado');

    // 2. CÁLCULO DE KPIS
    const faturamentoTotal = finalizados.reduce((acc, ag) => acc + (ag.servicos?.preco || 0), 0);
    const totalAtendimentos = finalizados.length;
    const ticketMedio = totalAtendimentos > 0 ? (faturamentoTotal / totalAtendimentos) : 0;
    const taxaCancelamento = filtered.length > 0 ? ((cancelados.length / filtered.length) * 100).toFixed(1) : 0;
    const faturamentoProjetado = faturamentoTotal + agendados.reduce((acc, ag) => acc + (ag.servicos?.preco || 0), 0);

    // 3. PREPARAÇÃO DOS GRÁFICOS

    // G1: Evolução Diária (Area Chart)
    const fatPorDiaMap = {};
    // Inicializa o mapa para garantir ordem cronológica se necessário (opcional, aqui faremos direto)
    finalizados.forEach(ag => {
       const dia = format(new Date(ag.data_hora_inicio), 'dd/MM');
       fatPorDiaMap[dia] = (fatPorDiaMap[dia] || 0) + (ag.servicos?.preco || 0);
    });
    // Ordena pela data (simplificado assumindo mesmo ano/mês para visualização curta)
    const graphFaturamento = Object.entries(fatPorDiaMap).map(([dia, valor]) => ({ dia, valor }));

    // G2: Serviços Mais Rentáveis (Ticket e Volume)
    const servStats = {};
    finalizados.forEach(ag => {
        const nome = ag.servicos?.nome || 'Outros';
        if (!servStats[nome]) servStats[nome] = { qtd: 0, total: 0 };
        servStats[nome].qtd += 1;
        servStats[nome].total += (ag.servicos?.preco || 0);
    });
    const graphServicosRentaveis = Object.entries(servStats)
        .map(([nome, dados]) => ({ 
            nome, 
            ticket: dados.total / dados.qtd, 
            total: dados.total,
            qtd: dados.qtd 
        }))
        .sort((a,b) => b.total - a.total)
        .slice(0, 5); // Top 5

    // G3: Retenção (Novos vs Recorrentes)
    // Lógica simplificada: conta quantas vezes o cliente aparece na lista filtrada
    const clientesCount = {};
    finalizados.forEach(ag => {
        const nome = ag.nome_cliente || 'Anônimo';
        clientesCount[nome] = (clientesCount[nome] || 0) + 1;
    });
    let recorrentes = 0, novos = 0;
    Object.values(clientesCount).forEach(qtd => {
        if (qtd > 1) recorrentes++; else novos++;
    });
    const graphRetencao = [
        { name: 'Recorrentes', value: recorrentes },
        { name: 'Novos / Únicos', value: novos }
    ];

    // G4: Ranking Profissionais
    const profStats = {};
    finalizados.forEach(ag => {
        const nome = ag.profissionais?.nome || 'Sem registro';
        profStats[nome] = (profStats[nome] || 0) + (ag.servicos?.preco || 0);
    });
    const graphProfissionais = Object.entries(profStats)
        .map(([nome, total]) => ({ nome, total }))
        .sort((a,b) => b.total - a.total);

    // 4. TABELA FINANCEIRA AGRUPADA (Para o Report PDF e Tela)
    const tabelaAgrupada = {};
    // Inicializa todos os profissionais para garantir que apareçam mesmo com zero (se quiser)
    // Neste caso, vamos mostrar apenas quem teve movimento
    finalizados.forEach(ag => {
        const pId = ag.profissional_id;
        const pNome = ag.profissionais?.nome || 'Profissional Removido';
        
        if (!tabelaAgrupada[pId]) {
            tabelaAgrupada[pId] = { id: pId, nome: pNome, itens: [], total: 0 };
        }
        tabelaAgrupada[pId].itens.push(ag);
        tabelaAgrupada[pId].total += (ag.servicos?.preco || 0);
    });

    return {
      kpis: { faturamentoTotal, ticketMedio, totalAtendimentos, taxaCancelamento, faturamentoProjetado },
      graficos: { graphFaturamento, graphServicosRentaveis, graphRetencao, graphProfissionais },
      dadosFiltrados: filtered,
      tabelaFinanceira: Object.values(tabelaAgrupada).sort((a,b) => b.total - a.total) // Ordena quem vendeu mais
    };
  }, [rawData, dataInicio, dataFim, filtroProfissional]);

  // --- FUNÇÃO: EXPORTAR PDF COMPLETO ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const periodoStr = `${formatarData(dataInicio)} a ${formatarData(dataFim)}`;
    
    // Cabeçalho Visual
    doc.setFillColor(192, 38, 211); // Fuchsia 600
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Faturamento", 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${periodoStr}`, 105, 24, { align: 'center' });

    // Filtros Aplicados
    doc.setTextColor(100);
    doc.setFontSize(10);
    const profNome = filtroProfissional === 'todos' 
        ? 'Todos os Profissionais' 
        : allProfissionais.find(p => String(p.id) === String(filtroProfissional))?.nome || 'Profissional Específico';
    doc.text(`Filtro: ${profNome}`, 14, 40);

    // Resumo de KPIs
    doc.setFillColor(245, 243, 255); // Fundo claro
    doc.roundedRect(14, 45, 182, 25, 3, 3, 'F');
    
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    
    doc.text("Faturamento Total", 25, 55);
    doc.text("Atendimentos", 90, 55);
    doc.text("Ticket Médio", 150, 55);
    
    doc.setFontSize(14);
    doc.setTextColor(192, 38, 211); // Cor destaque
    doc.text(formatarMoeda(kpis.faturamentoTotal), 25, 63);
    doc.text(String(kpis.totalAtendimentos), 90, 63);
    doc.text(formatarMoeda(kpis.ticketMedio), 150, 63);

    let currentY = 80;

    // Tabela Detalhada
    if (tabelaFinanceira.length === 0) {
        doc.setTextColor(150);
        doc.text("Nenhum registro encontrado para este período.", 105, 90, { align: 'center' });
    } else {
        const bodyData = [];
        
        tabelaFinanceira.forEach(grupo => {
            // Linha Separadora do Profissional
            bodyData.push([{ 
                content: `${grupo.nome.toUpperCase()} - Total: ${formatarMoeda(grupo.total)}`, 
                colSpan: 4, 
                styles: { 
                    fillColor: [240, 240, 240], 
                    textColor: [80, 80, 80], 
                    fontStyle: 'bold',
                    halign: 'left'
                } 
            }]);

            // Itens do Profissional
            grupo.itens.forEach(item => {
                bodyData.push([
                    format(new Date(item.data_hora_inicio), 'dd/MM HH:mm'),
                    item.nome_cliente || 'Consumidor Final',
                    item.servicos?.nome || 'Serviço Diverso',
                    formatarMoeda(item.servicos?.preco || 0)
                ]);
            });
        });

        autoTable(doc, {
            head: [['Data/Hora', 'Cliente', 'Serviço', 'Valor']],
            body: bodyData,
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: [88, 28, 135], halign: 'center' }, // Roxo escuro
            columnStyles: {
                0: { cellWidth: 35 },
                3: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
            },
            styles: { fontSize: 10, cellPadding: 4 },
        });
        
        // Rodapé do Relatório
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Relatório gerado em ${new Date().toLocaleString('pt-BR')}`, 14, finalY);
    }

    doc.save(`Faturamento_${format(dataInicio, 'dd-MM')}_a_${format(dataFim, 'dd-MM')}.pdf`);
  };

  // --- PREPARAÇÃO CSV (EXCEL) ---
  const csvData = useMemo(() => {
    return dadosFiltrados.map(ag => ({
        Data: format(new Date(ag.data_hora_inicio), 'dd/MM/yyyy'),
        Hora: format(new Date(ag.data_hora_inicio), 'HH:mm'),
        Profissional: ag.profissionais?.nome,
        Cliente: ag.nome_cliente,
        Servico: ag.servicos?.nome,
        Status: ag.status,
        Valor: (ag.servicos?.preco || 0).toFixed(2).replace('.', ',')
    }));
  }, [dadosFiltrados]);

  // --- RENDERIZAÇÃO ---
  if (loading && rawData.length === 0) return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 flex-col gap-4">
        <div className="w-16 h-16 border-4 border-fuchsia-200 border-t-fuchsia-600 rounded-full animate-spin"></div>
        <p className="text-fuchsia-800 font-bold animate-pulse">Carregando Inteligência de Negócio...</p>
    </div>
  );

  return (
    <div className="max-w-[1920px] mx-auto p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      
      {/* 1. HEADER E BARRA DE FILTROS (STICKY) */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 mb-8 sticky top-4 z-50 transition-all">
          <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
              
              {/* Título */}
              <div className="flex items-center gap-4 w-full xl:w-auto">
                 <div className="w-14 h-14 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-fuchsia-200 text-white">
                    📊
                 </div>
                 <div>
                    <h1 className="text-2xl font-black text-slate-800 leading-none tracking-tight">Dashboard Master</h1>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Visão Estratégica</p>
                 </div>
              </div>

              {/* Filtros Centrais */}
              <div className="flex flex-col lg:flex-row items-center gap-3 w-full xl:w-auto bg-slate-50 p-2 rounded-[1.5rem] border border-slate-200">
                  
                  {/* Dropdown de Períodos Rápidos */}
                  <div className="relative w-full lg:w-auto group">
                      <select 
                          value={periodoPredefinido} 
                          onChange={(e) => setPeriodoPredefinido(e.target.value)}
                          className="appearance-none bg-white border-none text-sm font-bold text-slate-600 rounded-2xl pl-4 pr-10 py-3 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-500 w-full cursor-pointer hover:bg-slate-50 transition"
                      >
                          <option value="hoje">📅 Hoje</option>
                          <option value="ontem">⏮️ Ontem</option>
                          <option value="7_dias">🗓️ Últimos 7 dias</option>
                          <option value="15_dias">🗓️ Últimos 15 dias</option>
                          <option value="mes_atual">📅 Este Mês</option>
                          <option value="ano_atual">📆 Este Ano</option>
                          <option value="custom">✏️ Personalizado</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                  </div>

                  {/* Date Pickers (Custom) */}
                  <div className={`flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-transparent transition-all ${periodoPredefinido === 'custom' ? 'border-fuchsia-400 ring-2 ring-fuchsia-100' : ''}`}>
                      <DatePicker 
                          selected={dataInicio} 
                          onChange={(date) => { setDataInicio(date); setPeriodoPredefinido('custom'); }} 
                          dateFormat="dd/MM/yyyy"
                          className="w-24 text-center text-sm font-bold text-slate-600 outline-none cursor-pointer bg-transparent placeholder-slate-300"
                          placeholderText="Início"
                      />
                      <span className="text-slate-300 font-bold">➝</span>
                      <DatePicker 
                          selected={dataFim} 
                          onChange={(date) => { setDataFim(date); setPeriodoPredefinido('custom'); }} 
                          dateFormat="dd/MM/yyyy"
                          className="w-24 text-center text-sm font-bold text-slate-600 outline-none cursor-pointer bg-transparent placeholder-slate-300"
                          placeholderText="Fim"
                      />
                  </div>

                  <div className="w-[1px] h-8 bg-slate-200 hidden lg:block"></div>

                  {/* Filtro Profissional */}
                  <div className="relative w-full lg:w-auto">
                      <select 
                          value={filtroProfissional} 
                          onChange={(e) => setFiltroProfissional(e.target.value)}
                          className="appearance-none bg-white border-none text-sm font-bold text-fuchsia-700 rounded-2xl pl-4 pr-10 py-3 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-500 w-full cursor-pointer hover:bg-fuchsia-50 transition"
                      >
                          <option value="todos">👥 Todos Profissionais</option>
                          {allProfissionais.map(p => <option key={p.id} value={p.id}>👤 {p.nome}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-fuchsia-300 pointer-events-none text-xs">▼</div>
                  </div>
              </div>

              {/* Botões de Ação (Export) */}
              <div className="flex gap-2 w-full xl:w-auto">
                 <CSVLink 
                    data={csvData} 
                    headers={[
                        { label: "Data", key: "Data" },
                        { label: "Hora", key: "Hora" },
                        { label: "Profissional", key: "Profissional" },
                        { label: "Cliente", key: "Cliente" },
                        { label: "Serviço", key: "Servico" },
                        { label: "Valor", key: "Valor" },
                        { label: "Status", key: "Status" }
                    ]}
                    filename={`Relatorio_${format(dataInicio, 'dd-MM')}_a_${format(dataFim, 'dd-MM')}.csv`} 
                    className="flex-1 xl:flex-none py-3 px-5 bg-green-50 text-green-700 font-bold text-xs rounded-2xl hover:bg-green-100 transition flex items-center justify-center gap-2 border border-green-200 shadow-sm hover:shadow-md active:scale-95"
                 >
                    📊 Excel
                 </CSVLink>
                 <button 
                    onClick={handleExportPDF} 
                    className="flex-1 xl:flex-none py-3 px-5 bg-red-50 text-red-700 font-bold text-xs rounded-2xl hover:bg-red-100 transition flex items-center justify-center gap-2 border border-red-200 shadow-sm hover:shadow-md active:scale-95"
                 >
                    📄 PDF
                 </button>
              </div>
          </div>
      </div>

      {/* 2. CARDS DE KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-in fade-in duration-700">
         <KpiCard 
            title="Faturamento Realizado" 
            value={formatarMoeda(kpis.faturamentoTotal)} 
            icon="💰" 
            colorClass="text-emerald-600" 
            subtext={`${kpis.totalAtendimentos} atendimentos concluídos`}
         />
         <KpiCard 
            title="Ticket Médio" 
            value={formatarMoeda(kpis.ticketMedio)} 
            icon="💎" 
            colorClass="text-fuchsia-600" 
            subtext="Valor médio por cliente"
         />
         <KpiCard 
            title="Taxa de Cancelamento" 
            value={`${kpis.taxaCancelamento}%`} 
            icon="📉" 
            colorClass={parseFloat(kpis.taxaCancelamento) > 15 ? "text-red-500" : "text-blue-500"} 
            subtext="Agendamentos perdidos"
         />
         <KpiCard 
            title="Previsão de Receita" 
            value={formatarMoeda(kpis.faturamentoProjetado)} 
            icon="🚀" 
            colorClass="text-amber-500" 
            subtext="Incluindo agendados futuros"
         />
      </div>

      {/* 3. GRÁFICOS ESTRATÉGICOS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
         
         {/* Gráfico 1: Evolução Diária (Area) */}
         <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 xl:col-span-2 hover:shadow-md transition-shadow">
            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
               <span className="w-3 h-8 bg-fuchsia-500 rounded-full"></span> 
               Evolução do Faturamento Diário
            </h3>
            <div className="h-[320px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graficos.graphFaturamento}>
                     <defs>
                        <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#c026d3" stopOpacity={0.2}/>
                           <stop offset="95%" stopColor="#c026d3" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="dia" tick={{fontSize: 11, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                     <YAxis hide />
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        formatter={(val) => [formatarMoeda(val), 'Receita']}
                        labelStyle={{ color: '#64748b', fontWeight: 'bold' }}
                     />
                     <Area type="monotone" dataKey="valor" stroke="#c026d3" strokeWidth={4} fillOpacity={1} fill="url(#colorFat)" activeDot={{ r: 8, strokeWidth: 0 }} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Gráfico 2: Retenção (Novo vs Recorrente) */}
         <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
            <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
               <span className="w-3 h-8 bg-amber-500 rounded-full"></span> 
               Fidelização (Retenção)
            </h3>
            <p className="text-xs text-slate-400 mb-6">Proporção entre clientes novos e recorrentes.</p>
            
            <div className="flex-1 min-h-[200px] relative">
               <ResponsiveContainer>
                  <PieChart>
                     <Pie 
                        data={graficos.graphRetencao} 
                        innerRadius={65} 
                        outerRadius={85} 
                        paddingAngle={5} 
                        dataKey="value"
                        cornerRadius={10}
                     >
                        <Cell fill="#f59e0b" /> {/* Recorrente */}
                        <Cell fill="#cbd5e1" /> {/* Novo */}
                     </Pie>
                     <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                     <Legend verticalAlign="bottom" iconType="circle" />
                  </PieChart>
               </ResponsiveContainer>
               {/* Centro do Donut */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                   <div className="text-center">
                       <span className="block text-3xl font-black text-amber-500">
                           {graficos.graphRetencao.reduce((acc, curr) => acc + curr.value, 0) > 0 
                             ? ((graficos.graphRetencao[0]?.value / graficos.graphRetencao.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(0) 
                             : 0}%
                       </span>
                       <span className="text-[10px] uppercase font-bold text-slate-400">Fiéis</span>
                   </div>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico 3: Serviços Rentáveis */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
             <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
               <span className="w-3 h-8 bg-indigo-500 rounded-full"></span> 
               Top 5 Serviços (Receita Total)
             </h3>
             <div className="h-[300px]">
                <ResponsiveContainer>
                   <BarChart data={graficos.graphServicosRentaveis} layout="vertical" margin={{left: 0, right: 20}}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="nome" type="category" width={140} tick={{fontSize: 11, fontWeight: 'bold', fill: '#64748b'}} interval={0} />
                      <Tooltip 
                         cursor={{fill: '#f8fafc'}}
                         formatter={(val, name) => [
                            name === 'total' ? formatarMoeda(val) : (name === 'ticket' ? formatarMoeda(val) : val),
                            name === 'total' ? 'Faturamento Total' : (name === 'ticket' ? 'Preço Médio' : 'Quantidade')
                         ]}
                         contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}}
                      />
                      <Bar dataKey="total" name="total" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={24} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Gráfico 4: Ranking Profissionais */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
             <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
               <span className="w-3 h-8 bg-emerald-500 rounded-full"></span> 
               Ranking de Profissionais
             </h3>
             <div className="h-[300px]">
                <ResponsiveContainer>
                   <BarChart data={graficos.graphProfissionais} barCategoryGap={20}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="nome" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        formatter={(val) => formatarMoeda(val)} 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} 
                      />
                      <Bar dataKey="total" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40}>
                        {graficos.graphProfissionais.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index === 0 ? '#059669' : '#34d399'} />
                        ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

      {/* 4. TABELA FINANCEIRA DETALHADA */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
             <div>
                 <h2 className="text-xl font-black text-slate-800">Detalhamento Financeiro</h2>
                 <p className="text-xs text-slate-500 font-bold mt-1">Dados filtrados de {formatarData(dataInicio)} até {formatarData(dataFim)}</p>
             </div>
             <div className="text-right hidden md:block">
                 <span className="block text-xs font-bold text-slate-400 uppercase">Total Geral</span>
                 <span className="text-2xl font-black text-fuchsia-600">{formatarMoeda(kpis.faturamentoTotal)}</span>
             </div>
         </div>
         
         <div className="p-8">
            {tabelaFinanceira.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <div className="text-4xl mb-3 opacity-30">📂</div>
                    <p className="text-slate-400 font-bold">Nenhum registro financeiro encontrado para este filtro.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {tabelaFinanceira.map((grupo, idx) => (
                        <div key={idx} className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition bg-white">
                            {/* Cabeçalho do Grupo (Profissional) */}
                            <div className="bg-slate-50/80 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100">
                                <h3 className="font-bold text-slate-700 flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sm shadow-sm border border-slate-100">👤</span>
                                    {grupo.nome}
                                </h3>
                                <div className="bg-white px-5 py-2 rounded-xl shadow-sm border border-slate-100 text-sm font-black text-fuchsia-700">
                                    Subtotal: {formatarMoeda(grupo.total)}
                                </div>
                            </div>

                            {/* Tabela de Itens */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-600">
                                    <thead className="text-xs text-slate-400 uppercase bg-white border-b border-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">Data / Hora</th>
                                            <th className="px-6 py-4 font-bold">Cliente</th>
                                            <th className="px-6 py-4 font-bold">Serviço Realizado</th>
                                            <th className="px-6 py-4 font-bold text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {grupo.itens.map(ag => (
                                            <tr key={ag.id} className="hover:bg-fuchsia-50/30 transition">
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                                    {format(new Date(ag.data_hora_inicio), 'dd/MM/yyyy')} <span className="text-slate-300">|</span> {format(new Date(ag.data_hora_inicio), 'HH:mm')}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-700">{ag.nome_cliente}</td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">
                                                        {ag.servicos?.nome}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-800">{formatarMoeda(ag.servicos?.preco || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
      </div>
    </div>
  );
}

export default DashboardPage;