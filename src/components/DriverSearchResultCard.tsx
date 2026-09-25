import { Car, CheckCircle, MapPin, Star, User } from 'lucide-react';
import type { Driver } from '../types';
import { formatVehicleType } from '../utils/vehicles';
import { getVehiclePlaceholderImage, SEDAN_PLACEHOLDER_IMAGE } from '../utils/vehiclePlaceholderImage';

interface DriverSearchResultCardProps {
  driver: Driver;
  selected: boolean;
  estimatedPrice: number | null;
  onSelect: () => void;
}

export function DriverSearchResultCard({
  driver,
  selected,
  estimatedPrice,
  onSelect,
}: DriverSearchResultCardProps) {
  const vehicle = driver.vehicleInfo;
  const hasPhoto = !!vehicle?.photoUrl;
  const vehicleVisualSrc = hasPhoto
    ? vehicle!.photoUrl!
    : getVehiclePlaceholderImage(vehicle?.type);
  const usesSedanPlaceholder = !hasPhoto && vehicleVisualSrc === SEDAN_PLACEHOLDER_IMAGE;
  const vehicleVisualAlt = hasPhoto
    ? `${vehicle!.make} ${vehicle!.model}`
    : formatVehicleType(vehicle?.type);

  const hasRating =
    typeof driver.averageRating === 'number'
    && typeof driver.totalRatings === 'number'
    && driver.totalRatings > 0;

  const isNearby =
    typeof driver.distanceFromPickup === 'number'
    && driver.distanceFromPickup > 0
    && driver.distanceFromPickup !== Infinity
    && driver.distanceFromPickup <= 10;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`self-start w-full border-2 rounded-xl overflow-hidden cursor-pointer transition-all ${
        selected
          ? 'border-gray-900 bg-gray-50 shadow-sm'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className={`relative w-full h-32 sm:h-36 ${
        usesSedanPlaceholder ? 'bg-white' : 'bg-gradient-to-br from-gray-100 to-gray-200'
      }`}>
        <img
          src={vehicleVisualSrc}
          alt={vehicleVisualAlt}
          className={`w-full h-full ${
            hasPhoto
              ? 'object-cover'
              : usesSedanPlaceholder
                ? 'object-contain'
                : 'object-contain p-3 sm:p-4 opacity-95'
          }`}
          loading="lazy"
        />
        {!hasPhoto && (
          <span className="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-gray-600 shadow-sm">
            Photo non disponible
          </span>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-11 h-11 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {driver.profilePhotoUrl ? (
              <img
                src={driver.profilePhotoUrl}
                alt={`${driver.firstName} ${driver.lastName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-gray-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                    {driver.firstName} {driver.lastName}
                  </h4>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold ${
                      hasRating ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Star
                      size={10}
                      className={hasRating ? 'text-yellow-500' : 'text-gray-400'}
                    />
                    {hasRating ? driver.averageRating!.toFixed(1) : 'Nouveau'}
                  </span>
                  {typeof driver.bookingCount === 'number' && driver.bookingCount > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[9px] sm:text-[10px] font-semibold">
                      ~{Math.max(1, Math.round(driver.bookingCount / 5) * 5)} courses
                    </span>
                  )}
                </div>

                {driver.city && (
                  <p className="mt-1 text-xs sm:text-sm text-gray-600 flex items-center gap-1 flex-wrap">
                    <MapPin size={12} className="flex-shrink-0" />
                    <span>{driver.city}</span>
                    {typeof driver.distanceFromPickup === 'number'
                      && driver.distanceFromPickup > 0
                      && driver.distanceFromPickup !== Infinity && (
                      <span className="text-gray-900 font-medium">
                        • {driver.distanceFromPickup} km
                      </span>
                    )}
                  </p>
                )}
              </div>

              {selected && (
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900 flex-shrink-0" />
              )}
            </div>

            {vehicle && (
              <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1">
                  <Car size={12} className="text-gray-900 flex-shrink-0" />
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || formatVehicleType(vehicle.type)}
                  </p>
                  {vehicle.isVip && (
                    <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-gray-100 text-gray-800">
                      VIP
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1 text-[10px] sm:text-xs text-gray-700">
                  {vehicle.color && (
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">{vehicle.color}</span>
                  )}
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                    {formatVehicleType(vehicle.type)}
                  </span>
                  {vehicle.seats && (
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">{vehicle.seats} places</span>
                  )}
                </div>
              </div>
            )}

            {estimatedPrice != null && (
              <p className="mt-2 text-sm font-bold text-green-700">~{estimatedPrice} TND</p>
            )}

            {isNearby && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <MapPin size={12} />
                Chauffeur proche
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
