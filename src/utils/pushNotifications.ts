// Service de notifications push pour le navigateur
export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class PushNotificationService {
  private isSupported: boolean;
  private permission: NotificationPermission;

  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
  }

  // Vérifier si les notifications sont supportées
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  // Obtenir le statut actuel des permissions
  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  // Demander la permission pour les notifications
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('Les notifications ne sont pas supportées par ce navigateur');
      return 'denied';
    }

    try {
      this.permission = await Notification.requestPermission();
      console.log('Permission de notification:', this.permission);
      return this.permission;
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      return 'denied';
    }
  }

  // Envoyer une notification
  async sendNotification(data: NotificationData): Promise<Notification | null> {
    if (!this.isSupported) {
      console.warn('Les notifications ne sont pas supportées');
      return null;
    }

    if (this.permission !== 'granted') {
      console.warn('Permission de notification non accordée');
      return null;
    }

    try {
      // Créer les options de notification sans actions pour éviter l'erreur
      const notificationOptions: NotificationOptions = {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        badge: data.badge || '/favicon.ico',
        tag: data.tag,
        data: data.data,
        requireInteraction: true, // La notification reste visible jusqu'à interaction
        silent: false
      };

      // Note: Les actions ne sont supportées que pour les notifications persistantes via Service Worker
      // Pour les notifications simples, on ne peut pas utiliser les actions
      console.log('📱 Envoi notification:', data.title);

      const notification = new Notification(data.title, notificationOptions);

      // Fermer automatiquement après 10 secondes
      setTimeout(() => {
        notification.close();
      }, 10000);

      return notification;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
      return null;
    }
  }

  // Notifications spécifiques pour TuniDrive

  // Notification pour chauffeur désigné
  async notifyDriverAssigned(driverName: string, clientName: string, pickupAddress: string, scheduledTime: string): Promise<Notification | null> {
    const notification = await this.sendNotification({
      title: '🚗 Nouvelle course assignée',
      body: `${clientName} vous a assigné une course de ${pickupAddress} pour le ${scheduledTime}`,
      tag: 'driver-assigned',
      data: {
        type: 'driver-assigned',
        driverName,
        clientName,
        pickupAddress,
        scheduledTime
      }
      // Note: Les actions ne sont pas supportées pour les notifications simples
    });

    return notification;
  }

  // Notification pour client - course annulée par chauffeur
  async notifyClientBookingCancelledByDriver(clientName: string, driverName: string, pickupAddress: string): Promise<Notification | null> {
    const notification = await this.sendNotification({
      title: '❌ Course annulée par le chauffeur',
      body: `${driverName} a annulé votre course de ${pickupAddress}. Nous cherchons un autre chauffeur.`,
      tag: 'booking-cancelled-by-driver',
      data: {
        type: 'booking-cancelled-by-driver',
        clientName,
        driverName,
        pickupAddress
      }
      // Note: Les actions ne sont pas supportées pour les notifications simples
    });

    return notification;
  }

  // Notification pour chauffeur - course annulée par client
  async notifyDriverBookingCancelledByClient(driverName: string, clientName: string, pickupAddress: string): Promise<Notification | null> {
    const notification = await this.sendNotification({
      title: '❌ Course annulée par le client',
      body: `${clientName} a annulé la course de ${pickupAddress}.`,
      tag: 'booking-cancelled-by-client',
      data: {
        type: 'booking-cancelled-by-client',
        driverName,
        clientName,
        pickupAddress
      }
      // Note: Les actions ne sont pas supportées pour les notifications simples
    });

    return notification;
  }

  // Notification pour chauffeur - course acceptée
  async notifyDriverBookingAccepted(driverName: string, clientName: string, pickupAddress: string, scheduledTime: string): Promise<Notification | null> {
    const notification = await this.sendNotification({
      title: '✅ Course acceptée',
      body: `Vous avez accepté la course de ${clientName} de ${pickupAddress} pour le ${scheduledTime}`,
      tag: 'booking-accepted',
      data: {
        type: 'booking-accepted',
        driverName,
        clientName,
        pickupAddress,
        scheduledTime
      }
    });

    return notification;
  }

  // Notification pour client - course acceptée par chauffeur
  async notifyClientBookingAcceptedByDriver(clientName: string, driverName: string, pickupAddress: string, scheduledTime: string): Promise<Notification | null> {
    const notification = await this.sendNotification({
      title: '✅ Course acceptée',
      body: `${driverName} a accepté votre course de ${pickupAddress} pour le ${scheduledTime}`,
      tag: 'booking-accepted-by-driver',
      data: {
        type: 'booking-accepted-by-driver',
        clientName,
        driverName,
        pickupAddress,
        scheduledTime
      }
      // Note: Les actions ne sont pas supportées pour les notifications simples
    });

    return notification;
  }

  // Notification pour chauffeur - course terminée
  async notifyDriverBookingCompleted(driverName: string, clientName: string, pickupAddress: string, earnings: number): Promise<Notification | null> {
    const notification = await this.sendNotification({
      title: '🎉 Course terminée',
      body: `Course de ${clientName} terminée avec succès. Vous avez gagné ${earnings} TND.`,
      tag: 'booking-completed',
      data: {
        type: 'booking-completed',
        driverName,
        clientName,
        pickupAddress,
        earnings
      }
    });

    return notification;
  }

  // Notification pour client - course terminée
  async notifyClientBookingCompleted(clientName: string, driverName: string, pickupAddress: string): Promise<Notification | null> {
    const notification = await this.sendNotification({
      title: '🎉 Course terminée',
      body: `Votre course avec ${driverName} est terminée. N'oubliez pas de noter votre chauffeur !`,
      tag: 'booking-completed',
      data: {
        type: 'booking-completed',
        clientName,
        driverName,
        pickupAddress
      }
      // Note: Les actions ne sont pas supportées pour les notifications simples
    });

    return notification;
  }

  // Fermer toutes les notifications
  closeAllNotifications(): void {
    if (this.isSupported) {
      // Fermer toutes les notifications avec le même tag
      const tags = [
        'driver-assigned',
        'booking-cancelled-by-driver',
        'booking-cancelled-by-client',
        'booking-accepted',
        'booking-accepted-by-driver',
        'booking-completed'
      ];

      tags.forEach(tag => {
        // Note: Il n'y a pas de méthode directe pour fermer toutes les notifications
        // Le navigateur les ferme automatiquement après un certain temps
        console.log(`Fermeture des notifications avec le tag: ${tag}`);
      });
    }
  }
}

// Instance singleton
export const pushNotificationService = new PushNotificationService();

// Hook React pour utiliser les notifications
export const usePushNotifications = () => {
  const requestPermission = async () => {
    return await pushNotificationService.requestPermission();
  };

  const sendNotification = async (data: NotificationData) => {
    return await pushNotificationService.sendNotification(data);
  };

  const isSupported = pushNotificationService.isNotificationSupported();
  const permission = pushNotificationService.getPermissionStatus();

  return {
    requestPermission,
    sendNotification,
    isSupported,
    permission,
    service: pushNotificationService
  };
};
