import { Link } from 'react-router-dom';
import '/src/index.css';

function HomePage() {
  const WHATSAPP_LINK = "https://wa.me/5519993562075"; 
  const INSTAGRAM_LINK = "https://instagram.com/studiopatriciaramalho"; 
  const LOCALIZACAO_LINK = "https://goo.gl/maps/seu-link-aqui"; 

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 to-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* --- Elementos de Fundo (Bolhas) --- */}
      <div className="absolute top-1/4 left-0 w-64 h-64 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>

      {/* --- BARRA LATERAL (REDES SOCIAIS) - Visível em Telas Grandes --- */}
      <aside className="fixed right-0 top-1/2 transform -translate-y-1/2 z-50 hidden lg:flex flex-col items-center gap-5 p-4 bg-white/80 backdrop-blur-md shadow-2xl rounded-l-2xl border-l border-t border-b border-fuchsia-100 transition-all hover:bg-white">
        <span className="writing-vertical-rl text-fuchsia-800 font-bold text-xs tracking-widest uppercase rotate-180 mb-2" style={{ writingMode: 'vertical-rl' }}>
          Siga-nos
        </span>
        
        <div className="w-px h-8 bg-fuchsia-200"></div> {/* Linha separadora */}

        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="group relative">
          <img src="https://api.iconify.design/logos:whatsapp-icon.svg" alt="WhatsApp" className="w-8 h-8 transition-transform group-hover:scale-110" />
        </a>
        
        <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer" className="group relative">
          <img src="https://api.iconify.design/skill-icons:instagram.svg" alt="Instagram" className="w-8 h-8 transition-transform group-hover:scale-110" />
        </a>
        
        <a href={LOCALIZACAO_LINK} target="_blank" rel="noopener noreferrer" className="group relative">
          <img src="https://api.iconify.design/flat-color-icons:google-maps.svg" alt="Localização" className="w-8 h-8 transition-transform group-hover:scale-110" />
        </a>
      </aside>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <div className="flex flex-col items-center justify-center flex-grow text-center z-10 max-w-md w-full px-4 mb-10">
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-fuchsia-800 mb-6 drop-shadow-sm">
          Studio Patricia Ramalho
        </h1>

        <p className="text-lg md:text-xl text-gray-700 mb-10 leading-relaxed">
          Realce sua beleza com nossos serviços exclusivos. Escolha o melhor horário para você.
        </p>

        {/* Botão Principal */}
        <Link 
          to="/agendar"
          className="w-full bg-fuchsia-600 text-white py-5 px-8 rounded-full shadow-lg hover:bg-fuchsia-700 transition-all duration-300 transform hover:scale-105 text-xl font-bold mb-6 tracking-wide flex items-center justify-center gap-3"
        >
          <span>📅</span> Agendar Meu Horário
        </Link>

        {/* Botão Secundário */}
        <Link 
          to="/consultar"
          className="w-full bg-white text-fuchsia-700 py-4 px-8 rounded-full shadow-md border border-fuchsia-200 hover:bg-fuchsia-50 transition-all duration-300 transform hover:scale-102 text-lg font-semibold flex items-center justify-center gap-3"
        >
          <span>🔍</span> Área do Cliente (Meus Agendamentos)
        </Link>

      </div>

      {/* --- MOBILE: Ícones no Rodapé (Apenas para Celular) --- */}
      {/* Em telas grandes (lg), isso some para dar lugar à barra lateral */}
      <div className="lg:hidden flex flex-col items-center gap-3 mb-6 z-10">
        <p className="text-sm text-fuchsia-800 font-semibold">Acesse nossas redes:</p>
        <div className="flex gap-6">
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
            <img src="https://api.iconify.design/logos:whatsapp-icon.svg" alt="WhatsApp" className="w-10 h-10 drop-shadow-sm" />
          </a>
          <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer">
            <img src="https://api.iconify.design/skill-icons:instagram.svg" alt="Instagram" className="w-10 h-10 drop-shadow-sm" />
          </a>
          <a href={LOCALIZACAO_LINK} target="_blank" rel="noopener noreferrer">
            <img 
              src="https://api.iconify.design/logos:google-maps.svg" 
              alt="Localização" 
              className="w-10 h-10 drop-shadow-sm" 
            />
          </a>
        </div>
      </div>

      {/* OBS: O rodapé roxo duplicado foi removido daqui. 
         O rodapé global "Desenvolvido por..." continuará aparecendo automaticamente abaixo deste componente. */}

    </div>
  );
}

export default HomePage;