import { useState, useEffect } from 'react';
import { supabase } from '/src/supabaseClient.js';

function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filtroAniversario, setFiltroAniversario] = useState(false);
  const [showMsgConfig, setShowMsgConfig] = useState(false);
  const [msgAniversario, setMsgAniversario] = useState(
    'Olá {nome}! 🎂 Parabéns pelo seu dia! O Studio Patricia Ramalho deseja muitas felicidades e um ano repleto de brilho. Que tal agendar um momento especial para comemorar?'
  );

  const [editingClient, setEditingClient] = useState(null); 
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editNascimento, setEditNascimento] = useState(''); 

  const [selectedBirthdays, setSelectedBirthdays] = useState([]);

  useEffect(() => {
    fetchClientes();
  }, []);

  async function fetchClientes() {
    setLoading(true);
    const { data, error } = await supabase.from('clientes').select('*').order('nome', { ascending: true });
    if (error) { console.error(error); setError('Erro ao carregar.'); } 
    else { setClientes(data); }
    setLoading(false);
  }

  const handleEditClick = (cliente) => {
    setEditingClient(cliente); setEditNome(cliente.nome); setEditTelefone(cliente.telefone);
    setEditNascimento(cliente.data_nascimento ? cliente.data_nascimento.split('T')[0] : '');
  };

  const handleCancelEdit = () => setEditingClient(null);

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    const { error } = await supabase.from('clientes').update({ nome: editNome, telefone: editTelefone, data_nascimento: editNascimento || null }).eq('id', editingClient.id);
    if (error) alert(error.message);
    else { alert('Atualizado!'); setEditingClient(null); fetchClientes(); }
  };

  const clientesFiltrados = clientes.filter((cliente) => {
    if (!filtroAniversario) return true;
    if (!cliente.data_nascimento) return false;
    const mesCliente = parseInt(cliente.data_nascimento.split('-')[1]);
    const mesAtual = new Date().getMonth() + 1;
    return mesCliente === mesAtual;
  });

  const toggleSelectBirthday = (id) => {
    setSelectedBirthdays(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAllBirthdays = () => {
    if (selectedBirthdays.length === clientesFiltrados.length) setSelectedBirthdays([]);
    else setSelectedBirthdays(clientesFiltrados.map(c => c.id));
  };

  const handleSendBulk = () => {
    if (selectedBirthdays.length === 0) return alert("Selecione pelo menos um cliente.");
    if (!window.confirm(`Você está prestes a abrir ${selectedBirthdays.length} janelas do WhatsApp. Continuar?`)) return;

    const targets = clientesFiltrados.filter(c => selectedBirthdays.includes(c.id));
    targets.forEach((c, index) => {
       const msg = msgAniversario.replace('{nome}', c.nome);
       const link = `https://wa.me/55${c.telefone}?text=${encodeURIComponent(msg)}`;
       setTimeout(() => { window.open(link, '_blank'); }, index * 800); 
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-black text-slate-800 mb-2">Gerenciar Clientes</h1>
        <p className="text-slate-500 text-sm">Base de clientes e marketing de aniversário.</p>
      </div>

      <div className="bg-gradient-to-r from-fuchsia-50 to-white p-6 rounded-2xl shadow-sm border border-fuchsia-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={() => setFiltroAniversario(!filtroAniversario)} className={`px-6 py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 ${filtroAniversario ? 'bg-fuchsia-600 text-white ring-4 ring-fuchsia-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {filtroAniversario ? '🎂 Modo Aniversário Ativo' : '🎂 Filtrar Aniversariantes do Mês'}
            {filtroAniversario && <span className="bg-white text-fuchsia-600 text-xs py-0.5 px-2 rounded-full font-black ml-2">{clientesFiltrados.length}</span>}
          </button>

          {filtroAniversario && (
            <div className="flex gap-2">
               <button onClick={toggleSelectAllBirthdays} className="px-4 py-2 bg-white border border-fuchsia-200 text-fuchsia-700 text-xs font-bold rounded-lg hover:bg-fuchsia-50">
                  {selectedBirthdays.length === clientesFiltrados.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
               </button>
               <button onClick={handleSendBulk} disabled={selectedBirthdays.length === 0} className="px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md flex items-center gap-1">
                  <span>🚀</span> Enviar ({selectedBirthdays.length})
               </button>
            </div>
          )}
        </div>

        {filtroAniversario && (
           <div className="mt-4">
              <button onClick={() => setShowMsgConfig(!showMsgConfig)} className="text-xs font-bold text-fuchsia-600 underline hover:text-fuchsia-800">
                {showMsgConfig ? 'Ocultar mensagem' : 'Editar mensagem padrão'}
              </button>
              {showMsgConfig && (
                <div className="mt-2 p-3 bg-white rounded-xl border border-fuchsia-100 animate-fade-in">
                  <textarea rows="3" value={msgAniversario} onChange={(e) => setMsgAniversario(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none resize-none" />
                </div>
              )}
           </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">
          {filtroAniversario ? '🎉 Aniversariantes Encontrados' : 'Lista Completa'}
        </h2>
        
        {loading ? <p className="text-center text-slate-400 py-10 animate-pulse">Carregando...</p> : (
          <div className="space-y-3">
            {clientesFiltrados.length === 0 ? <p className="text-center text-slate-400 py-10">Nenhum cliente encontrado.</p> : (
              clientesFiltrados.map((cliente) => {
                const msgFinal = msgAniversario.replace('{nome}', cliente.nome);
                const linkZap = `https://wa.me/55${cliente.telefone}?text=${encodeURIComponent(msgFinal)}`;

                return (
                  <div key={cliente.id} className={`p-4 rounded-xl border transition-all ${filtroAniversario && selectedBirthdays.includes(cliente.id) ? 'bg-fuchsia-50 border-fuchsia-300' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                    {editingClient?.id !== cliente.id ? (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                           {filtroAniversario && (
                              <input type="checkbox" checked={selectedBirthdays.includes(cliente.id)} onChange={() => toggleSelectBirthday(cliente.id)} className="w-5 h-5 text-fuchsia-600 rounded border-gray-300 focus:ring-fuchsia-500 cursor-pointer" />
                           )}
                           <div>
                              <p className="font-bold text-slate-800 flex items-center gap-2">{cliente.nome} {filtroAniversario && <span className="text-xl">🎂</span>}</p>
                              <p className="text-xs text-slate-500">{cliente.telefone}</p>
                              <p className="text-xs font-bold text-blue-500 mt-0.5">{cliente.data_nascimento ? new Date(cliente.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</p>
                           </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {filtroAniversario && (
                            <a href={linkZap} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-green-50 text-green-600 rounded-full hover:bg-green-500 hover:text-white transition shadow-sm border border-green-100 relative group" title="Enviar Parabéns">
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                            </a>
                          )}
                          <button onClick={() => handleEditClick(cliente)} className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-200">Editar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-slate-50 p-3 rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} className="p-2 text-sm rounded border border-slate-300" placeholder="Nome" />
                          <input type="tel" value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} className="p-2 text-sm rounded border border-slate-300" placeholder="Telefone" />
                          <input type="date" value={editNascimento} onChange={(e) => setEditNascimento(e.target.value)} className="p-2 text-sm rounded border border-slate-300" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700">Salvar</button>
                          <button onClick={handleCancelEdit} className="px-4 py-1.5 bg-slate-300 text-slate-700 text-xs font-bold rounded hover:bg-slate-400">Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientesPage;