import { z } from 'zod';

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
  phone: z
    .string()
    .min(8, 'Le numéro de téléphone doit contenir 8 chiffres')
    .max(8, 'Le numéro de téléphone doit contenir 8 chiffres')
    .regex(/^[0-9]{8}$/, 'Le numéro doit contenir exactement 8 chiffres (ex: 12345678)'),
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
  phone: z
    .string()
    .min(8, 'Le numéro de téléphone doit contenir 8 chiffres')
    .max(8, 'Le numéro de téléphone doit contenir 8 chiffres')
    .regex(/^[0-9]{8}$/, 'Le numéro doit contenir exactement 8 chiffres (ex: 22123456)'),
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
    .enum(['sedan', 'pickup', 'van', 'minibus', 'bus', 'truck', 'utility', 'limousine'])
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
