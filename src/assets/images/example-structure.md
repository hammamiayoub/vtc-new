# Structure des images pour TuniDrive

## 📁 Dossier : `src/assets/images/`

```
src/assets/images/
├── van.jpg              # Van de transport collectif
├── bus.jpg              # Bus de transport
├── utilitaire.jpg       # Véhicule utilitaire
├── limousine.jpg        # Limousine premium
└── README.md           # Documentation
```

## 🖼️ Images attendues

### 1. Van de transport collectif (`van.jpg`)
- **Sujet** : Van ou minibus de transport
- **Style** : Moderne, professionnel
- **Couleurs** : Bleu, blanc, gris
- **Usage** : Transport de groupe (familles, équipes)

### 2. Bus de transport (`bus.jpg`)
- **Sujet** : Bus de transport en commun
- **Style** : Confortable, spacieux
- **Couleurs** : Vert, blanc, bleu
- **Usage** : Transport longue distance, groupes

### 3. Véhicule utilitaire (`utilitaire.jpg`)
- **Sujet** : Camionnette, fourgon utilitaire
- **Style** : Pratique, robuste
- **Couleurs** : Orange, blanc, gris
- **Usage** : Transport de marchandises, déménagement

### 4. Limousine premium (`limousine.jpg`)
- **Sujet** : Limousine de luxe
- **Style** : Élégant, sophistiqué
- **Couleurs** : Noir, blanc, argent
- **Usage** : Occasions spéciales, service premium

## 🎨 Conseils pour les images

### Qualité :
- **Résolution** : 1920x1080 minimum
- **Format** : JPG optimisé
- **Taille** : < 500KB par image
- **Compression** : 85-90% qualité

### Composition :
- **Cadrage** : Vue latérale ou 3/4
- **Éclairage** : Lumière naturelle de préférence
- **Arrière-plan** : Neutre ou urbain
- **Focus** : Véhicule au centre

### Cohérence :
- **Style** : Même approche photographique
- **Couleurs** : Palette harmonieuse
- **Perspective** : Angle de vue similaire
- **Qualité** : Même niveau de professionnalisme

## 🔧 Intégration dans le code

Les images sont automatiquement intégrées avec :

```jsx
// Structure HTML générée
<div className="relative h-48 overflow-hidden">
  <img 
    src="/assets/images/van.jpg" 
    alt="Van de transport collectif"
    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    onError={handleImageError}
  />
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
    <Users size={64} className="text-white opacity-90" />
  </div>
</div>
```

## ✅ Checklist d'ajout

- [ ] Créer le dossier `src/assets/images/`
- [ ] Ajouter `van.jpg` (400x300px)
- [ ] Ajouter `bus.jpg` (400x300px)
- [ ] Ajouter `utilitaire.jpg` (400x300px)
- [ ] Ajouter `limousine.jpg` (400x300px)
- [ ] Optimiser les images (< 500KB)
- [ ] Tester le fallback (supprimer une image)
- [ ] Vérifier sur mobile et desktop
- [ ] Valider l'accessibilité (alt text)

## 🚀 Résultat attendu

Une fois les images ajoutées, la homepage affichera :
- ✅ Images réelles des véhicules
- ✅ Effet hover avec zoom
- ✅ Fallback vers icônes si image manquante
- ✅ Design responsive
- ✅ Performance optimisée
