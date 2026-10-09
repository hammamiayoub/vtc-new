import React from 'react';
import { Bell } from 'lucide-react';
import { useLocale } from '../i18n/locale';

interface NotificationBellProps {
  unreadCount: number;
  hasNewNotifications: boolean;
  onClick: () => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  hasNewNotifications,
  onClick,
  className = ''
}) => {
  const { locale } = useLocale();
  const en = locale === 'en';
  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg transition-colors ${className}`}
      title={
        hasNewNotifications
          ? (en ? `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}` : `${unreadCount} nouvelle(s) notification(s)`)
          : (en ? 'Notifications' : 'Notifications')
      }
    >
      <Bell size={20} />
      
      {/* Badge de notification */}
      {hasNewNotifications && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[20px] h-5 shadow-lg animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      
      {/* Point rouge simple pour les petits nombres */}
      {hasNewNotifications && unreadCount <= 3 && (
        <span className="absolute -top-1 -right-1 block w-3 h-3 bg-red-500 rounded-full shadow-lg animate-pulse border-2 border-gray-800"></span>
      )}
    </button>
  );
};