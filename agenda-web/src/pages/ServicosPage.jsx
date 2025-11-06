import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';
import { Link } from 'react-router-dom';

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

function ServicosPage() {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);

  // States do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [duracao, setDuracao] = useState(30); 
  const [preco, setPreco] = useState(0);
  const [foto, setFoto] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);
  
  // NOVO: State para os dias (Set é mais fácil de gerenciar)
  // Começa com todos os dias marcados por padrão
  const [diasSelecionados, setDiasSelecionados] = useState(new Set([0,1,2,3,4,5,6]));
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchServicos();
  }, []);

  async function fetchServicos() {
    // ... (Lógica 100% igual a antes) ...
    setLoading(true);
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .order('nome', { ascending: true }); 
    if (error) {
      console.error('Erro ao buscar serviços:', error);
      setError('Erro ao carregar lista de serviços.');
    } else {
      setServicos(data);
    }
    setLoading(false);
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFoto(e.target.files[0]);
    }
  };

  // NOVO: Função para marcar/desmarcar os dias
  const handleDiaToggle = (diaNumero) => {
    setDiasSelecionados(prevDias => {
      const novosDias = new Set(prevDias);
      if (novosDias.has(diaNumero)) {
        novosDias.delete(diaNumero); // Desmarca
      } else {
        novosDias.add(diaNumero); // Marca
      }
      return novosDias;
    });
  };

  // handleSubmit (MODIFICADO)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!nome || duracao <= 0 || preco < 0) {
      setError('Nome, Duração (maior que 0) e Preço (0 ou mais) são obrigatórios.');
      return;
    }
    
    // NOVO: Validação dos dias
    if (diasSelecionados.size === 0) {
      setError('Você deve selecionar pelo menos um dia da semana para o serviço.');
      return;
    }

    setIsUploading(true);
    let fotoUrl = null;

    if (foto) {
      // ... (Lógica de upload de foto 100% igual a antes) ...
      const fileName = `${Date.now()}-${foto.name}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('servico-fotos') 
        .upload(fileName, foto);
      if (uploadError) {
        console.error('Erro no upload da foto:', uploadError);
        setError(`Erro no upload da foto: ${uploadError.message}`);
        setIsUploading(false);
        return;
      }
      const { data: publicUrlData } = supabase
        .storage
        .from('servico-fotos')
        .getPublicUrl(uploadData.path);
      fotoUrl = publicUrlData.publicUrl;
    }

    // 3. Insere o serviço (MODIFICADO)
    const { error: insertError } = await supabase
      .from('servicos')
      .insert({
        nome: nome,
        descricao: descricao,
        duracao_minutos: duracao,
        preco: preco,
        foto_url: fotoUrl,
        dias_disponiveis: Array.from(diasSelecionados) // NOVO: Salva o array de dias
      });

    if (insertError) {
      console.error('Erro ao criar serviço:', insertError);
      setError(`Erro ao criar serviço: ${insertError.message}`);
    } else {
      setSuccess('Serviço criado com sucesso!');
      // Limpa o formulário
      setNome('');
      setDescricao('');
      setDuracao(30);
      setPreco(0);
      setFoto(null); 
      setDiasSelecionados(new Set([0,1,2,3,4,5,6])); // NOVO: Reseta os dias
      if (document.getElementById('foto-input')) {
        document.getElementById('foto-input').value = '';
      }
      fetchServicos();
    }
    setIsUploading(false);
  };
  
  // handleDelete (Como antes)
  const handleDelete = async (servico) => {
    // ... (Lógica 100% igual a antes) ...
    if (!window.confirm(`Tem certeza que deseja deletar "${servico.nome}"?`)) {
      return;
    }
    try {
      const { error: assocError } = await supabase
        .from('profissionais_servicos')
        .delete()
        .eq('servico_id', servico.id);
      if (assocError) throw assocError;
      const { error: servicoError } = await supabase
        .from('servicos')
        .delete()
        .eq('id', servico.id);
      if (servicoError) throw servicoError;
      if (servico.foto_url) {
        const fileName = servico.foto_url.split('/').pop(); 
        const { error: storageError } = await supabase
          .storage
          .from('servico-fotos')
          .remove([fileName]);
        if (storageError && storageError.message !== 'The resource was not found') {
          throw storageError;
        }
      }
      setSuccess('Serviço deletado com sucesso.');
      fetchServicos(); 
    } catch (error) {
      console.error('Erro ao deletar serviço:', error);
      setError(`Erro ao deletar: ${error.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      
      {/* --- FORMULÁRIO DE CRIAÇÃO (MODIFICADO) --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Gerenciar Serviços
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ... (Campos Nome, Descrição, Duração, Preço - 100% iguais) ... */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome do Serviço</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-fuchsia-500 focus:ring-fuchsia-500" placeholder="Ex: Corte de Cabelo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-fuchsia-500 focus:ring-fuchsia-500" placeholder="Ex: Inclui lavagem e secagem" />
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
            <input type="file" id="foto-input" onChange={handleFileChange} accept="image/png, image/jpeg"
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-fuchsia-50 file:text-fuchsia-700 hover:file:bg-fuchsia-100"
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}

          <div>
            <button type="submit" disabled={isUploading}
              className="w-full p-3 rounded-lg text-white font-semibold bg-fuchsia-600 hover:bg-fuchsia-700 transition-all disabled:bg-gray-400"
            >
              {isUploading ? 'Enviando foto...' : 'Criar Novo Serviço'}
            </button>
          </div>
        </form>
      </div>

      {/* --- LISTA DE SERVIÇOS (Como antes) --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Serviços Cadastrados
        </h2>
        {loading ? (
          <p>Carregando lista...</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {servicos.map((servico) => (
              <li key={servico.id} className="py-4 flex justify-between items-center">
                {/* ... (Lógica de exibição da lista 100% igual a antes) ... */}
                <div className="flex items-center space-x-4">
                  <img 
                    src={servico.foto_url || 'https://api.iconify.design/solar:camera-minimalistic-bold.svg?color=%239ca3af'}
                    alt={servico.nome}
                    className="w-16 h-16 rounded-md object-cover bg-gray-100"
                  />
                  <div>
                    <p className="font-semibold text-lg text-gray-900">{servico.nome}</p>
                    <p className="text-sm text-gray-600">
                      Duração: {servico.duracao_minutos} min | Preço: R$ {servico.preco.toFixed(2)}
                    </p>
                    {servico.descricao && <p className="text-sm text-gray-500">{servico.descricao}</p>}
                  </div>
                </div>
                <div className="flex space-x-4 flex-shrink-0">
                  <Link
                    to={`/admin/servicos/${servico.id}`}
                    className="text-sm font-medium text-fuchsia-600 hover:text-fuchsia-800"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(servico)} 
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Deletar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ServicosPage;