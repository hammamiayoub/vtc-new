import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 Edge Function check-user-email démarrée')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, userType } = await req.json()

    if (!email || !userType) {
      throw new Error('Email et userType requis')
    }

    console.log('🔍 Vérification email:', email, 'pour type:', userType)

    // Utiliser le service role key pour contourner RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const tableName = userType === 'client' ? 'clients' : 'drivers'
    
    const { data: userData, error: userError } = await supabaseAdmin
      .from(tableName)
      .select('id, first_name, last_name, email')
      .eq('email', email)
      .maybeSingle()

    if (userError) {
      console.error('❌ Erreur lors de la vérification:', userError)
      throw new Error('Erreur lors de la vérification de l\'email')
    }

    console.log('📊 Utilisateur trouvé:', !!userData)

    return new Response(
      JSON.stringify({ 
        exists: !!userData,
        userData: userData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 Erreur dans check-user-email:', error)
    
    return new Response(
      JSON.stringify({ 
        exists: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})