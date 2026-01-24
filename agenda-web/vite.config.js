import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Mantemos o limite alto (1600kB) para o aviso amarelo não aparecer/incomodar
    chunkSizeWarningLimit: 1600,
    
    // --- REMOVIDO O manualChunks ---
    // Removemos a divisão manual de arquivos que estava quebrando o React (forwardRef error).
    // O Vite agora fará a otimização automática padrão, que é mais segura.
  },
});