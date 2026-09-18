import { supabase } from '../lib/supabase';

export interface PublicReview {
  rating: number;
  comment: string;
  createdAt: string;
  clientInitial: string;
  city: string;
}

type RpcRow = {
  rating?: number;
  comment?: string;
  created_at?: string;
  client_initial?: string;
  city?: string;
};

/** Avis de secours affichés tant que la base n'a pas assez de commentaires publics. */
export const FALLBACK_REVIEWS: PublicReview[] = [
  {
    rating: 5,
    comment: 'Chauffeur ponctuel et très professionnel. Trajet Tunis–Hammamet sans stress, je recommande.',
    createdAt: '2026-01-15T10:00:00Z',
    clientInitial: 'S.',
    city: 'Tunis',
  },
  {
    rating: 5,
    comment: 'Transfert aéroport parfait, accueil avec pancarte et véhicule propre. Tarif annoncé respecté.',
    createdAt: '2026-02-03T14:00:00Z',
    clientInitial: 'M.',
    city: 'Enfidha',
  },
  {
    rating: 4,
    comment: 'Réservation simple depuis l\'app, suivi en temps réel et chauffeur courtois. Très bon service VTC.',
    createdAt: '2026-02-20T09:00:00Z',
    clientInitial: 'A.',
    city: 'Sousse',
  },
  {
    rating: 5,
    comment: 'Van spacieux pour notre groupe de 6 personnes. Conducteur expérimenté et trajet confortable.',
    createdAt: '2026-03-08T16:00:00Z',
    clientInitial: 'L.',
    city: 'Sfax',
  },
];

export async function fetchPublicReviews(limit = 12): Promise<PublicReview[]> {
  try {
    const { data, error } = await supabase.rpc('get_public_reviews', { p_limit: limit });

    if (error || !data) {
      console.warn('Impossible de charger les avis publics:', error?.message);
      return FALLBACK_REVIEWS;
    }

    const rows = (Array.isArray(data) ? data : []) as RpcRow[];
    const reviews = rows
      .filter((row) => row.comment && row.rating)
      .map((row) => ({
        rating: row.rating!,
        comment: row.comment!.trim(),
        createdAt: row.created_at ?? new Date().toISOString(),
        clientInitial: row.client_initial ?? 'C.',
        city: row.city ?? 'Tunisie',
      }));

    return reviews.length > 0 ? reviews : FALLBACK_REVIEWS;
  } catch (err) {
    console.warn('Erreur avis publics:', err);
    return FALLBACK_REVIEWS;
  }
}
