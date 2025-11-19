import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { Link } from 'react-router-dom';

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

  // --- FORMULÁRIO SERVIÇO ---
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [duracao, setDuracao] = useState(30); 
  const [preco, setPreco] = useState(0);
  const [foto, setFoto] = useState(null); 
  const [categoriaId, setCategoriaId] = useState(''); // NOVO: ID da categoria selecionada
  const [diasSelecionados, setDiasSelecionados] = useState(new Set([0,1,2,3,4,5,6]));
  
  // --- FORMULÁRIO CATEGORIA ---
  const [catNome, setCatNome] = useState('');
  const [catFoto, setCatFoto] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchDados();
  }, []);

  async function fetchDados() {
    setLoading(true);
    // Busca Serviços
    const { data: sData } = await supabase.from('servicos').select('*, categorias(nome)').order('nome');
    if (sData) setServicos(sData);
    
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

  // --- HANDLERS SERVIÇO ---
  const handleDiaToggle = (dia) => {
    setDiasSelecionados(prev => {
      const novos = new Set(prev);
      novos.has(dia) ? novos.delete(dia) : novos.add(dia);
      return novos;
    });
  };

  const handleSubmitServico = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    
    if (!nome || duracao <= 0 || preco < 0 || !categoriaId) {
      setError('Preencha Nome, Duração, Preço e selecione uma Categoria.');
      return;
    }
    if (diasSelecionados.size === 0) {
      setError('Selecione pelo menos um dia.');
      return;
    }

    setIsUploading(true);
    try {
      let fotoUrl = null;
      if (foto) fotoUrl = await uploadImage(foto, 'servico-fotos');

      const { error } = await supabase.from('servicos').insert({
        nome, descricao, duracao_minutos: duracao, preco,
        foto_url: fotoUrl,
        categoria_id: categoriaId, // Salva a categoria
        dias_disponiveis: Array.from(diasSelecionados)
      });

      if (error) throw error;

      setSuccess('Serviço criado!');
      setNome(''); setDescricao(''); setDuracao(30); setPreco(0); setFoto(null); setCategoriaId('');
      setDiasSelecionados(new Set([0,1,2,3,4,5,6]));
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

  // --- HANDLERS CATEGORIA ---
  const handleSubmitCategoria = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);

    if (!catNome) { setError('Nome da categoria é obrigatório.'); return; }

    setIsUploading(true);
    try {
      let fotoUrl = null;
      // Requer criar bucket 'categoria-fotos' no Supabase se quiser fotos, 
      // ou usar o mesmo 'servico-fotos' pra simplificar
      if (catFoto) fotoUrl = await uploadImage(catFoto, 'servico-fotos'); 

      const { error } = await supabase.from('categorias').insert({
        nome: catNome,
        foto_url: fotoUrl
      });
      if (error) throw error;

      setSuccess('Categoria criada!');
      setCatNome(''); setCatFoto(null);
      fetchDados();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCategoria = async (id) => {
    if(!confirm('Deletar categoria? Serviços nela ficarão sem categoria.')) return;
    // Primeiro desvincula os serviços (seta null) ou deleta (cuidado)
    // Aqui vamos apenas deletar a categoria, o banco pode dar erro se tiver FK constraint sem cascade
    // Ideal: Update services set categoria_id = null where categoria_id = id
    await supabase.from('servicos').update({ categoria_id: null }).eq('categoria_id', id);
    await supabase.from('categorias').delete().eq('id', id);
    fetchDados();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Gestão de Catálogo</h1>

      {/* ABAS */}
      <div className="flex border-b border-gray-200">
        <button
          className={`py-2 px-4 font-semibold ${activeTab === 'servicos' ? 'text-fuchsia-600 border-b-2 border-fuchsia-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('servicos')}
        >
          Serviços
        </button>
        <button
          className={`py-2 px-4 font-semibold ${activeTab === 'categorias' ? 'text-fuchsia-600 border-b-2 border-fuchsia-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('categorias')}
        >
          Categorias
        </button>
      </div>

      {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}
      {success && <div className="text-green-600 bg-green-50 p-3 rounded">{success}</div>}

      {/* --- CONTEÚDO ABA SERVIÇOS --- */}
      {activeTab === 'servicos' && (
        <div className="space-y-8 animate-fade-in">
          {/* Form Criar Serviço */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Novo Serviço</h2>
            <form onSubmit={handleSubmitServico} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700">Nome</label>
                   <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input-padrao" placeholder="Ex: Corte" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700">Categoria</label>
                   <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="input-padrao bg-white">
                     <option value="">Selecione...</option>
                     {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                   </select>
                </div>
              </div>
              
              <div>
                 <label className="block text-sm font-medium text-gray-700">Descrição</label>
                 <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} className="input-padrao" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700">Duração (min)</label>
                   <input type="number" value={duracao} onChange={e => setDuracao(e.target.value)} className="input-padrao" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
                   <input type="number" step="0.01" value={preco} onChange={e => setPreco(e.target.value)} className="input-padrao" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dias Disponíveis</label>
                <div className="flex flex-wrap gap-3">
                  {DIAS_SEMANA.map(dia => (
                    <label key={dia.numero} className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-2 py-1 rounded border">
                      <input type="checkbox" checked={diasSelecionados.has(dia.numero)} onChange={() => handleDiaToggle(dia.numero)} className="text-fuchsia-600 focus:ring-fuchsia-500" />
                      <span className="text-sm">{dia.nome}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700">Foto</label>
                 <input type="file" onChange={e => setFoto(e.target.files[0])} className="text-sm" />
              </div>

              <button disabled={isUploading} className="btn-primary w-full mt-2">
                {isUploading ? 'Salvando...' : 'Criar Serviço'}
              </button>
            </form>
          </div>

          {/* Lista de Serviços */}
          <div className="bg-white p-6 rounded-lg shadow-md">
             <h2 className="text-xl font-bold mb-4">Lista de Serviços</h2>
             <ul>
               {servicos.map(s => (
                 <li key={s.id} className="border-b py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <img src={s.foto_url || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded object-cover bg-gray-100" />
                       <div>
                          <p className="font-bold">{s.nome}</p>
                          <p className="text-xs text-gray-500">{s.categorias?.nome || 'Sem Categoria'} | R$ {s.preco}</p>
                       </div>
                    </div>
                    <div className="flex gap-3 text-sm">
                       <Link to={`/admin/servicos/${s.id}`} className="text-blue-600 hover:underline">Editar</Link>
                       <button onClick={() => handleDeleteServico(s.id)} className="text-red-600 hover:underline">Excluir</button>
                    </div>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      )}

      {/* --- CONTEÚDO ABA CATEGORIAS --- */}
      {activeTab === 'categorias' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Nova Categoria</h2>
            <form onSubmit={handleSubmitCategoria} className="flex gap-4 items-end">
               <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Nome da Categoria</label>
                  <input type="text" value={catNome} onChange={e => setCatNome(e.target.value)} className="input-padrao" placeholder="Ex: Cabelos" />
               </div>
               <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Foto (Capa)</label>
                  <input type="file" onChange={e => setCatFoto(e.target.files[0])} className="text-sm" />
               </div>
               <button disabled={isUploading} className="btn-primary py-2 px-6 h-10">
                 {isUploading ? '...' : 'Criar'}
               </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
             <h2 className="text-xl font-bold mb-4">Categorias Cadastradas</h2>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {categorias.map(c => (
                 <div key={c.id} className="border rounded-lg p-4 text-center relative group">
                    <img src={c.foto_url || 'https://via.placeholder.com/100'} className="w-16 h-16 rounded-full mx-auto object-cover mb-2 bg-gray-100" />
                    <p className="font-bold text-gray-800">{c.nome}</p>
                    <button 
                      onClick={() => handleDeleteCategoria(c.id)}
                      className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Excluir"
                    >
                      ✕
                    </button>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServicosPage;