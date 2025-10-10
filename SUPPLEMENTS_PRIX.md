# Système de Suppléments de Prix

## Vue d'ensemble

Le système de suppléments de prix a été implémenté pour ajouter automatiquement des frais supplémentaires selon l'heure et le jour de la réservation :

- **15% de supplément pour les trajets de nuit** (entre 21h et 6h)
- **10% de supplément pour les week-ends** (Samedi et Dimanche)
- **Les suppléments sont cumulatifs** (si c'est un trajet de nuit pendant le week-end, le total sera de 25%)

## Modifications apportées

### 1. Fichier `src/utils/geolocation.ts`

Ajout de nouvelles fonctions pour calculer les suppléments :

#### Interface `PriceSurcharges`
```typescript
export interface PriceSurcharges {
  isNightTime: boolean;           // Est-ce un trajet de nuit ?
  isWeekend: boolean;             // Est-ce un week-end ?
  nightSurchargePercent: number;  // Pourcentage du supplément nuit (15% si applicable)
  weekendSurchargePercent: number; // Pourcentage du supplément week-end (10% si applicable)
  totalSurchargePercent: number;  // Total des suppléments (cumulés)
  totalSurcharge: number;         // Montant total des suppléments en TND
}
```

#### Fonction `calculateSurcharges()`
Calcule automatiquement les suppléments en fonction de la date/heure :
- Détecte si c'est la nuit (21h-6h)
- Détecte si c'est le week-end (Samedi ou Dimanche)
- Calcule les montants correspondants

#### Fonction `calculatePriceWithSurcharges()`
Calcule le prix total avec tous les suppléments appliqués.

### 2. Fichier `src/components/BookingForm.tsx`

Le formulaire de réservation a été mis à jour pour :

1. **Calculer automatiquement les suppléments** lorsque l'utilisateur sélectionne une date/heure
2. **Afficher clairement les suppléments applicables** dans une section dédiée avec :
   - Badge jaune distinctif pour attirer l'attention
   - Détail de chaque supplément (nuit, week-end)
   - Montant total des suppléments en TND et en pourcentage

### 3. Fichier `src/components/BookingConfirmation.tsx`

La page de confirmation affiche également :

1. Les suppléments inclus dans le prix total
2. Le détail des pourcentages appliqués
3. Une interface claire et lisible pour le client

## Exemples de calcul

### Exemple 1 : Trajet de jour en semaine
- **Date/Heure** : Mardi 14h00
- **Prix de base** : 100 TND
- **Supplément nuit** : Non (0%)
- **Supplément week-end** : Non (0%)
- **Prix final** : 100 TND

### Exemple 2 : Trajet de nuit en semaine
- **Date/Heure** : Mercredi 22h00
- **Prix de base** : 100 TND
- **Supplément nuit** : Oui (+15%)
- **Supplément week-end** : Non (0%)
- **Prix final** : 115 TND

### Exemple 3 : Trajet de jour le week-end
- **Date/Heure** : Samedi 14h00
- **Prix de base** : 100 TND
- **Supplément nuit** : Non (0%)
- **Supplément week-end** : Oui (+10%)
- **Prix final** : 110 TND

### Exemple 4 : Trajet de nuit le week-end
- **Date/Heure** : Samedi 23h00
- **Prix de base** : 100 TND
- **Supplément nuit** : Oui (+15%)
- **Supplément week-end** : Oui (+10%)
- **Prix final** : 125 TND (25% de supplément cumulé)

## Interface utilisateur

### Dans le formulaire de réservation

Lorsque le client sélectionne une date/heure qui implique des suppléments, une section jaune apparaît automatiquement :

```
╔════════════════════════════════════════════╗
║  ⏰ Suppléments applicables                ║
║                                            ║
║  🌙 Trajet de nuit (21h-6h)       +15%    ║
║  📅 Week-end (Samedi/Dimanche)    +10%    ║
║  ─────────────────────────────────────     ║
║  Total des suppléments      +25.00 TND    ║
╚════════════════════════════════════════════╝
```

### Dans la page de confirmation

Le détail des suppléments est intégré dans la section "Prix total" :

```
╔════════════════════════════════════════════╗
║  Prix total                     125 TND    ║
║  Tarif: 1.50 TND/km                        ║
║  ─────────────────────────────────────     ║
║  Suppléments inclus:                       ║
║  🌙 Trajet de nuit              +15%       ║
║  📅 Week-end                    +10%       ║
╚════════════════════════════════════════════╝
```

## Points techniques importants

1. **Calcul automatique** : Les suppléments sont recalculés automatiquement chaque fois que l'utilisateur modifie la date/heure
2. **Compatible avec trajet retour** : Les suppléments s'appliquent également au prix avec trajet retour
3. **Visible et transparent** : Les clients voient clairement les suppléments avant de confirmer
4. **Stockage** : Le prix final (avec suppléments) est enregistré dans la base de données

## Compatibilité

✅ Compatible avec tous les types de véhicules
✅ Compatible avec les trajets retour
✅ Compatible avec les remises sur longue distance
✅ Responsive (mobile et desktop)

## Test de l'implémentation

Pour tester le système :

1. Allez sur la page de réservation
2. Remplissez les adresses de départ et d'arrivée
3. Sélectionnez une date/heure :
   - Après 21h pour voir le supplément nuit
   - Un samedi ou dimanche pour voir le supplément week-end
   - Un samedi après 21h pour voir les deux suppléments cumulés
4. Observez la section jaune qui apparaît avec les détails des suppléments
5. Le prix total affiché inclut déjà tous les suppléments

## Code source

Les fichiers modifiés sont :
- `src/utils/geolocation.ts` : Logique de calcul
- `src/components/BookingForm.tsx` : Affichage dans le formulaire
- `src/components/BookingConfirmation.tsx` : Affichage dans la confirmation



