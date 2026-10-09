import React, { useState } from 'react';
import { Star, X, MessageSquare, User, Car, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { RatingFormData, Booking } from '../types';
import { ratingSchema } from '../utils/validation';
import { useLocale } from '../i18n/locale';
import { translateSignupMessage } from '../i18n/signupErrors';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onRatingSubmitted: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  booking,
  onRatingSubmitted
}) => {
  const { locale } = useLocale();
  const en = locale === 'en';
  const dateLocale = en ? 'en-GB' : 'fr-FR';
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Debug: Log des données de la réservation
  console.log('📊 Données de la réservation dans RatingModal:', {
    id: booking.id,
    pickup_address: booking.pickup_address,
    destination_address: booking.destination_address,
    scheduled_time: booking.scheduled_time,
    price_tnd: booking.price_tnd,
    client_id: booking.client_id,
    driver_id: booking.driver_id,
    status: booking.status
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert(en ? 'Please select a rating' : 'Veuillez sélectionner une note');
      return;
    }

    // Validation avec Zod
    try {
      const formData = {
        rating: rating,
        comment: comment.trim() || undefined
      };
      
      ratingSchema.parse(formData);
    } catch (error: any) {
      alert(translateSignupMessage(error.errors?.[0]?.message, locale) || (en ? 'Invalid data' : 'Données invalides'));
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('ratings')
        .insert({
          booking_id: booking.id,
          client_id: booking.client_id,
          driver_id: booking.driver_id,
          rating: rating,
          comment: comment.trim() || null
        });

      if (error) {
        console.error('Erreur lors de l\'enregistrement de la note:', error);
        alert(en ? 'Could not save the rating' : "Erreur lors de l'enregistrement de la note");
        return;
      }

      setSubmitSuccess(true);
      console.log('✅ Note enregistrée avec succès, fermeture du modal dans 2 secondes...');
      setTimeout(() => {
        console.log('🔄 Appel de onRatingSubmitted et onClose...');
        onRatingSubmitted();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Erreur:', error);
      alert(en ? 'Something went wrong' : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setHoveredRating(0);
    setComment('');
    setSubmitSuccess(false);
  };

  const handleClose = () => {
    console.log('🚪 Fermeture du modal de notation...');
    resetForm();
    onClose();
  };

  if (submitSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {en ? 'Thank you for your review!' : 'Merci pour votre avis !'}
          </h2>
          <p className="text-gray-600 mb-6">
            {en
              ? 'Your rating was saved. It helps other riders choose the right driver.'
              : "Votre note a été enregistrée avec succès. Elle aidera d'autres clients à choisir le bon chauffeur."}
          </p>
          <div className="flex items-center justify-center gap-2 text-yellow-500 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={24}
                className={i < rating ? 'fill-current' : 'text-gray-300'}
              />
            ))}
          </div>
          <Button
            onClick={handleClose}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {en ? 'Close' : 'Fermer'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{en ? 'Rate your driver' : 'Noter votre chauffeur'}</h2>
                <p className="text-gray-600">{en ? 'Share your experience' : 'Partagez votre expérience'}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Informations de la course */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Car className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">{en ? 'Ride details' : 'Détails de la course'}</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>{en ? 'Pickup:' : 'Départ:'}</strong> {booking.pickup_address || (en ? 'Not specified' : 'Non spécifié')}</p>
              <p><strong>{en ? 'Destination:' : 'Arrivée:'}</strong> {booking.destination_address || (en ? 'Not specified' : 'Non spécifié')}</p>
              <p><strong>{en ? 'Date:' : 'Date:'}</strong> {booking.scheduled_time ? new Date(booking.scheduled_time).toLocaleDateString(dateLocale) : (en ? 'Not specified' : 'Non spécifiée')}</p>
              <p><strong>{en ? 'Fare:' : 'Prix:'}</strong> {booking.price_tnd ? `${booking.price_tnd} TND` : (en ? 'Not specified' : 'Non spécifié')}</p>
            </div>
          </div>

          {/* Formulaire de notation */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Note avec étoiles */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                {en ? 'How would you rate this driver?' : 'Comment évaluez-vous ce chauffeur ?'}
              </label>
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-colors"
                  >
                    <Star
                      size={40}
                      className={`transition-colors ${
                        star <= (hoveredRating || rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-sm text-gray-600">
                {rating === 0 && (en ? 'Select a rating' : 'Sélectionnez une note')}
                {rating === 1 && (en ? 'Very disappointing' : 'Très décevant')}
                {rating === 2 && (en ? 'Disappointing' : 'Décevant')}
                {rating === 3 && (en ? 'Okay' : 'Correct')}
                {rating === 4 && (en ? 'Good' : 'Bien')}
                {rating === 5 && (en ? 'Excellent' : 'Excellent')}
              </div>
            </div>

            {/* Commentaire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="inline w-4 h-4 mr-2" />
                {en ? 'Comment (optional)' : 'Commentaire (optionnel)'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder={en ? 'Share your experience with this driver...' : 'Partagez votre expérience avec ce chauffeur...'}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {comment.length}/500 {en ? 'characters' : 'caractères'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={rating === 0 || isSubmitting}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    {en ? 'Saving...' : 'Enregistrement...'}
                  </>
                ) : (
                  <>
                    <Star size={16} className="mr-2" />
                    {en ? 'Save rating' : 'Enregistrer la note'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={handleClose}
                variant="outline"
                className="flex-1"
              >
                {en ? 'Cancel' : 'Annuler'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
