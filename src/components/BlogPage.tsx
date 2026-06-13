import React, { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { SITE_URL } from '../utils/seo';

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

export const BlogPage: React.FC = () => {
  const location = useLocation();
  const blogRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!blogRef.current) return;
    loadSoroEmbed();
  }, [location.pathname]);

  useLayoutEffect(() => {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', `${SITE_URL}${location.pathname}`);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <header className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Blog TuniDrive
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Conseils VTC, transport de colis Europe ↔ Tunisie et actualités mobilité en Tunisie.
            </p>
          </header>

          {/* Équivalent React de :
              <div id="soro-blog"></div>
              <script src="https://app.trysoro.com/api/embed/1b2816b5-2ea6-4240-bc1d-27c3008d1855" defer></script>
          */}
          <div
            ref={blogRef}
            id="soro-blog"
            key={location.pathname}
            className="min-h-[400px]"
            aria-live="polite"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};
