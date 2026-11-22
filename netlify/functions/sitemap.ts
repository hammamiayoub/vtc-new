import type { Handler } from '@netlify/functions';

/**
 * Sitemap dynamique, servi sur /sitemap.xml (voir public/_redirects).
 *
 * - Pages fixes : listées ci-dessous (à tenir à jour quand on ajoute une page publique).
 * - Articles de blog : lus dans Supabase à chaque génération, pour que les articles publiés
 *   automatiquement (fonction publish-daily-blog) apparaissent sans intervention.
 *
 * Les pages privées (tableaux de bord, administration, réinitialisation de mot de passe)
 * n'y figurent pas et sont en « noindex » (voir public/_headers et src/utils/seo.ts).
 */

const SITE = 'https://tunidrive.net';

interface StaticPage {
  fr: string;
  en: string;
  lastmod: string;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Priorité de la version française ; l'anglaise est légèrement inférieure. */
  priority: number;
  /** Priorité anglaise si différente de « priority - 0.1 ». */
  priorityEn?: number;
}

const STATIC_PAGES: StaticPage[] = [
  { fr: '/', en: '/en', lastmod: '2026-11-22', changefreq: 'weekly', priority: 1.0, priorityEn: 0.9 },
  { fr: '/vtc-tunisie', en: '/en/vtc-tunisia', lastmod: '2026-10-09', changefreq: 'weekly', priority: 0.95, priorityEn: 0.85 },
  { fr: '/transport-groupes-tunisie', en: '/en/group-transport-tunisia', lastmod: '2026-10-21', changefreq: 'weekly', priority: 0.9, priorityEn: 0.8 },
  { fr: '/transport-colis-europe-tunisie', en: '/en/parcel-europe-tunisia', lastmod: '2026-10-09', changefreq: 'weekly', priority: 0.9, priorityEn: 0.8 },
  { fr: '/livraison-colis-tunisie', en: '/en/parcel-delivery-tunisia', lastmod: '2026-11-22', changefreq: 'weekly', priority: 0.9, priorityEn: 0.8 },
  { fr: '/a-propos', en: '/en/about', lastmod: '2026-10-09', changefreq: 'monthly', priority: 0.75, priorityEn: 0.7 },
  // /blog : sa date de modification est celle du dernier article (calculée plus bas)
  { fr: '/blog', en: '/en/blog', lastmod: '2026-11-08', changefreq: 'daily', priority: 0.8, priorityEn: 0.7 },
  { fr: '/signup', en: '/en/signup', lastmod: '2026-10-09', changefreq: 'monthly', priority: 0.7, priorityEn: 0.6 },
  { fr: '/client-signup', en: '/en/client-signup', lastmod: '2026-10-09', changefreq: 'monthly', priority: 0.7, priorityEn: 0.6 },
  { fr: '/login', en: '/en/login', lastmod: '2026-10-09', changefreq: 'monthly', priority: 0.6, priorityEn: 0.5 },
  { fr: '/client-login', en: '/en/client-login', lastmod: '2026-10-09', changefreq: 'monthly', priority: 0.6, priorityEn: 0.5 },
  { fr: '/driver-login', en: '/en/driver-login', lastmod: '2026-10-09', changefreq: 'monthly', priority: 0.6, priorityEn: 0.5 },
  { fr: '/terms-of-service', en: '/en/terms-of-service', lastmod: '2026-10-09', changefreq: 'yearly', priority: 0.4, priorityEn: 0.4 },
  { fr: '/privacy-policy', en: '/en/privacy-policy', lastmod: '2026-10-09', changefreq: 'yearly', priority: 0.4, priorityEn: 0.4 },
];

interface BlogRow {
  slug: string;
  published_at: string | null;
  updated_at: string | null;
}

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const day = (iso: string | null | undefined, fallback: string) =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : fallback;

function urlBlock(opts: {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
  fr: string;
  en: string;
}): string {
  const abs = (path: string) => `${SITE}${path === '/' ? '/' : path}`;
  return [
    '   <url>',
    `      <loc>${escapeXml(abs(opts.loc))}</loc>`,
    `      <lastmod>${opts.lastmod}</lastmod>`,
    `      <changefreq>${opts.changefreq}</changefreq>`,
    `      <priority>${opts.priority.toFixed(2).replace(/0$/, '')}</priority>`,
    `      <xhtml:link rel="alternate" hreflang="fr" href="${escapeXml(abs(opts.fr))}"/>`,
    `      <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(abs(opts.en))}"/>`,
    `      <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(abs(opts.fr))}"/>`,
    '   </url>',
  ].join('\n');
}

async function fetchPublishedPosts(): Promise<BlogRow[] | null> {
  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) return null;

  try {
    const response = await fetch(
      `${base}/rest/v1/blog_posts?select=slug,published_at,updated_at&published=eq.true&order=published_at.desc&limit=1000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as BlogRow[];
    return Array.isArray(rows) ? rows.filter((r) => typeof r.slug === 'string' && r.slug.length > 0) : null;
  } catch {
    return null;
  }
}

export const handler: Handler = async () => {
  const posts = await fetchPublishedPosts();

  const latestPostDate = posts?.length
    ? posts
        .map((p) => day(p.updated_at ?? p.published_at, ''))
        .filter(Boolean)
        .sort()
        .pop()
    : undefined;

  const blocks: string[] = [];

  for (const page of STATIC_PAGES) {
    const lastmod = page.fr === '/blog' && latestPostDate ? latestPostDate : page.lastmod;
    blocks.push(
      urlBlock({ loc: page.fr, lastmod, changefreq: page.changefreq, priority: page.priority, fr: page.fr, en: page.en }),
      urlBlock({
        loc: page.en,
        lastmod,
        changefreq: page.changefreq,
        priority: page.priorityEn ?? Math.max(0.1, page.priority - 0.1),
        fr: page.fr,
        en: page.en,
      }),
    );
  }

  for (const post of posts ?? []) {
    const slug = encodeURIComponent(post.slug);
    const fr = `/blog/${slug}`;
    const en = `/en/blog/${slug}`;
    const lastmod = day(post.updated_at ?? post.published_at, '2026-01-01');
    blocks.push(
      urlBlock({ loc: fr, lastmod, changefreq: 'weekly', priority: 0.6, fr, en }),
      urlBlock({ loc: en, lastmod, changefreq: 'weekly', priority: 0.55, fr, en }),
    );
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    '',
    blocks.join('\n\n'),
    '',
    '</urlset>',
    '',
  ].join('\n');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Base de données injoignable : on sert les pages fixes mais on ne garde pas ce sitemap en cache longtemps.
      'Cache-Control': posts ? 'public, max-age=3600, s-maxage=3600' : 'public, max-age=60, s-maxage=60',
      'X-Sitemap-Blog-Source': posts ? 'database' : 'unavailable',
    },
    body: xml,
  };
};
