import React from 'react';
import { MapPin, Navigation, Package, User, Phone, MessageSquare, Globe, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import type { DriverAcceptedParcelTrip } from '../types';
import { directionLabel } from '../utils/parcelService';

interface DriverParcelTripCardProps {
  trip: DriverAcceptedParcelTrip;
  variant: 'active' | 'completed';
  onMarkDelivered?: (requestId: string) => void;
  isCompleting?: boolean;
}

export const DriverParcelTripCard: React.FC<DriverParcelTripCardProps> = ({
  trip,
  variant,
  onMarkDelivered,
  isCompleting = false,
}) => {
  const { request } = trip;
  const itemsSummary =
    request.items && request.items.length > 0
      ? request.items.map((i) => `${i.name} (×${i.quantity})`).join(', ')
      : '—';

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-900 text-white">
              <Package size={12} />
              Transport colis
            </span>
            {variant === 'active' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Globe size={12} />
                À livrer
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle size={12} />
                Livraison effectuée
              </span>
            )}
            <span className="text-sm text-gray-500">
              Date souhaitée :{' '}
              {new Date(request.desiredDate).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <p className="text-sm font-medium text-gray-700 mb-2">{directionLabel(request.direction)}</p>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium text-gray-900">{request.departureAddress}</span>
            </div>
            <div className="flex items-start gap-2">
              <Navigation size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium text-gray-900">{request.arrivalAddress}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="font-bold text-green-600">
                {trip.price} {trip.currency}
              </span>
              {trip.estimatedDeliveryDate && (
                <span>
                  Livraison estimée :{' '}
                  {new Date(trip.estimatedDeliveryDate).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              <span className="text-gray-500">Objets :</span> {itemsSummary}
            </p>
            {request.notes && (
              <div className="bg-gray-50 rounded-lg p-3 mt-2">
                <p className="text-sm text-gray-700">
                  <strong>Notes :</strong> {request.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {variant === 'active' && onMarkDelivered && (
          <div className="lg:ml-6 flex-shrink-0">
            <Button
              onClick={() => onMarkDelivered(request.id)}
              disabled={isCompleting}
              className="bg-black hover:bg-gray-800 text-white flex items-center gap-2 w-full sm:w-auto"
              size="sm"
            >
              {isCompleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              Livraison effectuée
            </Button>
          </div>
        )}
      </div>

      {request.clients && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
            <User size={16} />
            Informations client
          </h4>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-medium text-blue-900">
                {request.clients.first_name} {request.clients.last_name}
              </p>
              {request.clients.phone && (
                <p className="text-sm text-blue-700">Tél: {request.clients.phone}</p>
              )}
              {request.clients.email && (
                <p className="text-sm text-blue-700">{request.clients.email}</p>
              )}
            </div>
            {request.clients.phone && variant === 'active' && (
              <div className="flex gap-2">
                <a
                  href={`tel:${request.clients.phone}`}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Appeler le client"
                >
                  <Phone size={16} />
                </a>
                <a
                  href={`sms:${request.clients.phone}`}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Envoyer un SMS"
                >
                  <MessageSquare size={16} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mt-4 text-sm text-gray-600">
        <span>Accepté le : </span>
        <span className="font-medium text-gray-900">
          {new Date(trip.acceptedAt).toLocaleString('fr-FR')}
        </span>
        {request.completedAt && (
          <>
            <span className="mx-2">·</span>
            <span>Livré le : </span>
            <span className="font-medium text-gray-900">
              {new Date(request.completedAt).toLocaleString('fr-FR')}
            </span>
          </>
        )}
        <span className="mx-2">·</span>
        <span className="font-mono text-xs">#{request.id.slice(0, 8)}</span>
      </div>
    </div>
  );
};
