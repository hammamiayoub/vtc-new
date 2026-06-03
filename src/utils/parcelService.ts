import { supabase } from '../lib/supabase';
import type {
  ParcelQuoteRequest,
  ParcelItem,
  ParcelProposal,
  ParcelDirection,
  DriverAcceptedParcelTrip,
} from '../types';

function mapItem(row: Record<string, unknown>): ParcelItem {
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    name: row.name as string,
    quantity: row.quantity as number,
    weightKg: row.weight_kg != null ? Number(row.weight_kg) : undefined,
    volumeM3: row.volume_m3 != null ? Number(row.volume_m3) : undefined,
    createdAt: row.created_at as string,
  };
}

function mapProposal(row: Record<string, unknown>): ParcelProposal {
  const drivers = row.drivers as Record<string, unknown> | undefined;
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    driverId: row.driver_id as string,
    price: Number(row.price),
    currency: row.currency as ParcelProposal['currency'],
    estimatedDeliveryDate: row.estimated_delivery_date as string | undefined,
    message: row.message as string | undefined,
    status: row.status as ParcelProposal['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    drivers: drivers
      ? {
          first_name: drivers.first_name as string,
          last_name: drivers.last_name as string,
          email: drivers.email as string | undefined,
          phone: drivers.phone as string | undefined,
          profile_photo_url: drivers.profile_photo_url as string | undefined,
        }
      : undefined,
  };
}

export function mapRequest(row: Record<string, unknown>): ParcelQuoteRequest {
  const clients = row.clients as Record<string, unknown> | undefined;
  const items = row.parcel_items as Record<string, unknown>[] | undefined;
  const photos = row.parcel_photos as Record<string, unknown>[] | undefined;
  const proposals =
    (row.parcel_quote_proposals as Record<string, unknown>[] | undefined) ??
    (row.parcel_quote_proposals_request_id_fkey as Record<string, unknown>[] | undefined);

  return {
    id: row.id as string,
    clientId: row.client_id as string,
    direction: row.direction as ParcelDirection,
    departureAddress: row.departure_address as string,
    departureCountry: row.departure_country as string | undefined,
    departureLatitude: row.departure_latitude as number | undefined,
    departureLongitude: row.departure_longitude as number | undefined,
    arrivalAddress: row.arrival_address as string,
    arrivalCountry: row.arrival_country as string | undefined,
    arrivalLatitude: row.arrival_latitude as number | undefined,
    arrivalLongitude: row.arrival_longitude as number | undefined,
    desiredDate: row.desired_date as string,
    currency: row.currency as ParcelQuoteRequest['currency'],
    notes: row.notes as string | undefined,
    status: row.status as ParcelQuoteRequest['status'],
    acceptedProposalId: row.accepted_proposal_id as string | undefined,
    completedAt: row.completed_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    items: items?.map(mapItem),
    photos: photos?.map((p) => ({
      id: p.id as string,
      requestId: p.request_id as string,
      photoUrl: p.photo_url as string,
      documentType: (p.document_type as 'photo' | 'invoice') || 'photo',
      createdAt: p.created_at as string,
    })),
    proposals: proposals?.map(mapProposal),
    clients: clients
      ? {
          first_name: clients.first_name as string,
          last_name: clients.last_name as string,
          email: clients.email as string | undefined,
          phone: clients.phone as string | undefined,
        }
      : undefined,
  };
}

const REQUEST_SELECT = `
  *,
  parcel_items(*),
  parcel_photos(*),
  parcel_quote_proposals!parcel_quote_proposals_request_id_fkey(
    *,
    drivers(first_name, last_name, email, phone, profile_photo_url)
  ),
  clients(first_name, last_name, email, phone)
`;

export async function expireOldParcelRequests(): Promise<void> {
  await supabase.rpc('expire_old_parcel_requests');
}

export async function fetchClientParcelRequests(clientId: string): Promise<ParcelQuoteRequest[]> {
  await expireOldParcelRequests();

  const { data, error } = await supabase
    .from('parcel_quote_requests')
    .select(REQUEST_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRequest);
}

export async function fetchParcelRequestById(requestId: string): Promise<ParcelQuoteRequest | null> {
  await expireOldParcelRequests();

  const { data, error } = await supabase
    .from('parcel_quote_requests')
    .select(REQUEST_SELECT)
    .eq('id', requestId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRequest(data) : null;
}

function mapRpcParcelTrip(row: Record<string, unknown>): DriverAcceptedParcelTrip {
  const requestPayload = row.request as Record<string, unknown>;
  const request = mapRequest({
    ...requestPayload,
    parcel_items: requestPayload.parcel_items,
    clients: requestPayload.clients,
  });

  return {
    proposalId: row.proposal_id as string,
    price: Number(row.price),
    currency: row.currency as DriverAcceptedParcelTrip['currency'],
    estimatedDeliveryDate: row.estimated_delivery_date as string | undefined,
    acceptedAt: row.accepted_at as string,
    request,
  };
}

/** Fallback PostgREST si la RPC n'est pas encore déployée */
async function fetchDriverAcceptedParcelTripsLegacy(
  driverId: string
): Promise<DriverAcceptedParcelTrip[]> {
  const { data, error } = await supabase
    .from('parcel_quote_proposals')
    .select(
      `
      *,
      parcel_quote_requests!inner(
        *,
        parcel_items(*),
        clients(first_name, last_name, email, phone)
      )
    `
    )
    .eq('driver_id', driverId)
    .eq('status', 'accepted')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data || [])
    .map((row) => {
      const requestRow = row.parcel_quote_requests as Record<string, unknown>;
      const request = mapRequest(requestRow);
      if (
        !['accepted', 'completed'].includes(request.status) ||
        request.acceptedProposalId !== row.id
      ) {
        return null;
      }
      return {
        proposalId: row.id as string,
        price: Number(row.price),
        currency: row.currency as DriverAcceptedParcelTrip['currency'],
        estimatedDeliveryDate: row.estimated_delivery_date as string | undefined,
        acceptedAt: row.updated_at as string,
        request,
      };
    })
    .filter((t): t is DriverAcceptedParcelTrip => t !== null);
}

/** Demandes colis dont la proposition du transporteur a été acceptée par le client */
export async function fetchDriverAcceptedParcelTrips(
  driverId: string
): Promise<DriverAcceptedParcelTrip[]> {
  await expireOldParcelRequests();

  const { data, error } = await supabase.rpc('get_driver_accepted_parcel_trips', {
    p_driver_id: driverId,
  });

  if (error) {
    const missingRpc =
      error.code === 'PGRST202' ||
      error.message?.includes('get_driver_accepted_parcel_trips') ||
      error.message?.includes('Could not find the function');
    if (missingRpc) {
      console.warn(
        'RPC get_driver_accepted_parcel_trips absente — repli sur requête directe. Appliquez la migration SQL.'
      );
      return fetchDriverAcceptedParcelTripsLegacy(driverId);
    }
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => mapRpcParcelTrip(row as Record<string, unknown>));
}

export async function completeParcelDelivery(requestId: string): Promise<ParcelQuoteRequest> {
  const { error } = await supabase.rpc('complete_parcel_delivery', {
    p_request_id: requestId,
  });

  if (error) throw error;

  const full = await fetchParcelRequestById(requestId);
  if (!full) throw new Error('Demande introuvable après clôture');
  return full;
}

export async function fetchTransporteurParcelRequests(): Promise<ParcelQuoteRequest[]> {
  await expireOldParcelRequests();

  const { data, error } = await supabase
    .from('parcel_quote_requests')
    .select(REQUEST_SELECT)
    .in('status', ['pending', 'quoted', 'accepted'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRequest);
}

export interface CreateParcelRequestInput {
  clientId: string;
  direction: ParcelDirection;
  departureAddress: string;
  departureCountry?: string;
  departureLatitude?: number;
  departureLongitude?: number;
  arrivalAddress: string;
  arrivalCountry?: string;
  arrivalLatitude?: number;
  arrivalLongitude?: number;
  desiredDate: string;
  notes?: string;
  items: Omit<ParcelItem, 'id' | 'requestId' | 'createdAt'>[];
}

export async function createParcelRequest(input: CreateParcelRequestInput): Promise<ParcelQuoteRequest> {
  const { data: request, error } = await supabase
    .from('parcel_quote_requests')
    .insert({
      client_id: input.clientId,
      direction: input.direction,
      departure_address: input.departureAddress,
      departure_country: input.departureCountry || null,
      departure_latitude: input.departureLatitude ?? null,
      departure_longitude: input.departureLongitude ?? null,
      arrival_address: input.arrivalAddress,
      arrival_country: input.arrivalCountry || null,
      arrival_latitude: input.arrivalLatitude ?? null,
      arrival_longitude: input.arrivalLongitude ?? null,
      desired_date: input.desiredDate,
      notes: input.notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  if (input.items.length > 0) {
    const { error: itemsError } = await supabase.from('parcel_items').insert(
      input.items.map((item) => ({
        request_id: request.id,
        name: item.name,
        quantity: item.quantity,
        weight_kg: item.weightKg ?? null,
        volume_m3: item.volumeM3 ?? null,
      }))
    );
    if (itemsError) throw itemsError;
  }

  const full = await fetchParcelRequestById(request.id);
  if (!full) throw new Error('Demande introuvable après création');
  return full;
}

export async function notifyTransporteursForRequest(requestId: string, clientId: string): Promise<void> {
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-parcel-request-to-transporteurs`;
  try {
    await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId, clientId }),
    });
  } catch (err) {
    console.error('Erreur envoi emails transporteurs:', err);
  }
}

export async function submitParcelProposal(
  requestId: string,
  driverId: string,
  price: number,
  estimatedDeliveryDate?: string,
  message?: string
): Promise<ParcelProposal> {
  const { data, error } = await supabase
    .from('parcel_quote_proposals')
    .insert({
      request_id: requestId,
      driver_id: driverId,
      price,
      estimated_delivery_date: estimatedDeliveryDate || null,
      message: message || null,
      status: 'sent',
    })
    .select()
    .single();

  if (error) throw error;

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-parcel-proposal-notification`;
  try {
    await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ proposalId: data.id, requestId }),
    });
  } catch (err) {
    console.error('Erreur notification proposition:', err);
  }

  return mapProposal(data);
}

export async function acceptParcelProposal(proposalId: string): Promise<ParcelProposal> {
  const { data, error } = await supabase.rpc('accept_parcel_proposal', {
    p_proposal_id: proposalId,
  });

  if (error) throw error;

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-parcel-acceptance-confirmation`;
  try {
    await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ proposalId }),
    });
  } catch (err) {
    console.error('Erreur confirmation acceptation:', err);
  }

  return mapProposal(data);
}

export function directionLabel(direction: ParcelDirection): string {
  return direction === 'europe_to_tunisia' ? 'Europe → Tunisie' : 'Tunisie → Europe';
}

export function statusLabel(status: ParcelQuoteRequest['status']): string {
  const labels: Record<ParcelQuoteRequest['status'], string> = {
    pending: 'En attente de propositions',
    quoted: 'Propositions reçues',
    accepted: 'Offre acceptée',
    completed: 'Livraison effectuée',
    cancelled: 'Annulée',
    expired: 'Expirée',
  };
  return labels[status];
}
