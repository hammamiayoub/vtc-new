import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-blog-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Audience = 'client' | 'driver'

interface ArticleDraft {
  title: string
  content: string
  keyword: string
}

interface PublishResult {
  audience: Audience
  status: 'published' | 'skipped' | 'illustrated'
  title: string
  slug: string
}

interface StoredImage {
  url: string
  path: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function secretsMatch(left: string, right: string): boolean {
  const encoder = new TextEncoder()
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function tunisDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function slugify(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || 'article'
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

async function isAuthorized(req: Request, admin: SupabaseClient): Promise<boolean> {
  const cronSecret = Deno.env.get('BLOG_CRON_SECRET') ?? ''
  const headerSecret = req.headers.get('x-blog-cron-secret') ?? ''
  if (cronSecret && headerSecret && secretsMatch(headerSecret, cronSecret)) return true

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (serviceKey && token && secretsMatch(token, serviceKey)) return true
  if (!token) return false

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!url || !anon) return false

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  if (userError || !userData.user) return false

  const { data: adminRow } = await admin
    .from('admin_users')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle()

  return Boolean(adminRow)
}

async function writeArticle(input: {
  audience: Audience
  keyword: string | null
  avoid: string[]
}): Promise<ArticleDraft> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY manquante dans les secrets de la fonction.')
  }

  const model = Deno.env.get('BLOG_OPENAI_MODEL') || 'gpt-4o-mini'
  const audienceLabel = input.audience === 'driver'
    ? 'les chauffeurs et transporteurs partenaires TuniDrive'
    : 'les voyageurs et clients qui réservent un trajet'
  const cta = input.audience === 'driver'
    ? 'https://tunidrive.net/signup'
    : 'https://tunidrive.net/client-login'
  const keywordLine = input.keyword
    ? `Le sujet imposé est : « ${input.keyword} ». Reprends cette intention dans le titre et le texte, sans te contenter de recopier le mot-clé s'il est télégraphique.`
    : 'La file de sujets est vide. Invente un sujet neuf, précis, en français, sur le VTC ou le chauffeur privé en Tunisie, pour cette audience. Ne réutilise aucun sujet déjà traité.'

  const system = `Tu rédiges un article de blog en français pour TuniDrive, plateforme tunisienne qui met en relation des clients avec des chauffeurs partenaires indépendants.
Réponds uniquement en JSON : {"title":"...","keyword":"...","content":"..."}.
Contraintes :
- 700 à 950 mots.
- Texte brut. Paragraphes séparés par une ligne vide. Pas de markdown, pas de titre en dièse, pas de puces avec astérisque, pas de HTML.
- Public : ${audienceLabel}.
- Ancre l'article dans la Tunisie : villes et aéroports réels (Tunis-Carthage, Enfidha-Hammamet, Monastir, Djerba-Zarzis, Sousse, Sfax, Hammamet).
- Véhicules possibles : berline, van, minibus, bus.
- N'invente aucune statistique, aucun avis client, aucun classement, aucun prix hors de cette grille : prise en charge selon la distance du chauffeur (10, 20, 30 ou 50 TND), prix minimum 14,40 TND, tarif kilométrique progressif, estimation affichée avant confirmation.
- Ne cite aucune entreprise concurrente. Ne recommande pas d'éviter un service nommé. Si le sujet parle de retards ou de comparaison, explique des critères concrets : horaire convenu, point de rendez-vous, suivi du vol, tarif affiché avant validation, type de véhicule.
- Mentionne TuniDrive une ou deux fois, de façon utile. Termine par un paragraphe qui invite à l'action et contient exactement ce lien : ${cta}.
- Le champ keyword reprend le sujet traité, en une courte phrase française.`

  const user = `${keywordLine}
Sujets déjà utilisés, à ne pas répéter : ${input.avoid.length ? input.avoid.join(' | ') : 'aucun'}.`

  let lastError = 'Rédaction impossible.'
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: attempt === 0
              ? user
              : `${user}\nLe précédent essai était trop court ou invalide. Écris un article complet d'au moins 700 mots.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 280)}`)
    }

    const payload = await response.json()
    const raw = payload?.choices?.[0]?.message?.content
    if (typeof raw !== 'string') {
      lastError = 'Réponse OpenAI vide.'
      continue
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ArticleDraft>
      const title = String(parsed.title ?? '').replace(/\s+/g, ' ').trim()
      const content = String(parsed.content ?? '').trim()
      const keyword = String(parsed.keyword ?? input.keyword ?? '').replace(/\s+/g, ' ').trim()
      if (!title || !content || !keyword || wordCount(content) < 500) {
        lastError = 'Article trop court ou incomplet.'
        continue
      }
      return { title: title.slice(0, 160), content, keyword: keyword.slice(0, 180) }
    } catch {
      lastError = 'Réponse OpenAI illisible.'
    }
  }

  throw new Error(lastError)
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function requestIllustration(apiKey: string, model: string, prompt: string): Promise<Uint8Array> {
  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
  }
  if (model === 'dall-e-3') {
    body.size = '1792x1024'
    body.quality = 'standard'
    body.response_format = 'b64_json'
  } else {
    body.size = '1536x1024'
    body.quality = 'medium'
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`OpenAI image ${model} ${response.status}: ${detail.slice(0, 280)}`)
  }

  const payload = await response.json()
  const encoded = payload?.data?.[0]?.b64_json
  if (typeof encoded !== 'string' || !encoded) throw new Error(`Image ${model} vide.`)
  const bytes = decodeBase64(encoded)
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('Image trop lourde pour le blog.')
  return bytes
}

async function uploadIllustration(admin: SupabaseClient, subject: string): Promise<StoredImage> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY manquante dans les secrets de la fonction.')

  const prompt = [
    'Photorealistic editorial photograph in Tunisia, natural daylight.',
    'No text, no letters, no logo, no watermark, no readable license plate.',
    'A private transfer scene: a clean dark sedan or passenger van, a driver seen from a distance, airport or city street.',
    `Subject to illustrate: ${subject}.`,
  ].join(' ')

  let bytes: Uint8Array | null = null
  let lastError = 'Illustration impossible.'
  for (const model of ['dall-e-3', 'gpt-image-1']) {
    try {
      bytes = await requestIllustration(apiKey, model, prompt.slice(0, 3900))
      break
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError
      console.error(lastError)
    }
  }
  if (!bytes) throw new Error(lastError)

  const path = `auto-${crypto.randomUUID()}.png`
  const { error } = await admin.storage.from('blog-images').upload(path, bytes, {
    contentType: 'image/png',
    upsert: false,
    cacheControl: '86400',
  })
  if (error) throw new Error(`Envoi de l’image impossible : ${error.message}`)

  const { data } = admin.storage.from('blog-images').getPublicUrl(path)
  if (!data.publicUrl) throw new Error('Adresse publique de l’image indisponible.')
  return { url: data.publicUrl, path }
}

async function uniqueSlug(admin: SupabaseClient, title: string): Promise<string> {
  const base = slugify(title)
  for (let i = 0; i < 6; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`.slice(0, 80)
    const { data } = await admin.from('blog_posts').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
  }
  return `${base}-${Date.now().toString().slice(-4)}`.slice(0, 80)
}

async function publishAudience(
  admin: SupabaseClient,
  audience: Audience,
  day: string,
): Promise<PublishResult> {
  const { data: existing, error: existingError } = await admin
    .from('blog_posts')
    .select('id, title, slug, keyword, image_url')
    .eq('source', 'auto')
    .eq('audience', audience)
    .eq('published_day', day)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing?.image_url) {
    return { audience, status: 'skipped', title: existing.title, slug: existing.slug }
  }
  if (existing) {
    const image = await uploadIllustration(admin, existing.keyword || existing.title)
    const { error: imageError } = await admin
      .from('blog_posts')
      .update({
        image_url: image.url,
        image_path: image.path,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (imageError) throw imageError
    return { audience, status: 'illustrated', title: existing.title, slug: existing.slug }
  }

  const { data: topic, error: topicError } = await admin
    .from('blog_topics')
    .select('id, keyword')
    .eq('audience', audience)
    .is('used_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (topicError) throw topicError

  const { data: history, error: historyError } = await admin
    .from('blog_topics')
    .select('keyword')
    .eq('audience', audience)
    .order('created_at', { ascending: false })
    .limit(80)

  if (historyError) throw historyError

  const draft = await writeArticle({
    audience,
    keyword: topic?.keyword ?? null,
    avoid: (history ?? []).map((row) => row.keyword),
  })

  const now = new Date().toISOString()
  const slug = await uniqueSlug(admin, draft.title)
  const image = await uploadIllustration(admin, topic?.keyword ?? draft.keyword)
  const { data: post, error: insertError } = await admin
    .from('blog_posts')
    .insert({
      title: draft.title,
      slug,
      content: draft.content,
      image_url: image.url,
      image_path: image.path,
      published: true,
      published_at: now,
      updated_at: now,
      audience,
      source: 'auto',
      keyword: topic?.keyword ?? draft.keyword,
      published_day: day,
    })
    .select('id, title, slug')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return { audience, status: 'skipped', title: draft.title, slug }
    }
    throw insertError
  }

  if (topic) {
    const { error: markError } = await admin
      .from('blog_topics')
      .update({ used_at: now, post_id: post.id })
      .eq('id', topic.id)
    if (markError) throw markError
  } else {
    const { error: topicInsertError } = await admin.from('blog_topics').insert({
      audience,
      keyword: draft.keyword,
      used_at: now,
      post_id: post.id,
    })
    if (topicInsertError && topicInsertError.code !== '23505') throw topicInsertError
  }

  return { audience, status: 'published', title: post.title, slug: post.slug }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée.' }, 405)

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!url || !serviceKey) return json({ ok: false, error: 'Configuration Supabase incomplète.' }, 500)

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    if (!(await isAuthorized(req, admin))) {
      return json({ ok: false, error: 'Non autorisé.' }, 401)
    }

    const day = tunisDate()
    const client = await publishAudience(admin, 'client', day)
    const driver = await publishAudience(admin, 'driver', day)
    return json({ ok: true, day, posts: [client, driver] })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'Publication impossible.'
    return json({ ok: false, error: message }, 500)
  }
})
