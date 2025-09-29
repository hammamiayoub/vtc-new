# Guide des images pour TuniDrive

## 📁 Emplacement des images

Placez vos images PNG dans le dossier `public/` avec ces noms exacts :

```
public/
├── van.png          # Van de transport collectif
├── bus.png          # Bus de transport
├── utilitaire.png   # Véhicule utilitaire
├── limousine.png    # Limousine premium
└── IMAGES-GUIDE.md  # Ce guide
```

## 🎯 Noms de fichiers requis

- `van.png` - Image du van de transport collectif
- `bus.png` - Image du bus de transport
- `utilitaire.png` - Image du véhicule utilitaire
- `limousine.png` - Image de la limousine premium

## 🔧 Comment ajouter les images

1. **Copiez vos images** dans le dossier `public/`
2. **Renommez-les** avec les noms exacts ci-dessus
3. **Redémarrez** le serveur de développement
4. **Vérifiez** que les images s'affichent

## 📱 Test des images

Pour vérifier que vos images sont accessibles :
- Ouvrez `http://localhost:5173/van.png` dans votre navigateur
- Répétez pour `bus.png`, `utilitaire.png`, `limousine.png`

## ✅ Checklist

- [ ] `van.png` ajouté dans `public/`
- [ ] `bus.png` ajouté dans `public/`
- [ ] `utilitaire.png` ajouté dans `public/`
- [ ] `limousine.png` ajouté dans `public/`
- [ ] Serveur redémarré
- [ ] Images visibles sur la homepage

## 🚨 Problèmes courants

### Images ne s'affichent pas :
1. Vérifiez que les fichiers sont dans `public/`
2. Vérifiez les noms de fichiers (sensible à la casse)
3. Redémarrez le serveur de développement
4. Videz le cache du navigateur

### Fallback vers icônes :
- C'est normal si les images n'existent pas encore
- Les icônes s'affichent automatiquement en attendant
