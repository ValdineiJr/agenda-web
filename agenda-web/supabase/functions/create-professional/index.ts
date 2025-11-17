import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts' // Importa do arquivo que criamos

// Define o tipo de dados que esperamos receber do formulário
interface ProfileInput {
  nome: string;
  email: string;
  password: string;
  role: 'admin' | 'profissional';
}

console.log('Função "create-professional" inicializada.');

Deno.serve(async (req) => {
  // 1. Configurações de CORS (MODO CORRETO)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Pega os dados (nome, email, senha) enviados pelo app React
    const { nome, email, password, role }: ProfileInput = await req.json();

    // 3. Cria o "Cliente Admin" do Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. ETAPA A: Cria o Login (em auth.users) (CORRIGIDO)
    console.log(`Criando login para: ${email}`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // <-- A CORREÇÃO IMPORTANTE
    });

    if (authError) {
      console.error('Erro ao criar login (Auth):', authError.message);
      throw new Error(`Erro no Auth: ${authError.message}`);
    }

    const newUserId = authData.user.id;
    console.log(`Login criado com sucesso. UUID: ${newUserId}`);

    // 5. ETAPA B: Cria o Perfil (em public.profissionais)
    console.log(`Criando perfil para: ${nome}`);
    const { error: profileError } = await supabaseAdmin
      .from('profissionais')
      .insert({
        user_id: newUserId, // O UUID que acabamos de criar
        nome: nome,
        email: email,
        role: role
      });

    if (profileError) {
      console.error('Erro ao criar perfil (Profissionais):', profileError.message);
      // Se deu erro aqui, deleta o login que acabamos de criar (para não deixar lixo)
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(`Erro no Perfil: ${profileError.message}`);
    }

    console.log('Perfil criado com sucesso.');

    // 6. Retorna Sucesso (COM HEADERS CORS)
    return new Response(JSON.stringify({ message: "Profissional criada com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // 7. Retorna Erro (COM HEADERS CORS)
    console.error('Erro geral na função:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});