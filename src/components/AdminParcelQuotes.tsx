import React, { useEffect, useState } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { directionLabel, statusLabel, expireOldParcelRequests } from '../utils/parcelService';
import type { ParcelQuoteRequest } from '../types';

export const AdminParcelQuotes: React.FC = () => {
  const [requests, setRequests] = useState<ParcelQuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await expireOldParcelRequests();
        const { data, error } = await supabase
          .from('parcel_quote_requests')
          .select(`
            *,
            parcel_items(*),
            parcel_quote_proposals!parcel_quote_proposals_request_id_fkey(*, drivers(first_name, last_name, email)),
            clients(first_name, last_name, email, phone)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setRequests(
          (data || []).map((row) => ({
            id: row.id,
            clientId: row.client_id,
            direction: row.direction,
            departureAddress: row.departure_address,
            arrivalAddress: row.arrival_address,
            desiredDate: row.desired_date,
            currency: row.currency,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            items: row.parcel_items,
            proposals: row.parcel_quote_proposals,
            clients: row.clients,
          }))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
        <p className="text-gray-600">Aucune demande de transport de colis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <div key={req.id} className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100">
              {statusLabel(req.status)}
            </span>
            <span className="text-xs text-gray-500">{directionLabel(req.direction)}</span>
            <span className="text-xs text-gray-500">{req.currency}</span>
          </div>
          <p className="font-medium text-gray-900">
            {req.departureAddress} → {req.arrivalAddress}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Date : {new Date(req.desiredDate).toLocaleDateString('fr-FR')}
            {req.clients && ` · Client : ${req.clients.first_name} ${req.clients.last_name}`}
          </p>
          {req.proposals && req.proposals.length > 0 && (
            <p className="text-sm text-blue-600 mt-2">
              {req.proposals.length} proposition(s)
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
