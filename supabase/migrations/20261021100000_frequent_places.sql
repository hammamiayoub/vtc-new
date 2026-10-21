-- Lieux fréquents des transferts (aéroports, gares, hôtels).
-- Servis par le site sans appel Google. Les hôtels s'ajoutent par de nouvelles lignes (kind = 'hotel').

CREATE TABLE IF NOT EXISTS public.frequent_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  kind text NOT NULL CHECK (kind IN ('airport', 'station', 'hotel')),
  country_code text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS frequent_places_label_key ON public.frequent_places (label);

ALTER TABLE public.frequent_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS frequent_places_public_read ON public.frequent_places;
CREATE POLICY frequent_places_public_read
  ON public.frequent_places
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

INSERT INTO public.frequent_places (label, aliases, kind, country_code, latitude, longitude)
VALUES
  (
    'Aéroport Tunis-Carthage',
    ARRAY['aeroport tunis carthage', 'aeroport de tunis', 'aeroport tunis', 'tunis carthage', 'carthage', 'tunis airport', 'carthage airport'],
    'airport', 'tn', 36.85111, 10.22722
  ),
  (
    'Aéroport Enfidha-Hammamet',
    ARRAY['aeroport enfidha', 'enfidha', 'aeroport hammamet', 'enfidha hammamet', 'enfidha airport'],
    'airport', 'tn', 36.09194, 10.41389
  ),
  (
    'Aéroport Djerba-Zarzis',
    ARRAY['aeroport djerba', 'djerba', 'zarzis', 'aeroport zarzis', 'djerba airport'],
    'airport', 'tn', 33.87500, 10.77528
  ),
  (
    'Aéroport Monastir Habib Bourguiba',
    ARRAY['aeroport monastir', 'monastir airport', 'habib bourguiba', 'skanes'],
    'airport', 'tn', 35.75806, 10.75472
  ),
  (
    'Aéroport Sfax-Thyna',
    ARRAY['aeroport sfax', 'sfax airport', 'thyna'],
    'airport', 'tn', 34.71778, 10.69083
  ),
  (
    'Aéroport Tozeur-Nefta',
    ARRAY['aeroport tozeur', 'tozeur airport', 'nefta'],
    'airport', 'tn', 33.93972, 8.11056
  ),
  (
    'Aéroport Tabarka-Aïn Draham',
    ARRAY['aeroport tabarka', 'tabarka airport', 'ain draham'],
    'airport', 'tn', 36.98000, 8.87694
  ),
  (
    'Aéroport Gafsa-Ksar',
    ARRAY['aeroport gafsa', 'gafsa airport'],
    'airport', 'tn', 34.42194, 8.82250
  ),
  (
    'Aéroport Gabès-Matmata',
    ARRAY['aeroport gabes', 'gabes airport', 'matmata'],
    'airport', 'tn', 33.73337, 9.91821
  ),
  (
    'Gare de Tunis',
    ARRAY['gare tunis', 'gare de barcelone', 'place de barcelone', 'tunis ville'],
    'station', 'tn', 36.79607, 10.18053
  ),
  (
    'Gare de Sousse',
    ARRAY['gare sousse', 'gare de sousse'],
    'station', 'tn', 35.83065, 10.63833
  ),
  (
    'Gare de Monastir',
    ARRAY['gare monastir', 'gare habib bourguiba monastir'],
    'station', 'tn', 35.77089, 10.82640
  ),
  (
    'Gare de Sfax',
    ARRAY['gare sfax', 'gare de sfax'],
    'station', 'tn', 34.73778, 10.76639
  ),
  (
    'Gare de Gabès',
    ARRAY['gare gabes', 'gare de gabes'],
    'station', 'tn', 33.88448, 10.09936
  )
ON CONFLICT (label) DO NOTHING;
