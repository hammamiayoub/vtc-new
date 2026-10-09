import React from 'react';
import { Mail, MessageCircle, Facebook, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppStoreBadges } from './AppStoreBadges';
import { Button } from './ui/Button';
import { useLocale } from '../i18n/locale';

interface FooterProps {
  onPrivacyPolicyClick?: () => void;
  onTermsClick?: () => void;
}

const footerLinkClass = 'text-sm text-gray-300 hover:text-white transition-colors';
const footerHeadingClass = 'text-sm font-semibold text-white mb-4';

export const Footer: React.FC<FooterProps> = () => {
  const { locale, href } = useLocale();
  const en = locale === 'en';

  return (
    <footer className="bg-black border-t border-gray-800 text-white">
      <div className="page-container py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-7 gap-8">
          <div className="sm:col-span-2 lg:col-span-2">
            <p className="text-xl font-bold text-white mb-4 tracking-tight">TuniDrive</p>
            <p className="text-sm text-gray-300 mb-4 max-w-md leading-relaxed">
              {en
                ? 'Mobility in Tunisia: private rides with professional drivers and international parcel transport between Europe and Tunisia.'
                : 'Mobilité et transport en Tunisie : courses VTC avec chauffeurs professionnels et transport international de colis Europe ↔ Tunisie.'}
            </p>
          </div>

          <div>
            <p className={footerHeadingClass}>{en ? 'Services' : 'Services'}</p>
            <ul className="space-y-3">
              <li>
                <Link to={href('/vtc-tunisie')} className={footerLinkClass}>
                  {en ? 'Private driver & airport transfer' : 'VTC Tunisie & transfert aéroport'}
                </Link>
              </li>
              <li>
                <Link to={href('/#transport-vtc')} className={footerLinkClass}>
                  {en ? 'Private driver' : 'Chauffeur privé'}
                </Link>
              </li>
              <li>
                <Link to={href('/transport-colis-europe-tunisie')} className={footerLinkClass}>
                  {en ? 'Parcels Europe ↔ Tunisia' : 'Transport colis Europe ↔ Tunisie'}
                </Link>
              </li>
              <li>
                <Link to={href('/blog')} className={footerLinkClass}>
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className={footerHeadingClass}>{en ? 'Sign up' : 'Inscription'}</p>
            <ul className="space-y-3">
              <li>
                <Link to={href('/signup')} className={footerLinkClass}>
                  {en ? 'Become a driver or carrier' : 'Devenir chauffeur ou transporteur'}
                </Link>
              </li>
              <li>
                <Link to={href('/client-signup')} className={footerLinkClass}>
                  {en ? 'Rider signup' : 'Inscription client'}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className={footerHeadingClass}>{en ? 'Legal' : 'Légal'}</p>
            <ul className="space-y-3">
              <li>
                <Link to={href('/terms-of-service')} className={footerLinkClass}>
                  {en ? 'Terms of use' : 'CGU'}
                </Link>
              </li>
              <li>
                <Link to={href('/privacy-policy')} className={footerLinkClass}>
                  {en ? 'Privacy policy' : 'RGPD'}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className={footerHeadingClass}>{en ? 'App' : 'Application'}</p>
            <AppStoreBadges layout="column" />
          </div>

          <div>
            <p className={footerHeadingClass}>Contact</p>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://wa.me/21628528477"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${footerLinkClass} inline-flex items-center gap-2`}
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@tunidrive.net"
                  className={`${footerLinkClass} inline-flex items-center gap-2`}
                >
                  <Mail size={16} />
                  support@tunidrive.net
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-gray-800 bg-gray-900/50 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-white mb-1">{en ? 'Ready to book?' : 'Prêt à réserver ?'}</p>
            <p className="text-sm text-gray-400">
              {en ? 'Get a fare in a few seconds, with no commitment.' : 'Obtenez un tarif en quelques secondes, sans engagement.'}
            </p>
          </div>
          <Link to={href('/#reserver')} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto rounded-full bg-white text-black hover:bg-gray-200">
              {en ? 'Book a ride' : 'Réserver une course'}
            </Button>
          </Link>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} TuniDrive. {en ? 'All rights reserved.' : 'Tous droits réservés.'}
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.facebook.com/profile.php?id=61581866699494"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="https://www.instagram.com/tunidrive_tunisia/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://www.tiktok.com/@tunidrive_tunisia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="TikTok"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
