import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { Link } from 'react-router-dom';

// --- IMPORTS PARA O CALENDÁRIO E MODAL ---
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import Modal from 'react-modal'; // Importante para o Modal de Edição em Massa
import 'react-datepicker/dist/react-datepicker.css';

// Registra o idioma português para o calendário
registerLocale('pt-BR', ptBR);
Modal.setAppElement('#root'); // Acessibilidade do Modal

const DIAS_SEMANA = [
  { numero: 0, nome: 'Dom' }, { numero: 1, nome: 'Seg' }, { numero: 2, nome: 'Ter' },
  { numero: 3, nome: 'Qua' }, { numero: 4, nome: 'Qui' }, { numero: 5, nome: 'Sex' }, { numero: 6, nome: 'Sab' },
];

function ServicosPage() {
  // Abas: 'servicos' ou 'categorias'
  const [activeTab, setActiveTab] = useState('servicos');

  // --- DADOS ---
  const [servicos, setServicos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- FORMULÁRIO CRIAR SERVIÇO (Individual) ---
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [duracao, setDuracao] = useState(30); 
  const [preco, setPreco] = useState(0);
  const [foto, setFoto] = useState(null); 
  const [categoriaId, setCategoriaId] = useState('');
  
  // Disponibilidade (Criação)
  const [tipoDisponibilidade, setTipoDisponibilidade] = useState('semanal'); 
  const [diasSelecionados, setDiasSelecionados] = useState(new Set([0,1,2,3,4,5,6])); 
  const [datasEspecificas, setDatasEspecificas] = useState([]); 

  // --- SELEÇÃO EM MASSA (BULK ACTIONS) ---
  const [selectedServiceIds, setSelectedServiceIds] = useState(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // States do Modal de Edição em Massa (Separados do form de criação)
  const [bulkTipo, setBulkTipo] = useState('semanal');
  const [bulkDias, setBulkDias] = useState(new Set([0,1,2,3,4,5,6]));
  const [bulkDatas, setBulkDatas] = useState([]);

  // --- FORMULÁRIO CATEGORIA ---
  const [catNome, setCatNome] = useState('');
  const [catFoto, setCatFoto] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchDados();
  }, []);

  async function fetchDados() {
    setLoading(true);
    // Busca Serviços
    const { data: sData, error: sError } = await supabase.from('servicos').select('*, categorias(nome)').order('nome');
    if (sData) setServicos(sData);
    if (sError) console.error("Erro ao buscar serviços:", sError);
    
    // Busca Categorias
    const { data: cData } = await supabase.from('categorias').select('*').order('nome');
    if (cData) setCategorias(cData);
    
    setLoading(false);
  }

  // --- UPLOAD GENÉRICO ---
  const uploadImage = async (file, bucket) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  };

  // ==========================================
  //          LÓGICA DE SELEÇÃO EM MASSA
  // ==========================================

  // Selecionar/Deselecionar um serviço
  const toggleSelectService = (id) => {
    setSelectedServiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // Selecionar Todos / Nenhum
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(servicos.map(s => s.id));
      setSelectedServiceIds(allIds);
    } else {
      setSelectedServiceIds(new Set());
    }
  };

  // Abrir Modal de Edição em Massa
  const openBulkModal = () => {
    if (selectedServiceIds.size === 0) return alert("Selecione pelo menos um serviço.");
    // Reseta os estados do modal para o padrão
    setBulkTipo('semanal');
    setBulkDias(new Set([0,1,2,3,4,5,6]));
    setBulkDatas([]);
    setIsBulkModalOpen(true);
  };

  // Salvar Edição em Massa
  const handleBulkSave = async () => {
    setIsBulkSaving(true);
    setError(null);
    setSuccess(null);

    // Validação Bulk
    let payloadDias = null;
    let payloadDatas = null;

    if (bulkTipo === 'semanal') {
       if (bulkDias.size === 0) {
         alert('Selecione pelo menos um dia da semana.');
         setIsBulkSaving(false); return;
       }
       payloadDias = Array.from(bulkDias);
       payloadDatas = null;
    } else {
       if (bulkDatas.length === 0) {
         alert('Selecione pelo menos uma data no calendário.');
         setIsBulkSaving(false); return;
       }
       payloadDatas = bulkDatas.map(d => d.toISOString().split('T')[0]);
       payloadDias = null;
    }

    try {
      const idsArray = Array.from(selectedServiceIds);
      const { error } = await supabase
        .from('servicos')
        .update({
          dias_disponiveis: payloadDias,
          datas_especificas: payloadDatas
        })
        .in('id', idsArray);

      if (error) throw error;

      setSuccess(`Disponibilidade atualizada para ${idsArray.length} serviços!`);
      setSelectedServiceIds(new Set()); // Limpa seleção
      setIsBulkModalOpen(false); // Fecha modal
      fetchDados(); // Recarrega lista
    } catch (err) {
      console.error(err);
      setError('Erro ao atualizar em massa: ' + err.message);
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Handlers para o Modal Bulk (separados dos handlers de criação)
  const handleBulkDiaToggle = (dia) => {
    setBulkDias(prev => {
      const novos = new Set(prev);
      novos.has(dia) ? novos.delete(dia) : novos.add(dia);
      return novos;
    });
  };

  const handleBulkDataSelect = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const exists = bulkDatas.some(d => d.toISOString().split('T')[0] === dateStr);
    if (exists) {
      setBulkDatas(bulkDatas.filter(d => d.toISOString().split('T')[0] !== dateStr));
    } else {
      setBulkDatas([...bulkDatas, date]);
    }
  };

  // ==========================================
  //       LÓGICA DE CRIAÇÃO (Individual)
  // ==========================================
  
  const handleDiaToggle = (dia) => {
    setDiasSelecionados(prev => {
      const novos = new Set(prev);
      novos.has(dia) ? novos.delete(dia) : novos.add(dia);
      return novos;
    });
  };

  const handleDataEspecificaSelect = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const exists = datasEspecificas.some(d => d.toISOString().split('T')[0] === dateStr);
    if (exists) {
      setDatasEspecificas(datasEspecificas.filter(d => d.toISOString().split('T')[0] !== dateStr));
    } else {
      setDatasEspecificas([...datasEspecificas, date]);
    }
  };

  const handleSubmitServico = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    
    if (!nome || duracao <= 0 || preco < 0 || !categoriaId) {
      setError('Preencha Nome, Duração, Preço e selecione uma Categoria.');
      return;
    }

    let payloadDias = null;
    let payloadDatas = null;

    if (tipoDisponibilidade === 'semanal') {
       if (diasSelecionados.size === 0) {
         setError('Selecione pelo menos um dia da semana.'); return;
       }
       payloadDias = Array.from(diasSelecionados);
    } else {
       if (datasEspecificas.length === 0) {
         setError('Selecione pelo menos uma data no calendário.'); return;
       }
       payloadDatas = datasEspecificas.map(d => d.toISOString().split('T')[0]);
    }

    setIsUploading(true);
    try {
      let fotoUrl = null;
      if (foto) fotoUrl = await uploadImage(foto, 'servico-fotos');

      const { error } = await supabase.from('servicos').insert({
        nome, descricao, duracao_minutos: duracao, preco,
        foto_url: fotoUrl, categoria_id: categoriaId,
        dias_disponiveis: payloadDias, datas_especificas: payloadDatas
      });

      if (error) throw error;

      setSuccess('Serviço criado com sucesso!');
      
      setNome(''); setDescricao(''); setDuracao(30); setPreco(0); setFoto(null); setCategoriaId('');
      setTipoDisponibilidade('semanal');
      setDiasSelecionados(new Set([0,1,2,3,4,5,6]));
      setDatasEspecificas([]);
      
      const fileInput = document.getElementById('file-upload');
      if(fileInput) fileInput.value = '';
      
      fetchDados();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteServico = async (id) => {
    if(!confirm('Deletar este serviço?')) return;
    await supabase.from('profissionais_servicos').delete().eq('servico_id', id);
    await supabase.from('servicos').delete().eq('id', id);
    fetchDados();
  };

  // ==========================================
  //          LÓGICA DE CATEGORIAS
  // ==========================================
  
  const handleEditCategoryClick = (categoria) => {
    setEditingCategory(categoria);
    setCatNome(categoria.nome);
    setCatFoto(null); 
    setError(null); setSuccess(null);
    window.scrollTo(0, 0); 
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setCatNome(''); setCatFoto(null);
    setError(null); setSuccess(null);
  };

  const handleSubmitCategoria = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!catNome) { setError('Nome da categoria é obrigatório.'); return; }

    setIsUploading(true);
    try {
      let fotoUrl = editingCategory ? editingCategory.foto_url : null;
      if (catFoto) {
         fotoUrl = await uploadImage(catFoto, 'servico-fotos'); 
      }

      if (editingCategory) {
        const { error } = await supabase.from('categorias').update({ nome: catNome, foto_url: fotoUrl }).eq('id', editingCategory.id);
        if (error) throw error;
        setSuccess('Categoria atualizada com sucesso!');
      } else {
        const { error } = await supabase.from('categorias').insert({ nome: catNome, foto_url: fotoUrl });
        if (error) throw error;
        setSuccess('Categoria criada com sucesso!');
      }

      setEditingCategory(null); setCatNome(''); setCatFoto(null);
      const catInput = document.getElementById('cat-upload');
      if(catInput) catInput.value = '';
      fetchDados();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCategoria = async (id) => {
    if(!confirm('Tem certeza? Serviços nesta categoria ficarão "Sem Categoria".')) return;
    await supabase.from('servicos').update({ categoria_id: null }).eq('categoria_id', id);
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) { alert('Erro ao deletar: ' + error.message); } else { fetchDados(); }
  };

  // ==========================================
  //                 RENDER
  // ==========================================
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Gestão de Catálogo</h1>

      {/* ABAS */}
      <div className="flex border-b border-gray-200">
        <button
          className={`py-3 px-6 font-semibold text-sm transition-colors focus:outline-none ${activeTab === 'servicos' ? 'text-fuchsia-600 border-b-2 border-fuchsia-600 bg-fuchsia-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('servicos')}
        >
          Serviços
        </button>
        <button
          className={`py-3 px-6 font-semibold text-sm transition-colors focus:outline-none ${activeTab === 'categorias' ? 'text-fuchsia-600 border-b-2 border-fuchsia-600 bg-fuchsia-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('categorias')}
        >
          Categorias
        </button>
      </div>

      {error && <div className="text-red-700 bg-red-100 border border-red-200 p-4 rounded-lg text-sm">{error}</div>}
      {success && <div className="text-green-700 bg-green-100 border border-green-200 p-4 rounded-lg text-sm">{success}</div>}

      {/* --- CONTEÚDO ABA SERVIÇOS --- */}
      {activeTab === 'servicos' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Form Criar Serviço */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-fuchsia-100 p-2 rounded-full text-fuchsia-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Novo Serviço</h2>
            </div>

            <form onSubmit={handleSubmitServico} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Serviço</label>
                   <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 transition-all outline-none" placeholder="Ex: Corte Bordado" />
                </div>
                <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1">Categoria</label>
                   <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 transition-all outline-none bg-white">
                     <option value="">Selecione uma categoria...</option>
                     {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                   </select>
                </div>
              </div>
              
              <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição (Opcional)</label>
                 <textarea rows="2" value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 transition-all outline-none resize-none" placeholder="Detalhes sobre o procedimento..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1">Duração (min)</label>
                   <input type="number" value={duracao} onChange={e => setDuracao(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 transition-all outline-none" />
                </div>
                <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1">Preço (R$)</label>
                   <input type="number" step="0.01" value={preco} onChange={e => setPreco(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 transition-all outline-none" />
                </div>
              </div>

              {/* Área de Disponibilidade (Criação) */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <label className="block text-sm font-bold text-gray-700 mb-3">Tipo de Disponibilidade</label>
                 <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tipoDisp" checked={tipoDisponibilidade === 'semanal'} onChange={() => setTipoDisponibilidade('semanal')} className="text-fuchsia-600 focus:ring-fuchsia-500" />
                      <span className="text-gray-700 font-medium">Dias da Semana (Recorrente)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tipoDisp" checked={tipoDisponibilidade === 'datas'} onChange={() => setTipoDisponibilidade('datas')} className="text-fuchsia-600 focus:ring-fuchsia-500" />
                      <span className="text-gray-700 font-medium">Datas Específicas (Calendário)</span>
                    </label>
                 </div>

                 {tipoDisponibilidade === 'semanal' && (
                   <div>
                     <p className="text-xs text-gray-500 mb-2">O serviço estará disponível toda semana nestes dias:</p>
                     <div className="flex flex-wrap gap-2">
                       {DIAS_SEMANA.map(dia => (
                         <label key={dia.numero} className={`flex items-center justify-center px-4 py-2 rounded-full cursor-pointer text-sm font-medium transition-all border select-none ${diasSelecionados.has(dia.numero) ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-md' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                           <input type="checkbox" checked={diasSelecionados.has(dia.numero)} onChange={() => handleDiaToggle(dia.numero)} className="hidden" />
                           {dia.nome}
                         </label>
                       ))}
                     </div>
                   </div>
                 )}

                 {tipoDisponibilidade === 'datas' && (
                   <div className="text-center">
                     <p className="text-xs text-gray-500 mb-2">Clique nas datas para adicionar ou remover:</p>
                     <div className="inline-block border rounded-lg bg-white p-2">
                        <DatePicker
                           selected={null}
                           onChange={handleDataEspecificaSelect}
                           inline locale="pt-BR" minDate={new Date()}
                           highlightDates={datasEspecificas}
                           dayClassName={(date) => {
                              const dateStr = date.toISOString().split('T')[0];
                              return datasEspecificas.some(d => d.toISOString().split('T')[0] === dateStr) ? "bg-fuchsia-600 text-white font-bold rounded-full hover:bg-fuchsia-700" : undefined;
                           }}
                        />
                     </div>
                     <div className="mt-2 text-sm text-fuchsia-700 font-bold">{datasEspecificas.length} datas selecionadas</div>
                   </div>
                 )}
              </div>

              <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">Foto do Serviço</label>
                 <div className="flex items-center justify-center w-full">
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {foto ? <p className="text-sm text-green-600 font-semibold">Imagem: {foto.name}</p> : <p className="text-sm text-gray-500"><span className="font-semibold">Clique para enviar</span> uma foto</p>}
                        </div>
                        <input id="file-upload" type="file" className="hidden" onChange={e => setFoto(e.target.files[0])} />
                    </label>
                </div>
              </div>

              <button disabled={isUploading} className="w-full py-3 px-4 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-lg shadow-md transition-all disabled:bg-gray-400">
                {isUploading ? 'Salvando...' : 'Criar Serviço'}
              </button>
            </form>
          </div>

          {/* LISTA DE SERVIÇOS (COM BULK ACTIONS) */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
             
             <div className="flex justify-between items-end mb-6">
                <h2 className="text-xl font-bold text-gray-800">Serviços Cadastrados</h2>
                
                {/* Header da Lista com Selecionar Todos */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                   <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={servicos.length > 0 && selectedServiceIds.size === servicos.length}
                      className="w-4 h-4 text-fuchsia-600 rounded focus:ring-fuchsia-500" 
                   />
                   <span className="text-sm font-semibold text-gray-600">Selecionar Todos</span>
                </div>
             </div>

             {/* BARRA DE AÇÕES EM MASSA */}
             {selectedServiceIds.size > 0 && (
                <div className="mb-4 bg-fuchsia-100 border border-fuchsia-200 p-3 rounded-lg flex justify-between items-center animate-fade-in">
                   <span className="text-fuchsia-800 font-bold text-sm">
                      {selectedServiceIds.size} {selectedServiceIds.size === 1 ? 'serviço selecionado' : 'serviços selecionados'}
                   </span>
                   <button 
                      onClick={openBulkModal}
                      className="bg-fuchsia-600 text-white px-4 py-2 rounded-md font-bold text-sm hover:bg-fuchsia-700 shadow-md transition-all flex items-center gap-2"
                   >
                      📅 Alterar Disponibilidade em Massa
                   </button>
                </div>
             )}

             <ul className="divide-y divide-gray-100">
               {servicos.map(s => (
                 <li key={s.id} className={`py-4 flex justify-between items-center hover:bg-gray-50 rounded-lg px-2 transition-colors ${selectedServiceIds.has(s.id) ? 'bg-fuchsia-50' : ''}`}>
                    <div className="flex items-center gap-4">
                       {/* CHECKBOX INDIVIDUAL */}
                       <input 
                          type="checkbox" 
                          checked={selectedServiceIds.has(s.id)}
                          onChange={() => toggleSelectService(s.id)}
                          className="w-5 h-5 text-fuchsia-600 rounded focus:ring-fuchsia-500 cursor-pointer"
                       />

                       <img src={s.foto_url || 'https://via.placeholder.com/150'} className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                       <div>
                          <p className="font-bold text-gray-800">{s.nome}</p>
                          <div className="text-xs text-gray-500 font-medium uppercase">
                             {s.categorias?.nome || 'Sem Categoria'} 
                             {s.datas_especificas && s.datas_especificas.length > 0 && (
                                <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-[10px] border border-yellow-200">
                                  📅 Datas Especiais
                                </span>
                             )}
                          </div>
                       </div>
                    </div>
                    <div className="flex gap-3 text-sm font-medium">
                       <Link to={`/admin/servicos/${s.id}`} className="text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full">Editar</Link>
                       <button onClick={() => handleDeleteServico(s.id)} className="text-red-600 hover:text-red-800 bg-red-50 px-3 py-1 rounded-full">Excluir</button>
                    </div>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      )}

      {/* --- CONTEÚDO ABA CATEGORIAS (Mantido igual) --- */}
      {activeTab === 'categorias' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
               <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
               </div>
               <h2 className="text-xl font-bold text-gray-800">
                 {editingCategory ? `Editar Categoria: ${editingCategory.nome}` : 'Nova Categoria'}
               </h2>
            </div>
            
            <form onSubmit={handleSubmitCategoria} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nome da Categoria</label>
                    <input type="text" value={catNome} onChange={e => setCatNome(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none" placeholder="Ex: Cabelos" />
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {editingCategory ? 'Trocar Foto (Opcional)' : 'Foto de Capa'}
                    </label>
                    <input id="cat-upload" type="file" onChange={e => setCatFoto(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-200 rounded-lg cursor-pointer" />
                 </div>
               </div>

               <div className="flex gap-3">
                 <button disabled={isUploading} className="flex-1 md:flex-none py-2.5 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all disabled:bg-gray-400">
                   {isUploading ? 'Salvando...' : (editingCategory ? 'Atualizar Categoria' : 'Criar Categoria')}
                 </button>
                 {editingCategory && (
                   <button type="button" onClick={handleCancelEditCategory} className="flex-1 md:flex-none py-2.5 px-6 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all">
                     Cancelar
                   </button>
                 )}
               </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
             <h2 className="text-xl font-bold mb-6 text-gray-800">Categorias Cadastradas</h2>
             {categorias.length === 0 ? (
                <p className="text-center text-gray-400 py-4">Nenhuma categoria cadastrada.</p>
             ) : (
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                 {categorias.map(c => (
                   <div key={c.id} className={`border rounded-xl p-4 text-center relative group hover:shadow-lg transition-all bg-white ${editingCategory?.id === c.id ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                      <div className="w-20 h-20 mx-auto mb-3 rounded-full p-1 border-2 border-fuchsia-100 relative overflow-hidden">
                         <img src={c.foto_url || 'https://via.placeholder.com/100'} className="w-full h-full rounded-full object-cover bg-gray-100" />
                      </div>
                      <p className="font-bold text-gray-800 mb-2">{c.nome}</p>
                      <div className="flex justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={() => handleEditCategoryClick(c)} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 shadow-sm" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteCategoria(c.id)} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 shadow-sm" title="Excluir">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      )}

      {/* --- MODAL DE EDIÇÃO EM MASSA --- */}
      <Modal
        isOpen={isBulkModalOpen}
        onRequestClose={() => setIsBulkModalOpen(false)}
        className="Modal"
        overlayClassName="ModalOverlay"
      >
        <div className="bg-gradient-to-r from-fuchsia-600 to-purple-700 p-6 rounded-t-2xl text-white relative shrink-0">
           <h2 className="text-2xl font-bold">Edição em Massa</h2>
           <p className="text-fuchsia-100 text-sm opacity-90 mt-1">
             Aplicando regras para {selectedServiceIds.size} serviços selecionados.
           </p>
           <button onClick={() => setIsBulkModalOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold">&times;</button>
        </div>

        <div className="p-6 bg-white overflow-y-auto max-h-[70vh]">
           <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-bold text-gray-700 mb-3">Definir Nova Disponibilidade</label>
              
              {/* Seletor de Tipo Bulk */}
              <div className="flex gap-4 mb-4">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="radio" checked={bulkTipo === 'semanal'} onChange={() => setBulkTipo('semanal')} className="text-fuchsia-600 focus:ring-fuchsia-500" />
                   <span className="text-gray-700 font-medium">Dias da Semana</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="radio" checked={bulkTipo === 'datas'} onChange={() => setBulkTipo('datas')} className="text-fuchsia-600 focus:ring-fuchsia-500" />
                   <span className="text-gray-700 font-medium">Datas Específicas</span>
                 </label>
              </div>

              {/* Opção Bulk: Semanal */}
              {bulkTipo === 'semanal' && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Todos os serviços selecionados funcionarão nestes dias:</p>
                  <div className="flex flex-wrap gap-2">
                    {DIAS_SEMANA.map(dia => (
                      <label key={dia.numero} className={`flex items-center justify-center px-4 py-2 rounded-full cursor-pointer text-sm font-medium transition-all border select-none ${bulkDias.has(dia.numero) ? 'bg-fuchsia-600 text-white border-fuchsia-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                        <input type="checkbox" checked={bulkDias.has(dia.numero)} onChange={() => handleBulkDiaToggle(dia.numero)} className="hidden" />
                        {dia.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Opção Bulk: Datas */}
              {bulkTipo === 'datas' && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2">Clique para selecionar as datas para todos os serviços:</p>
                  <div className="inline-block border rounded-lg bg-white p-2">
                     <DatePicker
                        selected={null}
                        onChange={handleBulkDataSelect}
                        inline locale="pt-BR" minDate={new Date()}
                        highlightDates={bulkDatas}
                        dayClassName={(date) => {
                           const dateStr = date.toISOString().split('T')[0];
                           return bulkDatas.some(d => d.toISOString().split('T')[0] === dateStr) ? "bg-fuchsia-600 text-white font-bold rounded-full hover:bg-fuchsia-700" : undefined;
                        }}
                     />
                  </div>
                  <div className="mt-2 text-sm text-fuchsia-700 font-bold">{bulkDatas.length} datas selecionadas</div>
                </div>
              )}
           </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 rounded-b-2xl">
           <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition">
             Cancelar
           </button>
           <button onClick={handleBulkSave} disabled={isBulkSaving} className="flex-1 py-3 bg-fuchsia-600 text-white font-bold rounded-lg hover:bg-fuchsia-700 transition shadow-md disabled:bg-fuchsia-400">
             {isBulkSaving ? 'Aplicando...' : 'Salvar Alterações'}
           </button>
        </div>
      </Modal>

    </div>
  );
}

export default ServicosPage;