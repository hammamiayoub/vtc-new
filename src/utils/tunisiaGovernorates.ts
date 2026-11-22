/**
 * Les 24 gouvernorats de Tunisie, identifiés par un code stable stocké en base
 * (`drivers.parcel_governorates`, `parcel_quote_requests.*_governorate`).
 * La liste doit rester identique aux CHECK de la migration 20261122110000.
 */
export interface TunisiaGovernorate {
  code: string;
  fr: string;
  en: string;
  ar: string;
  /** Variantes d'écriture rencontrées dans Google Places ou dans nos lieux fréquents. */
  aliases?: string[];
}

export const TUNISIA_GOVERNORATES: TunisiaGovernorate[] = [
  { code: 'tunis', fr: 'Tunis', en: 'Tunis', ar: 'تونس' },
  { code: 'ariana', fr: 'Ariana', en: 'Ariana', ar: 'أريانة', aliases: ['l ariana'] },
  { code: 'ben_arous', fr: 'Ben Arous', en: 'Ben Arous', ar: 'بن عروس' },
  { code: 'manouba', fr: 'La Manouba', en: 'Manouba', ar: 'منوبة', aliases: ['manouba', 'la manouba'] },
  { code: 'nabeul', fr: 'Nabeul', en: 'Nabeul', ar: 'نابل' },
  { code: 'zaghouan', fr: 'Zaghouan', en: 'Zaghouan', ar: 'زغوان' },
  { code: 'bizerte', fr: 'Bizerte', en: 'Bizerte', ar: 'بنزرت' },
  { code: 'beja', fr: 'Béja', en: 'Beja', ar: 'باجة' },
  { code: 'jendouba', fr: 'Jendouba', en: 'Jendouba', ar: 'جندوبة' },
  { code: 'kef', fr: 'Le Kef', en: 'Kef', ar: 'الكاف', aliases: ['kef', 'le kef', 'el kef'] },
  { code: 'siliana', fr: 'Siliana', en: 'Siliana', ar: 'سليانة' },
  { code: 'sousse', fr: 'Sousse', en: 'Sousse', ar: 'سوسة' },
  { code: 'monastir', fr: 'Monastir', en: 'Monastir', ar: 'المنستير' },
  { code: 'mahdia', fr: 'Mahdia', en: 'Mahdia', ar: 'المهدية' },
  { code: 'sfax', fr: 'Sfax', en: 'Sfax', ar: 'صفاقس' },
  { code: 'kairouan', fr: 'Kairouan', en: 'Kairouan', ar: 'القيروان' },
  { code: 'kasserine', fr: 'Kasserine', en: 'Kasserine', ar: 'القصرين' },
  { code: 'sidi_bouzid', fr: 'Sidi Bouzid', en: 'Sidi Bouzid', ar: 'سيدي بوزيد' },
  { code: 'gabes', fr: 'Gabès', en: 'Gabes', ar: 'قابس' },
  { code: 'medenine', fr: 'Médenine', en: 'Medenine', ar: 'مدنين', aliases: ['djerba', 'zarzis'] },
  { code: 'tataouine', fr: 'Tataouine', en: 'Tataouine', ar: 'تطاوين' },
  { code: 'gafsa', fr: 'Gafsa', en: 'Gafsa', ar: 'قفصة' },
  { code: 'tozeur', fr: 'Tozeur', en: 'Tozeur', ar: 'توزر' },
  { code: 'kebili', fr: 'Kébili', en: 'Kebili', ar: 'قبلي' },
];

export const TUNISIA_GOVERNORATE_CODES = TUNISIA_GOVERNORATES.map((g) => g.code);

const BY_CODE = new Map(TUNISIA_GOVERNORATES.map((g) => [g.code, g]));

export function governorateLabel(code?: string | null, locale: 'fr' | 'en' = 'fr'): string {
  if (!code) return '';
  const g = BY_CODE.get(code);
  return g ? (locale === 'en' ? g.en : g.fr) : code;
}

const NOISE_WORDS = new Set(['governorate', 'gouvernorat', 'wilaya', 'province', 'de', 'du', 'of', 'ولاية']);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim();
}

function namesFor(g: TunisiaGovernorate): string[] {
  return [g.fr, g.en, g.ar, ...(g.aliases ?? [])].map(normalize).filter(Boolean);
}

// Noms normalisés, plus longs d'abord (« sidi bouzid » avant tout nom plus court)
const NAME_INDEX: { name: string; code: string }[] = TUNISIA_GOVERNORATES.flatMap((g) =>
  namesFor(g).map((name) => ({ name, code: g.code })),
).sort((a, b) => b.name.length - a.name.length);

/**
 * Convertit la valeur `administrative_area_level_1` de Google (« Tunis Governorate »,
 * « Gouvernorat de Ben Arous », « ولاية صفاقس »…) en code de gouvernorat.
 */
export function governorateFromAdministrativeArea(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = normalize(raw)
    .split(' ')
    .filter((word) => word && !NOISE_WORDS.has(word))
    .join(' ');
  return NAME_INDEX.find((entry) => entry.name === cleaned)?.code;
}

/**
 * Cherche un nom de gouvernorat comme mot entier dans un libellé de lieu
 * (ex. « Aéroport Tunis-Carthage »). À réserver à notre catalogue de lieux fréquents :
 * sur du texte libre Google, un nom d'établissement pourrait induire en erreur.
 */
export function governorateFromText(text?: string | null): string | undefined {
  if (!text) return undefined;
  const padded = ` ${normalize(text)} `;
  return NAME_INDEX.find((entry) => padded.includes(` ${entry.name} `))?.code;
}
