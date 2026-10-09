const EN: Record<string, string> = {
  'Le numéro de téléphone est requis': 'A phone number is required',
  'Numéro invalide. Saisissez un numéro local (ex : 0612345678) ou international (+33…).':
    'Invalid number. Enter a local number (e.g. 0612345678) or an international one (+33…).',
  'Numéro invalide. Ex : 22123456 (Tunisie) ou +33601234567 (France)':
    'Invalid number. Example: 22123456 (Tunisia) or +33601234567 (France)',
  'Veuillez sélectionner un pays': 'Please select a country',
  'La ville doit contenir au moins 2 caractères': 'The city must be at least 2 characters',
  'La ville ne peut pas dépasser 100 caractères': 'The city cannot exceed 100 characters',
  'Le prénom doit contenir au moins 2 caractères': 'The first name must be at least 2 characters',
  'Le prénom ne peut pas dépasser 50 caractères': 'The first name cannot exceed 50 characters',
  'Le nom doit contenir au moins 2 caractères': 'The last name must be at least 2 characters',
  'Le nom ne peut pas dépasser 50 caractères': 'The last name cannot exceed 50 characters',
  'Veuillez entrer une adresse email valide': 'Please enter a valid email address',
  'Le mot de passe doit contenir au moins 8 caractères': 'The password must be at least 8 characters',
  'Le mot de passe doit contenir au moins une lettre minuscule': 'The password must include a lowercase letter',
  'Le mot de passe doit contenir au moins une lettre majuscule': 'The password must include an uppercase letter',
  'Le mot de passe doit contenir au moins un chiffre': 'The password must include a number',
  'Le mot de passe doit contenir au moins un caractère spécial': 'The password must include a special character',
  'Les mots de passe ne correspondent pas': 'The passwords do not match',
  "Veuillez choisir votre type d'activité": 'Please choose your type of activity',
  "Erreur lors de la vérification de l'email. Veuillez réessayer.": 'Could not check this email. Please try again.',
  'Cette adresse email est déjà utilisée par un compte chauffeur. Veuillez utiliser une autre adresse email ou vous connecter avec votre compte chauffeur.':
    'This email is already used by a driver account. Use another email or sign in as a driver.',
  'Cette adresse email est déjà utilisée par un compte client. Veuillez utiliser une autre adresse email ou vous connecter avec votre compte existant.':
    'This email is already used by a rider account. Use another email or sign in with that account.',
  'Cet email a été rejeté par le serveur. Veuillez essayer avec une adresse email différente.':
    'This email was rejected. Please try a different address.',
  "Trop de tentatives d'inscription. Veuillez attendre quelques secondes avant de réessayer.":
    'Too many signup attempts. Please wait a few seconds and try again.',
  'Email ou mot de passe incorrect': 'Incorrect email or password',
  'Veuillez confirmer votre email avant de vous connecter': 'Please confirm your email before signing in',
  'Erreur lors de la vérification du compte': 'Could not verify this account',
  "Identifiants incorrects. Ce compte n'est pas un compte client. Veuillez utiliser vos identifiants client ou créer un compte client.":
    'Incorrect details. This is not a rider account. Use your rider login or create a rider account.',
  "Identifiants incorrects. Ce compte n'est pas un compte chauffeur. Veuillez utiliser vos identifiants chauffeur ou créer un compte chauffeur.":
    'Incorrect details. This is not a driver account. Use your driver login or create a driver account.',
  'Une erreur est survenue lors de la connexion': 'Something went wrong while signing in',
  "Une erreur inattendue s'est produite. Veuillez réessayer.": 'Something unexpected happened. Please try again.',
  "Aucun compte client trouvé avec cet email.": 'No rider account was found with this email.',
  "Aucun compte chauffeur trouvé avec cet email.": 'No driver account was found with this email.',
  "Erreur lors de l'envoi de l'email. Veuillez réessayer.": 'Could not send the email. Please try again.',
  'Une erreur inattendue est survenue.': 'Something unexpected happened.',
  'Session de réinitialisation invalide. Veuillez demander un nouveau lien de réinitialisation.':
    'This reset session is invalid. Please request a new reset link.',
  'Session de réinitialisation expirée. Veuillez demander un nouveau lien de réinitialisation.':
    'This reset session has expired. Please request a new reset link.',
  'Le mot de passe ne respecte pas les critères de sécurité': 'The password does not meet the security rules',
  'Une erreur inattendue est survenue': 'Something unexpected happened',
  "L'adresse de départ doit contenir au moins 3 caractères": 'The pickup address must be at least 3 characters',
  "L'adresse de départ ne peut pas dépasser 200 caractères": 'The pickup address cannot exceed 200 characters',
  "L'adresse de départ ne peut pas dépasser 250 caractères": 'The pickup address cannot exceed 250 characters',
  "L'adresse d'arrivée doit contenir au moins 3 caractères": 'The destination must be at least 3 characters',
  "L'adresse d'arrivée ne peut pas dépasser 200 caractères": 'The destination cannot exceed 200 characters',
  "L'adresse d'arrivée ne peut pas dépasser 250 caractères": 'The destination cannot exceed 250 characters',
  'Veuillez sélectionner une heure': 'Please select a time',
  'Les notes ne peuvent pas dépasser 500 caractères': 'Notes cannot exceed 500 characters',
  'La note doit être au minimum 1 étoile': 'The rating must be at least 1 star',
  'La note doit être au maximum 5 étoiles': 'The rating cannot be more than 5 stars',
  'Le commentaire ne peut pas dépasser 500 caractères': 'The comment cannot exceed 500 characters',
  "Le nom de l'objet doit contenir au moins 2 caractères": 'The item name must be at least 2 characters',
  "Le nom de l'objet ne peut pas dépasser 150 caractères": 'The item name cannot exceed 150 characters',
  'Le nombre de colis doit être un entier': 'The number of parcels must be a whole number',
  'Au moins 1 colis': 'At least 1 parcel',
  'Le poids ne peut pas être négatif': 'Weight cannot be negative',
  'Le volume ne peut pas être négatif': 'Volume cannot be negative',
  'Veuillez sélectionner une direction': 'Please select a direction',
  'Veuillez sélectionner une date souhaitée': 'Please select a preferred date',
  'Une erreur est survenue lors de la réservation': 'Something went wrong while booking',
  "Impossible d'obtenir votre position. Veuillez saisir l'adresse manuellement.":
    'Could not get your location. Please type the address.',
  'Veuillez sélectionner une adresse de départ valide depuis les suggestions (autocomplétion).':
    'Please pick a valid pickup address from the suggestions.',
  "Veuillez d'abord sélectionner une date et heure de départ": 'Please select a pickup date and time first',
  'Veuillez sélectionner un type de véhicule': 'Please select a vehicle type',
  'Une erreur est survenue lors de la recherche des chauffeurs': 'Something went wrong while searching for drivers',
  'Veuillez saisir des adresses valides pour calculer le prix': 'Please enter valid addresses so we can calculate the fare',
  'Veuillez sélectionner un chauffeur': 'Please select a driver',
  'Chauffeur sélectionné introuvable, relancez la recherche': 'The selected driver is no longer available. Search again.',
  'Erreur lors de la création de la réservation': 'Could not create the booking',
  'Veuillez décrire au moins un objet': 'Please describe at least one item',
  'Les notes ne peuvent pas dépasser 1000 caractères': 'Notes cannot exceed 1000 characters',
  'Impossible de récupérer les chauffeurs disponibles': 'Could not load available drivers',
  'Erreur lors de la création de la demande. Veuillez réessayer.': 'Could not create the request. Please try again.',
};

export function translateSignupMessage(message: string | undefined, locale: 'fr' | 'en'): string | undefined {
  if (!message) return message;
  if (locale === 'fr') return message;
  if (EN[message]) return EN[message];
  if (message.startsWith('Erreur de connexion: ')) {
    return `Sign-in error: ${message.slice('Erreur de connexion: '.length)}`;
  }
  if (message.startsWith("Erreur lors de l'inscription: ")) {
    return `Signup error: ${message.slice("Erreur lors de l'inscription: ".length)}`;
  }
  if (message.startsWith('Erreur lors de la création du profil: ')) {
    return `Could not create the profile: ${message.slice('Erreur lors de la création du profil: '.length)}`;
  }
  if (message.startsWith('Erreur lors de la mise à jour du mot de passe: ')) {
    return `Could not update the password: ${message.slice('Erreur lors de la mise à jour du mot de passe: '.length)}`;
  }
  return message;
}
