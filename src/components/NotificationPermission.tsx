import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { usePushNotifications } from '../utils/pushNotifications';
import { useLocale } from '../i18n/locale';

interface NotificationPermissionProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export const NotificationPermission: React.FC<NotificationPermissionProps> = ({
  onPermissionGranted,
  onPermissionDenied
}) => {
  const { locale } = useLocale();
  const en = locale === 'en';
  const { requestPermission, isSupported, permission } = usePushNotifications();
  const [isRequesting, setIsRequesting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Afficher le prompt si les notifications ne sont pas supportées ou refusées
    if (!isSupported) {
      setShowPrompt(false);
    } else if (permission === 'default') {
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
    }
  }, [isSupported, permission]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await requestPermission();
      
      if (result === 'granted') {
        onPermissionGranted?.();
        setShowPrompt(false);
      } else {
        onPermissionDenied?.();
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      onPermissionDenied?.();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onPermissionDenied?.();
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              {en ? 'Notifications are not supported' : 'Notifications non supportées'}
            </h3>
            <p className="text-sm text-yellow-700">
              {en ? 'This browser does not support push notifications.' : 'Votre navigateur ne supporte pas les notifications push.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            {en ? 'Turn on notifications' : 'Activer les notifications'}
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            {en
              ? 'Get live updates for your rides: new requests, cancellations and status changes.'
              : 'Recevez des notifications en temps réel pour vos courses : nouvelles demandes, annulations, et mises à jour de statut.'}
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRequesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {en ? 'Turning on...' : 'Activation...'}
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  {en ? 'Turn on notifications' : 'Activer les notifications'}
                </>
              )}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              {en ? 'Later' : 'Plus tard'}
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-blue-400 hover:text-blue-600"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Composant pour afficher le statut des notifications
export const NotificationStatus: React.FC = () => {
  const { locale } = useLocale();
  const en = locale === 'en';
  const { isSupported, permission } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <BellOff className="w-4 h-4" />
        <span className="text-sm">{en ? 'Notifications not supported' : 'Notifications non supportées'}</span>
      </div>
    );
  }

  switch (permission) {
    case 'granted':
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">{en ? 'Notifications on' : 'Notifications activées'}</span>
        </div>
      );
    case 'denied':
      return (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="w-4 h-4" />
          <span className="text-sm">{en ? 'Notifications blocked' : 'Notifications refusées'}</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2 text-yellow-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{en ? 'Notifications pending' : 'Notifications en attente'}</span>
        </div>
      );
  }
};
