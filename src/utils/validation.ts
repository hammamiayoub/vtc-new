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
    .min(10, 'Le numéro de téléphone doit contenir au moins 10 chiffres')
    .regex(/^[0-9+\-\s()]+$/, 'Format de téléphone invalide'),
  licenseNumber: z
    .string()
    .min(5, 'Le numéro de permis doit contenir au moins 5 caractères')
    .max(20, 'Le numéro de permis ne peut pas dépasser 20 caractères'),
  vehicleInfo: z.object({
    make: z
      .string()
      .min(2, 'La marque doit contenir au moins 2 caractères'),
    model: z
      .string()
      .min(2, 'Le modèle doit contenir au moins 2 caractères'),
    year: z
      .number()
      .min(2000, 'Le véhicule doit être de 2000 ou plus récent')
      .max(new Date().getFullYear() + 1, 'Année invalide'),
    color: z
      .string()
      .min(3, 'La couleur doit contenir au moins 3 caractères'),
    licensePlate: z
      .string()
      .min(6, 'La plaque d\'immatriculation doit contenir au moins 6 caractères')
      .max(10, 'La plaque d\'immatriculation ne peut pas dépasser 10 caractères'),
    seats: z
      .number()
      .min(2, 'Le véhicule doit avoir au moins 2 places')
      .max(8, 'Le véhicule ne peut pas avoir plus de 8 places'),
    type: z.enum(['sedan', 'suv', 'luxury', 'van'], {
      errorMap: () => ({ message: 'Type de véhicule invalide' })
    })
  })
});