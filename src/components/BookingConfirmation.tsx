import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  MapPin, 
  Navigation, 
  Clock, 
  User, 
  Phone, 
  Car, 
  Calendar,
  MessageSquare,
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { Booking, Driver } from '../types';

interface BookingConfirmationProps {
  bookingId: string;
  onBack: () => void;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({ 
  bookingId, 
  onBack 
}) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [phonecopied, setPhoneCopied] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      // Récupérer les détails de la réservation
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError) {
        console.error('Erreur lors de la récupération de la réservation:', bookingError);
        return;
      }

      setBooking(bookingData);

      // Si un chauffeur est assigné, récupérer ses informations
      if (bookingData.driver_id) {
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('*')
          .eq('id', bookingData.driver_id)
          .single();

        if (driverError) {
          console.error('Erreur lors de la récupération du chauffeur:', driverError);
        } else {
          setDriver({
            id: driverData.id,
            firstName: driverData.first_name,
            lastName: driverData.last_name,
            email: driverData.email,
            phone: driverData.phone,
            licenseNumber: driverData.license_number,
            vehicleInfo: driverData.vehicle_info,
            status: driverData.status,
            createdAt: driverData.created_at,
            updatedAt: driverData.updated_at
          });
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyPhoneNumber = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
            <Clock size={16} />
            En attente d'acceptation
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <CheckCircle size={16} />
            Acceptée par le chauffeur
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <Car size={16} />
            Course en cours
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Réservation introuvable</h2>
          <Button onClick={onBack}>Retour au tableau de bord</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-6 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Retour au tableau de bord
          </button>

          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Réservation confirmée !
            </h1>
            <p className="text-gray-600 text-lg">
              Votre course a été enregistrée avec succès
            </p>
          </div>
        </div>

        {/* Statut de la réservation */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Statut de votre réservation
              </h2>
              <p className="text-gray-600">
                Réservation #{booking.id.slice(0, 8)}
              </p>
            </div>
            {getStatusBadge(booking.status)}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Détails de la course */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              Détails de la course
            </h3>

            <div className="space-y-6">
              {/* Trajet */}
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Point de départ</p>
                    <p className="font-medium text-gray-900">{booking.pickupAddress}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Destination</p>
                    <p className="font-medium text-gray-900">{booking.destinationAddress}</p>
                  </div>
                </div>
              </div>

              {/* Heure et distance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-blue-600" />
                    <span className="text-sm text-gray-600">Heure prévue</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {new Date(booking.scheduledTime).toLocaleString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation size={16} className="text-purple-600" />
                    <span className="text-sm text-gray-600">Distance</span>
                  </div>
                  <p className="font-semibold text-gray-900">{booking.distanceKm} km</p>
                </div>
              </div>

              {/* Prix */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-purple-900">Prix total</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {booking.priceTnd} TND
                  </span>
                </div>
                <p className="text-sm text-purple-700 mt-1">
                  Tarif: {(() => {
                    if (booking.distanceKm <= 20) return '2,5 TND/km';
                    if (booking.distanceKm <= 30) return '3,0 TND/km';
                    if (booking.distanceKm <= 50) return '2,5 TND/km';
                    return '2,2 TND/km';
                  })()}
                </p>
              </div>

              {/* Notes */}
              {booking.notes && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={16} className="text-gray-600" />
                    <span className="text-sm text-gray-600">Notes</span>
                  </div>
                  <p className="text-gray-900 bg-gray-50 rounded-lg p-3">
                    {booking.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Informations du chauffeur */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              {driver ? 'Votre chauffeur' : 'Chauffeur'}
            </h3>

            {driver ? (
              <div className="space-y-6">
                {/* Profil du chauffeur */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User size={32} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">
                      {driver.firstName} {driver.lastName}
                    </h4>
                    <p className="text-gray-600">Chauffeur professionnel</p>
                  </div>
                </div>

                {/* Contact */}
                {driver.phone && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone size={20} className="text-blue-600" />
                        <div>
                          <p className="text-sm text-blue-700">Téléphone</p>
                          <p className="font-semibold text-blue-900">{driver.phone}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => copyPhoneNumber(driver.phone!)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Copier le numéro"
                      >
                        {phonecopied ? <Check size={20} /> : <Copy size={20} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Véhicule */}
                {driver.vehicleInfo && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Car size={16} className="text-gray-600" />
                      <span className="text-sm text-gray-600">Véhicule</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-gray-900 mb-2">
                        {driver.vehicleInfo.make} {driver.vehicleInfo.model}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="block">Année: {driver.vehicleInfo.year}</span>
                          <span className="block">Couleur: {driver.vehicleInfo.color}</span>
                        </div>
                        <div>
                          <span className="block">Places: {driver.vehicleInfo.seats}</span>
                          <span className="block">Plaque: {driver.vehicleInfo.licensePlate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                  {driver.phone && (
                    <a
                      href={`tel:${driver.phone}`}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Phone size={20} />
                      Appeler le chauffeur
                    </a>
                  )}
                  
                  <a
                    href={`sms:${driver.phone || ''}`}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={20} />
                    Envoyer un SMS
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock size={48} className="text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  En attente d'assignation
                </h4>
                <p className="text-gray-600">
                  Un chauffeur va bientôt accepter votre course. 
                  Vous recevrez ses coordonnées dès qu'il aura confirmé.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Prochaines étapes */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Prochaines étapes
          </h3>
          <div className="space-y-4">
            {booking.status === 'pending' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-orange-600">1</span>
                  </div>
                  <p className="text-gray-700">
                    <strong>En cours:</strong> Recherche d'un chauffeur disponible
                  </p>
                </div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-400">2</span>
                  </div>
                  <p className="text-gray-500">
                    Confirmation par le chauffeur
                  </p>
                </div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-400">3</span>
                  </div>
                  <p className="text-gray-500">
                    Prise en charge à l'heure prévue
                  </p>
                </div>
              </>
            )}
            
            {booking.status === 'accepted' && (
              <>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={16} className="text-green-600" />
                  </div>
                  <p className="text-gray-500">
                    <strong>Terminé:</strong> Chauffeur trouvé et confirmé
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">2</span>
                  </div>
                  <p className="text-gray-700">
                    <strong>En cours:</strong> Préparation pour la prise en charge
                  </p>
                </div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-400">3</span>
                  </div>
                  <p className="text-gray-500">
                    Prise en charge à l'heure prévue
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Informations importantes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mt-8">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            Informations importantes
          </h3>
          <ul className="space-y-2 text-yellow-800">
            <li>• Soyez prêt 5 minutes avant l'heure prévue</li>
            <li>• Le chauffeur vous contactera si nécessaire</li>
            <li>• En cas de problème, contactez directement votre chauffeur</li>
            <li>• Le paiement se fait en espèces à la fin de la course</li>
          </ul>
        </div>
      </div>
    </div>
  );
};