import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Loader2, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { ParcelAttachmentsGallery } from './ui/ParcelAttachmentsGallery';
import { Button } from './ui/Button';
import { parcelProposalSchema } from '../utils/validation';
import {
  fetchTransporteurParcelRequests,
  submitParcelProposal,
  directionLabel,
  statusLabel,
} from '../utils/parcelService';
import type { ParcelQuoteRequest, ParcelProposalFormData } from '../types';

interface TransporteurRequestsProps {
  driverId: string;
  refreshKey?: number;
}

export const TransporteurRequests: React.FC<TransporteurRequestsProps> = ({
  driverId,
  refreshKey = 0,
}) => {
  const [requests, setRequests] = useState<ParcelQuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchTransporteurParcelRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [driverId, refreshKey]);

  const ProposalForm: React.FC<{ request: ParcelQuoteRequest }> = ({ request }) => {
    const existing = request.proposals?.find((p) => p.driverId === driverId);
    const {
      register,
      handleSubmit,
      formState: { errors },
    } = useForm<ParcelProposalFormData>({
      resolver: zodResolver(parcelProposalSchema),
      defaultValues: {
        price: existing?.price,
        estimatedDeliveryDate: existing?.estimatedDeliveryDate?.split('T')[0],
        message: existing?.message || '',
      },
    });

    const onSubmit = async (data: ParcelProposalFormData) => {
      setSubmittingId(request.id);
      try {
        await submitParcelProposal(
          request.id,
          driverId,
          data.price,
          data.estimatedDeliveryDate,
          data.message
        );
        await load();
        alert('Votre proposition a été envoyée au client.');
      } catch (err) {
        console.error(err);
        alert('Erreur lors de l\'envoi de la proposition.');
      } finally {
        setSubmittingId(null);
      }
    };

    if (request.status === 'accepted' || request.status === 'completed' || request.status === 'expired') {
      return (
        <p className="text-sm text-gray-500 mt-3">
          {request.status === 'expired' ? 'Cette demande a expiré.' : 'Une offre a déjà été acceptée.'}
        </p>
      );
    }

    if (existing) {
      return (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">Votre proposition envoyée</p>
          <p className="text-lg font-bold text-blue-800 mt-1">
            {existing.price} {existing.currency}
          </p>
          {existing.message && <p className="text-sm text-blue-700 mt-1">{existing.message}</p>}
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-700">
          Envoyer une proposition ({request.currency})
        </p>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Prix proposé *</label>
          <input
            type="number"
            step="0.01"
            min={1}
            {...register('price')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder={`Montant en ${request.currency}`}
          />
          {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price.message}</p>}
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Date de livraison estimée</label>
          <input
            type="date"
            {...register('estimatedDeliveryDate')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Message au client</label>
          <textarea
            {...register('message')}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="Conditions, délais, remarques…"
          />
        </div>
        <Button type="submit" disabled={submittingId === request.id} size="sm" className="flex items-center gap-2">
          {submittingId === request.id ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Envoyer la proposition
        </Button>
      </form>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm">
        <Package className="mx-auto text-gray-300 mb-4" size={48} />
        <p className="text-gray-600">Aucune demande de transport de colis pour le moment.</p>
        <p className="text-sm text-gray-400 mt-2">
          Assurez-vous d'avoir renseigné vos disponibilités et au moins un véhicule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const isExpanded = expandedId === req.id;
        return (
          <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : req.id)}
              className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-3 hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {statusLabel(req.status)}
                  </span>
                  <span className="text-xs text-gray-500">{directionLabel(req.direction)}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {req.departureAddress} → {req.arrivalAddress}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Date : {new Date(req.desiredDate).toLocaleDateString('fr-FR')}
                  {req.clients && ` · ${req.clients.first_name} ${req.clients.last_name}`}
                </p>
              </div>
              {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>

            {isExpanded && (
              <div className="px-4 sm:px-5 pb-5 border-t border-gray-100 pt-4">
                {req.items && req.items.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Objets</p>
                    <ul className="text-sm space-y-0.5">
                      {req.items.map((item, i) => (
                        <li key={item.id || i} className="text-gray-700">
                          {item.name} — {item.quantity} colis
                          {item.weightKg != null && ` · ${item.weightKg} kg`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {req.photos && req.photos.length > 0 && (
                  <div className="mb-4">
                    <ParcelAttachmentsGallery photos={req.photos} />
                  </div>
                )}
                {req.notes && <p className="text-sm text-gray-600 mb-3">{req.notes}</p>}
                <ProposalForm request={req} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
