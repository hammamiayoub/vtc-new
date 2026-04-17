import { z } from 'zod';

/**
 * Normalise un numéro de téléphone :
 * - 8 chiffres commençant par 2, 5 ou 9 → ajoute le préfixe +216 (Tunisie)
 * - +CC0local ou 00CC0local (hors +216) → supprime le 0 de troncature local
 *   ex: +330601646792 → +33601646792 | 00330601646792 → 0033601646792
 */
export function normalizePhone(raw: string): string {
  const value = raw.trim().replace(/\s+/g, '');

  if (!value) return value;

  // 8 chiffres tunisiens (2X / 5X / 9X) → préfixe +216
  if (/^[259]\d{7}$/.test(value)) {
    return '+216' + value;
  }

  // +CC0local → supprime le 0 de troncature si CC ≠ 216
  // Le local doit contenir ≥ 6 chiffres pour éviter la transformation prématurée lors de la saisie
  const plusMatch = value.match(/^\+(\d{1,3})0(\d{6,12})$/);
  if (plusMatch && plusMatch[1] !== '216') {
    return '+' + plusMatch[1] + plusMatch[2];
  }

  // 00CC0local → supprime le 0 de troncature si CC ≠ 216
  const doubleZeroMatch = value.match(/^00(\d{1,3})0(\d{6,12})$/);
  if (doubleZeroMatch && doubleZeroMatch[1] !== '216') {
    return '00' + doubleZeroMatch[1] + doubleZeroMatch[2];
  }

  return value;
}

const phoneFieldSchema = z.string().superRefine((val, ctx) => {
  const v = val.trim().replace(/\s+/g, '');

  if (!v) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Le numéro de téléphone est requis' });
    return;
  }

  // Commence par un seul 0 → demander l'indicatif pays
  if (/^0[^0]/.test(v)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Numéro commençant par 0 : veuillez entrer l'indicatif du pays au format +XX (ex: +33 pour la France)",
    });
    return;
  }

  // 8 chiffres tunisiens (2X / 5X / 9X) — avant normalisation
  if (/^[259]\d{7}$/.test(v)) return;
  // +216 + 8 chiffres tunisiens — après normalisation
  if (/^\+216[259]\d{7}$/.test(v)) return;
  // Format international E.164 (+CC…)
  if (/^\+\d{7,15}$/.test(v)) return;
  // Format 00CC…
  if (/^00\d{7,15}$/.test(v)) return;

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'Numéro invalide. Ex : 22123456 (Tunisie) ou +33601234567 (France)',
  });
});

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/(?=.*[a-z])/, 'Le mot de passe doit contenir au moins une lettre minuscule')
  .regex(/(?=.*[A-Z])/, 'Le mot de passe doit contenir au moins une lettre majuscule')
  .regex(/(?=.*\d)/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/(?=.*[^a-zA-Z0-9])/, 'Le mot de passe doit contenir au moins un caractère spécial');

export const signupSchema = z.object({
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
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
});

export const clientSignupSchema = z.object({
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
  phone: phoneFieldSchema,
  city: z
    .string()
    .min(2, 'La ville doit contenir au moins 2 caractères')
    .max(100, 'La ville ne peut pas dépasser 100 caractères'),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
});

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
