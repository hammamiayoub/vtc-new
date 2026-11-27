import React from 'react';
import { MapPin, UserCheck, ShieldCheck, Navigation, Star } from 'lucide-react';
import { RevealSection } from './ui/RevealSection';
import { useLocale } from '../i18n/locale';

/**
 * Parcours d'une réservation en cinq étapes. Chaque étape montre un aperçu en code de l'écran
 * correspondant (données d'exemple), avec une tuile d'icône qui chevauche le coin du visuel.
 */

const frame = 'relative h-full w-full overflow-hidden rounded-lg bg-surface-muted p-5 sm:p-6';
const panel = 'rounded-xl border border-surface-border bg-white shadow-raised';

function TripPreview({ en }: { en: boolean }) {
  return (
    <div className={`${frame} flex items-center justify-center`}>
      <div className={`${panel} w-full max-w-xs p-4`}>
        <div className="relative space-y-2 pl-6">
          <span aria-hidden="true" className="absolute left-[7px] top-4 h-[calc(100%-32px)] w-px bg-gray-300" />
          <span aria-hidden="true" className="absolute left-0 top-[14px] h-[9px] w-[9px] rounded-full bg-brand" />
          <span aria-hidden="true" className="absolute left-0 bottom-[14px] h-[9px] w-[9px] rounded-[2px] bg-brand" />
          <div className="rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-gray-900">
            {en ? 'Tunis-Carthage airport' : 'Aéroport Tunis-Carthage'}
          </div>
          <div className="rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-gray-900">Hammamet</div>
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t border-surface-border pt-3">
          <span className="text-xs text-gray-500">{en ? 'Estimated fare' : 'Tarif estimé'}</span>
          <span className="text-base font-medium tabular-nums text-gray-900">≈ 90 TND</span>
        </div>
      </div>
    </div>
  );
}

function DriversPreview({ en }: { en: boolean }) {
  const rows = [
    { img: '/vehicles/berline-3d.webp', name: 'Karim B.', meta: en ? 'Sedan · 4 seats' : 'Berline · 4 places', rating: '4,9', selected: true },
    { img: '/vehicles/van-3d.webp', name: 'Sami T.', meta: en ? 'Van · 8 seats' : 'Van · 8 places', rating: '4,8', selected: false },
  ];
  return (
    <div className={`${frame} flex items-center justify-center`}>
      <div className="w-full max-w-xs space-y-2">
        {rows.map((r) => (
          <div
            key={r.name}
            className={`${panel} flex items-center gap-3 p-3 ${r.selected ? 'border-brand ring-1 ring-brand' : ''}`}
          >
            <img src={r.img} alt="" width={56} height={32} loading="lazy" className="h-8 w-14 object-contain" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{r.name}</p>
              <p className="truncate text-xs text-gray-500">{r.meta}</p>
            </div>
            <span className="text-xs tabular-nums text-gray-900">{r.rating}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfirmPreview({ en }: { en: boolean }) {
  return (
    <div className={`${frame} flex items-center justify-center`}>
      <div className={`${panel} w-full max-w-xs p-4`}>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-medium text-white"
          >
            KB
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900">Karim B.</p>
            <p className="text-xs text-gray-500">{en ? 'Graphite sedan' : 'Berline graphite'}</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 border-t border-surface-border pt-3 text-xs">
          <div className="flex justify-between">
            <dt className="text-gray-500">{en ? 'Pickup' : 'Prise en charge'}</dt>
            <dd className="tabular-nums text-gray-900">14:30</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">{en ? 'Confirmed price' : 'Prix confirmé'}</dt>
            <dd className="tabular-nums text-gray-900">90 TND</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function TrackPreview({ en }: { en: boolean }) {
  return (
    <div className={frame}>
      <svg viewBox="0 0 320 180" className="h-full w-full" role="img" aria-label={en ? 'Route on a map' : 'Itinéraire sur une carte'}>
        <path d="M0 150 C60 140 90 90 150 96 S250 60 320 30" fill="none" stroke="#e7e2d9" strokeWidth="14" strokeLinecap="round" />
        <path d="M30 138 C70 130 95 92 150 96 S235 70 280 44" fill="none" stroke="#003333" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 7" />
        <circle cx="30" cy="138" r="5" fill="#003333" />
        <rect x="275" y="39" width="10" height="10" rx="2" fill="#003333" />
        <circle cx="150" cy="96" r="9" fill="#fff" stroke="#003333" strokeWidth="2.5" />
      </svg>
      <div className={`${panel} absolute right-4 top-4 px-3 py-2`}>
        <p className="text-xs text-gray-500">{en ? 'Arriving in' : 'Arrivée dans'}</p>
        <p className="text-sm font-medium tabular-nums text-gray-900">12 min</p>
      </div>
    </div>
  );
}

function RatePreview({ en }: { en: boolean }) {
  return (
    <div className={`${frame} flex items-center justify-center`}>
      <div className={`${panel} w-full max-w-xs p-4 text-center`}>
        <p className="mb-3 text-sm text-gray-900">{en ? 'How was your ride?' : 'Comment s’est passée votre course ?'}</p>
        <div className="flex justify-center gap-1" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={22} strokeWidth={1.5} className="fill-gray-900 text-gray-900" />
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">{en ? 'Reviews are verified after each ride' : 'Avis vérifiés après chaque course'}</p>
      </div>
    </div>
  );
}

export const HomeRideSteps: React.FC = () => {
  const { locale } = useLocale();
  const en = locale === 'en';

  const steps = [
    {
      icon: MapPin,
      title: en ? 'Enter your trip' : 'Indiquez votre trajet',
      text: en
        ? 'Type your pickup and destination. The estimated fare is shown right away, no account needed.'
        : 'Saisissez votre départ et votre destination. Le tarif estimé s’affiche tout de suite, sans compte.',
      Preview: TripPreview,
    },
    {
      icon: UserCheck,
      title: en ? 'Choose your driver' : 'Choisissez votre chauffeur',
      text: en
        ? 'Pick the vehicle and the verified driver that suit you.'
        : 'Choisissez le véhicule et le chauffeur vérifié qui vous conviennent.',
      Preview: DriversPreview,
    },
    {
      icon: ShieldCheck,
      title: en ? 'Confirm and meet your driver' : 'Confirmez et retrouvez votre chauffeur',
      text: en
        ? 'The price is confirmed before departure. Check your driver and vehicle, then get in at the agreed time.'
        : 'Le prix est confirmé avant le départ. Vérifiez votre chauffeur et son véhicule, puis montez à l’heure convenue.',
      Preview: ConfirmPreview,
    },
    {
      icon: Navigation,
      title: en ? 'Follow your ride' : 'Suivez votre course',
      text: en
        ? 'Follow the route in real time from the app, up to your destination.'
        : 'Suivez l’itinéraire en temps réel depuis l’application, jusqu’à votre destination.',
      Preview: TrackPreview,
    },
    {
      icon: Star,
      title: en ? 'Rate your driver' : 'Notez votre chauffeur',
      text: en
        ? 'Leave a rating and a comment after the ride. Your feedback helps the next riders.'
        : 'Laissez une note et un commentaire après la course. Votre avis aide les prochains clients.',
      Preview: RatePreview,
    },
  ];

  return (
    <RevealSection className="py-20 md:py-24 bg-surface-band">
      <div className="page-container">
        <h2 className="page-heading max-w-xl mb-10 [text-wrap:balance]">
          {en ? 'How to book a ride' : 'Comment commander un trajet'}
        </h2>
        <ol className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-6">
          {steps.map(({ icon: Icon, title, text, Preview }, index) => (
            <li key={title} className={index < 3 ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <div className={index < 3 ? 'aspect-[3/2]' : 'aspect-[3/2] lg:aspect-[2/1]'}>
                <Preview en={en} />
              </div>
              <span
                aria-hidden="true"
                className="relative -mt-6 ml-4 flex h-12 w-12 items-center justify-center rounded-xl border border-surface-border bg-white text-gray-900 shadow-raised"
              >
                <Icon size={20} strokeWidth={1.5} />
              </span>
              <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </RevealSection>
  );
};
