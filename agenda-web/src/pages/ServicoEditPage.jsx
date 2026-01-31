import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '/src/supabaseClient.js';

// --- IMPORTS DO CALENDÁRIO ---
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

// Registra o idioma português
registerLocale('pt-BR', ptBR);

const DIAS_SEMANA = [
  { numero: 0, nome: 'Dom' },
  { numero: 1, nome: 'Seg' },
  { numero: 2, nome: 'Ter' },
  { numero: 3, nome: 'Qua' },
  { numero: 4, nome: 'Qui' },
  { numero: 5, nome: 'Sex' },
  { numero: 6, nome: 'Sab' },
];

function ServicoEditPage() {
  const { id } = useParams(); 
  const navigate = useNavigate(); 

  // States do formulário Básico
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [duracao, setDuracao] = useState(30);
  const [preco, setPreco] = useState(0);
  const [fotoUrl, setFotoUrl] = useState(null);
  
  // --- NOVOS STATES DE DISPONIBILIDADE ---
  const [tipoDisponibilidade, setTipoDisponibilidade] = useState('semanal'); // 'semanal' ou 'datas'
  const [diasSelecionados, setDiasSelecionados] = useState(new Set()); // Para Semanal
  const [datasEspecificas, setDatasEspecificas] = useState([]); // Para Datas Específicas (Array de Date)
  
  const [novaFoto, setNovaFoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Busca os dados e Preenche o estado correto
  useEffect(() => {
    async function fetchServico() {
      setLoading(true);
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Erro ao buscar serviço:', error);
        setError('Serviço não encontrado.');
      } else {
        setNome(data.nome);
        setDescricao(data.descricao || '');
        setDuracao(data.duracao_minutos);
        setPreco(data.preco);
        setFotoUrl(data.foto_url);
        
        // --- LÓGICA INTELIGENTE DE PREENCHIMENTO ---
        // Verifica se tem datas específicas salvas
        if (data.datas_especificas && data.datas_especificas.length > 0) {
            setTipoDisponibilidade('datas');
            setDiasSelecionados(new Set()); // Limpa semanal
            
            // Converte as strings 'YYYY-MM-DD' do banco para objetos Date do JS
            const datasConvertidas = data.datas_especificas.map(dataStr => {
                const [ano, mes, dia] = dataStr.split('-').map(Number);
                return new Date(ano, mes - 1, dia);
            });
            setDatasEspecificas(datasConvertidas);

        } else {
            // Caso contrário, assume modo Semanal (padrão)
            setTipoDisponibilidade('semanal');
            setDiasSelecionados(new Set(data.dias_disponiveis || [0,1,2,3,4,5,6]));
            setDatasEspecificas([]);
        }
      }
      setLoading(false);
    }
    fetchServico();
  }, [id]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setNovaFoto(e.target.files[0]);
    }
  };
  
  // Função para marcar/desmarcar dias da semana
  const handleDiaToggle = (diaNumero) => {
    setDiasSelecionados(prevDias => {
      const novosDias = new Set(prevDias);
      if (novosDias.has(diaNumero)) {
        novosDias.delete(diaNumero);
      } else {
        novosDias.add(diaNumero);
      }
      return novosDias;
    });
  };

  // Função para marcar/desmarcar datas específicas no calendário
  const handleDataEspecificaSelect = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const exists = datasEspecificas.some(d => d.toISOString().split('T')[0] === dateStr);

    if (exists) {
      // Remove se já existe
      setDatasEspecificas(datasEspecificas.filter(d => d.toISOString().split('T')[0] !== dateStr));
    } else {
      // Adiciona se não existe
      setDatasEspecificas([...datasEspecificas, date]);
    }
  };

  // 2. Função para salvar (ATUALIZADA)
  const handleSave = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    
    // Validação
    if (tipoDisponibilidade === 'semanal' && diasSelecionados.size === 0) {
        setError('Para disponibilidade semanal, selecione pelo menos um dia.');
        setIsUploading(false); return;
    }
    if (tipoDisponibilidade === 'datas' && datasEspecificas.length === 0) {
        setError('Para datas específicas, selecione pelo menos uma data no calendário.');
        setIsUploading(false); return;
    }

    let urlParaSalvar = fotoUrl; 

    // Upload de Foto (Se houver nova)
    if (novaFoto) {
      if (fotoUrl) {
        const oldFileName = fotoUrl.split('/').pop();
        await supabase.storage.from('servico-fotos').remove([oldFileName]);
      }
      const newFileName = `${Date.now()}-${novaFoto.name}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('servico-fotos')
        .upload(newFileName, novaFoto);
      if (uploadError) {
        setError(`Erro no upload: ${uploadError.message}`);
        setIsUploading(false);
        return;
      }
      const { data: publicUrlData } = supabase
        .storage
        .from('servico-fotos')
        .getPublicUrl(uploadData.path);
      urlParaSalvar = publicUrlData.publicUrl;
    }

    // Preparação dos dados de disponibilidade para o banco
    let payloadDias = null;
    let payloadDatas = null;

    if (tipoDisponibilidade === 'semanal') {
        payloadDias = Array.from(diasSelecionados);
        payloadDatas = null; // Limpa as datas específicas no banco
    } else {
        // Converte Dates para Strings 'YYYY-MM-DD'
        payloadDatas = datasEspecificas.map(d => d.toISOString().split('T')[0]);
        payloadDias = null; // Limpa os dias da semana no banco
    }

    // Atualiza o banco
    const { error: updateError } = await supabase
      .from('servicos')
      .update({
        nome: nome,
        descricao: descricao,
        duracao_minutos: duracao,
        preco: preco,
        foto_url: urlParaSalvar,
        dias_disponiveis: payloadDias, 
        datas_especificas: payloadDatas 
      })
      .eq('id', id);

    if (updateError) {
      setError(`Erro ao salvar: ${updateError.message}`);
    } else {
      alert('Serviço atualizado com sucesso!');
      navigate('/admin/servicos'); 
    }
    setIsUploading(false);
  };

  if (loading) return <div className="p-10 text-center">Carregando dados do serviço...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-10">
      
      <Link to="/admin/servicos" className="text-fuchsia-600 hover:underline flex items-center gap-1">
        <span>&larr;</span> Voltar para a lista de serviços
      </Link>
      
      {/* --- FORMULÁRIO DE EDIÇÃO --- */}
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <div className="bg-fuchsia-100 p-2 rounded-full text-fuchsia-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Editar Serviço</h1>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">{error}</div>}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Dados Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Serviço</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descrição (Opcional)</label>
                <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Duração (min)</label>
              <input type="number" value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Preço (R$)</label>
              <input type="number" step="0.01" value={preco} onChange={(e) => setPreco(Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all" />
            </div>
          </div>
          
          {/* --- ÁREA DE DISPONIBILIDADE (Igual ao Cadastro) --- */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
             <label className="block text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📅</span> Tipo de Disponibilidade
             </label>
             
             {/* Seletor de Tipo (Radio Buttons) */}
             <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${tipoDisponibilidade === 'semanal' ? 'bg-white border-fuchsia-500 shadow-sm' : 'bg-transparent border-gray-300'}`}>
                  <input 
                    type="radio" 
                    name="tipoDisp" 
                    checked={tipoDisponibilidade === 'semanal'} 
                    onChange={() => setTipoDisponibilidade('semanal')}
                    className="text-fuchsia-600 focus:ring-fuchsia-500 w-5 h-5"
                  />
                  <span className="text-gray-700 font-medium">Dias da Semana (Recorrente)</span>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${tipoDisponibilidade === 'datas' ? 'bg-white border-fuchsia-500 shadow-sm' : 'bg-transparent border-gray-300'}`}>
                  <input 
                    type="radio" 
                    name="tipoDisp" 
                    checked={tipoDisponibilidade === 'datas'} 
                    onChange={() => setTipoDisponibilidade('datas')}
                    className="text-fuchsia-600 focus:ring-fuchsia-500 w-5 h-5"
                  />
                  <span className="text-gray-700 font-medium">Datas Específicas (Calendário)</span>
                </label>
             </div>

             {/* Opção 1: Dias da Semana */}
             {tipoDisponibilidade === 'semanal' && (
               <div className="animate-fade-in">
                 <p className="text-sm text-gray-500 mb-3">Selecione os dias da semana em que este serviço ocorre:</p>
                 <div className="flex flex-wrap gap-2">
                   {DIAS_SEMANA.map(dia => (
                     <label key={dia.numero} className={`flex items-center justify-center px-4 py-2 rounded-full cursor-pointer text-sm font-bold transition-all border select-none ${diasSelecionados.has(dia.numero) ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-md transform scale-105' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'}`}>
                       <input type="checkbox" checked={diasSelecionados.has(dia.numero)} onChange={() => handleDiaToggle(dia.numero)} className="hidden" />
                       {dia.nome}
                     </label>
                   ))}
                 </div>
               </div>
             )}

             {/* Opção 2: Calendário de Datas Específicas */}
             {tipoDisponibilidade === 'datas' && (
               <div className="animate-fade-in flex flex-col items-center">
                 <p className="text-sm text-gray-500 mb-4 text-center">Clique nas datas para adicionar ou remover (ex: Dia do Laser, Botox Day):</p>
                 <div className="inline-block border rounded-xl bg-white p-4 shadow-sm">
                    <DatePicker
                       selected={null}
                       onChange={handleDataEspecificaSelect}
                       inline
                       locale="pt-BR"
                       minDate={new Date()}
                       highlightDates={datasEspecificas}
                       dayClassName={(date) => {
                          const dateStr = date.toISOString().split('T')[0];
                          return datasEspecificas.some(d => d.toISOString().split('T')[0] === dateStr)
                            ? "bg-fuchsia-600 text-white font-bold rounded-full hover:bg-fuchsia-700" 
                            : undefined;
                       }}
                    />
                 </div>
                 <div className="mt-4 text-sm font-bold text-fuchsia-700 bg-fuchsia-50 px-4 py-2 rounded-lg border border-fuchsia-100">
                    {datasEspecificas.length} datas selecionadas
                 </div>
               </div>
             )}
          </div>
          
          {/* Campo de Foto */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Foto do Serviço (Opcional)</label>
            <div className="flex items-start gap-4">
                {fotoUrl && !novaFoto && (
                  <img src={fotoUrl} alt="Foto atual" className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
                )}
                <div className="flex-1">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg"
                      className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2.5 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-fuchsia-50 file:text-fuchsia-700
                                hover:file:bg-fuchsia-100
                                cursor-pointer"
                    />
                    <p className="text-xs text-gray-400 mt-2">Formatos: JPG ou PNG. Selecione uma nova para substituir.</p>
                </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-4 rounded-xl text-white font-bold text-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 transition-all shadow-lg transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Salvando Alterações...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ServicoEditPage;