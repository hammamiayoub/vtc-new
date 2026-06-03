import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Package, CheckCircle, User, Phone, Mail } from 'lucide-react';
import { Button } from './ui/Button';
import { ParcelAttachmentsGallery } from './ui/ParcelAttachmentsGallery';
import {
  fetchParcelRequestById,
  acceptParcelProposal,
  directionLabel,
  statusLabel,
} from '../utils/parcelService';
import type { ParcelQuoteRequest } from '../types';

interface ParcelQuoteDetailProps {
  requestId: string;
  onBack: () => void;
  onAccepted?: () => void;
}

export const ParcelQuoteDetail: React.FC<ParcelQuoteDetailProps> = ({
  requestId,
  onBack,
  onAccepted,
}) => {
  const [request, setRequest] = useState<ParcelQuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchParcelRequestById(requestId);
      setRequest(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [requestId]);

  const handleAccept = async (proposalId: string) => {
    if (!confirm('Confirmer cette offre ? Les autres propositions seront automatiquement rejetées.')) {
      return;
    }
    setAcceptingId(proposalId);
    try {
      await acceptParcelProposal(proposalId);
      await load();
      onAccepted?.();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'acceptation de l'offre.");
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Demande introuvable.</p>
        <Button onClick={onBack} className="mt-4">Retour</Button>
      </div>
    );
  }

  const proposals = (request.proposals || []).sort((a, b) => a.price - b.price);
  const acceptedProposal = proposals.find((p) => p.status === 'accepted');
  const canAccept = request.status === 'pending' || request.status === 'quoted';

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} />
        Retour à mes demandes
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <Package className="text-blue-600 mt-1" size={22} />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Demande de transport de colis</h2>
            <p className="text-sm text-gray-500">{directionLabel(request.direction)} · {statusLabel(request.status)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Départ</p>
            <p className="font-medium">{request.departureAddress}</p>
            {request.departureCountry && <p className="text-xs text-gray-400">{request.departureCountry}</p>}
          </div>
          <div>
            <p className="text-gray-500">Arrivée</p>
            <p className="font-medium">{request.arrivalAddress}</p>
            {request.arrivalCountry && <p className="text-xs text-gray-400">{request.arrivalCountry}</p>}
          </div>
          <div>
            <p className="text-gray-500">Date souhaitée</p>
            <p className="font-medium">{new Date(request.desiredDate).toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-gray-500">Devise des propositions</p>
            <p className="font-medium">{request.currency}</p>
          </div>
        </div>

        {request.items && request.items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Objets</p>
            <ul className="space-y-1 text-sm">
              {request.items.map((item, i) => (
                <li key={item.id || i} className="text-gray-600">
                  {item.name} — {item.quantity} colis
                  {item.weightKg != null && ` · ${item.weightKg} kg`}
                  {item.volumeM3 != null && ` · ${item.volumeM3} m³`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {request.photos && request.photos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <ParcelAttachmentsGallery photos={request.photos} />
          </div>
        )}

        {request.notes && (
          <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{request.notes}</p>
        )}
      </div>

      {request.status === 'completed' && acceptedProposal && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="text-emerald-600" size={20} />
            <h3 className="font-semibold text-emerald-900">Livraison effectuée</h3>
          </div>
          <p className="text-lg font-bold text-emerald-800 mb-2">
            {acceptedProposal.price} {acceptedProposal.currency}
          </p>
          {request.completedAt && (
            <p className="text-sm text-emerald-800">
              Clôturée le {new Date(request.completedAt).toLocaleString('fr-FR')}
            </p>
          )}
          {acceptedProposal.drivers && (
            <p className="text-sm text-emerald-900 mt-2">
              Transporteur : {acceptedProposal.drivers.first_name} {acceptedProposal.drivers.last_name}
            </p>
          )}
        </div>
      )}

      {request.status === 'accepted' && acceptedProposal && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="text-green-600" size={20} />
            <h3 className="font-semibold text-green-900">Offre acceptée — livraison en cours</h3>
          </div>
          <p className="text-lg font-bold text-green-800 mb-3">
            {acceptedProposal.price} {acceptedProposal.currency}
          </p>
          {acceptedProposal.drivers && (
            <div className="space-y-1 text-sm text-green-900">
              <p className="flex items-center gap-2">
                <User size={14} />
                {acceptedProposal.drivers.first_name} {acceptedProposal.drivers.last_name}
              </p>
              {acceptedProposal.drivers.phone && (
                <p className="flex items-center gap-2">
                  <Phone size={14} />
                  {acceptedProposal.drivers.phone}
                </p>
              )}
              {acceptedProposal.drivers.email && (
                <p className="flex items-center gap-2">
                  <Mail size={14} />
                  {acceptedProposal.drivers.email}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-green-700 mt-3">
            Un email de confirmation avec les coordonnées a été envoyé aux deux parties.
          </p>
        </div>
      )}

      {proposals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Propositions reçues ({proposals.length})
          </h3>
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className={`p-4 rounded-lg border ${
                  proposal.status === 'accepted'
                    ? 'border-green-300 bg-green-50'
                    : proposal.status === 'rejected'
                    ? 'border-gray-200 bg-gray-50 opacity-60'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold text-gray-900">
                      {proposal.price} {proposal.currency}
                    </p>
                    {proposal.drivers && (
                      <p className="text-sm text-gray-600 mt-1">
                        {proposal.drivers.first_name} {proposal.drivers.last_name}
                      </p>
                    )}
                    {proposal.estimatedDeliveryDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Livraison estimée :{' '}
                        {new Date(proposal.estimatedDeliveryDate).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {proposal.message && (
                      <p className="text-sm text-gray-500 mt-2 italic">« {proposal.message} »</p>
                    )}
                  </div>
                  {canAccept && proposal.status === 'sent' && (
                    <Button
                      onClick={() => handleAccept(proposal.id)}
                      disabled={acceptingId === proposal.id}
                      className="whitespace-nowrap"
                    >
                      {acceptingId === proposal.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        'Valider cette offre'
                      )}
                    </Button>
                  )}
                  {proposal.status === 'accepted' && (
                    <span className="text-sm font-medium text-green-700">Acceptée</span>
                  )}
                  {proposal.status === 'rejected' && (
                    <span className="text-sm text-gray-400">Non retenue</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {proposals.length === 0 && request.status === 'pending' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          Votre demande a été envoyée aux transporteurs éligibles. Vous recevrez un email à chaque nouvelle proposition.
        </div>
      )}
    </div>
  );
};
