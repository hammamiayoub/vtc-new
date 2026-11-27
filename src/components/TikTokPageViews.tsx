import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Site monopage : le pixel TikTok n'envoie une page vue qu'au chargement (index.html).
 * Ce composant envoie les suivantes à chaque changement d'URL. Sans effet tant que le pixel n'est
 * pas chargé, c'est-à-dire tant que les cookies n'ont pas été acceptés.
 */
export function TikTokPageViews() {
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.ttq?.page();
  }, [pathname]);

  return null;
}
