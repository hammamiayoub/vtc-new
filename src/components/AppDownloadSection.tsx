import React from 'react';
import { Smartphone, QrCode, Download } from 'lucide-react';

interface AppDownloadSectionProps {
  qrImageSrc?: string;
  compact?: boolean;
}

export const AppDownloadSection: React.FC<AppDownloadSectionProps> = ({ qrImageSrc, compact }) => {
  const sectionPadding = compact ? 'py-8' : 'py-20';
  const gridGap = compact ? 'gap-8' : 'gap-12';
  const phoneMaxWidth = compact ? 'max-w-xs' : 'max-w-sm';
  const screenHeight = compact ? 'h-[420px]' : 'h-[600px]';
  const iconSize = compact ? 56 : 80;
  const qrSizePx = compact ? 140 : 180;

  return (
    <section className={`${sectionPadding} bg-gradient-to-br from-gray-50 to-blue-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid lg:grid-cols-2 ${gridGap} items-center`}>
          {/* Partie gauche - Contenu texte */}
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Smartphone size={16} />
              Application mobile
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Téléchargez l'application TuniDrive
            </h2>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Réservez vos courses en quelques secondes, suivez votre chauffeur en temps réel et gérez tous vos trajets depuis votre smartphone.
            </p>

            {/* Liste des avantages */}
            <div className="space-y-4 mb-10">
              {[
                'Inscription simple et gratuite ',
                'Réservation instantanée en 3 clics',
                'Suivi GPS en temps réel',
                'Historique de toutes vos courses',
                'Notifications push pour vos courses'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            {/* Badges des stores */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="https://play.google.com/store/apps/details?id=com.tunidrive.mobile"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 transition-transform durée-200"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                  alt="Disponible sur Google Play"
                  className="h-14 w-auto"
                />
              </a>
              <a 
                href="https://apps.apple.com/fr/app/tunidrive/id6753982765"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 transition-transform durée-200"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                  alt="Télécharger sur l'App Store"
                  className="h-14 w-auto"
                />
              </a>
            </div>
          </div>

          {/* Partie droite - Mockup du téléphone */}
          <div className="relative">
            <div className={`relative mx-auto w-full ${phoneMaxWidth}`}>
              {/* Fond décoratif */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl transform rotate-6 opacity-20"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-500 rounded-3xl transform -rotate-6 opacity-20"></div>
              
              {/* Mockup du téléphone */}
              <div className="relative bg-white rounded-3xl shadow-2xl p-3 border-8 border-gray-800">
                <div className="bg-gray-900 rounded-2xl overflow-hidden">
                  {/* Notch */}
                  <div className="h-6 bg-gray-900 flex items-center justify-center">
                    <div className="w-32 h-4 bg-black rounded-full"></div>
                  </div>
                  
                  {/* Contenu de l'écran */}
                  <div className={`bg-black ${screenHeight} flex flex-col items-center justify-center p-6 text-white`}>
                    <Download size={iconSize} className="mb-6 animate-bounce" />
                    <h3 className="text-2xl font-bold mb-2">TuniDrive</h3>
                    <p className="text-blue-100 text-center text-sm mb-8">
                      Votre transport à portée de main
                    </p>
                    
                    {/* QR Code personnalisable avec fallback */}
                    <div className="bg-white p-4 rounded-2xl flex items-center justify-center">
                      {qrImageSrc ? (
                        <>
                          <img 
                            src={qrImageSrc}
                            alt="QR de téléchargement"
                            className={`object-contain`}
                            style={{ width: `${qrSizePx}px`, height: `${qrSizePx}px` }}
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                              const next = target.nextElementSibling as HTMLElement;
                              if (next) next.style.display = 'block';
                            }}
                          />
                          <div style={{display: 'none'}}>
                            <QrCode size={qrSizePx} className="text-gray-900" />
                          </div>
                        </>
                      ) : (
                        <QrCode size={qrSizePx} className="text-gray-900" />
                      )}
                    </div>
                    <p className="text-xs text-blue-100 mt-4">Scanner pour télécharger</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};