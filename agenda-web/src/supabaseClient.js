import { createClient } from '@supabase/supabase-js'

// 1. Pega a URL e a Chave das "Variáveis de Ambiente"
// O Vite (nosso motor) usa "import.meta.env.VITE_NOME_DA_VARIAVEL"
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// 2. Cria o cliente
export const supabase = createClient(supabaseUrl, supabaseKey);