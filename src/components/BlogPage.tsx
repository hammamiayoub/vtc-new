import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer } from './Footer';
import { SkeletonList } from './ui/Skeleton';
import { applyBlogArticleSeo, removeJsonLd } from '../utils/seo';
import {
  excerptFromContent,
  fetchPublishedBlogPostBySlug,
  fetchPublishedBlogPosts,
  type BlogPost,
} from '../utils/blogPosts';
import { useLocale } from '../i18n/locale';

/** Balise embed fournie par Soro AI */
const SORO_EMBED_SRC =
  'https://app.trysoro.com/api/embed/1b2816b5-2ea6-4240-bc1d-27c3008d1855';

function loadSoroEmbed() {
  if (document.querySelector(`script[src="${SORO_EMBED_SRC}"]`)) return;

  const script = document.createElement('script');
  script.src = SORO_EMBED_SRC;
  script.defer = true;
  document.body.appendChild(script);
}

function formatPostDate(value: string | null, locale: 'fr' | 'en'): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function blogSlugFromPath(pathname: string): string | null {
  if (!pathname.startsWith('/blog/')) return null;
  const slug = decodeURIComponent(pathname.slice('/blog/'.length)).replace(/\/+$/, '');
  return slug || null;
}

export const BlogPage: React.FC = () => {
  const location = useLocation();
  const { locale, logicalPath, href } = useLocale();
  const en = locale === 'en';
  const slug = blogSlugFromPath(logicalPath);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [listReady, setListReady] = useState(false);
  const [article, setArticle] = useState<BlogPost | null>(null);
  const [articleResolved, setArticleResolved] = useState(!slug);

  useEffect(() => {
    let cancelled = false;

    if (!slug) {
      setArticle(null);
      setArticleResolved(true);
      setListReady(false);
      void fetchPublishedBlogPosts()
        .then((rows) => {
          if (!cancelled) setPosts(rows);
        })
        .catch((err) => {
          console.error(err);
          if (!cancelled) setPosts([]);
        })
        .finally(() => {
          if (!cancelled) setListReady(true);
        });
      return () => {
        cancelled = true;
      };
    }

    setArticleResolved(false);
    void fetchPublishedBlogPostBySlug(slug)
      .then((post) => {
        if (!cancelled) setArticle(post);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setArticle(null);
      })
      .finally(() => {
        if (!cancelled) setArticleResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const showSoro = articleResolved && !article;

  useLayoutEffect(() => {
    if (!showSoro) return;
    loadSoroEmbed();
  }, [showSoro, location.pathname]);

  useEffect(() => {
    if (!slug) {
      removeJsonLd('blog-posting');
      return;
    }
    if (!article) return;
    applyBlogArticleSeo(
      {
        title: article.title,
        description: excerptFromContent(article.content, 160),
        imageUrl: article.image_url,
        publishedAt: article.published_at,
        updatedAt: article.updated_at,
      },
      locale,
      logicalPath,
    );
  }, [article, locale, logicalPath, slug]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          {article ? (
            <article className="animate-fade-in">
              <Link
                to={href('/blog')}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6"
              >
                <ArrowLeft size={16} />
                {en ? 'Back to the blog' : 'Retour au blog'}
              </Link>
              {article.image_url && (
                <img
                  src={article.image_url}
                  alt=""
                  className="w-full max-h-[420px] object-cover rounded-2xl mb-6"
                />
              )}
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mb-8">
                {article.audience && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {article.audience === 'driver' ? (en ? 'Drivers' : 'Chauffeurs') : (en ? 'Riders' : 'Voyageurs')}
                  </span>
                )}
                {article.published_at && (
                  <p className="text-sm text-gray-500">{formatPostDate(article.published_at, locale)}</p>
                )}
              </div>
              {en && (
                <p className="text-sm text-gray-500 mb-6">This article is written in French.</p>
              )}
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base md:text-lg">
                {article.content}
              </div>
            </article>
          ) : (
            <>
              <header className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                  Blog TuniDrive
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  {en
                    ? 'Guides on private hire, Europe ↔ Tunisia parcels and mobility in Tunisia. Articles are published in French.'
                    : 'Conseils VTC, transport de colis Europe ↔ Tunisie et actualités mobilité en Tunisie.'}
                </p>
              </header>

              {!slug && !listReady && <SkeletonList count={3} className="mb-12" />}

              {posts.length > 0 && (
                <section className="mb-12 animate-fade-in" aria-label={en ? 'TuniDrive articles' : 'Articles TuniDrive'}>
                  <div className="grid gap-6">
                    {posts.map((post) => (
                      <Link
                        key={post.id}
                        to={href(`/blog/${post.slug}`)}
                        className="group uber-card overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt=""
                            className="w-full h-52 sm:h-64 object-cover"
                          />
                        )}
                        <div className="p-5 sm:p-6">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {post.audience && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                {post.audience === 'driver' ? (en ? 'Drivers' : 'Chauffeurs') : (en ? 'Riders' : 'Voyageurs')}
                              </span>
                            )}
                            {post.published_at && (
                              <p className="text-xs text-gray-500">{formatPostDate(post.published_at, locale)}</p>
                            )}
                          </div>
                          <h2 className="text-xl font-semibold text-gray-900 group-hover:underline underline-offset-2">
                            {post.title}
                          </h2>
                          <p className="text-gray-600 mt-2 leading-relaxed">
                            {excerptFromContent(post.content)}
                          </p>
                          <span className="inline-block mt-4 text-sm font-semibold text-gray-900">
                            {en ? 'Read the article' : 'Lire l’article'}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {showSoro && (
                <div
                  id="soro-blog"
                  key={location.pathname}
                  className="min-h-[400px]"
                  aria-live="polite"
                />
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};
