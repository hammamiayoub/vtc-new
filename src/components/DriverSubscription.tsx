import React, { useState, useEffect } from 'react';
import { CreditCard, Check, X, AlertCircle, Calendar, TrendingUp, Lock, Unlock, Info, Copy, MessageCircle, Mail } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';

interface DriverSubscriptionProps {
  driverId: string;
}

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionType: 'free' | 'premium';
  monthlyAcceptedBookings: number;
  canAcceptMoreBookings: boolean;
  remainingFreeBookings: number;
  lifetimeAcceptedBookings: number;
  hasUsedFreeTrial: boolean;
  subscriptionEndDate?: string;
}

type BillingPeriod = 'monthly' | 'yearly';

export const DriverSubscription: React.FC<DriverSubscriptionProps> = ({ driverId }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [bankAccountCopied, setBankAccountCopied] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<BillingPeriod>('monthly');

  // Informations de paiement
  const SUBSCRIPTION_PRICE_BASE_MONTHLY = 30.00;
  const VAT_PERCENTAGE = 19.00;
  const YEARLY_DISCOUNT = 0.10; // 10% de réduction
  const BANK_ACCOUNT = "TN59 XXXXXXX XXXXXX XXXXXX"; // Sera remplacé plus tard

  // Calcul des prix selon la période
  const calculatePrices = (billingPeriod: BillingPeriod) => {
    let basePrice = SUBSCRIPTION_PRICE_BASE_MONTHLY;
    
    if (billingPeriod === 'yearly') {
      // Prix annuel avec 10% de réduction
      basePrice = (SUBSCRIPTION_PRICE_BASE_MONTHLY * 12) * (1 - YEARLY_DISCOUNT);
    }
    
    const vatAmount = basePrice * VAT_PERCENTAGE / 100;
    const totalPrice = basePrice + vatAmount;
    const monthlyEquivalent = billingPeriod === 'yearly' ? totalPrice / 12 : totalPrice;
    
    return {
      basePrice: basePrice.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      monthlyEquivalent: monthlyEquivalent.toFixed(2)
    };
  };

  const prices = calculatePrices(selectedBillingPeriod);

  useEffect(() => {
    fetchSubscriptionStatus();
    checkPendingRequest();
  }, [driverId]);

  const checkPendingRequest = async () => {
    try {
      // Vérifier s'il existe déjà une demande en attente
      const { data, error } = await supabase
        .from('driver_subscriptions')
        .select('id, created_at')
        .eq('driver_id', driverId)
        .eq('payment_status', 'pending')
        .eq('status', 'active')
        .single();

      if (data && !error) {
        setHasPendingRequest(true);
        setShowPaymentInfo(true); // Afficher automatiquement les infos de paiement
      } else {
        setHasPendingRequest(false);
      }
    } catch (error) {
      console.error('Erreur vérification demande:', error);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      
      // Appeler la fonction SQL pour récupérer le statut
      const { data, error } = await supabase
        .rpc('get_driver_subscription_status', { p_driver_id: driverId });

      if (error) {
        console.error('Erreur récupération statut abonnement:', error);
        return;
      }

      if (data && data.length > 0) {
        const status = data[0];
        setSubscriptionStatus({
          hasActiveSubscription: status.has_active_subscription,
          subscriptionType: status.subscription_type,
          monthlyAcceptedBookings: status.monthly_accepted_bookings,
          canAcceptMoreBookings: status.can_accept_more_bookings,
          remainingFreeBookings: status.remaining_free_bookings,
          lifetimeAcceptedBookings: status.lifetime_accepted_bookings || 0,
          hasUsedFreeTrial: status.has_used_free_trial || false,
          subscriptionEndDate: status.subscription_end_date
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionRequest = async () => {
    // Vérifier d'abord s'il n'existe pas déjà une demande en attente
    const { data: existingRequest } = await supabase
      .from('driver_subscriptions')
      .select('id')
      .eq('driver_id', driverId)
      .eq('payment_status', 'pending')
      .eq('status', 'active')
      .maybeSingle();

    if (existingRequest) {
      alert('Vous avez déjà une demande d\'abonnement en cours de traitement. Veuillez effectuer le paiement avec les informations affichées ci-dessous.');
      setShowPaymentInfo(true);
      setHasPendingRequest(true);
      return;
    }

    setSubmittingRequest(true);
    try {
      // Créer une nouvelle demande d'abonnement
      const startDate = new Date();
      const endDate = new Date();
      
      // Calculer la date de fin selon la période choisie
      if (selectedBillingPeriod === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      const calculatedPrices = calculatePrices(selectedBillingPeriod);

      const { error } = await supabase
        .from('driver_subscriptions')
        .insert({
          driver_id: driverId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          subscription_type: 'premium',
          billing_period: selectedBillingPeriod,
          price_tnd: parseFloat(calculatedPrices.basePrice),
          vat_percentage: VAT_PERCENTAGE,
          total_price_tnd: parseFloat(calculatedPrices.totalPrice),
          payment_status: 'pending',
          status: 'active'
        });

      if (error) {
        console.error('Erreur création demande abonnement:', error);
        alert('Erreur lors de la création de la demande d\'abonnement. Veuillez réessayer.');
        return;
      }

      alert('Demande d\'abonnement créée avec succès ! Veuillez effectuer le paiement et contacter l\'administration avec votre référence de paiement.');
      setShowPaymentInfo(true);
      setHasPendingRequest(true);
      fetchSubscriptionStatus();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const copyBankAccount = async () => {
    try {
      await navigator.clipboard.writeText(BANK_ACCOUNT);
      setBankAccountCopied(true);
      setTimeout(() => setBankAccountCopied(false), 2000);
    } catch (error) {
      console.error('Erreur copie:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!subscriptionStatus) {
    return null;
  }

  const isPremium = subscriptionStatus.hasActiveSubscription || subscriptionStatus.subscriptionType === 'premium';

  return (
    <div className="space-y-6">
      {/* Carte de statut principal */}
      <div className={`rounded-xl shadow-lg p-6 ${
        isPremium 
          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' 
          : 'bg-white border-2 border-gray-200'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {isPremium ? (
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp size={24} className="text-white" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Lock size={24} className="text-gray-600" />
              </div>
            )}
            <div>
               <h3 className={`text-xl font-bold ${isPremium ? 'text-white' : 'text-gray-900'}`}>
                 {isPremium ? 'Abonnement Premium' : 'Compte Gratuit'}
               </h3>
               <p className={`text-sm ${isPremium ? 'text-white/90' : 'text-gray-600'}`}>
                 {isPremium ? 'Courses illimitées' : '3 courses gratuites'}
               </p>
            </div>
          </div>
          {isPremium && (
            <div className="px-3 py-1 bg-white/20 rounded-full">
              <span className="text-sm font-semibold text-white">Actif</span>
            </div>
          )}
        </div>

        {/* Statistiques */}
        <div className={`rounded-lg p-4 ${
          isPremium ? 'bg-white/10' : 'bg-gray-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${isPremium ? 'text-white/90' : 'text-gray-600'}`}>
              {isPremium ? 'Courses acceptées' : 'Courses gratuites utilisées'}
            </span>
             <span className={`text-2xl font-bold ${isPremium ? 'text-white' : 'text-gray-900'}`}>
               {subscriptionStatus.lifetimeAcceptedBookings}
               {!isPremium && <span className="text-sm font-normal"> / 3</span>}
             </span>
          </div>
          
          {!isPremium && (
            <>
               <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                 <div 
                   className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                   style={{ width: `${(subscriptionStatus.lifetimeAcceptedBookings / 3) * 100}%` }}
                 ></div>
               </div>
              <p className="text-xs text-gray-600">
                {subscriptionStatus.remainingFreeBookings > 0 ? (
                  <>
                    <Check size={12} className="inline mr-1" />
                    {subscriptionStatus.remainingFreeBookings} course{subscriptionStatus.remainingFreeBookings > 1 ? 's' : ''} gratuite{subscriptionStatus.remainingFreeBookings > 1 ? 's' : ''} restante{subscriptionStatus.remainingFreeBookings > 1 ? 's' : ''}
                  </>
                ) : (
                  <>
                    <X size={12} className="inline mr-1" />
                    Quota gratuit épuisé - Abonnement requis
                  </>
                )}
              </p>
            </>
          )}
          
          {isPremium && subscriptionStatus.subscriptionEndDate && (
            <p className="text-xs text-white/80 mt-2">
              <Calendar size={12} className="inline mr-1" />
              Valable jusqu'au {new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>

        {/* Alerte si quota atteint */}
        {!isPremium && !subscriptionStatus.canAcceptMoreBookings && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                 <h4 className="font-semibold text-red-900 mb-1">
                   Courses gratuites épuisées
                 </h4>
                 <p className="text-sm text-red-800">
                   Vous avez utilisé vos 3 courses gratuites. 
                   Souscrivez à l'abonnement Premium pour continuer à recevoir des courses.
                 </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Carte Premium - Si compte gratuit */}
      {!isPremium && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Unlock size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Passez au Premium
              </h3>
              <p className="text-gray-700">
                Débloquez un accès illimité aux courses et maximisez vos revenus
              </p>
            </div>
          </div>

          {/* Sélecteur de période d'abonnement */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Choisissez votre période d'abonnement
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedBillingPeriod('monthly')}
                className={`relative p-4 border-2 rounded-lg transition-all ${
                  selectedBillingPeriod === 'monthly'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-semibold text-gray-900 mb-1">Mensuel</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {calculatePrices('monthly').totalPrice} TND
                  </p>
                  <p className="text-xs text-gray-500 mt-1">par mois</p>
                </div>
                {selectedBillingPeriod === 'monthly' && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-5 h-5 text-purple-600" />
                  </div>
                )}
              </button>

              <button
                onClick={() => setSelectedBillingPeriod('yearly')}
                className={`relative p-4 border-2 rounded-lg transition-all ${
                  selectedBillingPeriod === 'yearly'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    -10%
                  </span>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900 mb-1">Annuel</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {calculatePrices('yearly').totalPrice} TND
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {calculatePrices('yearly').monthlyEquivalent} TND/mois
                  </p>
                </div>
                {selectedBillingPeriod === 'yearly' && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-5 h-5 text-purple-600" />
                  </div>
                )}
              </button>
            </div>
            {selectedBillingPeriod === 'yearly' && (
              <p className="text-xs text-green-700 mt-2 text-center font-medium">
                🎉 Économisez {(parseFloat(calculatePrices('monthly').totalPrice) * 12 - parseFloat(calculatePrices('yearly').totalPrice)).toFixed(2)} TND par an !
              </p>
            )}
          </div>

          {/* Avantages Premium */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Courses illimitées</p>
                <p className="text-sm text-gray-600">Acceptez autant de courses que vous le souhaitez</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Priorité sur les réservations</p>
                <p className="text-sm text-gray-600">Recevez les nouvelles demandes en priorité</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Support prioritaire</p>
                <p className="text-sm text-gray-600">Assistance rapide en cas de besoin</p>
              </div>
            </div>
          </div>

          {/* Prix */}
          <div className="bg-white rounded-lg p-4 mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-gray-600">
                {selectedBillingPeriod === 'yearly' ? 'Prix annuel' : 'Prix mensuel'}
              </span>
              <div className="text-right">
                <span className="text-3xl font-bold text-gray-900">{prices.basePrice} TND</span>
                <span className="text-sm text-gray-600 ml-1">HT</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between text-sm mb-3">
              <span className="text-gray-600">TVA ({VAT_PERCENTAGE}%)</span>
              <span className="text-gray-700 font-medium">{prices.vatAmount} TND</span>
            </div>
            {selectedBillingPeriod === 'yearly' && (
              <div className="flex items-baseline justify-between text-sm mb-3 text-green-700">
                <span className="font-medium">Réduction annuelle (10%)</span>
                <span className="font-bold">
                  -{(parseFloat(calculatePrices('monthly').basePrice) * 12 * 0.10).toFixed(2)} TND
                </span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-gray-900 font-semibold">Total TTC</span>
                <span className="text-2xl font-bold text-purple-600">{prices.totalPrice} TND</span>
              </div>
              {selectedBillingPeriod === 'yearly' && (
                <p className="text-xs text-gray-500 text-right">
                  Soit {prices.monthlyEquivalent} TND/mois
                </p>
              )}
            </div>
          </div>

          {/* Bouton d'action */}
          {!hasPendingRequest ? (
            <Button
              onClick={handleSubscriptionRequest}
              disabled={submittingRequest}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {submittingRequest ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CreditCard size={20} className="mr-2" />
                  Souscrire - {selectedBillingPeriod === 'yearly' ? 'Annuel' : 'Mensuel'} ({prices.totalPrice} TND)
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">
                      Demande en attente
                    </h4>
                    <p className="text-sm text-amber-800">
                      Vous avez déjà une demande d'abonnement en cours. Effectuez le paiement avec les informations ci-dessous.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowPaymentInfo(!showPaymentInfo)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg"
              >
                <Info size={20} className="mr-2" />
                {showPaymentInfo ? 'Masquer' : 'Voir'} les informations de paiement
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Informations de paiement */}
      {showPaymentInfo && (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="text-blue-600" size={24} />
            Informations de paiement
          </h3>

          <div className="space-y-4">
            {/* Méthode 1: Virement bancaire */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <CreditCard size={18} />
                Méthode 1 : Virement bancaire
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-blue-800 font-medium">Bénéficiaire :</span>
                  <p className="text-blue-900">TuniDrive SARL</p>
                </div>
                <div>
                  <span className="text-blue-800 font-medium">Numéro de compte :</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-white px-3 py-2 rounded border border-blue-300 text-blue-900 font-mono flex-1">
                      {BANK_ACCOUNT}
                    </code>
                    <button
                      onClick={copyBankAccount}
                      className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="Copier le numéro"
                    >
                      {bankAccountCopied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-blue-800 font-medium">Montant :</span>
                  <p className="text-blue-900 font-bold">{prices.totalPrice} TND</p>
                  {selectedBillingPeriod === 'yearly' && (
                    <p className="text-xs text-blue-700 mt-1">Abonnement annuel avec 10% de réduction</p>
                  )}
                </div>
                <div>
                  <span className="text-blue-800 font-medium">Motif du virement :</span>
                  <p className="text-blue-900 font-mono">ABONNEMENT-{driverId.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* Instructions après paiement */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <AlertCircle size={18} />
                Après votre paiement
              </h4>
              <ol className="text-sm text-amber-800 space-y-1 ml-4 list-decimal mb-4">
                <li>Conservez le reçu de paiement</li>
                <li>Notez votre numéro de référence de paiement</li>
                <li>Contactez le support avec votre référence de paiement</li>
                <li>Votre abonnement sera activé sous 24h ouvrables</li>
              </ol>
              
              {/* Liens de contact */}
              <div className="border-t border-amber-300 pt-3">
                <p className="text-xs font-semibold text-amber-900 mb-2">💬 Contactez-nous pour valider votre paiement :</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={`https://wa.me/21628528477?text=${encodeURIComponent(`Bonjour, je souhaite valider mon abonnement Premium ${selectedBillingPeriod === 'yearly' ? 'ANNUEL' : 'MENSUEL'}.\n\nRéférence : ABONNEMENT-${driverId.slice(0, 8).toUpperCase()}\n\nJ'ai effectué le paiement de ${prices.totalPrice} TND.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-md hover:shadow-lg"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:support@tunidrive.net?subject=Validation%20Abonnement%20Premium%20${selectedBillingPeriod === 'yearly' ? 'ANNUEL' : 'MENSUEL'}%20-%20ABONNEMENT-${driverId.slice(0, 8).toUpperCase()}&body=Bonjour,%0D%0A%0D%0AJe souhaite valider mon abonnement Premium ${selectedBillingPeriod === 'yearly' ? 'ANNUEL' : 'MENSUEL'}.%0D%0A%0D%0ARéférence : ABONNEMENT-${driverId.slice(0, 8).toUpperCase()}%0D%0A%0D%0AJ'ai effectué le paiement de ${prices.totalPrice} TND par virement bancaire.%0D%0A%0D%0ANuméro de référence du paiement : __________%0D%0A%0D%0ACi-joint la preuve de paiement.%0D%0A%0D%0ACordialement`}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-md hover:shadow-lg"
                  >
                    <Mail size={16} />
                    Email
                  </a>
                </div>
                <p className="text-xs text-amber-700 mt-2">
                  💡 Les messages sont pré-remplis avec votre référence d'abonnement
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informations supplémentaires */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-600 flex items-start gap-2">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              <strong>Période d'essai gratuite :</strong> 3 courses gratuites pour tous les nouveaux chauffeurs (offre valable une seule fois).
            </span>
          </p>
          <p className="text-sm text-gray-600 flex items-start gap-2">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              <strong>Abonnement mensuel :</strong> Valable pour 1 mois à partir de la date d'activation. Renouvelable manuellement chaque mois.
            </span>
          </p>
          <p className="text-sm text-gray-600 flex items-start gap-2">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              <strong>Abonnement annuel :</strong> Valable pour 1 an à partir de la date d'activation avec 10% de réduction. Plus économique sur le long terme !
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

