import { z } from 'zod';
import {
  getSignupCountryDialCode,
  SIGNUP_COUNTRY_CODES,
  type SignupCountryCode,
} from './signupCountries';

/**
 * Normalise un numéro selon le pays choisi :
 * - +indicatif… ou 00indicatif… → conserve (avec correction du 0 de troncature hors +216)
 * - numéro commençant par un seul 0 → supprime le 0 et applique l'indicatif du pays
 * - numéro local sans préfixe → applique l'indicatif du pays
 */
export function normalizePhone(raw: string, country: SignupCountryCode = 'TN'): string {
  const value = raw.trim().replace(/\s+/g, '');

  if (!value) return value;

  const dialCode = getSignupCountryDialCode(country);

  if (value.startsWith('+')) {
    const plusMatch = value.match(/^\+(\d{1,3})0(\d{6,12})$/);
    if (plusMatch && plusMatch[1] !== '216') {
      return '+' + plusMatch[1] + plusMatch[2];
    }
    return value;
  }

  if (value.startsWith('00')) {
    const doubleZeroMatch = value.match(/^00(\d{1,3})0(\d{6,12})$/);
    if (doubleZeroMatch && doubleZeroMatch[1] !== '216') {
      return '00' + doubleZeroMatch[1] + doubleZeroMatch[2];
    }
    return value;
  }

  if (/^0[^0]/.test(value)) {
    return dialCode + value.slice(1);
  }

  if (country === 'TN' && /^[259]\d{7}$/.test(value)) {
    return '+216' + value;
  }

  if (/^\d{6,12}$/.test(value)) {
    return dialCode + value;
  }

  return value;
}

export function isValidNormalizedPhone(normalized: string): boolean {
  const v = normalized.trim().replace(/\s+/g, '');
  if (!v) return false;
  if (/^\+\d{7,15}$/.test(v)) return true;
  if (/^00\d{7,15}$/.test(v)) return true;
  return false;
}

function refineSignupPhone(
  data: { phone: string; country: SignupCountryCode },
  ctx: z.RefinementCtx
) {
  const v = data.phone.trim().replace(/\s+/g, '');

  if (!v) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le numéro de téléphone est requis',
      path: ['phone'],
    });
    return;
  }

  const normalized = normalizePhone(v, data.country);
  if (!isValidNormalizedPhone(normalized)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'Numéro invalide. Saisissez un numéro local (ex : 0612345678) ou international (+33…).',
      path: ['phone'],
    });
  }
}

const phoneFieldSchema = z.string().superRefine((val, ctx) => {
  if (!isValidNormalizedPhone(normalizePhone(val, 'TN'))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Numéro invalide. Ex : 22123456 (Tunisie) ou +33601234567 (France)',
    });
  }
});

export const signupCountrySchema = z.enum(SIGNUP_COUNTRY_CODES, {
  message: 'Veuillez sélectionner un pays',
});

const signupContactFieldsSchema = {
  country: signupCountrySchema,
  phone: z.string().min(1, 'Le numéro de téléphone est requis'),
  city: z
    .string()
    .min(2, 'La ville doit contenir au moins 2 caractères')
    .max(100, 'La ville ne peut pas dépasser 100 caractères'),
};

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/(?=.*[a-z])/, 'Le mot de passe doit contenir au moins une lettre minuscule')
  .regex(/(?=.*[A-Z])/, 'Le mot de passe doit contenir au moins une lettre majuscule')
  .regex(/(?=.*\d)/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/(?=.*[^a-zA-Z0-9])/, 'Le mot de passe doit contenir au moins un caractère spécial');

const signupObjectSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères'),
  lastName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  email: z
    .string()
    .email('Veuillez entrer une adresse email valide'),
  password: passwordSchema,
  confirmPassword: z.string(),
});

export const signupSchema = signupObjectSchema.refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Les mots de passe ne correspondent pas', path: ['confirmPassword'] }
);

export const driverSignupSchema = signupObjectSchema
  .extend({
    activityType: z.enum(['vtc', 'transporteur'], {
      message: 'Veuillez choisir votre type d\'activité',
    }),
    ...signupContactFieldsSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
  .superRefine(refineSignupPhone);

export const clientSignupSchema = z
  .object({
    firstName: z
      .string()
      .min(2, 'Le prénom doit contenir au moins 2 caractères')
      .max(50, 'Le prénom ne peut pas dépasser 50 caractères'),
    lastName: z
      .string()
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
    email: z.string().email('Veuillez entrer une adresse email valide'),
    ...signupContactFieldsSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
  .superRefine(refineSignupPhone);

export const validatePassword = (password: string) => {
  const requirements = [
    { 
      regex: /.{8,}/, 
      message: 'Au moins 8 caractères',
      met: password.length >= 8 
    },
    { 
      regex: /(?=.*[a-z])/, 
      message: 'Une lettre minuscule',
      met: /(?=.*[a-z])/.test(password)
    },
    { 
      regex: /(?=.*[A-Z])/, 
      message: 'Une lettre majuscule',
      met: /(?=.*[A-Z])/.test(password)
    },
    { 
      regex: /(?=.*\d)/, 
      message: 'Un chiffre',
      met: /(?=.*\d)/.test(password)
    },
    { 
      regex: /(?=.*[^a-zA-Z0-9])/, 
      message: 'Un caractère spécial',
      met: /(?=.*[^a-zA-Z0-9])/.test(password)
    }
  ];

  return requirements;
};

export const driverProfileSchema = z.object({
  phone: phoneFieldSchema,
  city: z
    .string()
    .min(2, 'La ville doit contenir au moins 2 caractères')
    .max(100, 'La ville ne peut pas dépasser 100 caractères'),
  licenseNumber: z
    .string()
    .min(5, 'Le numéro de permis doit contenir au moins 5 caractères')
    .max(20, 'Le numéro de permis ne peut pas dépasser 20 caractères'),
});

export const bookingSchema = z.object({
  pickupAddress: z
    .string()
    .min(3, 'L\'adresse de départ doit contenir au moins 3 caractères')
    .max(200, 'L\'adresse de départ ne peut pas dépasser 200 caractères'),
  destinationAddress: z
    .string()
    .min(3, 'L\'adresse d\'arrivée doit contenir au moins 3 caractères')
    .max(200, 'L\'adresse d\'arrivée ne peut pas dépasser 200 caractères'),
  scheduledTime: z
    .string()
    .min(1, 'Veuillez sélectionner une heure'),
  vehicleType: z
    .enum(['sedan', 'pickup', 'van', 'minibus', 'bus', 'truck', 'utility', 'taxi'])
    .optional(),
  isReturnTrip: z
    .boolean()
    .optional(),
  notes: z
    .string()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
    .optional()
});

export const ratingSchema = z.object({
  rating: z
    .number()
    .min(1, 'La note doit être au minimum 1 étoile')
    .max(5, 'La note doit être au maximum 5 étoiles'),
  comment: z
    .string()
    .max(500, 'Le commentaire ne peut pas dépasser 500 caractères')
    .optional()
});

// ============================================================
// Transport international de colis (devis)
// ============================================================
export const parcelItemSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom de l\'objet doit contenir au moins 2 caractères')
    .max(150, 'Le nom de l\'objet ne peut pas dépasser 150 caractères'),
  quantity: z.coerce
    .number()
    .int('Le nombre de colis doit être un entier')
    .min(1, 'Au moins 1 colis'),
  weightKg: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().min(0, 'Le poids ne peut pas être négatif').optional()
  ),
  volumeM3: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().min(0, 'Le volume ne peut pas être négatif').optional()
  ),
});

export const parcelQuoteSchema = z.object({
  direction: z.enum(['europe_to_tunisia', 'tunisia_to_europe'], {
    message: 'Veuillez sélectionner une direction',
  }),
  departureAddress: z
    .string()
    .min(3, 'L\'adresse de départ doit contenir au moins 3 caractères')
    .max(250, 'L\'adresse de départ ne peut pas dépasser 250 caractères'),
  arrivalAddress: z
    .string()
    .min(3, 'L\'adresse d\'arrivée doit contenir au moins 3 caractères')
    .max(250, 'L\'adresse d\'arrivée ne peut pas dépasser 250 caractères'),
  desiredDate: z
    .string()
    .min(1, 'Veuillez sélectionner une date souhaitée'),
  items: z
    .array(parcelItemSchema)
    .min(1, 'Veuillez décrire au moins un objet'),
  notes: z
    .string()
    .max(1000, 'Les notes ne peuvent pas dépasser 1000 caractères')
    .optional(),
});

export const parcelProposalSchema = z.object({
  price: z.coerce
    .number()
    .min(1, 'Veuillez saisir un prix valide'),
  estimatedDeliveryDate: z
    .string()
    .optional(),
  message: z
    .string()
    .max(1000, 'Le message ne peut pas dépasser 1000 caractères')
    .optional(),
});
