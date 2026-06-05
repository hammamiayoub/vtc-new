export const SIGNUP_COUNTRIES = [
  { code: 'TN', label: 'Tunisie', dialCode: '+216' },
  { code: 'FR', label: 'France', dialCode: '+33' },
  { code: 'IT', label: 'Italie', dialCode: '+39' },
  { code: 'DE', label: 'Allemagne', dialCode: '+49' },
  { code: 'ES', label: 'Espagne', dialCode: '+34' },
  { code: 'BE', label: 'Belgique', dialCode: '+32' },
  { code: 'LU', label: 'Luxembourg', dialCode: '+352' },
  { code: 'CH', label: 'Suisse', dialCode: '+41' },
  { code: 'NL', label: 'Pays-Bas', dialCode: '+31' },
] as const;

export type SignupCountryCode = (typeof SIGNUP_COUNTRIES)[number]['code'];

export const SIGNUP_COUNTRY_CODES = SIGNUP_COUNTRIES.map((c) => c.code) as [
  SignupCountryCode,
  ...SignupCountryCode[],
];

export function getSignupCountryDialCode(country: SignupCountryCode): string {
  return SIGNUP_COUNTRIES.find((c) => c.code === country)?.dialCode ?? '+216';
}

export function getSignupCountryLabel(country: SignupCountryCode): string {
  return SIGNUP_COUNTRIES.find((c) => c.code === country)?.label ?? 'Tunisie';
}

/** Code ISO 2 lettres (minuscules) pour Google Places Autocomplete */
export function getSignupGoogleCountryCode(country: SignupCountryCode): string {
  return country.toLowerCase();
}

export function getPhonePlaceholder(country: SignupCountryCode): string {
  switch (country) {
    case 'TN':
      return 'Ex : 22123456 ou 0612345678';
    case 'FR':
      return 'Ex : 0612345678 ou +33612345678';
    case 'DE':
      return 'Ex : 01511234567 ou +491511234567';
    default:
      return 'Ex : 0612345678 ou indicatif international';
  }
}
