import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Loader2, Navigation, X, MapPin, FileText, Image } from 'lucide-react';
import { Button } from './ui/Button';
import AddressAutocomplete from './AddressAutocomplete';
import { ParcelItemsInput } from './ui/ParcelItemsInput';
import { parcelQuoteSchema } from '../utils/validation';
import { countriesForPoint, extractPlaceDetails, geolocateCurrentPosition } from '../utils/parcelGeo';
import { createParcelRequest, notifyTransporteursForRequest } from '../utils/parcelService';
import { uploadParcelAttachment } from '../utils/imageUpload';
import type { ParcelDirection, ParcelDocumentType, ParcelItem, ParcelQuoteFormData } from '../types';
import { useLocale } from '../i18n/locale';
import { translateSignupMessage } from '../i18n/signupErrors';

interface PendingAttachment {
  file: File;
  documentType: ParcelDocumentType;
  previewUrl?: string;
}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

interface ParcelQuoteFormProps {
  clientId: string;
  onSuccess: (requestId: string) => void;
}

interface PlaceState {
  address: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export const ParcelQuoteForm: React.FC<ParcelQuoteFormProps> = ({ clientId, onSuccess }) => {
  const { locale } = useLocale();
  const en = locale === 'en';
  const tx = (message?: string) => translateSignupMessage(message, locale);
  const [items, setItems] = useState<Omit<ParcelItem, 'id' | 'requestId' | 'createdAt'>[]>([
    { name: '', quantity: 1 },
  ]);
  const [departure, setDeparture] = useState<PlaceState>({ address: '' });
  const [arrival, setArrival] = useState<PlaceState>({ address: '' });
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ParcelQuoteFormData>({
    resolver: zodResolver(parcelQuoteSchema),
    defaultValues: {
      direction: 'europe_to_tunisia',
      departureAddress: '',
      arrivalAddress: '',
      desiredDate: '',
      items: [{ name: '', quantity: 1 }],
      notes: '',
    },
  });

  const direction = watch('direction') as ParcelDirection;

  const handleGeolocateDeparture = async () => {
    setIsGeolocating(true);
    try {
      const place = await geolocateCurrentPosition();
      setDeparture(place);
      setValue('departureAddress', place.address, { shouldValidate: true });
    } catch (err) {
      console.error(err);
      alert(
        en
          ? 'Could not get your location. Check location permissions.'
          : "Impossible d'obtenir votre position. Vérifiez les autorisations de géolocalisation.",
      );
    } finally {
      setIsGeolocating(false);
    }
  };

  const addAttachments = (files: File[], documentType: ParcelDocumentType) => {
    const valid: PendingAttachment[] = [];
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) continue;
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (documentType === 'photo' && !isImage) continue;
      if (documentType === 'invoice' && !isImage && !isPdf) continue;
      valid.push({ file, documentType });
    }
    if (valid.length !== files.length) {
      alert(
        documentType === 'photo'
          ? (en ? 'Photos: images only (JPG, PNG…), 5 MB each.' : 'Photos : images uniquement (JPG, PNG…), max 5 Mo chacune.')
          : (en ? 'Invoices: image or PDF, 5 MB each.' : 'Factures : image ou PDF, max 5 Mo chacun.')
      );
    }
    setAttachments((prev) => {
      const next = [...prev, ...valid];
      valid.forEach((att) => {
        if (!att.file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const previewUrl = ev.target?.result as string;
          setAttachments((current) =>
            current.map((item) =>
              item.file === att.file && item.documentType === att.documentType
                ? { ...item, previewUrl }
                : item
            )
          );
        };
        reader.readAsDataURL(att.file);
      });
      return next;
    });
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: ParcelDocumentType
  ) => {
    addAttachments(Array.from(e.target.files || []), documentType);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ParcelQuoteFormData) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        clientId,
        direction: data.direction,
        departureAddress: departure.address || data.departureAddress,
        departureCountry: departure.country,
        departureLatitude: departure.latitude,
        departureLongitude: departure.longitude,
        arrivalAddress: arrival.address || data.arrivalAddress,
        arrivalCountry: arrival.country,
        arrivalLatitude: arrival.latitude,
        arrivalLongitude: arrival.longitude,
        desiredDate: data.desiredDate,
        notes: data.notes,
        items,
      };

      const request = await createParcelRequest(payload);

      for (const att of attachments) {
        await uploadParcelAttachment(att.file, request.id, att.documentType);
      }

      await notifyTransporteursForRequest(request.id, clientId);
      onSuccess(request.id);
    } catch (err) {
      console.error(err);
      setSubmitError('Erreur lors de la création de la demande. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Package className="text-blue-600" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {en ? 'International parcel transport' : 'Transport international de colis'}
          </h2>
          <p className="text-sm text-gray-600">
            {en ? 'Request a quote for Europe ↔ Tunisia' : 'Demandez un devis pour un transport Europe ↔ Tunisie'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{en ? 'Direction *' : 'Direction du transport *'}</label>
          <select
            {...register('direction')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="europe_to_tunisia">{en ? 'Europe → Tunisia (currency: EUR)' : 'Europe → Tunisie (devise : EUR)'}</option>
            <option value="tunisia_to_europe">{en ? 'Tunisia → Europe (currency: TND)' : 'Tunisie → Europe (devise : TND)'}</option>
          </select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">{en ? 'Pickup address *' : 'Adresse de départ *'}</label>
            <button
              type="button"
              onClick={handleGeolocateDeparture}
              disabled={isGeolocating}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {isGeolocating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
              {en ? 'My current location' : 'Ma position actuelle'}
            </button>
          </div>
          <AddressAutocomplete
            inputId="parcel-departure-address"
            label=""
            value={departure.address}
            onChange={(v) => {
              setDeparture((prev) => ({ ...prev, address: v }));
              setValue('departureAddress', v, { shouldValidate: true });
            }}
            onPlaceSelect={(place) => {
              const details = extractPlaceDetails(place);
              setDeparture(details);
              setValue('departureAddress', details.address, { shouldValidate: true });
            }}
            countries={countriesForPoint(direction, 'departure')}
            placeholder={en ? 'Pickup address…' : 'Adresse de départ…'}
          />
          {departure.country && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={12} /> {departure.country}
            </p>
          )}
          {errors.departureAddress && (
            <p className="text-sm text-red-600">{tx(errors.departureAddress.message)}</p>
          )}
        </div>

        <div>
          <AddressAutocomplete
            inputId="parcel-arrival-address"
            label={en ? 'Destination address *' : "Adresse d'arrivée *"}
            value={arrival.address}
            onChange={(v) => {
              setArrival((prev) => ({ ...prev, address: v }));
              setValue('arrivalAddress', v, { shouldValidate: true });
            }}
            onPlaceSelect={(place) => {
              const details = extractPlaceDetails(place);
              setArrival(details);
              setValue('arrivalAddress', details.address, { shouldValidate: true });
            }}
            countries={countriesForPoint(direction, 'arrival')}
            placeholder={en ? 'Destination address…' : "Adresse d'arrivée…"}
          />
          {arrival.country && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <MapPin size={12} /> {arrival.country}
            </p>
          )}
          {errors.arrivalAddress && (
            <p className="text-sm text-red-600">{tx(errors.arrivalAddress.message)}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{en ? 'Preferred date *' : 'Date souhaitée *'}</label>
          <input
            type="date"
            min={minDate}
            {...register('desiredDate')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.desiredDate && (
            <p className="text-sm text-red-600">{tx(errors.desiredDate.message)}</p>
          )}
        </div>

        <ParcelItemsInput
          items={items}
          onChange={(next) => {
            setItems(next);
            setValue('items', next, { shouldValidate: true });
          }}
          errors={tx(errors.items?.message)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {en ? 'Photos and invoices' : 'Photos et factures'}
          </label>
          <p className="text-xs text-gray-500 mb-3">
            {en
              ? 'Add photos of the goods and/or invoices (image or PDF) so the carrier can estimate the shipment.'
              : 'Ajoutez des photos de la marchandise et/ou vos factures (image ou PDF) pour aider le transporteur à estimer le transport.'}
          </p>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {attachments.map((att, i) => (
                <div
                  key={`${att.file.name}-${i}`}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                >
                  {att.previewUrl ? (
                    <img src={att.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-1">
                      <FileText size={22} className="text-red-600" />
                      <span className="text-[9px] text-center mt-1 leading-tight">PDF</span>
                    </div>
                  )}
                  <span
                    className={`absolute bottom-0 left-0 right-0 text-[9px] text-center py-0.5 text-white ${
                      att.documentType === 'invoice' ? 'bg-amber-600' : 'bg-blue-600'
                    }`}
                  >
                    {att.documentType === 'invoice' ? (en ? 'Invoice' : 'Facture') : (en ? 'Photo' : 'Photo')}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 text-sm text-gray-600">
              <Image size={16} />
              {en ? 'Goods photos' : 'Photos marchandise'}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'photo')}
              />
            </label>
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-amber-300 rounded-lg cursor-pointer hover:border-amber-500 text-sm text-gray-600">
              <FileText size={16} />
              {en ? 'Invoices' : 'Factures'}
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'invoice')}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{en ? 'Additional notes' : 'Notes complémentaires'}</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={en ? 'Useful details for carriers…' : 'Informations utiles pour les transporteurs…'}
          />
        </div>

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{tx(submitError)}</div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              {en ? 'Sending…' : 'Envoi en cours…'}
            </>
          ) : (
            en ? 'Submit quote request' : 'Valider ma demande de devis'
          )}
        </Button>
      </form>
    </div>
  );
};
