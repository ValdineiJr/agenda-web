import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto bg-gray-50 shadow-md rounded-lg mt-10 text-center">
      
      {/* Logo */}
      <div className="flex justify-center mb-6">
      <img 
  src="/logo-salao.png" 
  alt="Logo do Salão" 
  className="w-24 h-auto object-contain" 
/>
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Bem-vindo(a)!
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        O que você gostaria de fazer?
      </p>

      {/* Botões de Ação */}
      <div className="space-y-4">
        <Link
          to="/agendar"
          className="block w-full p-6 rounded-lg text-white font-bold text-lg bg-fuchsia-900 hover:bg-fuchsia-800 transition-all text-left"
        >
          <span className="text-2xl">🗓️ Fazer um Agendamento</span>
          <p className="text-sm font-normal text-fuchsia-200 mt-1">Quero marcar um novo horário.</p>
        </Link>
        <Link
          to="/consultar"
          className="block w-full p-6 rounded-lg text-gray-900 font-bold text-lg bg-gray-200 hover:bg-gray-300 transition-all text-left"
        >
          <span className="text-2xl">🔍 Consultar ou Cancelar</span>
          <p className="text-sm font-normal text-gray-600 mt-1">Já tenho um agendamento e quero gerenciá-lo.</p>
        </Link>
      </div>

      {/* --- SEÇÃO REDES SOCIAIS (CORRIGIDA) --- */}
      <div className="mt-10 pt-6 border-t border-gray-200">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Confira nossas redes sociais para acompanhar as novidades!
        </p>
        <a 
          href="https://www.instagram.com/studiopatriciaramalho/" // <-- TROQUE PELO LINK DO INSTAGRAM
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block p-2 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-yellow-500 hover:opacity-80 transition-opacity"
        >
          {/* Ícone do Instagram (agora usa 'skill-icons' que é mais estável) */}
          <img 
            src="https://api.iconify.design/skill-icons:instagram.svg" 
            alt="Instagram" 
            className="w-8 h-8"
          />
        </a>
      </div>
    </div>
  );
}

export default HomePage;