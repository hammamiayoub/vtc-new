// Fonction désactivée : elle renvoyait l'identifiant, le nom et l'e-mail de n'importe quel compte à partir
// d'une adresse (énumération et fuite de données), sans authentification. Plus aucun appelant dans les
// applications : la disponibilité d'un e-mail passe par la fonction SQL is_email_available.
// À supprimer du projet : supabase functions delete check-user-email
Deno.serve((req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  return new Response(JSON.stringify({ error: 'gone' }), {
    status: 410,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
