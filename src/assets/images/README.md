# Images des services TuniDrive

## 📁 Structure des images

Placez vos images dans le dossier `public/` avec les noms suivants :

### Images requises :
- `public/van.png` - Image du van de transport collectif
- `public/bus.png` - Image du bus de transport
- `public/utilitaire.png` - Image du véhicule utilitaire
- `public/limousine.png` - Image de la limousine premium

## 🎨 Spécifications techniques

### Dimensions recommandées :
- **Largeur** : 400px minimum
- **Hauteur** : 300px minimum
- **Ratio** : 4:3 ou 16:9
- **Format** : JPG, PNG, WebP

### Qualité :
- **Résolution** : 72-150 DPI
- **Taille fichier** : < 500KB par image
- **Optimisation** : Compressées pour le web

## 🔧 Utilisation dans le code

Les images sont automatiquement chargées avec fallback vers les icônes :

```jsx
<img 
  src="/assets/images/van.jpg" 
  alt="Van de transport collectif"
  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
  onError={(e) => {
    // Fallback vers l'icône si l'image n'existe pas
    e.currentTarget.style.display = 'none';
    e.currentTarget.nextElementSibling.style.display = 'flex';
  }}
/>
```

## 📱 Responsive

Les images s'adaptent automatiquement :
- **Desktop** : 400x300px
- **Tablet** : 350x250px  
- **Mobile** : 300x200px

## 🎯 Effets visuels

- **Hover** : Zoom léger (scale-105)
- **Transition** : Animation fluide (300ms)
- **Overlay** : Assombrissement léger (bg-opacity-20)

## ✅ Checklist

- [ ] `van.jpg` ajouté
- [ ] `bus.jpg` ajouté  
- [ ] `utilitaire.jpg` ajouté
- [ ] `limousine.jpg` ajouté
- [ ] Images optimisées pour le web
- [ ] Test sur différents écrans
- [ ] Vérification du fallback
