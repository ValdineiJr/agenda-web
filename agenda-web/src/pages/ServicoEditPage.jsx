import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '/src/supabaseClient.js';

// NOVO: Array dos dias da semana
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

  // States do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [duracao, setDuracao] = useState(30);
  const [preco, setPreco] = useState(0);
  const [fotoUrl, setFotoUrl] = useState(null);
  
  // NOVO: State para os dias
  const [diasSelecionados, setDiasSelecionados] = useState(new Set());
  
  const [novaFoto, setNovaFoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Busca os dados (MODIFICADO)
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
        
        // NOVO: Preenche os dias selecionados
        // Se 'dias_disponiveis' for nulo (ex: serviço antigo), marca todos por padrão
        setDiasSelecionados(new Set(data.dias_disponiveis || [0,1,2,3,4,5,6]));
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
  
  // NOVO: Função para marcar/desmarcar os dias
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

  // 2. Função para salvar (MODIFICADA)
  const handleSave = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    
    // NOVO: Validação dos dias
    if (diasSelecionados.size === 0) {
      setError('Você deve selecionar pelo menos um dia da semana para o serviço.');
      setIsUploading(false);
      return;
    }

    let urlParaSalvar = fotoUrl; 

    // 2a. Se uma NOVA foto foi enviada...
    if (novaFoto) {
      // ... (Lógica de upload de foto 100% igual a antes) ...
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

    // 3. Atualiza a tabela 'servicos' (MODIFICADO)
    const { error: updateError } = await supabase
      .from('servicos')
      .update({
        nome: nome,
        descricao: descricao,
        duracao_minutos: duracao,
        preco: preco,
        foto_url: urlParaSalvar,
        dias_disponiveis: Array.from(diasSelecionados) // NOVO: Salva os dias
      })
      .eq('id', id);

    if (updateError) {
      setError(`Erro ao salvar: ${updateError.message}`);
    } else {
      alert('Serviço atualizado com sucesso!');
      navigate('/admin/servicos'); // Volta para a lista
    }
    setIsUploading(false);
  };

  if (loading) {
    return <p>Carregando dados do serviço...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      
      <Link 
        to="/admin/servicos"
        className="text-fuchsia-600 hover:underline"
      >
        &larr; Voltar para a lista de serviços
      </Link>
      
      {/* --- FORMULÁRIO DE EDIÇÃO --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Editar Serviço
        </h1>
        
        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

        <form onSubmit={handleSave} className="space-y-4">
          {/* ... (Campos Nome, Descrição, Duração, Preço - 100% iguais) ... */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome do Serviço</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-fuchsia-500 focus:ring-fuchsia-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-fuchsia-500 focus:ring-fuchsia-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Duração (em minutos)</label>
              <input type="number" value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-fuchsia-500 focus:ring-fuchsia-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
              <input type="number" step="0.01" value={preco} onChange={(e) => setPreco(Number(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-fuchsia-500 focus:ring-fuchsia-500" />
            </div>
          </div>
          
          {/* --- NOVO: CHECKBOXES DOS DIAS --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Dias disponíveis</label>
            <p className="text-xs text-gray-500">Marque os dias em que este serviço pode ser agendado.</p>
            <div className="mt-2 flex flex-wrap gap-4">
              {DIAS_SEMANA.map(dia => (
                <label key={dia.numero} className="flex items-center space-x-2 p-2 rounded-lg border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={diasSelecionados.has(dia.numero)}
                    onChange={() => handleDiaToggle(dia.numero)}
                    className="h-4 w-4 rounded text-fuchsia-600 border-gray-300 focus:ring-fuchsia-500"
                  />
                  <span>{dia.nome}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Campo de Foto (como antes) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Foto do Serviço (Opcional)</label>
            {fotoUrl && !novaFoto && (
              <img src={fotoUrl} alt="Foto atual" className="w-32 h-32 rounded-md object-cover my-2" />
            )}
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/png, image/jpeg"
              className="mt-1 block w-full text-sm text-gray-500
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0
                         file:text-sm file:font-semibold
                         file:bg-fuchsia-50 file:text-fuchsia-700
                         hover:file:bg-fuchsia-100"
            />
            <span className="text-xs text-gray-500">Selecione uma nova foto para substituí-la.</span>
          </div>

          <div>
            <button
              type="submit"
              disabled={isUploading}
              className="w-full p-3 rounded-lg text-white font-semibold bg-fuchsia-600 hover:bg-fuchsia-700 transition-all disabled:bg-gray-400"
            >
              {isUploading ? 'Salvando...' : 'Salvar Mudanças'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ServicoEditPage;