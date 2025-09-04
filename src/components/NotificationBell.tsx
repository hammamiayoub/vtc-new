import React from 'react';
import { Bell } from 'lucide-react';

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
  return (
    <button
      onClick={onClick}
      className={`relative p-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition-colors ${className}`}
      title={hasNewNotifications ? `${unreadCount} nouvelle(s) notification(s)` : 'Notifications'}
    >
      <Bell size={20} />
      
      {/* Badge de notification */}
      {hasNewNotifications && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[20px] h-5 animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      
      {/* Point rouge simple pour les petits nombres */}
      {hasNewNotifications && unreadCount === 1 && (
        <span className="absolute -top-1 -right-1 block w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
      )}
    </button>
  );
};