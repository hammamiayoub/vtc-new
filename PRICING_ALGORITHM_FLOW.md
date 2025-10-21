# 🔄 Flux de calcul du prix des trajets

## 📊 **Diagramme de flux**

```
┌─────────────────────────────────────────────────────────────────┐
│                    CALCUL DU PRIX D'UN TRAJET                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    1. CALCUL DE LA DISTANCE                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌─────────────────────┐    ┌─────────────────────┐
        │   DISTANCE ROUTIÈRE │    │ DISTANCE À VOL      │
        │   (OSRM API)        │    │ D'OISEAU (Haversine)│
        │   calculateDriving  │    │ calculateDistance   │
        │   Distance()        │    │ ()                  │
        └─────────────────────┘    └─────────────────────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. TARIF PAR KILOMÈTRE                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌─────────────────────┐    ┌─────────────────────┐
        │   < 30 km           │    │   30-100 km         │
        │   1.5 TND/km        │    │   1.5 TND/km        │
        └─────────────────────┘    └─────────────────────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌─────────────────────┐    ┌─────────────────────┐
        │   100-250 km         │    │   250+ km           │
        │   1.35 TND/km (-10%) │    │   1.20 TND/km (-20%)│
        └─────────────────────┘    └─────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  3. MULTIPLICATEUR VÉHICULE                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌─────────────────────┐    ┌─────────────────────┐
        │   Berline/Pickup/   │    │   Bus/Minibus/     │
        │   Van/Utilitaire    │    │   Limousine/Camion  │
        │   × 1.0             │    │   × 2.0 à 3.5      │
        └─────────────────────┘    └─────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. PRIX DE BASE                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌─────────────────────┐    ┌─────────────────────┐
        │   Distance ×        │    │   Prix de base ×    │
        │   Tarif/km          │    │   Multiplicateur │
        │   = Prix de base    │    │   = Prix ajusté    │
        └─────────────────────┘    └─────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    5. SUPPLÉMENTS TEMPORELS                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌─────────────────────┐    ┌─────────────────────┐
        │   NUIT (21h-6h)     │    │   WEEK-END          │
        │   +15%              │    │   (Samedi/Dimanche) │
        │                     │    │   +10%              │
        └─────────────────────┘    └─────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    6. TRAJET RETOUR                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌─────────────────────┐    ┌─────────────────────┐
        │   TRAJET SIMPLE     │    │   TRAJET RETOUR     │
        │   Prix final        │    │   Prix × 1.8        │
        │                     │    │   (Distance × 2)    │
        └─────────────────────┘    └─────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    7. PRIX FINAL                                │
└─────────────────────────────────────────────────────────────────┘
```

## 🧮 **Formule complète**

```
PRIX FINAL = (Distance × Tarif/km × Multiplicateur_véhicule + Suppléments) × Multiplicateur_retour

Où :
- Distance = Distance routière (OSRM) ou à vol d'oiseau (Haversine)
- Tarif/km = 1.5 TND (base) avec réductions selon la distance
- Multiplicateur_véhicule = 1.0 à 3.5 selon le type
- Suppléments = Nuit (15%) + Week-end (10%)
- Multiplicateur_retour = 1.0 (simple) ou 1.8 (retour)
```

## 📍 **Localisation dans le code**

### **Fichier principal : `src/utils/geolocation.ts`**
- **Lignes 98-115** : `getPricePerKm()` - Tarifs par kilomètre
- **Lignes 118-130** : `getVehicleMultiplier()` - Multiplicateurs véhicules
- **Lignes 143-170** : `calculateSurcharges()` - Suppléments temporels
- **Lignes 173-179** : `calculatePrice()` - Prix de base
- **Lignes 182-196** : `calculatePriceWithSurcharges()` - Prix final

### **Fichier d'intégration : `src/components/BookingForm.tsx`**
- **Lignes 142, 175** : Appel à `calculatePrice()`
- **Lignes 148** : Appel à `calculatePriceWithSurcharges()`
- **Lignes 195, 252, 310** : Appel à `calculateDrivingDistance()`
- **Ligne 176** : Multiplicateur trajet retour (×1.8)

## 🎯 **Points de configuration**

1. **Tarif de base** : Ligne 100 - `basePricePerKm = 1.5`
2. **Seuils de distance** : Lignes 102-114
3. **Multiplicateurs véhicules** : Lignes 120-128
4. **Suppléments** : Lignes 155-156
5. **Multiplicateur retour** : Ligne 176 dans BookingForm.tsx

L'algorithme est entièrement modulaire et configurable ! 🚀
