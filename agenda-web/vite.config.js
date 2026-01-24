import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Aumenta o limite do aviso para 1600kb para evitar logs desnecessários
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // --- OTIMIZAÇÃO DE CACHE E MEMÓRIA (Chunk Splitting) ---
        // Isso força o Vite a separar as bibliotecas pesadas em arquivos diferentes.
        // O navegador consegue gerenciar melhor a memória e evita travamentos.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor_react';
            if (id.includes('supabase')) return 'vendor_supabase';
            if (id.includes('date-fns')) return 'vendor_date';
            if (id.includes('react-big-calendar')) return 'vendor_calendar';
            
            return 'vendor_general'; // Outras bibliotecas genéricas
          }
        },
      },
    },
  },
});