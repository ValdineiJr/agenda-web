import { Link } from 'react-router-dom';
import '/src/index.css'; // Certifique-se de que o Tailwind CSS e seu CSS personalizado estão sendo importados

function HomePage() {
  const WHATSAPP_LINK = "https://wa.me/5519993562075"; // Seu número WhatsApp
  const INSTAGRAM_LINK = "https://instagram.com/seu-perfil-aqui"; // Seu link do Instagram
  const LOCALIZACAO_LINK = "https://maps.app.goo.gl/seu-endereco-aqui"; // Link para o Google Maps do seu salão

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 to-white flex flex-col items-center justify-between p-4 relative overflow-hidden">
      
      {/* Elementos de fundo abstratos para dar um toque moderno */}
      <div className="absolute top-1/4 left-0 w-64 h-64 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>

      {/* Conteúdo Principal Centralizado */}
      <div className="flex flex-col items-center justify-center flex-grow text-center z-10 max-w-md w-full px-4">
        
        {/* Logo ou Nome do Salão */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-fuchsia-800 mb-6 drop-shadow-sm">
          Studio Patricia Ramalho
        </h1>

        <p className="text-lg md:text-xl text-gray-700 mb-10 leading-relaxed">
          Escolha o serviço, dia e horário que deseja ser atendido(a).
        </p>

        {/* Botão de Agendar em destaque */}
        <Link 
          to="/agendar"
          className="w-full bg-fuchsia-600 text-white py-5 px-8 rounded-full shadow-lg hover:bg-fuchsia-700 transition-all duration-300 transform hover:scale-105 text-xl font-bold mb-6 tracking-wide"
        >
          Agendar Meu Horário
        </Link>

        {/* Botão Área do Cliente em menor destaque, mas visível */}
        <Link 
          to="/consultar"
          className="w-full bg-white text-fuchsia-700 py-4 px-8 rounded-full shadow-md border border-fuchsia-200 hover:bg-fuchsia-50 transition-all duration-300 transform hover:scale-102 text-lg font-semibold"
        >
          Área do Cliente (Consultar/Cancelar)
        </Link>
      </div>

      {/* Rodapé Moderno com Ícones */}
      <footer className="w-full flex justify-center gap-8 py-6 z-10">
        <a 
          href={WHATSAPP_LINK} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-gray-500 hover:text-green-500 transition-colors transform hover:scale-110"
          title="Fale Conosco pelo WhatsApp"
        >
          <img src="https://api.iconify.design/mdi:whatsapp.svg?color=%236b7280" alt="WhatsApp" className="w-9 h-9" />
        </a>
        <a 
          href={INSTAGRAM_LINK} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-gray-500 hover:text-pink-600 transition-colors transform hover:scale-110"
          title="Nosso Instagram"
        >
          <img src="https://api.iconify.design/mdi:instagram.svg?color=%236b7280" alt="Instagram" className="w-9 h-9" />
        </a>
        <a 
          href={LOCALIZACAO_LINK} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-gray-500 hover:text-red-500 transition-colors transform hover:scale-110"
          title="Como Chegar"
        >
          <img src="https://api.iconify.design/mdi:map-marker.svg?color=%236b7280" alt="Localização" className="w-9 h-9" />
        </a>
      </footer>

      {/* Footer "copyright" */}
      <div className="absolute bottom-0 w-full bg-fuchsia-800 text-white text-center text-xs py-2 z-0">
        © {new Date().getFullYear()} Studio Patricia Ramalho. Todos os direitos reservados.
      </div>
    </div>
  );
}

export default HomePage;