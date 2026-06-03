import React, { useEffect, useState } from 'react';
import { Package, ChevronRight, Loader2 } from 'lucide-react';
import { fetchClientParcelRequests, directionLabel, statusLabel } from '../utils/parcelService';
import type { ParcelQuoteRequest } from '../types';

interface ParcelQuoteListProps {
  clientId: string;
  onSelectRequest: (requestId: string) => void;
  refreshKey?: number;
}

const statusColors: Record<ParcelQuoteRequest['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-700',
};

export const ParcelQuoteList: React.FC<ParcelQuoteListProps> = ({
  clientId,
  onSelectRequest,
  refreshKey = 0,
}) => {
  const [requests, setRequests] = useState<ParcelQuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchClientParcelRequests(clientId);
        setRequests(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientId, refreshKey]);

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
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <button
          key={req.id}
          type="button"
          onClick={() => onSelectRequest(req.id)}
          className="w-full text-left bg-white rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow border border-gray-100"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[req.status]}`}>
                  {statusLabel(req.status)}
                </span>
                <span className="text-xs text-gray-500">{directionLabel(req.direction)}</span>
              </div>
              <p className="text-sm text-gray-900 truncate">
                {req.departureAddress} → {req.arrivalAddress}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Date souhaitée : {new Date(req.desiredDate).toLocaleDateString('fr-FR')}
                {req.proposals && req.proposals.length > 0 && (
                  <span className="ml-2 text-blue-600">
                    · {req.proposals.length} proposition{req.proposals.length > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
            <ChevronRight className="text-gray-400 flex-shrink-0 mt-1" size={20} />
          </div>
        </button>
      ))}
    </div>
  );
};
