# 🚀 Guide Simple - Activer un Abonnement Premium

## Pour l'Administrateur

### 📝 Ce que vous recevrez du chauffeur

Le chauffeur vous contactera par WhatsApp ou Email avec :
- ✉️ Un message pré-rempli
- 📋 Sa référence : `ABONNEMENT-XXXXXXXX`
- 🧾 Une preuve de paiement de 47.60 TND
- 🔢 Un numéro de référence du virement/mandat

---

## ⚡ Activation en 3 Étapes

### Étape 1️⃣ : Vérifier le Paiement (hors système)
- Consultez votre relevé bancaire ou registre des mandats
- Confirmez la réception de 47.60 TND
- Notez la référence exacte du paiement

### Étape 2️⃣ : Ouvrir Supabase
1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet TuniDrive
3. Cliquez sur **"SQL Editor"** dans le menu gauche

### Étape 3️⃣ : Copier-Coller et Exécuter

Ouvrez le fichier **`SCRIPT_ACTIVATION_RAPIDE.sql`** et :

1. **Modifiez ces 2 lignes** (tout en haut du script) :
   ```sql
   v_driver_email TEXT := 'email-du-chauffeur@example.com';  -- Mettre le vrai email
   v_payment_reference TEXT := 'REF123456';                  -- Mettre la vraie référence
   ```

2. **Copiez TOUT le script**

3. **Collez dans SQL Editor**

4. **Cliquez sur "RUN"** (ou F5)

5. **Vérifiez le résultat** :
   ```
   ✅ ACTIVATION CONFIRMÉE
   chauffeur: Prénom Nom
   subscription_type: premium
   payment_status: paid
   ```

**C'est tout ! Le chauffeur est actif immédiatement.** 🎉

---

## 🔍 Que Fait le Script Automatiquement ?

1. ✅ Trouve le chauffeur par son email
2. ✅ Trouve sa demande d'abonnement en attente
3. ✅ Marque le paiement comme reçu
4. ✅ Active le compte Premium
5. ✅ Affiche une confirmation

---

## ❓ FAQ Admin

### Le chauffeur ne voit pas son compte Premium activé ?

**Solution** : Demandez-lui de rafraîchir la page (F5)

### Je ne trouve pas le chauffeur par email ?

**Alternative** : Utilisez son numéro de téléphone ou cherchez manuellement :
```sql
SELECT id, first_name, last_name, email, phone
FROM drivers
WHERE phone LIKE '%28528477%'  -- Derniers chiffres du téléphone
   OR first_name ILIKE '%mohamed%';
```

Puis utilisez l'UUID dans le script.

### Le script affiche une erreur ?

**Causes possibles** :
- Email incorrect → Vérifier l'orthographe
- Pas de demande en attente → Le chauffeur n'a pas cliqué sur "Souscrire"
- Demande déjà validée → Vérifier si déjà Premium

**Debug** :
```sql
-- Vérifier le statut actuel
SELECT 
  d.email,
  d.subscription_type,
  ds.payment_status,
  ds.created_at
FROM drivers d
LEFT JOIN driver_subscriptions ds ON ds.driver_id = d.id
WHERE d.email = 'email@example.com';
```

---

## 📞 Notifier le Chauffeur

Après activation, envoyez un message :

**Via WhatsApp** :
```
✅ Bonjour [Prénom],

Votre abonnement Premium est maintenant ACTIF !

Vous pouvez accepter des courses illimitées.

Rafraîchissez votre tableau de bord pour voir le changement.

Bon travail sur TuniDrive ! 🚗
```

**Via Email** :
(Voir template dans `PROCESSUS_ACTIVATION_ABONNEMENT.md`)

---

## ⏰ Si l'Abonnement Expire

Les abonnements expirent automatiquement après 1 mois (`end_date`).

**Pour renouveler** :
- Le chauffeur doit créer une **nouvelle demande**
- Et repayer 47.60 TND
- Vous validez à nouveau avec le même script

**Automatisation de l'expiration** : Voir `CONFIG_ABONNEMENT_TODO.md` pour configurer le cron job.

---

## 📊 Statistiques Utiles

Voir combien d'abonnements vous avez validés ce mois :
```sql
SELECT 
  COUNT(*) as nb_activations,
  SUM(total_price_tnd) as revenus_total
FROM driver_subscriptions
WHERE payment_status = 'paid'
  AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE);
```

---

**Ce guide suffit pour activer 99% des abonnements en quelques secondes ! ⚡**

